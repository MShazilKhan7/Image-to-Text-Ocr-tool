export interface CaptureState {
  status: "idle" | "capturing" | "processing" | "success" | "error";
  extractedText: string;
  error: string;
}

export interface SelectionArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
    