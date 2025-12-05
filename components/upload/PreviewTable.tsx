"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PreviewTable({
  rows,
  columns,
}: {
  rows: any[];
  columns: string[];
}) {
  return (
    <div className="w-full">
      <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
        <UITable>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c} className="whitespace-nowrap">
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 10).map((r, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c} className="whitespace-nowrap">
                    {String(r?.[c] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </UITable>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        Showing first 10 rows
      </div>
    </div>
  );
}
