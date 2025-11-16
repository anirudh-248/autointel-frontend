"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Database } from "lucide-react";
import { PreviewTable } from "@/components/upload/PreviewTable";

type Props = {
  dburi?: string;
  dbType?: string;
};

export default function MongoOverview({ dburi, dbType }: Props) {
  const [mongoOverview, setMongoOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(
    null
  );
  const [loadingCollectionDetails, setLoadingCollectionDetails] =
    useState<boolean>(false);

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
            includeStats: false,
            includeFieldStats: false,
            sampleSize: 5,
          }),
        });

        if (!res.ok) throw new Error("Failed to fetch Mongo overview");
        const data = await res.json();
        setMongoOverview(data);
      } catch (err: any) {
        console.error("MongoOverview: failed to fetch overview", err);
        setFetchError(err?.message || "Failed to fetch overview");
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [dbType, dburi]);

  const fetchCollectionDetails = async (collectionName: string) => {
    if (!dburi || dbType !== "mongodb") return;

    setLoadingCollectionDetails(true);
    setSelectedCollection(null);
    try {
      const res = await fetch("/api/db/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionString: dburi,
          includeDocuments: true,
          includeFieldStats: true,
          includeStats: false,
          collectionsFilter: [collectionName],
          sampleSize: 10,
          page: 1,
          pageSize: 5,
        }),
      });

      if (!res.ok) throw new Error("Failed to load collection details");
      const data = await res.json();

      const dbOverview = Array.isArray(data.cluster) ? data.cluster[0] : null;
      const col = dbOverview?.collections?.find(
        (c: any) => c.collectionName === collectionName
      );

      if (col) setSelectedCollection(col);
      else setFetchError("Collection details not found in overview response");
    } catch (err: any) {
      console.error("MongoOverview: failed to fetch collection details:", err);
      setFetchError(err?.message || "Failed to fetch collection details");
    } finally {
      setLoadingCollectionDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Loading MongoDB collections...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        {fetchError}
      </div>
    );
  }

  if (!mongoOverview || !Array.isArray(mongoOverview.cluster)) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        <p>No overview available. Try reloading the connection.</p>
      </div>
    );
  }

  return (
    <div>
      {mongoOverview.cluster.map((db: any, idx: number) => (
        <div key={db.databaseName || idx} className="mb-6">
          <h3 className="text-lg font-medium mb-3">{db.databaseName}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {db.collections.map((col: any) => (
              <Card
                key={col.collectionName}
                className={`p-4 hover:shadow-md cursor-pointer`}
                onClick={() => fetchCollectionDetails(col.collectionName)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{col.collectionName}</h4>
                  <div className="text-sm text-muted-foreground">
                    {col.documentCount} docs
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {col.attributeCount} fields • {col.indexes?.length || 0}{" "}
                  indexes
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {loadingCollectionDetails && (
        <div className="text-sm text-muted-foreground text-center py-6">
          Loading collection...
        </div>
      )}

      {selectedCollection && !loadingCollectionDetails && (
        <Card className="mt-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {selectedCollection.collectionName}
            </h3>
            <div className="text-sm text-muted-foreground">
              {selectedCollection.documentCount} documents
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-2">Schema</h4>
            <div className="text-sm text-muted-foreground">
              {selectedCollection.attributes?.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedCollection.attributes.map((a: string) => (
                    <li key={a} className="truncate">
                      <strong className="mr-2">{a}</strong>
                      <span className="text-xs text-muted-foreground">
                        {JSON.stringify(selectedCollection.schema?.[a] || [])}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No schema detected
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Sample Documents</h4>
            {selectedCollection.topDocuments &&
            selectedCollection.topDocuments.length > 0 ? (
              <PreviewTable
                rows={selectedCollection.topDocuments}
                columns={
                  selectedCollection.attributes ||
                  Object.keys(selectedCollection.topDocuments[0] || {})
                }
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                No documents available
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
