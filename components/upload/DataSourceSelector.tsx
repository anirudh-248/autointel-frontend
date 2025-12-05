// components/DataSourceSelector.tsx
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataSourceType } from "@/lib/types";
import { DATA_SOURCES } from "@/lib/constants";

type DataSourceSelectorProps = {
  source: DataSourceType;
  onSourceChange: (source: DataSourceType) => void;
};

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  source,
  onSourceChange,
}) => {
  const groupedSources = DATA_SOURCES.reduce((acc, src) => {
    if (!acc[src.category]) acc[src.category] = [];
    acc[src.category].push(src);
    return acc;
  }, {} as Record<string, typeof DATA_SOURCES>);

  return (
    <Card className="w-full p-4 sm:p-6 overflow-hidden">
      <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
        Choose Data Source
      </h2>
      <div className="space-y-3 sm:space-y-4">
        {Object.entries(groupedSources).map(([category, sources]) => (
          <div key={category}>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
              {category}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {sources.map((src: any) => {
                const Icon = src.icon;
                return (
                  <Button
                    key={src.value}
                    variant={source === src.value ? "default" : "outline"}
                    className="h-auto py-2 sm:py-3 flex flex-col items-center gap-1 sm:gap-2"
                    onClick={() => onSourceChange(src.value)}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-xs leading-tight text-center">
                      {src.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
