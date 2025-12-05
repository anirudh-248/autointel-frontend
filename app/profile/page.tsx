"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getUserInfo, updateUserInfo } from "@/lib/api";
import {
  User,
  Phone,
  Database,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
} from "lucide-react";

export default function ProfilePage() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [postgres, setPostgres] = React.useState("");
  const [sqlite, setSqlite] = React.useState("");
  const [mysql, setMysql] = React.useState("");
  const [info, setInfo] = React.useState<any>(null);
  const [msg, setMsg] = React.useState("");
  const [msgType, setMsgType] = React.useState<"success" | "error">("success");
  const [loading, setLoading] = React.useState(false);
  const [mongodb, setMongodb] = React.useState("");
  const [initialLoad, setInitialLoad] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await getUserInfo();
        setInfo(res);
        try {
          const parsed = typeof res === "string" ? JSON.parse(res as any) : res;
          setName(parsed?.data.name || "");
          setPhone(parsed?.data.phone_number || "");
          setPostgres(parsed?.data.postgres_db_url || "");
          setSqlite(parsed?.data.sqlite_db_url || "");
          setMysql(parsed?.data.mysql_db_url || "");
          setMongodb(parsed?.data.mongodb_db_url || "");
        } catch {}
      } catch {}
      setInitialLoad(false);
    })();
  }, []);

  const onSave = async () => {
    setLoading(true);
    setMsg("");
    try {
      await updateUserInfo({
        name,
        phone_number: phone,
        postgres_db_url: postgres,
        sqlite_db_url: sqlite,
        mysql_db_url: mysql,
        mongodb_uri: mongodb,
      });
      setMsg("Profile updated successfully!");
      setMsgType("success");
    } catch (e: any) {
      setMsg(e?.message || "Failed to update profile");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 md:pt-24 overflow-x-hidden">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
          Profile Settings
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your personal information and database connections
        </p>
      </div>

      {/* Status Message */}
      {msg && (
        <div className="mb-6">
          <Card
            className={`p-4 border-l-4 ${
              msgType === "success"
                ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                : "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
            }`}
          >
            <div className="flex items-center gap-3">
              {msgType === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <p
                className={`text-sm font-medium ${
                  msgType === "success"
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {msg}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Personal Information Card */}
      <div className="mb-6">
        <Card className="w-full p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-lg">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">
                Personal Information
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Your basic account details
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Database Connections Card */}
      <div className="mb-6">
        <Card className="w-full p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">
                  Database Connections
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Configure your database connection strings
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:flex shrink-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Optional
            </Badge>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="postgres" className="text-sm font-medium">
                PostgreSQL Connection URL
              </Label>
              <Input
                id="postgres"
                placeholder="postgresql://user:password@host:port/database"
                value={postgres}
                onChange={(e) => setPostgres(e.target.value)}
                className="h-10 font-mono text-xs sm:text-sm"
                type="text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mysql" className="text-sm font-medium">
                MySQL Connection URL
              </Label>
              <Input
                id="mysql"
                placeholder="mysql://user:password@host:port/database"
                value={mysql}
                onChange={(e) => setMysql(e.target.value)}
                className="h-10 font-mono text-xs sm:text-sm"
                type="text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sqlite" className="text-sm font-medium">
                SQLite Database Path
              </Label>
              <Input
                id="sqlite"
                placeholder="/path/to/database.db or file:database.db"
                value={sqlite}
                onChange={(e) => setSqlite(e.target.value)}
                className="h-10 font-mono text-xs sm:text-sm"
                type="text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mongodb" className="text-sm font-medium">
                MongoDB Connection URI
              </Label>
              <Input
                id="mongodb"
                placeholder="mongodb://user:password@host:port/database"
                value={mongodb}
                onChange={(e) => setMongodb(e.target.value)}
                className="h-10 font-mono text-xs sm:text-sm"
                type="text"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={loading} className="px-6">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
