import React from "react";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";

type ErrorModalProps = {
  show: boolean;
  onClose: () => void;
  message: string;
};

export default function ErrorModal({
  show,
  onClose,
  message,
}: ErrorModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center text-card-foreground shadow-lg">
        <ExclamationCircleIcon className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="text-lg font-semibold">{message}</h2>
        <button
          onClick={onClose}
          className="mt-4 inline-flex h-10 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          OK
        </button>
      </div>
    </div>
  );
}
