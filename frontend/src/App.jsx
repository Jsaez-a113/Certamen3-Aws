// ============================================================
// ArchivaCloud P-12 — Gestor Documental con Amazon S3
// Archivo único: App.jsx
// Stack: React 19 + Vite + axios (sin librerías de UI externas)
// Formatos: DOCX, ODT, RTF — Máximo 14 MB
// ============================================================

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";

// ============================================================
// CONSTANTES GLOBALES
// ============================================================

const API = "http://localhost:8000";

// MIME types permitidos para las extensiones válidas (SEC-03)
const MIME_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
};

// Extensiones permitidas — usadas en validación frontend (SEC-03)
const ALLOWED_EXTENSIONS = ["docx", "odt", "rtf"];

// Límite de tamaño: 14 MB en bytes (SEC-04)
const MAX_FILE_SIZE = 14 * 1024 * 1024;

// Configuración de reintentos automáticos para la subida
const MAX_UPLOAD_RETRIES = 2;

// Duración del toast antes de desaparecer (ms)
const TOAST_DURATION = 4500;

// Delay del debounce para el input de renombrar (ms)
const DEBOUNCE_DELAY = 300;

// ============================================================
// PALETA DE COLORES — TEMA OSCURO PROFESIONAL
// ============================================================

const C = {
  // Fondos
  bg: "#0b0e14",
  bgCard: "#131720",
  bgSurface: "#1a1f2e",
  bgHover: "#1e2538",
  bgInput: "#0f1219",

  // Bordes
  border: "#232a3b",
  borderFocus: "#4a6cf7",
  borderDrag: "#4a6cf7",

  // Textos
  text: "#e2e8f0",
  textSoft: "#8892a8",
  textMuted: "#5a6478",

  // Acentos
  accent: "#4a6cf7",
  accentHover: "#5b7dff",
  accentGlow: "rgba(74, 108, 247, 0.15)",
  accentGlowStrong: "rgba(74, 108, 247, 0.3)",

  // Estados
  success: "#22c55e",
  successBg: "rgba(34, 197, 94, 0.1)",
  successBorder: "rgba(34, 197, 94, 0.3)",
  danger: "#ef4444",
  dangerBg: "rgba(239, 68, 68, 0.1)",
  dangerBorder: "rgba(239, 68, 68, 0.3)",
  dangerHover: "#dc2626",
  warning: "#f59e0b",
  warningBg: "rgba(245, 158, 11, 0.1)",
  warningBorder: "rgba(245, 158, 11, 0.3)",

  // Colores por tipo de archivo
  docxColor: "#2b5797",
  odtColor: "#00a651",
  rtfColor: "#7c3aed",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.6)",
};

// ============================================================
// INYECCIÓN DE ANIMACIONES CSS (keyframes)
// No es posible hacer keyframes con inline styles,
// así que los inyectamos una vez al montar la app.
// ============================================================

