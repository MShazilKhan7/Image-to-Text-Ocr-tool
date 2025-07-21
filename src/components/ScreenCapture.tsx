import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Copy,
  Download,
  AlertCircle,
  CheckCircle,
  Loader,
  Upload,
  X,
  Scissors,
} from "lucide-react";
import Tesseract from "tesseract.js";

interface CaptureState {
  status: "idle" | "capturing" | "processing" | "success" | "error";
  extractedText: string;
  error: string;
}

interface SelectionArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const ScreenCapture: React.FC = () => {
  const [captureState, setCaptureState] = useState<CaptureState>({
    status: "idle",
    extractedText: "",
    error: "",
  });
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<SelectionArea | null>(null);
  const [imageSource, setImageSource] = useState<
    "capture" | "paste" | "upload"
  >("capture");
  const imageRef = useRef<HTMLImageElement>(null);

  const startScreenCapture = useCallback(async () => {
    try {
      setCaptureState((prev) => ({ ...prev, status: "capturing", error: "" }));
      setSelection(null);
      setImageSource("capture");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      video.addEventListener("loadedmetadata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const imageDataUrl = canvas.toDataURL("image/png");
          setCapturedImage(imageDataUrl);
          setCaptureState((prev) => ({
            ...prev,
            status: "idle",
            extractedText: "",
            error: "",
          }));
        }

        stream.getTracks().forEach((track) => track.stop());
      });
    } catch (error) {
      setCaptureState((prev) => ({
        ...prev,
        status: "error",
        error: "Failed to capture screen. Please ensure you grant permission.",
      }));
    }
  }, []);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    e.preventDefault();

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageDataUrl = event.target?.result as string;
            setCapturedImage(imageDataUrl);
            setSelection(null);
            setImageSource("paste");
            setCaptureState((prev) => ({
              ...prev,
              status: "idle",
              extractedText: "",
              error: "",
            }));
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageDataUrl = event.target?.result as string;
          setCapturedImage(imageDataUrl);
          setSelection(null);
          setImageSource("upload");
          setCaptureState((prev) => ({
            ...prev,
            status: "idle",
            extractedText: "",
            error: "",
          }));
        };
        reader.readAsDataURL(file);
      }
    },
    []
  );

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      handlePaste(e);
    };

    document.addEventListener("paste", handleGlobalPaste);
    return () => {
      document.removeEventListener("paste", handleGlobalPaste);
    };
  }, [handlePaste]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (!imageRef.current) return;

      e.preventDefault();
      const rect = imageRef.current.getBoundingClientRect();
      const scaleX = imageRef.current.naturalWidth / rect.width;
      const scaleY = imageRef.current.naturalHeight / rect.height;

      const startX = (e.clientX - rect.left) * scaleX;
      const startY = (e.clientY - rect.top) * scaleY;

      setSelection({ startX, startY, endX: startX, endY: startY });
      setIsSelecting(true);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (!isSelecting || !selection || !imageRef.current) return;

      e.preventDefault();
      const rect = imageRef.current.getBoundingClientRect();
      const scaleX = imageRef.current.naturalWidth / rect.width;
      const scaleY = imageRef.current.naturalHeight / rect.height;

      const endX = (e.clientX - rect.left) * scaleX;
      const endY = (e.clientY - rect.top) * scaleY;

      setSelection((prev) => (prev ? { ...prev, endX, endY } : null));
    },
    [isSelecting, selection]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setIsSelecting(false);
  }, []);

  const clearAll = useCallback(() => {
    setCapturedImage("");
    setSelection(null);
    setIsSelecting(false);
    setCaptureState({
      status: "idle",
      extractedText: "",
      error: "",
    });
    setImageSource("capture");
  }, []);

  const extractText = useCallback(async () => {
    if (!capturedImage) return;

    setCaptureState((prev) => ({
      ...prev,
      status: "processing",
      extractedText: "",
      error: "",
    }));

    try {
      let imageToProcess = capturedImage;

      if (selection) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        await new Promise((resolve, reject) => {
          img.onload = () => {
            const { startX, startY, endX, endY } = selection;
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            const x = Math.min(startX, endX);
            const y = Math.min(startY, endY);

            if (width < 10 || height < 10) {
              setCaptureState((prev) => ({
                ...prev,
                status: "error",
                error: `Selected area is too small (${Math.round(
                  width
                )}px × ${Math.round(
                  height
                )}px). Please select an area at least 10×10 pixels.`,
              }));
              reject(new Error("Selection too small"));
              return;
            }

            canvas.width = width;
            canvas.height = height;

            if (ctx) {
              ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
              imageToProcess = canvas.toDataURL("image/png");
            }
            resolve(void 0);
          };

          img.onerror = () => {
            setCaptureState((prev) => ({
              ...prev,
              status: "error",
              error: "Failed to load the captured image. Please try again.",
            }));
            reject(new Error("Image load failed"));
          };

          img.src = capturedImage;
        });
      }

      try {
        const {
          data: { text },
        } = await Tesseract.recognize(imageToProcess, "eng", {
          logger: (m) => console.log(m),
        });

        setCaptureState((prev) => ({
          ...prev,
          status: "success",
          extractedText: text.trim(),
        }));
      } catch (ocrError) {
        setCaptureState((prev) => ({
          ...prev,
          status: "error",
          error:
            "Failed to extract text from the image. Please try with a different image or area.",
        }));
      }
    } catch (error) {
      setCaptureState((prev) => ({
        ...prev,
        status: "error",
        error: "Failed to process the image.",
      }));
    }
  }, [capturedImage, selection]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(captureState.extractedText);
      const button = document.querySelector(
        "[data-copy-button]"
      ) as HTMLElement;
      if (button) {
        button.style.background = "#059669";
        setTimeout(() => {
          button.style.background = "";
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  }, [captureState.extractedText]);

  const getImageTitle = () => {
    switch (imageSource) {
      case "paste":
        return "Pasted Image";
      case "upload":
        return "Uploaded Image";
      default:
        return "Screen Capture";
    }
  };

  const getExtractButtonText = () => {
    if (selection) {
      return (
        <>
          <Scissors size={18} />
          Extract Text from Selection
        </>
      );
    }

    return (
      <>
        <Download size={18} />
        Extract Text from Complete Image
      </>
    );
  };

  const canExtractText = () => {
    return !!capturedImage;
  };

  const getSelectionStyle = (): React.CSSProperties => {
    if (!selection || !imageRef.current) return {};

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = rect.width / imageRef.current.naturalWidth;
    const scaleY = rect.height / imageRef.current.naturalHeight;

    const { startX, startY, endX, endY } = selection;
    const left = Math.min(startX, endX) * scaleX;
    const top = Math.min(startY, endY) * scaleY;
    const width = Math.abs(endX - startX) * scaleX;
    const height = Math.abs(endY - startY) * scaleY;

    return {
      position: "absolute",
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      border: "2px solid #3B82F6",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      pointerEvents: "none",
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r text-purple-400 to-emerald-400 bg-clip-text text-transparent mb-4">
            OCR Snipping Tool
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Capture screen areas, paste images, or upload files to extract text
            using advanced OCR technology
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Control Panel */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6 shadow-xl">
            <div className="flex flex-wrap gap-4 items-center justify-center">
              <button
                onClick={startScreenCapture}
                disabled={captureState.status === "capturing"}
                className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 
                         disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-all duration-200 
                         font-medium shadow-lg hover:shadow-blue-500/25 hover:scale-105"
              >
                {captureState.status === "capturing" ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera size={20} />
                    Capture Screen
                  </>
                )}
              </button>

              <label
                className="flex items-center gap-3 bg-purple-600 hover:bg-purple-700 
                               px-6 py-3 rounded-lg transition-all duration-200 cursor-pointer 
                               font-medium shadow-lg hover:shadow-purple-500/25 hover:scale-105"
              >
                <Upload size={20} />
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {capturedImage && (
                <button
                  onClick={extractText}
                  disabled={
                    !canExtractText() || captureState.status === "processing"
                  }
                  className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 
                           disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-all duration-200 
                           font-medium shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
                >
                  {captureState.status === "processing" ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    getExtractButtonText()
                  )}
                </button>
              )}

              {selection && (
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 
                           px-4 py-2 rounded-lg transition-all duration-200 font-medium 
                           shadow-lg hover:shadow-amber-500/25"
                >
                  <X size={16} />
                  Clear Selection
                </button>
              )}

              {capturedImage && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 
                           px-4 py-2 rounded-lg transition-all duration-200 font-medium 
                           shadow-lg hover:shadow-red-500/25"
                >
                  <X size={16} />
                  Clear All
                </button>
              )}
              <div className="flex items-center gap-2 text-slate-400 bg-slate-700/50 px-4 py-3 rounded-lg border border-slate-600">
                <Copy size={18} />
                <span className="text-sm font-medium">
                  Or paste image (Ctrl+V)
                </span>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {captureState.error && (
            <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6 flex items-center gap-3 backdrop-blur-sm">
              <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
              <span className="text-red-200 font-medium">
                {captureState.error}
              </span>
            </div>
          )}

          {captureState.status === "success" && (
            <div className="bg-emerald-900/50 border border-emerald-700 rounded-xl p-4 mb-6 flex items-center gap-3 backdrop-blur-sm">
              <CheckCircle
                className="text-emerald-400 flex-shrink-0"
                size={20}
              />
              <span className="text-emerald-200 font-medium">
                Text extracted successfully!
              </span>
            </div>
          )}

          {/* Image Display */}
          {capturedImage && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-200">
                  {getImageTitle()}
                </h3>
                {selection && (
                  <div className="text-sm text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-700">
                    Selection Active
                  </div>
                )}
              </div>
              <div className="relative inline-block">
                <img
                  ref={imageRef}
                  src={capturedImage}
                  alt={getImageTitle()}
                  className="max-w-full h-auto rounded-lg border border-slate-600 cursor-crosshair shadow-lg"
                  style={{ userSelect: "none" }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  draggable={false}
                />
                {selection && <div style={getSelectionStyle()} />}
              </div>
              <p className="text-slate-400 text-sm mt-4 bg-slate-700/30 p-3 rounded-lg border border-slate-600">
                💡 <strong>Tip:</strong> Click and drag to select a specific
                text area, or use "Extract Text from Complete Image" to process
                the entire image
              </p>
            </div>
          )}

          {/* Extracted Text */}
          {captureState.extractedText && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-200">
                  Extracted Text
                </h3>
                <button
                  data-copy-button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 
                           px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium 
                           shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                >
                  <Copy size={16} />
                  Copy to Clipboard
                </button>
              </div>
              <div className="bg-slate-900/50 rounded-lg border border-slate-600 p-4 min-h-[120px] max-h-[400px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-slate-200 font-mono text-sm leading-relaxed">
                  {captureState.extractedText}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreenCapture;
