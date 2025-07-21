import React from "react";
import { SelectionArea } from "../types/types";
import { getImageTitle } from "../utils/utils";

interface Props {
  imageRef: React.RefObject<HTMLImageElement>;
  capturedImage: string;
  selection: SelectionArea | null;
  imageSource: "capture" | "paste" | "upload";
  onMouseDown: React.MouseEventHandler<HTMLImageElement>;
  onMouseMove: React.MouseEventHandler<HTMLImageElement>;
  onMouseUp: React.MouseEventHandler<HTMLImageElement>;
  onMouseLeave: React.MouseEventHandler<HTMLImageElement>;
  getSelectionStyle: () => React.CSSProperties;
}

const ImageViewer: React.FC<Props> = ({
  imageRef,
  capturedImage,
  selection,
  imageSource,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  getSelectionStyle,
}) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6 shadow-xl">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-semibold text-slate-200">
        {getImageTitle(imageSource)}
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
        alt="Selected"
        className="max-w-full h-auto rounded-lg border border-slate-600 cursor-crosshair shadow-lg"
        style={{ userSelect: "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        draggable={false}
      />
      {selection && <div style={getSelectionStyle()} />}
    </div>
    <p className="text-slate-400 text-sm mt-4 bg-slate-700/30 p-3 rounded-lg border border-slate-600">
      💡 <strong>Tip:</strong> Click and drag to select a specific text area, or
      use "Extract Text from Complete Image" to process the entire image.
    </p>
  </div>
);

export default ImageViewer;