const CSS_ANIMATIONS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  @keyframes acSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes acSlideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-12px); }
  }
  @keyframes acFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes acFadeInUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes acPulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 0.8; }
  }
  @keyframes acShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes acSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes acProgressStripe {
    0%   { background-position: 0 0; }
    100% { background-position: 40px 0; }
  }
  @keyframes acScaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes acDropBounce {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  @keyframes acGlow {
    0%, 100% { box-shadow: 0 0 15px rgba(74, 108, 247, 0.15); }
    50%      { box-shadow: 0 0 25px rgba(74, 108, 247, 0.3); }
  }
`;

// ============================================================
// HOOK: useDebounce — retrasa la actualización de un valor
// Uso: evitar llamadas excesivas al cambiar el nombre
// ============================================================

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ============================================================
// HOOK: useToast — sistema de notificaciones toast
// Tipos: "success", "error", "warning", "info"
// ============================================================

function useToast() {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message, type = "info") => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    // Programar la salida con animación
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      // Eliminar del DOM después de la animación de salida
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, TOAST_DURATION);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return { toasts, addToast, removeToast };
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState("");

  useEffect(() => { fetchFiles(); }, []);

  async function fetchFiles() {
    try {
      const res = await axios.get(`${API}/api/files`);
      setFiles(res.data.files);
    } catch {
      setMessage("Error al cargar archivos");
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["docx", "odt", "rtf"].includes(ext)) {
      setMessage("❌ Solo se permiten archivos DOCX, ODT o RTF");
      return;
    }
    if (file.size > 14 * 1024 * 1024) {
      setMessage("❌ El archivo supera el límite de 14 MB");
      return;
    }

    setUploading(true);
    setMessage("");
    try {
      const { data } = await axios.post(`${API}/api/upload/presigned-url`, {
        fileName: file.name,
        fileType: MIME_TYPES[ext] || file.type,
        fileSize: file.size,
      });

      await axios.put(data.presignedUrl, file, {
        headers: { "Content-Type": MIME_TYPES[ext] || file.type },
      });

      setMessage("✅ Archivo subido correctamente");
      fetchFiles();
    } catch {
      setMessage("❌ Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(name) {
    if (!confirm(`¿Eliminar ${name}?`)) return;
    try {
      await axios.delete(`${API}/api/files/${name}`);
      setMessage(`✅ ${name} eliminado`);
      fetchFiles();
    } catch {
      setMessage("❌ Error al eliminar");
    }
  }

  async function handleRename(name) {
    if (!newName.trim()) return;
    try {
      await axios.post(`${API}/api/files/${name}/rename`, { newName });
      setMessage(`✅ Renombrado a ${newName}`);
      setRenaming(null);
      setNewName("");
      fetchFiles();
    } catch {
      setMessage("❌ Error al renombrar");
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div style={{ maxWidth: 700, margin: "2rem auto", fontFamily: "sans-serif", padding: "0 1rem" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>☁️ ArchivaCloud P-12</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Gestor de archivos DOCX · ODT · RTF — máx 14 MB</p>

      <div style={{ border: "2px dashed #ccc", borderRadius: 8, padding: 24, textAlign: "center", marginBottom: 24 }}>
        <input
          type="file"
          accept=".docx,.odt,.rtf"
          onChange={handleUpload}
          disabled={uploading}
          style={{ display: "none" }}
          id="file-input"
        />
        <label htmlFor="file-input" style={{
          cursor: uploading ? "not-allowed" : "pointer",
          background: "#0066cc", color: "white",
          padding: "10px 24px", borderRadius: 6, fontSize: 14
        }}>
          {uploading ? "Subiendo..." : "Seleccionar archivo"}
        </label>
        <p style={{ marginTop: 12, fontSize: 13, color: "#888" }}>DOCX, ODT, RTF · máximo 14 MB</p>
      </div>

      {message && (
        <div style={{
          padding: "10px 16px", borderRadius: 6, marginBottom: 16,
          background: message.startsWith("✅") ? "#e6f4ea" : "#fce8e6",
          color: message.startsWith("✅") ? "#137333" : "#c5221f",
          fontSize: 14
        }}>
          {message}
        </div>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Archivos en el bucket ({files.length})</h2>

      {files.length === 0 ? (
        <p style={{ color: "#888", fontSize: 14 }}>No hay archivos subidos aún.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Nombre</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Tamaño</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.key} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 12px" }}>{f.name}</td>
                <td style={{ padding: "8px 12px", color: "#666" }}>{formatSize(f.size)}</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  {renaming === f.name ? (
                    <span style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="nuevo-nombre.docx"
                        style={{ padding: "4px 8px", fontSize: 13, borderRadius: 4, border: "1px solid #ccc", width: 160 }}
                      />
                      <button onClick={() => handleRename(f.name)}
                        style={{ padding: "4px 10px", background: "#0066cc", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>
                        OK
                      </button>
                      <button onClick={() => { setRenaming(null); setNewName(""); }}
                        style={{ padding: "4px 10px", background: "#eee", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>
                        ✕
                      </button>
                    </span>
                  ) : (
                    <span style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button onClick={() => { setRenaming(f.name); setNewName(f.name); }}
                        style={{ padding: "4px 10px", background: "#f0a500", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>
                        Renombrar
                      </button>
                      <button onClick={() => handleDelete(f.name)}
                        style={{ padding: "4px 10px", background: "#cc0000", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>
                        Eliminar
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
