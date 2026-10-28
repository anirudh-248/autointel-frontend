"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import ErrorModal from "./ErrorModal";
import SuccessModal from "./SuccessModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ForgotPasswordProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPassword({
  isOpen,
  onClose,
}: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/forgot-password/${email}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const data = await response.json();

      if (data.success) {
        localStorage.setItem("reset_email", email);
        setSuccessMessage("OTP sent successfully! Please check your email.");
        setIsSuccessModalOpen(true);
        onClose();
        setTimeout(() => {
          window.location.href = `/reset-password?sessionId=${data.data.session_id}`;
        }, 2000);
      } else {
        onClose();
        setErrorMessage(data.detail || "Failed to send OTP.");
        setIsErrorModalOpen(true);
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      onClose();
      setErrorMessage("Failed to send OTP. Please try again later.");
      setIsErrorModalOpen(true);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-10">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg border border-border bg-card text-left text-card-foreground shadow-lg transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <form onSubmit={handleSubmit}>
                <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:grid sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:items-start sm:gap-4">
                    <div className="mx-auto flex size-12 shrink-0 items-center justify-center sm:mx-0 sm:size-10">
                      <ArrowPathIcon
                        aria-hidden="true"
                        className="size-6 text-primary"
                      />
                    </div>
                    <div className="mt-3 min-w-0 text-center sm:mt-0 sm:text-left">
                      <DialogTitle
                        as="h3"
                        className="text-xl font-semibold tracking-tight"
                      >
                        Reset Your Password
                      </DialogTitle>
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          Enter your email address below and we&apos;ll send
                          you an OTP to reset your password.
                        </p>
                        <div className="mt-4">
                          <label htmlFor="email-reset" className="sr-only">
                            Email address
                          </label>
                          <Input
                            id="email-reset"
                            name="email-reset"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="johndoe@gmail.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/50 px-4 py-3 sm:flex-row-reverse sm:px-6">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                  >
                    Send OTP
                  </Button>
                  <Button
                    type="button"
                    data-autofocus
                    onClick={onClose}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Error Modal */}
      <ErrorModal
        show={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        message={errorMessage}
      />

      {/* Success Modal */}
      <SuccessModal
        show={isSuccessModalOpen}
        message={successMessage}
      />
    </>
  );
}
