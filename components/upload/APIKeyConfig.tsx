// components/ApiKeyConfig.tsx
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Save, Sparkles } from "lucide-react";

type ApiKeyConfigProps = {
  apiKey: string;
  modelName: string;
  baseURL: string;
  hfToken: string;
  onApiKeyChange: (key: string) => void;
  onModelNameChange: (model: string) => void;
  onBaseURLChange: (url: string) => void;
  onHfTokenChange: (token: string) => void;
  onSave: () => void;
  hasChanges: boolean;
  successMessage?: string;
  loading?: boolean;
};

export const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({
  apiKey,
  modelName,
  baseURL,
  hfToken,
  onApiKeyChange,
  onModelNameChange,
  onBaseURLChange,
  onHfTokenChange,
  onSave,
  hasChanges,
  successMessage,
  loading = false,
}) => {
  return (
    <Card className="w-full p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">
              LLM API Configuration
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Configure your LLM API connection
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            OpenRouter Base URL
          </Label>
          <Input
            type="text"
            placeholder="https://openrouter.ai/api/v1 or http://localhost:11434/v1"
            value={baseURL}
            onChange={(e) => onBaseURLChange(e.target.value)}
            className="h-10 font-mono text-xs sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            OpenRouter API Key
          </Label>
          <Input
            type="password"
            placeholder="sk-or-v1-... (optional for local models)"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="h-10 font-mono text-xs sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            OpenRouter Model Name
          </Label>
          <Input
            type="text"
            placeholder="e.g., x-ai/grok-4-fast, llama3.2, qwen2.5"
            value={modelName}
            onChange={(e) => onModelNameChange(e.target.value)}
            className="h-10 font-mono text-xs sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Hugging Face Token
          </Label>
          <Input
            type="password"
            placeholder="hf_..."
            value={hfToken}
            onChange={(e) => onHfTokenChange(e.target.value)}
            className="h-10 font-mono text-xs sm:text-sm"
          />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={onSave}
          disabled={loading || !hasChanges}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
        {successMessage && (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </span>
        )}
      </div>
    </Card>
  );
};
