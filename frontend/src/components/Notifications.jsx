import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

const NotifyContext = createContext(() => {});

/**
 * Глобални известия (вместо alert()).
 * notify("Текст", "success" | "error" | "warning" | "info")
 */
export const NotificationProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const current = queue[0];

  const notify = useCallback((message, severity = "info") => {
    if (!message) return;
    setQueue((q) => [...q.slice(-4), { id: Date.now() + Math.random(), message, severity }]);
  }, []);

  const close = (_e, reason) => {
    if (reason === "clickaway") return;
    setQueue((q) => q.slice(1));
  };

  // Ловим и грешки, които не са обработени никъде другаде (напр. забравен try/catch)
  useEffect(() => {
    const onRejection = (event) => {
      console.error("Unhandled promise rejection:", event.reason);
      notify(event.reason?.message || "Unexpected error. Please try again.", "error");
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [notify]);

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={current?.id}
        open={Boolean(current)}
        autoHideDuration={current?.severity === "error" ? 7000 : 4000}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {current ? (
          <Alert onClose={close} severity={current.severity} variant="filled" sx={{ width: "100%", maxWidth: 420 }}>
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotifyContext.Provider>
  );
};

export const useNotify = () => useContext(NotifyContext);
