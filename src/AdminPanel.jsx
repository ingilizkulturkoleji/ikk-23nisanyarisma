<td className="p-3 border text-center">
  {row.fileUrl ? (
    <div className="flex items-center gap-3 justify-center">

      {/* Dosya türüne göre ikon */}
      {row.fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
        <span title="Görsel dosyası">🖼️</span>
      ) : row.fileUrl.match(/\.pdf$/i) ? (
        <span title="PDF dosyası">📄</span>
      ) : (
        <span title="Diğer dosya">📁</span>
      )}

      {/* Önizleme */}
      <a
        href={row.fileUrl}
        target="_blank"
        className="text-blue-600 underline"
      >
        Görüntüle
      </a>

      {/* İndir */}
      <a
        href={row.fileUrl}
        download
        className="text-green-600 underline"
      >
        İndir
      </a>

    </div>
  ) : (
    "—"
  )}
</td>
