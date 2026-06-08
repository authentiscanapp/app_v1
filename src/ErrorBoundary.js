import { Component } from "react";

// Catches render-time errors so users get a recoverable screen instead of a
// blank white page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          padding: "0 28px",
          textAlign: "center",
          background: "#070a0f",
          color: "#f0f4f8",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700 }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: "#5a6475", lineHeight: 1.6, maxWidth: 320 }}>
          The app hit an unexpected error. Reloading usually fixes it.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "12px 28px",
            background: "#c8ff00",
            color: "#070a0f",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
