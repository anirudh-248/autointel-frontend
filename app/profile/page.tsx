"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { deleteUser, getUserInfo, updateUserInfo } from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { ApiKeyConfig } from "@/components/upload/APIKeyConfig";
import {
  User,
  Phone,
  Database,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ProfilePage() {
  const { logout } = useAuth();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [postgres, setPostgres] = React.useState("");
  const [sqlite, setSqlite] = React.useState("");
  const [mysql, setMysql] = React.useState("");
  const [info, setInfo] = React.useState<any>(null);
  const [msg, setMsg] = React.useState("");
  const [msgType, setMsgType] = React.useState<"success" | "error">("success");
  const [databaseSuccess, setDatabaseSuccess] = React.useState("");
  const [llmSuccess, setLlmSuccess] = React.useState("");
  const [personalSuccess, setPersonalSuccess] = React.useState("");
  const [databaseLoading, setDatabaseLoading] = React.useState(false);
  const [llmLoading, setLlmLoading] = React.useState(false);
  const [personalLoading, setPersonalLoading] = React.useState(false);
  const [mongodb, setMongodb] = React.useState("");
  const [openRouterKey, setOpenRouterKey] = React.useState("");
  const [modelName, setModelName] = React.useState("");
  const [baseURL, setBaseURL] = React.useState("");
  const [hfToken, setHfToken] = React.useState("");
  const [initialDatabaseValues, setInitialDatabaseValues] = React.useState({
    postgres: "",
    sqlite: "",
    mysql: "",
    mongodb: "",
  });
  const [initialLlmValues, setInitialLlmValues] = React.useState({
    openRouterKey: "",
    modelName: "",
    baseURL: "",
    hfToken: "",
  });
  const [initialPersonalValues, setInitialPersonalValues] = React.useState({
    name: "",
    phone: "",
  });
  const [initialLoad, setInitialLoad] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

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
          setOpenRouterKey(parsed?.data.openrouter_api_key || "");
          setModelName(
            parsed?.data.openrouter_model_name ||
              process.env.NEXT_PUBLIC_OPENROUTER_MODEL ||
              "x-ai/grok-4-fast",
          );
          setBaseURL(
            parsed?.data.openrouter_base_url || "https://openrouter.ai/api/v1",
          );
          setHfToken(parsed?.data.hf_token || "");
          setInitialDatabaseValues({
            postgres: parsed?.data.postgres_db_url || "",
            sqlite: parsed?.data.sqlite_db_url || "",
            mysql: parsed?.data.mysql_db_url || "",
            mongodb: parsed?.data.mongodb_db_url || "",
          });
          setInitialLlmValues({
            openRouterKey: parsed?.data.openrouter_api_key || "",
            modelName:
              parsed?.data.openrouter_model_name ||
              process.env.NEXT_PUBLIC_OPENROUTER_MODEL ||
              "x-ai/grok-4-fast",
            baseURL:
              parsed?.data.openrouter_base_url ||
              "https://openrouter.ai/api/v1",
            hfToken: parsed?.data.hf_token || "",
          });
          setInitialPersonalValues({
            name: parsed?.data.name || "",
            phone: parsed?.data.phone_number || "",
          });
        } catch {}
      } catch {}
      setInitialLoad(false);
    })();
  }, []);

  const onSaveDatabase = async () => {
    setDatabaseLoading(true);
    setMsg("");
    setDatabaseSuccess("");
    try {
      await updateUserInfo({
        postgres_db_url: postgres,
        sqlite_db_url: sqlite,
        mysql_db_url: mysql,
        mongodb_uri: mongodb,
      });
      setInitialDatabaseValues({ postgres, sqlite, mysql, mongodb });
      setDatabaseSuccess("Connections updated successfully!");
    } catch (e: any) {
      setMsg(e?.message || "Failed to update database connections");
      setMsgType("error");
    } finally {
      setDatabaseLoading(false);
    }
  };

  const onSaveLlm = async () => {
    setLlmLoading(true);
    setMsg("");
    setLlmSuccess("");
    try {
      await updateUserInfo({
        openrouter_api_key: openRouterKey,
        openrouter_model_name: modelName,
        openrouter_base_url: baseURL,
        hf_token: hfToken,
      });
      localStorage.setItem("OPENROUTER_API_KEY", openRouterKey);
      localStorage.setItem("OPENROUTER_MODEL_NAME", modelName);
      localStorage.setItem("OPENROUTER_BASE_URL", baseURL);
      localStorage.setItem("HF_TOKEN", hfToken);
      setInitialLlmValues({ openRouterKey, modelName, baseURL, hfToken });
      setLlmSuccess("Configuration updated successfully!");
    } catch (e: any) {
      setMsg(e?.message || "Failed to update LLM API configuration");
      setMsgType("error");
    } finally {
      setLlmLoading(false);
    }
  };

  const onSavePersonal = async () => {
    setPersonalLoading(true);
    setMsg("");
    setPersonalSuccess("");
    try {
      await updateUserInfo({
        name,
        phone_number: phone,
      });
      setInitialPersonalValues({ name, phone });
      setPersonalSuccess("Personal information updated successfully!");
    } catch (e: any) {
      setMsg(e?.message || "Failed to update personal information");
      setMsgType("error");
    } finally {
      setPersonalLoading(false);
    }
  };

  const databaseChanged =
    postgres !== initialDatabaseValues.postgres ||
    sqlite !== initialDatabaseValues.sqlite ||
    mysql !== initialDatabaseValues.mysql ||
    mongodb !== initialDatabaseValues.mongodb;
  const llmChanged =
    openRouterKey !== initialLlmValues.openRouterKey ||
    modelName !== initialLlmValues.modelName ||
    baseURL !== initialLlmValues.baseURL ||
    hfToken !== initialLlmValues.hfToken;
  const personalChanged =
    name !== initialPersonalValues.name ||
    phone !== initialPersonalValues.phone;

  const onDeleteAccount = async () => {
    setDeleteLoading(true);
    setMsg("");
    try {
      await deleteUser();

      [
        "OPENROUTER_API_KEY",
        "OPENROUTER_MODEL_NAME",
        "OPENROUTER_BASE_URL",
        "HF_TOKEN",
      ].forEach((key) => localStorage.removeItem(key));
      logout();
      window.location.assign("/");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to delete account");
      setMsgType("error");
      setDeleteDialogOpen(false);
    } finally {
      setDeleteLoading(false);
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
          Manage your personal information, database connections, and LLM API
          configurations
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Database Connections Card */}
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
          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={onSaveDatabase}
              disabled={databaseLoading || !databaseChanged}
              className="w-full sm:w-auto"
            >
              {databaseLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Database Connections
                </>
              )}
            </Button>
            {databaseSuccess && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {databaseSuccess}
              </span>
            )}
          </div>
        </Card>

        {/* LLM API Configuration Card */}
        <ApiKeyConfig
          apiKey={openRouterKey}
          modelName={modelName}
          baseURL={baseURL}
          hfToken={hfToken}
          onApiKeyChange={setOpenRouterKey}
          onModelNameChange={setModelName}
          onBaseURLChange={setBaseURL}
          onHfTokenChange={setHfToken}
          onSave={onSaveLlm}
          hasChanges={llmChanged}
          successMessage={llmSuccess}
          loading={llmLoading}
        />
      </div>

      {/* Personal Information Card */}
      <div className="mt-6">
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
          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={onSavePersonal}
              disabled={personalLoading || !personalChanged}
              className="w-full sm:w-auto"
            >
              {personalLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Personal Information
                </>
              )}
            </Button>
            {personalSuccess && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {personalSuccess}
              </span>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="w-full border-red-200 p-4 sm:p-6 dark:border-red-900">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-950">
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Delete Account</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Delete your account and sign out. You can restore it within 30
                days.
              </p>
              <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="mt-4"
                    disabled={deleteLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign you out and soft-delete your account. You
                      can restore it within 30 days by signing in again. Are you
                      sure you want to continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteLoading}
                      onClick={(event) => {
                        event.preventDefault();
                        void onDeleteAccount();
                      }}
                    >
                      {deleteLoading ? "Deleting..." : "Delete Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
