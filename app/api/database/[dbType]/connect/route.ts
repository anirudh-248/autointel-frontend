// app/api/database/[dbType]/connect/route.ts
import { NextResponse } from "next/server";
import { DataProcessor } from "@/lib/dataProcessor";
import mongoToDataset from "@/lib/mongoToDataset";

export async function POST(
  request: Request,
  context: { params: Promise<{ dbType: string }> }
) {
  try {
    const body = await request.json();
    const { connectionString } = body || {};
    const { dbType } = await context.params;

    if (!connectionString) {
      return NextResponse.json(
        { error: "Connection string is required" },
        { status: 400 }
      );
    }

    // Placeholder: implement actual DB connections here
    let rows: any[] = [];
    let sourceName = "";

    switch (dbType) {
      case "postgres":
        sourceName = "PostgreSQL Database";
        return NextResponse.json(
          {
            error:
              "PostgreSQL connection not implemented. Please configure in your API route.",
            hint: "Install 'pg' package and implement connection logic in app/api/database/[dbType]/connect/route.ts",
          },
          { status: 501 }
        );

      case "mysql":
        sourceName = "MySQL Database";
        return NextResponse.json(
          {
            error:
              "MySQL connection not implemented. Please configure in your API route.",
            hint: "Install 'mysql2' package and implement connection logic",
          },
          { status: 501 }
        );

      case "sqlite":
        sourceName = "SQLite Database";
        return NextResponse.json(
          {
            error:
              "SQLite connection not implemented. Please configure in your API route.",
            hint: "Install 'better-sqlite3' package and implement connection logic",
          },
          { status: 501 }
        );

      case "mongodb": {
        sourceName = "MongoDB Database";
        let client;

        try {
          const { MongoClient } = await import("mongodb");
          client = new MongoClient(connectionString, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
          });

          console.log("Connecting to MongoDB...");
          await client.connect();
          console.log("MongoDB connected successfully");

          const adminDb = client.db().admin();
          const dbList = await adminDb.listDatabases();
          console.log(`Found ${dbList.databases.length} databases`);

          const allDocs: any[] = [];
          let totalCollections = 0;

          for (const dbInfo of dbList.databases) {
            // Skip system databases
            if (["admin", "local", "config"].includes(dbInfo.name)) {
              continue;
            }

            const db = client.db(dbInfo.name);
            const collections = await db.listCollections().toArray();
            console.log(
              `Database '${dbInfo.name}' has ${collections.length} collections`
            );

            for (const colInfo of collections) {
              const col = db.collection(colInfo.name);
              const count = await col.countDocuments();
              console.log(
                `Collection '${colInfo.name}' has ${count} documents`
              );

              const docs = await col.find({}).limit(200).toArray();
              console.log(
                `Retrieved ${docs.length} documents from '${colInfo.name}'`
              );

              if (docs.length > 0) {
                allDocs.push(...docs);
                totalCollections++;
              }
            }
          }

          console.log(
            `Total documents retrieved: ${allDocs.length} from ${totalCollections} collections`
          );

          if (allDocs.length === 0) {
            // Return empty dataset structure instead of error
            const emptyDataset = {
              source: {
                kind: "mongodb" as const,
                name: "MongoDB Database",
                meta: {
                  connectionString,
                  uri: connectionString,
                },
              },
              schema: {
                fields: [],
                rowCount: 0,
              },
              rows: [],
            };

            await client.close();
            console.log("MongoDB connection closed - empty database");

            return NextResponse.json({
              dataset: emptyDataset,
              totalCollections: 0,
              totalDocs: 0,
              warning:
                "Database connected but no documents found. Please add data to your collections.",
            });
          }

          console.log(
            `Retrieved ${allDocs.length} documents from ${totalCollections} collections`
          );

          const baseDataset = mongoToDataset(allDocs);
          const dataset = {
            ...baseDataset,
            source: {
              kind: "mongodb" as const,
              name: "MongoDB Database",
              meta: {
                connectionString,
                uri: connectionString,
              },
            },
          };

          await client.close();
          console.log("MongoDB connection closed");

          return NextResponse.json({
            dataset,
            totalCollections,
            totalDocs: allDocs.length,
          });
        } catch (err: any) {
          console.error("MONGODB CONNECT ERROR:", err);
          if (client) {
            try {
              await client.close();
            } catch (closeErr) {
              console.error("Error closing MongoDB connection:", closeErr);
            }
          }

          // Provide more specific error messages
          let errorMessage = err.message || "Failed to connect to MongoDB";
          if (err.message?.includes("ENOTFOUND")) {
            errorMessage =
              "Cannot resolve MongoDB host. Check your connection string.";
          } else if (err.message?.includes("authentication failed")) {
            errorMessage =
              "Authentication failed. Check your username and password.";
          } else if (err.message?.includes("timed out")) {
            errorMessage =
              "Connection timed out. Check your network or MongoDB Atlas whitelist.";
          }

          return NextResponse.json(
            { error: errorMessage, details: err.message },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: "Unsupported database type" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    const { dbType } = await context.params;
    console.error(`Error in ${dbType} connect API:`, error);
    return NextResponse.json(
      { error: error?.message || "Database connection failed" },
      { status: 500 }
    );
  }
}
