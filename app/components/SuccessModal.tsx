import React from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

type SuccessModalProps = {
  show: boolean;
  message: string;
};

export default function SuccessModal({ show, message }: SuccessModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center text-card-foreground shadow-lg">
        <CheckCircleIcon className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="text-lg font-semibold">{message}</h2>
      </div>
    </div>
  );
}
