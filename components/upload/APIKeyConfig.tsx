// components/ApiKeyConfig.tsx
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

type ApiKeyConfigProps = {
  apiKey: string;
  modelName: string;
  baseURL: string;
  onApiKeyChange: (key: string) => void;
  onModelNameChange: (model: string) => void;
  onBaseURLChange: (url: string) => void;
  onSave: () => void;
};

export const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({
  apiKey,
  modelName,
  baseURL,
  onApiKeyChange,
  onModelNameChange,
  onBaseURLChange,
  onSave,
}) => {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">LLM API Configuration</h2>
      </div>
      <div className="space-y-3">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">Base URL</label>
            <Input
              type="text"
              placeholder="https://openrouter.ai/api/v1 or http://localhost:11434/v1"
              value={baseURL}
              onChange={(e) => onBaseURLChange(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              OpenRouter, Ollama (localhost:11434/v1), or any OpenAI-compatible
              API
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">API Key</label>
            <Input
              type="password"
              placeholder="sk-or-v1-... (optional for local models)"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
            />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">Model Name</label>
            <Input
              type="text"
              placeholder="e.g., x-ai/grok-4-fast, llama3.2, qwen2.5"
              value={modelName}
              onChange={(e) => onModelNameChange(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              OpenRouter:{" "}
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                browse models
              </a>{" "}
              | Ollama: llama3.2, qwen2.5, mistral, etc.
            </p>
          </div>
          <Button onClick={onSave} className="mt-auto">
            Save Configuration
          </Button>
        </div>
      </div>
    </Card>
  );
};
