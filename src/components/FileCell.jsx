import React from "react";

function extOf(name = "") {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function FileIcon({ filename }) {
  const ext = extOf(filename);
  const common = "inline-flex items-center justify-center w-9 h-9 rounded-lg border";

  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext))
    return <span className={`${common} bg-white`}>🖼️</span>;
  if (ext === "pdf") return <span className={`${common} bg-white`}>📄</span>;
  if (["doc", "docx"].includes(ext)) return <span className={`${common} bg-white`}>📝</span>;
  if (["mp4", "mov", "avi"].includes(ext)) return <span className={`${common} bg-white`}>🎬</span>;
  return <span className={`${common} bg-white`}>📎</span>;
}

export default function FileCell({ fileName, downloadUrl }) {
  if (!downloadUrl) return <span className="text-slate-400">—</span>;

  return (
    <div className="flex items-center gap-3">
      <FileIcon filename={fileName} />
      <div className="min-w-0">
        <div className="text-sm font-medium truncate max-w-[240px]">{fileName}</div>
        <a
          className="text-sm text-blue-600 hover:underline"
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          download
        >
          İndir
        </a>
      </div>
    </div>
  );
}
