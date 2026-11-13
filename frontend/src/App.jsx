import styled, { ThemeProvider } from "styled-components";
import { darkTheme, lightTheme } from "./utils/Theme";
import Home from "./pages/Home";
import CreatePost from "./pages/CreatePost";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import { NotificationProvider } from "./components/Notifications";
import { CloudflareStatusProvider } from "./components/CloudflareStatus";
import { useEffect, useState } from "react";

const Container = styled.div`
  width: 100%;
  min-height: 100vh;
  height: 100%;
  display: flex;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text_primary};
  overflow-x: hidden;
  overflow-y: hidden;
  transition: all 0.2s ease;
`;

const Wrapper = styled.div`
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 3;
`;

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem("darkMode");
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem("darkMode", String(isDarkMode));
    } catch {
      /* без запазване */
    }
    document.body.style.background = isDarkMode ? darkTheme.bg : lightTheme.bg;
  }, [isDarkMode]);

  return (
    <ThemeProvider theme={!isDarkMode ? lightTheme : darkTheme}>
      <NotificationProvider>
        <CloudflareStatusProvider>
          <Container>
            <Wrapper>
              <BrowserRouter>
                <Navbar isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/post" element={<CreatePost />} />
                    <Route path="*" element={<Home />} />
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </Wrapper>
          </Container>
        </CloudflareStatusProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
