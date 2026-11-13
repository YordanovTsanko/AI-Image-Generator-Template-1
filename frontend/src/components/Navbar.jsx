import React from "react";
import styled from "styled-components";
import { DarkMode, WbSunny } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { FormControlLabel, Switch } from "@mui/material";
import { CloudflareBadge } from "./CloudflareStatus";

const Container = styled.div`
  flex: 1;
  background: ${({ theme }) => theme.navbar};
  color: ${({ theme }) => theme.text_primary};
  font-weight: bold;
  font-size: 22px;
  padding: 14px 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
  @media only screen and (max-width: 600px) {
    padding: 10px 12px;
  }
`;

const LogoTitle = styled(Link)`
  text-decoration: none;
  white-space: nowrap;
  color: ${({ theme }) => theme.text_primary};
  @media only screen and (max-width: 600px) {
    font-size: 17px;
  }
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  /* Значката на Cloudflare е вдясно от превключвателя за тема */
  & > button {
    margin-right: 0;
  }
  .MuiFormControlLabel-root {
    margin-right: 10px;
  }
`;

const Navbar = ({ isDarkMode, setIsDarkMode }) => {
  return (
    <Container>
      <LogoTitle to="/">AI Image Generator</LogoTitle>
      <Right>
        <FormControlLabel
          control={
            <Switch
              checked={isDarkMode}
              onChange={(event) => setIsDarkMode(event.target.checked)}
              inputProps={{ "aria-label": "Dark mode" }}
              sx={{ "& .MuiSwitch-track": { backgroundColor: "rgb(116, 116, 116) !important" } }}
              style={{ color: "#fff" }}
              icon={<WbSunny style={{ color: "#000", transform: "translate(-2.1px,-1.5px)" }} />}
              checkedIcon={<DarkMode style={{ transform: "translate(2.1px,-1.5px)" }} />}
            />
          }
        />
        <CloudflareBadge />
      </Right>
    </Container>
  );
};

export default Navbar;