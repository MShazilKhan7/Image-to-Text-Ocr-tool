import React from "react";
import {
  Camera,
  Copy,
  Upload,
  Loader,
  Scissors,
  Download,
  X,
} from "lucide-react";

interface Props {
  status: string;
  startScreenCapture: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  extractText: () => void;
  clearSelection: () => void;
  clearAll: () => void;
  hasImage: boolean;
  hasSelection: boolean;
  canExtract: boolean;
}

const ControlPanel: React.FC<Props> = ({
  status,
  startScreenCapture,
  handleFileUpload,
  extractText,
  clearSelection,
  clearAll,
  hasImage,
  hasSelection,
  canExtract,
}) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6 shadow-xl">
      <div className="flex flex-wrap gap-4 items-center justify-center">
        <button
          onClick={startScreenCapture}
          disabled={status === "capturing"}
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 
          disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-all duration-200 
          font-medium shadow-lg hover:shadow-blue-500/25 hover:scale-105"
        >
          {status === "capturing" ? (
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

        {hasImage && (
          <button
            onClick={extractText}
            disabled={!canExtract || status === "processing"}
            className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 
            disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-all duration-200 
            font-medium shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
          >
            {status === "processing" ? (
              <>
                <Loader className="animate-spin" size={18} />
                Processing...
              </>
            ) : hasSelection ? (
              <>
                <Scissors size={18} />
                Extract Text from Selection
              </>
            ) : (
              <>
                <Download size={18} />
                Extract Text from Complete Image
              </>
            )}
          </button>
        )}

        {hasSelection && (
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

        {hasImage && (
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
          <span className="text-sm font-medium">Or paste image (Ctrl+V)</span>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
