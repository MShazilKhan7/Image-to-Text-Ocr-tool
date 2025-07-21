import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import Tesseract from "tesseract.js";
import ControlPanel from "./ControlPanel";
import StatusMessages from "./StatusMessages";
import ImageViewer from "./ImageViewer";
import ExtractedTextBox from "./ExtractedTextBox";
import { CaptureState, SelectionArea } from "../types/types";
import { getImageTitle } from "../utils/utils";

const ScreenCapture: React.FC = () => {
  const [captureState, setCaptureState] = useState<CaptureState>({
    status: "idle",
    extractedText: "",
    error: "",
  });
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<SelectionArea | null>(null);
  const [imageSource, setImageSource] = useState<"capture" | "paste" | "upload">("capture");
  const imageRef = useRef<HTMLImageElement>(null);

  // Screen capture logic
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
          setCaptureState({ status: "idle", extractedText: "", error: "" });
        }

        stream.getTracks().forEach((track) => track.stop());
      });
    } catch {
      setCaptureState({
        status: "error",
        extractedText: "",
        error: "Failed to capture screen. Please ensure you grant permission.",
      });
    }
  }, []);

  // Handle paste
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    e.preventDefault();
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setCapturedImage(event.target?.result as string);
            setSelection(null);
            setImageSource("paste");
            setCaptureState({ status: "idle", extractedText: "", error: "" });
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // File upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        setSelection(null);
        setImageSource("upload");
        setCaptureState({ status: "idle", extractedText: "", error: "" });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Selection handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (!imageRef.current) return;

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

      const rect = imageRef.current.getBoundingClientRect();
      const scaleX = imageRef.current.naturalWidth / rect.width;
      const scaleY = imageRef.current.naturalHeight / rect.height;

      const endX = (e.clientX - rect.left) * scaleX;
      const endY = (e.clientY - rect.top) * scaleY;

      setSelection((prev) => prev && { ...prev, endX, endY });
    },
    [isSelecting, selection]
  );

  const handleMouseUp = useCallback(() => setIsSelecting(false), []);
  const handleMouseLeave = useCallback(() => setIsSelecting(false), []);
  const clearSelection = useCallback(() => setSelection(null), []);
  const clearAll = useCallback(() => {
    setCapturedImage("");
    setSelection(null);
    setCaptureState({ status: "idle", extractedText: "", error: "" });
    setImageSource("capture");
  }, []);

  // OCR Processing
  const extractText = useCallback(async () => {
    if (!capturedImage) return;

    setCaptureState({ status: "processing", extractedText: "", error: "" });

    let imageToProcess = capturedImage;

    if (selection) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const { startX, startY, endX, endY } = selection;
          const width = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);
          const x = Math.min(startX, endX);
          const y = Math.min(startY, endY);

          if (width < 10 || height < 10) {
            setCaptureState({
              status: "error",
              extractedText: "",
              error: `Selected area is too small (${Math.round(width)}px × ${Math.round(height)}px).`,
            });
            reject();
            return;
          }

          canvas.width = width;
          canvas.height = height;

          if (ctx) {
            ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
            imageToProcess = canvas.toDataURL("image/png");
          }
          resolve();
        };

        img.onerror = () => reject();
        img.src = capturedImage;
      });
    }

    try {
      const { data } = await Tesseract.recognize(imageToProcess, "eng");
      setCaptureState({ status: "success", extractedText: data.text.trim(), error: "" });
    } catch {
      setCaptureState({
        status: "error",
        extractedText: "",
        error: "OCR failed. Try with a clearer image.",
      });
    }
  }, [capturedImage, selection]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(captureState.extractedText);
      const btn = document.querySelector("[data-copy-button]") as HTMLElement;
      if (btn) {
        btn.style.background = "#059669";
        setTimeout(() => (btn.style.background = ""), 1000);
      }
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  }, [captureState.extractedText]);

  // Selection box style
  const getSelectionStyle = useCallback((): React.CSSProperties => {
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
  }, [selection]);

  const canExtract = useMemo(() => !!capturedImage, [capturedImage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-purple-400 mb-4">OCR Snipping Tool</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Capture screen areas, paste images, or upload files to extract text using advanced OCR
            technology
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <ControlPanel
            status={captureState.status}
            startScreenCapture={startScreenCapture}
            handleFileUpload={handleFileUpload}
            extractText={extractText}
            clearSelection={clearSelection}
            clearAll={clearAll}
            hasImage={!!capturedImage}
            hasSelection={!!selection}
            canExtract={canExtract}
          />

          <StatusMessages error={captureState.error} status={captureState.status} />

          {capturedImage && (
            <ImageViewer
              imageRef={imageRef}
              capturedImage={capturedImage}
              imageSource={imageSource}
              selection={selection}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              getSelectionStyle={getSelectionStyle}
            />
          )}

          {captureState.extractedText && (
            <ExtractedTextBox text={captureState.extractedText} copyToClipboard={copyToClipboard} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreenCapture;
