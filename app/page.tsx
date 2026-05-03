"use client";

import { useState, useCallback } from "react";
import { UploadCloud, File, AlertCircle, CheckCircle2, Download, TerminalSquare } from "lucide-react";

export default function Home() {
  const [binaryFile, setBinaryFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "dumping" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [logOutput, setLogOutput] = useState("");
  const [dumpCsContent, setDumpCsContent] = useState("");

  const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB to bypass Vercel 4.5MB limit

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "binary" | "metadata") => {
    if (e.target.files && e.target.files[0]) {
      if (type === "binary") setBinaryFile(e.target.files[0]);
      else setMetadataFile(e.target.files[0]);
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const uploadFileInChunks = async (file: File) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileName = `${Date.now()}_${file.name}`;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "x-file-name": fileName,
          "x-chunk-index": chunkIndex.toString(),
          "x-total-chunks": totalChunks.toString(),
          "Content-Type": "application/octet-stream",
        },
        body: chunk,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload chunk ${chunkIndex + 1} of ${file.name}`);
      }
    }
    return fileName;
  };

  const handleStartDump = async () => {
    if (!binaryFile || !metadataFile) return;

    try {
      setStatus("uploading");
      setProgress(10);
      setLogOutput("Uploading files in chunks...");

      // Upload binary
      const binaryName = await uploadFileInChunks(binaryFile);
      setProgress(40);
      setLogOutput((prev) => prev + "\nBinary uploaded successfully.");

      // Upload metadata
      const metadataName = await uploadFileInChunks(metadataFile);
      setProgress(70);
      setLogOutput((prev) => prev + "\nMetadata uploaded successfully.\nStarting dump process on server...");

      setStatus("dumping");

      // Trigger Dump
      const dumpRes = await fetch("/api/dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ binaryName, metadataName }),
      });

      const dumpData = await dumpRes.json();

      if (!dumpRes.ok) {
        throw new Error(dumpData.error || "Server error during dump");
      }

      setLogOutput((prev) => prev + "\n" + dumpData.log);
      setDumpCsContent(dumpData.dumpCs);
      setStatus("success");
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "An unexpected error occurred.");
    }
  };

  const downloadDumpCs = () => {
    const blob = new Blob([dumpCsContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dump.cs";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[80vh]">
      <div className="glass p-8 md:p-12 rounded-3xl w-full max-w-3xl flex flex-col items-center text-center glow border-white/10 relative overflow-hidden">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-4">
            Modcat Dumper
          </h1>
          <p className="text-gray-400 text-lg">
            Upload your il2cpp binary and global-metadata.dat to extract class structures.
          </p>
        </div>

        {/* Upload Zones */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Binary Upload */}
          <label className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${binaryFile ? 'border-indigo-500 bg-indigo-500/5' : 'border-gray-600 hover:border-indigo-400 hover:bg-white/5'}`}>
            <input type="file" className="hidden" onChange={(e) => handleFileChange(e, "binary")} disabled={status === "uploading" || status === "dumping"} />
            {binaryFile ? (
              <div className="flex flex-col items-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-indigo-400" />
                <span className="font-medium text-gray-200">{binaryFile.name}</span>
                <span className="text-sm text-gray-400">{(binaryFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2 text-gray-400">
                <UploadCloud className="w-10 h-10 mb-2" />
                <span className="font-medium text-gray-200">il2cpp Binary</span>
                <span className="text-sm">Click or Drag file here (.so)</span>
              </div>
            )}
          </label>

          {/* Metadata Upload */}
          <label className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${metadataFile ? 'border-purple-500 bg-purple-500/5' : 'border-gray-600 hover:border-purple-400 hover:bg-white/5'}`}>
            <input type="file" className="hidden" onChange={(e) => handleFileChange(e, "metadata")} disabled={status === "uploading" || status === "dumping"} />
            {metadataFile ? (
              <div className="flex flex-col items-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-purple-400" />
                <span className="font-medium text-gray-200">{metadataFile.name}</span>
                <span className="text-sm text-gray-400">{(metadataFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2 text-gray-400">
                <File className="w-10 h-10 mb-2" />
                <span className="font-medium text-gray-200">global-metadata.dat</span>
                <span className="text-sm">Click or Drag file here</span>
              </div>
            )}
          </label>
        </div>

        {/* Progress & Status */}
        {(status === "uploading" || status === "dumping") && (
          <div className="w-full mb-8">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>{status === "uploading" ? "Uploading chunks..." : "Dumping (this may take a few seconds)..."}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center space-x-3 mb-8">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-left">{errorMessage}</span>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="w-full mb-8 flex flex-col space-y-4">
            <button 
              onClick={downloadDumpCs}
              className="w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center space-x-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors border border-green-500/30"
            >
              <Download className="w-5 h-5" />
              <span>Download dump.cs</span>
            </button>
            
            {/* Terminal Log */}
            <div className="w-full bg-[#0a0a0c] border border-white/5 rounded-xl p-4 text-left font-mono text-sm text-gray-400 h-48 overflow-y-auto">
              <div className="flex items-center space-x-2 mb-2 text-gray-500 sticky top-0 bg-[#0a0a0c] py-1">
                <TerminalSquare className="w-4 h-4" />
                <span>Console Output</span>
              </div>
              <pre className="whitespace-pre-wrap">{logOutput}</pre>
            </div>
          </div>
        )}

        {/* Action Button */}
        {status !== "success" && (
          <button
            onClick={handleStartDump}
            disabled={!binaryFile || !metadataFile || status === "uploading" || status === "dumping"}
            className="w-full py-4 rounded-xl font-semibold text-lg transition-all
              bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25
              hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "uploading" ? "Uploading..." : status === "dumping" ? "Processing..." : "Start Dump"}
          </button>
        )}
      </div>
    </div>
  );
}
