import React, { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Loader2,
  Download,
  Presentation,
  FileText,
  Languages,
} from "lucide-react";
import { Message } from "@/lib/types";
import { SQLResultDisplay } from "./SQLResultDisplay";

// Language options with native names
const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिंदी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "ur", name: "Urdu", native: "اردو" },
];

type ChatAssistantProps = {
  messages: Message[];
  input: string;
  loading: boolean;
  downloadLoading: boolean;
  selectedVizCount: number;
  selectedReportCount: number;
  reports: Array<{ id: string; title: string; content: string; html: string }>;
  isSQLSource: boolean;
  isTextSource?: boolean;
  storyLoading?: boolean;
  selectedLanguage?: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onDownloadReport: (html: string, format: "html" | "pdf") => void;
  onGenerateStory?: (language?: string) => void;
  onToggleReportSelection: (reportId: string) => void;
  onLanguageChange?: (language: string) => void;
  selectedReportIds: Set<string>;
};

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  messages,
  input,
  loading,
  downloadLoading,
  selectedVizCount,
  selectedReportCount,
  reports,
  isSQLSource,
  isTextSource,
  storyLoading = false,
  selectedLanguage = "en",
  onInputChange,
  onSendMessage,
  onDownloadReport,
  onGenerateStory,
  onToggleReportSelection,
  onLanguageChange,
  selectedReportIds,
}) => {
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [showLanguageSelect, setShowLanguageSelect] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const totalSelected = selectedVizCount + selectedReportCount;
  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <Card className="w-full min-w-0 p-4 sm:p-6 lg:sticky lg:top-4 overflow-x-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3 w-full">
        <h2 className="text-lg sm:text-xl font-semibold truncate min-w-0">
          AI Assistant
        </h2>

        {/* Language Selector */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLanguageSelect(!showLanguageSelect)}
            className="flex items-center gap-2 w-full sm:w-auto"
            aria-label="Select story language"
          >
            <Languages className="h-4 w-4" />
            <span className="text-sm">{currentLanguage.native}</span>
          </Button>

          {showLanguageSelect && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-2">
                <p className="text-xs font-semibold text-slate-500 px-2 py-1">
                  Select Story Language
                </p>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange?.(lang.code);
                      setShowLanguageSelect(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition ${
                      lang.code === selectedLanguage
                        ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{lang.native}</span>
                      <span className="text-xs text-slate-500">
                        {lang.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selection Summary */}
      {totalSelected > 0 && (
        <div className="mb-4 space-y-2">
          <div className="mb-4 p-3 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium">
              📊 {selectedVizCount} visualization
              {selectedVizCount !== 1 ? "s" : ""}
              {selectedReportCount > 0 &&
                ` • 📄 ${selectedReportCount} report${
                  selectedReportCount !== 1 ? "s" : ""
                }`}{" "}
              selected
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Story will be generated in{" "}
              <strong>{currentLanguage.native}</strong>
            </p>
          </div>

          {onGenerateStory && (
            <Button
              onClick={() => onGenerateStory(selectedLanguage)}
              disabled={storyLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              {storyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating {currentLanguage.native} Story...
                </>
              ) : (
                <>
                  <Presentation className="h-4 w-4 mr-2" />
                  Generate Story in {currentLanguage.native}
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Report Selection */}
      {reports.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generated Reports
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => onToggleReportSelection(report.id)}
                className={`p-2 rounded-lg cursor-pointer transition-all ${
                  selectedReportIds.has(report.id)
                    ? "bg-blue-100 border-2 border-blue-500"
                    : "bg-slate-50 border-2 border-transparent hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center ${
                      selectedReportIds.has(report.id)
                        ? "bg-blue-600 border-blue-600"
                        : "border-slate-300"
                    }`}
                  >
                    {selectedReportIds.has(report.id) && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {report.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {report.content.substring(0, 50)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex flex-col h-[400px] sm:h-[500px] lg:h-[600px]">
        <ScrollArea
          horizontal
          className="flex-1 mb-4 p-3 sm:p-4 border rounded-lg overflow-x-auto"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-3 min-w-0 ${
                msg.role === "assistant"
                  ? "bg-muted/50 rounded-lg p-2 sm:p-3"
                  : "bg-primary/10 rounded-lg p-2 sm:p-3"
              }`}
            >
              <p className="text-xs sm:text-sm whitespace-pre-wrap break-normal max-w-full">
                {msg.content}
              </p>

              {msg.sqlData && <SQLResultDisplay sqlData={msg.sqlData} />}

              {/* Report Download Buttons */}
              {msg.html && (
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onDownloadReport(msg.html!, "pdf")}
                    disabled={downloadLoading}
                    className="w-full sm:w-auto"
                  >
                    {downloadLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3 mr-1" />
                    )}
                    {downloadLoading ? "Generating..." : "Download PDF"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadReport(msg.html!, "html")}
                    disabled={downloadLoading}
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download HTML
                  </Button>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="mb-3 bg-muted/30 rounded-lg p-2 sm:p-3 text-xs sm:text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isSQLSource ? "Querying database..." : "Analyzing your data..."}
            </div>
          )}
          <div ref={chatEndRef} />
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !loading && onSendMessage()}
            placeholder={
              isSQLSource
                ? "Ask a question about your database..."
                : "Ask about your data..."
            }
            disabled={loading}
            className="text-sm"
          />
          <Button
            onClick={onSendMessage}
            disabled={loading}
            size="icon"
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
