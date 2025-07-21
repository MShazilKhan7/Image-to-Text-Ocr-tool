import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

interface Props {
  error?: string;
  status?: string;
}

const StatusMessages: React.FC<Props> = ({ error, status }) => {
  if (error)
    return (
      <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6 flex items-center gap-3 backdrop-blur-sm">
        <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
        <span className="text-red-200 font-medium">{error}</span>
      </div>
    );

  if (status === "success")
    return (
      <div className="bg-emerald-900/50 border border-emerald-700 rounded-xl p-4 mb-6 flex items-center gap-3 backdrop-blur-sm">
        <CheckCircle className="text-emerald-400 flex-shrink-0" size={20} />
        <span className="text-emerald-200 font-medium">
          Text extracted successfully!
        </span>
      </div>
    );

  return null;
};

export default StatusMessages;
