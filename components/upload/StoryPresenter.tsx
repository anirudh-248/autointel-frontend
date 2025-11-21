import React, { useState, useEffect, useRef, useCallback } from "react";
import PlotlyRenderer from "../PlotlyRenderer";

interface Slide {
  title: string;
  content: string[];
  speakerNotes: string;
  visualizationId: string | null;
  reportId: string | null;
  audioData: string | null;
  slideNumber: number;
  type?: string;
}

interface Visualization {
  id: string;
  title: string;
  description?: string;
  plotlyData: any[];
  plotlyLayout?: any;
}

interface StoryPresenterProps {
  presentationTitle: string;
  presentationSubtitle: string;
  slides: Slide[];
  pptxData: string;
  visualizations: Visualization[];
  onClose: () => void;
}

const StoryPresenter: React.FC<StoryPresenterProps> = ({
  presentationTitle,
  presentationSubtitle,
  slides,
  pptxData,
  visualizations,
  onClose,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentSlideData = slides[currentSlide] || slides[0];
  const totalSlides = slides.length;

  // Load audio when slide changes
  useEffect(() => {
    if (currentSlideData?.audioData && audioRef.current) {
      const audioBlob = base64ToBlob(currentSlideData.audioData, "audio/mpeg");
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      audioRef.current.load();

      return () => URL.revokeObjectURL(audioUrl);
    } else if (currentSlideData?.speakerNotes && !currentSlideData?.audioData) {
      // Use browser TTS as fallback
      if ("speechSynthesis" in window) {
        speechRef.current = new SpeechSynthesisUtterance(
          currentSlideData.speakerNotes
        );
        speechRef.current.rate = 0.9;
        speechRef.current.pitch = 1.0;
      }
    }
  }, [currentSlide, currentSlideData]);

  // Handle playback
  useEffect(() => {
    if (currentSlideData?.audioData && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => {
          console.error("Audio playback failed:", e);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    } else if (isPlaying && speechRef.current && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(speechRef.current);
    } else if (!isPlaying && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [isPlaying, currentSlideData]);

  // Audio progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      setAudioProgress(isNaN(progress) ? 0 : progress);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(0);

      if (autoPlay && currentSlide < totalSlides - 1) {
        setTimeout(() => nextSlide(), 1000);
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [autoPlay, currentSlide, totalSlides]);

  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
      setIsPlaying(false);
      setAudioProgress(0);

      if (autoPlay) {
        setTimeout(() => setIsPlaying(true), 500);
      }
    } else if (autoPlay) {
      setAutoPlay(false);
      setIsPlaying(false);
    }
  }, [currentSlide, totalSlides, autoPlay]);

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      setIsPlaying(false);
      setAudioProgress(0);
    }
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const toggleAutoPlay = () => {
    const newAutoPlay = !autoPlay;
    setAutoPlay(newAutoPlay);
    if (newAutoPlay && !isPlaying) setIsPlaying(true);
  };

  const startPresentation = () => {
    setShowWelcome(false);
    setCurrentSlide(0);
    setAutoPlay(true);
    setIsPlaying(true);
    if (!isFullscreen) toggleFullscreen();
  };

  const skipWelcome = () => setShowWelcome(false);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const downloadPresentation = () => {
    const blob = base64ToBlob(
      pptxData,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${presentationTitle.replace(/\s+/g, "_")}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const currentViz = currentSlideData?.visualizationId
    ? visualizations.find((v) => v.id === currentSlideData.visualizationId)
    : null;

  // Debug logging
  useEffect(() => {
    if (currentSlideData?.visualizationId) {
      console.log("Looking for viz ID:", currentSlideData.visualizationId);
      console.log(
        "Available visualizations:",
        visualizations.map((v) => ({ id: v.id, title: v.title }))
      );
      console.log(
        "Found currentViz:",
        currentViz ? currentViz.title : "NOT FOUND"
      );
    }
  }, [currentSlide, currentSlideData, visualizations, currentViz]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-40 bg-white dark:bg-black ${
        isFullscreen ? "p-0" : ""
      }`}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-in { animation: slideIn 0.8s ease-out forwards; }
        
        /* Perfect 16:9 slide container */
        .slide-container {
          width: min(calc(100vh * 1.6), calc(100vw - 4rem));
          height: min(calc(100vh - 200px), calc((100vw - 4rem) * 0.5625));
          margin: 0 auto;
        }
      `}</style>

      <div className="h-full flex flex-col bg-white dark:bg-black">
        {/* Header - matching upload page style */}
        <div className="flex items-center justify-between px-4 md:px-16 py-4 border-b border-2 bg-white dark:bg-black">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition "
              aria-label="Close presentation"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-bold ">{presentationTitle}</h2>
              <p className="text-sm ">{presentationSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium">
              {currentSlide + 1} / {totalSlides}
            </span>
            {autoPlay && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                Auto-Playing
              </span>
            )}
            <button
              onClick={startPresentation}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Play Story
            </button>
            <button
              onClick={downloadPresentation}
              className="px-4 py-2 bg-white dark:bg-black hover:bg-slate-50  border border-slate-300 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download PPTX
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-slate-100 rounded-lg transition "
              aria-label="Toggle fullscreen"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900 overflow-hidden">
          {showWelcome ? (
            <div className="slide-container">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl shadow-2xl flex items-center justify-center p-8 overflow-hidden">
                <div className="w-full max-w-3xl mx-auto space-y-4 animate-fade-in text-center text-white">
                  <div className="text-5xl mb-3">🎬</div>
                  <h1 className="text-3xl lg:text-4xl font-bold mb-2 px-4">
                    {presentationTitle}
                  </h1>
                  <p className="text-lg lg:text-xl text-blue-100 mb-6 px-4">
                    {presentationSubtitle}
                  </p>
                  <div className="space-y-3">
                    <p className="text-sm text-blue-100">
                      {totalSlides} slides • AI-Narrated • Interactive
                    </p>
                    <div className="flex gap-3 justify-center mt-6">
                      <button
                        onClick={startPresentation}
                        className="bg-white text-blue-600 hover:bg-gray-100 text-base px-6 py-3 rounded-lg font-bold transition flex items-center gap-2 shadow-lg"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                        </svg>
                        Play Story
                      </button>
                      <button
                        onClick={skipWelcome}
                        className="border-2 border-white text-white hover:bg-white/10 text-base px-6 py-3 rounded-lg font-bold transition"
                      >
                        Browse Slides
                      </button>
                    </div>
                  </div>
                  <div className="mt-6 space-y-1 text-xs text-blue-100">
                    <p>
                      🎙️ AI Narration • 📊 Interactive Charts • ⏯️ Full Controls
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="slide-container">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-slate-300 dark:border-slate-700 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-hidden p-6 lg:p-8">
                  <h1 className="text-xl lg:text-2xl font-bold mb-4 pb-2 border-b-2 border-blue-600 animate-fade-in">
                    {currentSlideData?.title || "Loading..."}
                  </h1>

                  {/* Two-column layout when visualization exists */}
                  {currentSlideData?.visualizationId && currentViz ? (
                    <div className="grid grid-cols-2 gap-4 h-[calc(100%-5rem)] mb-3">
                      {/* Left side: Content/Explanation */}
                      <div className="space-y-2 overflow-y-auto pr-2 animate-slide-in">
                        {currentSlideData?.content?.map(
                          (item: string, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 animate-fade-in"
                              style={{ animationDelay: `${idx * 0.1}s` }}
                            >
                              <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                              <p className="text-sm leading-relaxed">{item}</p>
                            </div>
                          )
                        )}
                      </div>

                      {/* Right side: Visualization */}
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3 animate-fade-in overflow-hidden flex flex-col">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex-shrink-0">
                          📊 {currentViz.title}
                        </h3>
                        <div className="flex-1 bg-white dark:bg-slate-950 rounded p-2 border border-slate-200 dark:border-slate-700 overflow-hidden">
                          {currentViz.plotlyData &&
                          currentViz.plotlyData.length > 0 ? (
                            <PlotlyRenderer
                              data={currentViz.plotlyData}
                              layout={{
                                ...currentViz.plotlyLayout,
                                autosize: true,
                                margin: { l: 30, r: 20, t: 20, b: 30 },
                                paper_bgcolor: "rgba(0,0,0,0)",
                                plot_bgcolor: "rgba(0,0,0,0)",
                                font: { size: 9 },
                              }}
                              config={{
                                responsive: true,
                                displayModeBar: false,
                                displaylogo: false,
                              }}
                            />
                          ) : (
                            <div className="text-center py-4 text-slate-500">
                              <p className="text-xs">
                                Visualization data not available
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Single column layout when no visualization */
                    <div className="space-y-3 mb-3 h-[calc(100%-5rem)] overflow-y-auto pr-2 animate-slide-in">
                      {currentSlideData?.content?.map(
                        (item: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 animate-fade-in"
                            style={{ animationDelay: `${idx * 0.1}s` }}
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                            <p className="text-base leading-relaxed">{item}</p>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Error state for missing visualization */}
                  {currentSlideData?.visualizationId && !currentViz && (
                    <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                      <div className="text-center py-3">
                        <div className="text-yellow-600 dark:text-yellow-400 mb-1 text-xs">
                          ⚠️ Visualization not found
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          ID: {currentSlideData.visualizationId}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Speaker Notes */}
                  <div className="mt-auto p-3 rounded border-l-2 border border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 animate-fade-in">
                    <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                      📝 Speaker Notes
                    </p>
                    <p className="text-xs leading-relaxed line-clamp-2">
                      {currentSlideData?.speakerNotes || "No notes available"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls - matching upload page style */}
        <div className="border-t border-2 bg-white dark:bg-black p-4 space-y-4">
          {currentSlideData?.audioData && (
            <div className="max-w-4xl mx-auto">
              <div className="h-2 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition "
              aria-label="Previous slide"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {currentSlideData?.speakerNotes && (
              <>
                <button
                  onClick={togglePlay}
                  className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-white shadow-sm"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 9v6m4-6v6"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition "
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                  )}
                </button>

                <button
                  onClick={toggleAutoPlay}
                  className={`px-4 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
                    autoPlay
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 "
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                  {autoPlay ? "Auto-Play ON" : "Auto-Play OFF"}
                </button>
              </>
            )}

            <button
              onClick={nextSlide}
              disabled={currentSlide === totalSlides - 1}
              className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition "
              aria-label="Next slide"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div className="flex justify-center gap-2">
            {slides.map((_, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentSlide(idx);
                  setIsPlaying(false);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide
                    ? "w-8 bg-blue-600"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
};

export default StoryPresenter;
