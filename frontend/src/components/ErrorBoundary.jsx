import React from "react";
import styled from "styled-components";
import { ErrorOutlineRounded } from "@mui/icons-material";

const Wrapper = styled.div`
  flex: 1;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 30px;
  text-align: center;
  color: ${({ theme }) => theme.text_primary};
`;

const Title = styled.div`
  font-size: 26px;
  font-weight: 600;
`;

const Desc = styled.div`
  font-size: 15px;
  color: ${({ theme }) => theme.text_secondary};
  max-width: 480px;
`;

const Details = styled.pre`
  font-size: 12px;
  max-width: 600px;
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: ${({ theme }) => theme.bgLight};
  color: ${({ theme }) => theme.red};
  white-space: pre-wrap;
  text-align: left;
`;

const ActionButton = styled.button`
  border: none;
  border-radius: 10px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  background: ${({ theme }) => theme.primary};
  &:hover {
    filter: brightness(1.1);
  }
`;

/** Хваща грешки при рендериране, за да не остава бял екран. */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI error:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Wrapper>
        <ErrorOutlineRounded style={{ fontSize: 56, color: "#ef5350" }} />
        <Title>Something went wrong</Title>
        <Desc>An unexpected error occurred on this page. Reload to continue.</Desc>
        {import.meta.env.DEV && <Details>{String(error?.stack || error)}</Details>}
        <div style={{ display: "flex", gap: 10 }}>
          <ActionButton onClick={() => this.setState({ error: null })}>Try again</ActionButton>
          <ActionButton onClick={() => window.location.assign("/")}>Go to home</ActionButton>
        </div>
      </Wrapper>
    );
  }
}

export default ErrorBoundary;
