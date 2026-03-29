/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "Consolas", "monospace"]
      },
      colors: {
        shell: "#f3f6f9",
        canvas: "#f8fafc",
        panel: "#ffffff",
        "panel-header": "#f2f6fb",
        "panel-subtle": "#f6f9fc",
        line: "#c5d0db",
        "line-strong": "#9fb2c5",
        primary: "#2563eb",
        "primary-hover": "#1d4ed8",
        "primary-light": "#e8f0ff",
        accent: "#0f766e",
        "accent-light": "#e6f6f4",
        success: "#0d7a5f",
        "success-light": "#ecfdf5",
        danger: "#b54747",
        "danger-light": "#fef2f2",
        heading: "#0f172a",
        body: "#334155",
        caption: "#475569",
        "muted-text": "#64748b",
        "viewer-bg": "#0b1020",
        "viewer-panel": "#edf2f7"
      },
      borderRadius: {
        panel: "0px",
        control: "0px"
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(159, 178, 197, 0.5), 4px 4px 0 rgba(15, 23, 42, 0.08)",
        focus: "0 0 0 3px rgba(37, 99, 235, 0.16)",
        viewer: "0 0 0 1px rgba(159, 178, 197, 0.7), 6px 6px 0 rgba(15, 23, 42, 0.12)"
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }]
      }
    }
  },
  plugins: []
};
