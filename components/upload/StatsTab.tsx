// components/StatsTab.tsx
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataSet } from "@/lib/types";

type StatsTabProps = {
  dataset: DataSet;
  isSQLSource: boolean;
  dbType?: string;
  dburi?: string;
  sqlTableData?: any[];
  sqlColumns?: string[];
};

export const StatsTab: React.FC<StatsTabProps> = ({
  dataset,
  isSQLSource,
  dbType,
  dburi,
  sqlTableData = [],
  sqlColumns = [],
}) => {
  const [mongoOverview, setMongoOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      if (dbType !== "mongodb" || !dburi) return;

      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/db/overview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionString: dburi,
            includeDocuments: false,
            includeStats: true,
            includeFieldStats: true,
            sampleSize: 10,
          }),
        });

        if (!res.ok) throw new Error("Failed to fetch Mongo overview");
        const data = await res.json();
        setMongoOverview(data);
      } catch (err: any) {
        console.error("StatsTab: failed to fetch overview", err);
        setFetchError(err?.message || "Failed to fetch overview");
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [dbType, dburi]);

  if (isSQLSource) {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Database Type</p>
          <p className="text-2xl font-bold">{dbType?.toUpperCase()}</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Connection Details</h3>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">URI:</span>
              <p className="text-muted-foreground break-all mt-1">{dburi}</p>
            </div>
            {sqlTableData.length > 0 && (
              <>
                <div className="text-sm">
                  <span className="font-medium">Last Query Rows:</span>
                  <p className="text-muted-foreground mt-1">
                    {sqlTableData.length}
                  </p>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Columns:</span>
                  <p className="text-muted-foreground mt-1">
                    {sqlColumns.length}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
        {sqlColumns.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Last Query Schema</h3>
            <div className="space-y-2">
              {sqlColumns.map((col) => (
                <div key={col} className="flex justify-between text-sm">
                  <span className="font-medium">{col}</span>
                  <Badge variant="secondary">column</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }
  // MongoDB overview rendering
  if (dbType === "mongodb") {
    // show loading / error
    if (loading) {
      return (
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">
              Loading MongoDB stats…
            </p>
          </Card>
        </div>
      );
    }

    if (fetchError) {
      return (
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-sm text-destructive">{fetchError}</p>
          </Card>
        </div>
      );
    }

    const cluster = mongoOverview?.cluster || [];

    return (
      <div className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Databases Scanned</p>
          <p className="text-2xl font-bold">{cluster.length}</p>
        </Card>

        {cluster.map((db: any) => (
          <Card key={db.databaseName} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold">{db.databaseName}</h3>
                <p className="text-sm text-muted-foreground">
                  {db.totalCollections} collections
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {db.collections?.length || 0} shown
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {db.collections?.map((col: any) => (
                <div
                  key={col.collectionName}
                  className="grid grid-cols-3 gap-4 items-start"
                >
                  <div className="col-span-1">
                    <span className="font-medium">{col.collectionName}</span>
                  </div>
                  <div className="col-span-1 text-sm text-muted-foreground">
                    {col.documentCount} documents
                  </div>
                  <div className="col-span-1 text-sm text-muted-foreground">
                    {col.attributeCount} fields • {col.indexes?.length || 0}{" "}
                    indexes
                  </div>

                  {col.collectionStats && (
                    <div className="col-span-3 text-xs text-muted-foreground mt-1">
                      Storage: {col.collectionStats.storageSizeMB} • Avg doc:{" "}
                      {col.collectionStats.avgDocumentSizeKB}
                    </div>
                  )}

                  {col.fieldStats && (
                    <div className="col-span-3 mt-2">
                      <div className="text-sm font-medium mb-1">
                        Top Field Stats
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {Object.entries(col.fieldStats)
                          .slice(0, 6)
                          .map(([fname, fstat]: any) => (
                            <div key={fname} className="p-2 border rounded">
                              <div className="font-medium">{fname}</div>
                              <div>
                                Types:{" "}
                                {Array.isArray(fstat.type)
                                  ? fstat.type.join(", ")
                                  : fstat.type}
                              </div>
                              <div>Usage: {fstat.usageFrequency}%</div>
                              <div>Nulls: {fstat.nullPercentage}%</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Fallback for file / plain dataset
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Rows</p>
          <p className="text-2xl font-bold">{dataset.schema.rowCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Columns</p>
          <p className="text-2xl font-bold">{dataset.schema.fields.length}</p>
        </Card>
      </div>
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Schema</h3>
        <div className="space-y-2">
          {dataset.schema.fields.map((field) => (
            <div key={field.name} className="flex justify-between text-sm">
              <span className="font-medium">{field.name}</span>
              <Badge variant="secondary">{field.type}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
