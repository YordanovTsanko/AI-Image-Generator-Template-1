import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Tooltip } from "@mui/material";
import { CloudRounded, WarningAmberRounded } from "@mui/icons-material";
import { getHealth } from "../api";

const StatusContext = createContext({ status: "loading", refresh: () => {} });

const COLORS = {
  connected: "#12c26a",
  limit: "#F7AD63",
  error: "#ef5350",
  offline: "#ef5350",
  loading: "#AFAFB5",
  unknown: "#AFAFB5",
};

const LABELS = {
  connected: "Cloudflare AI · Connected",
  limit: "Cloudflare AI · Limit reached",
  error: "Cloudflare AI · Error",
  offline: "Server offline",
  loading: "Checking Cloudflare…",
  unknown: "Cloudflare AI · Unknown",
};

const formatLocal = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

/** Държи статуса на Cloudflare за цялото приложение и го обновява на 60 секунди. */
export const CloudflareStatusProvider = ({ children }) => {
  const [data, setData] = useState({ status: "loading" });
  const busy = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const health = await getHealth(force);
      setData({ ...health.cloudflare, db: health.db });
    } catch (err) {
      setData({ status: "offline", message: err.message });
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => refresh(), 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  return <StatusContext.Provider value={{ ...data, refresh }}>{children}</StatusContext.Provider>;
};

export const useCloudflareStatus = () => useContext(StatusContext);

// ---------------- Значка в навигацията ----------------
const Badge = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 14px;
  padding: 6px 12px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  color: ${({ theme }) => theme.text_primary};
  background: ${({ $color }) => $color + "1f"};
  border: 1px solid ${({ $color }) => $color + "80"};
  transition: all 0.2s ease;
  &:hover {
    background: ${({ $color }) => $color + "33"};
  }
  @media (max-width: 760px) {
    padding: 6px;
    margin-right: 6px;
    span.label {
      display: none;
    }
  }
`;

const Dot = styled.span`
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 0 ${({ $color }) => $color};
  ${({ $pulse }) => $pulse && `animation: cf-pulse 2s infinite;`}
  @keyframes cf-pulse {
    0% { box-shadow: 0 0 0 0 rgba(18, 194, 106, 0.6); }
    70% { box-shadow: 0 0 0 7px rgba(18, 194, 106, 0); }
    100% { box-shadow: 0 0 0 0 rgba(18, 194, 106, 0); }
  }
`;

export const CloudflareBadge = () => {
  const s = useCloudflareStatus();
  const status = s.status || "unknown";
  const color = COLORS[status] || COLORS.unknown;

  const tooltip =
    status === "connected"
      ? `Model: ${s.model}${s.accountName ? ` · Account: ${s.accountName}` : ""}`
      : status === "limit"
      ? `Daily free limit used up. Resets at ${formatLocal(s.limitUntil)}`
      : status === "loading"
      ? "Checking connection…"
      : s.message || "Not connected";

  return (
    <Tooltip title={`${tooltip} · Click to re-check`} arrow>
      <Badge $color={color} onClick={() => s.refresh(true)} aria-label={LABELS[status]}>
        {status === "limit" ? (
          <WarningAmberRounded style={{ fontSize: 16, color }} />
        ) : status === "connected" ? (
          <Dot $color={color} $pulse />
        ) : (
          <CloudRounded style={{ fontSize: 16, color }} />
        )}
        <span className="label">{LABELS[status] || LABELS.unknown}</span>
      </Badge>
    </Tooltip>
  );
};

// ---------------- Банер на страницата за генериране ----------------
const Banner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 14px;
  text-align: left;
  line-height: 1.4;
  color: ${({ theme }) => theme.text_primary};
  background: ${({ $color }) => $color + "1f"};
  border: 1px solid ${({ $color }) => $color + "80"};
`;

export const CloudflareBanner = () => {
  const s = useCloudflareStatus();
  if (s.status === "limit") {
    return (
      <Banner $color={COLORS.limit} role="alert">
        <WarningAmberRounded style={{ color: COLORS.limit }} />
        <div>
          <b>The daily Cloudflare AI limit is used up.</b>
          <br />
          New images can be generated again after {formatLocal(s.limitUntil)}.
        </div>
      </Banner>
    );
  }
  if (s.status === "error" || s.status === "offline") {
    return (
      <Banner $color={COLORS.error} role="alert">
        <CloudRounded style={{ color: COLORS.error }} />
        <div>
          <b>{s.status === "offline" ? "The server is not reachable." : "No connection to Cloudflare AI."}</b>
          <br />
          {s.message}
        </div>
      </Banner>
    );
  }
  return null;
};
