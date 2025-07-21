import React from "react";
import { Copy } from "lucide-react";

interface Props {
  text: string;
  copyToClipboard: () => void;
}

const ExtractedTextBox: React.FC<Props> = ({ text, copyToClipboard }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-semibold text-slate-200">Extracted Text</h3>
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
        {text}
      </pre>
    </div>
  </div>
);

export default ExtractedTextBox;
