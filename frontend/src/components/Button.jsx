import { CircularProgress } from "@mui/material";
import React from "react";
import styled from "styled-components";

// $-префиксът (transient props) спира предаването на тези свойства към DOM
const StyledButton = styled.button`
  border: none;
  font-family: inherit;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: min-content;
  padding: 10px 24px;
  @media (max-width: 600px) {
    padding: 8px 12px;
  }
  ${({ $type, theme }) =>
    $type === "green"
      ? `background: green;`
      : $type === "secondary"
      ? `background: ${theme.secondary};`
      : `background: ${theme.primary};`}

  &:hover {
    filter: brightness(1.1);
  }

  ${({ $isDisabled }) => $isDisabled && `opacity:0.4; cursor:not-allowed; &:hover { filter: none; }`};

  ${({ $isLoading }) => $isLoading && `opacity: 0.8; cursor: not-allowed;`};

  ${({ $flex }) => $flex && `flex:1;`};
`;

const Button = ({ text, isLoading, isDisabled, rightIcon, leftIcon, type, onClick, flex }) => {
  return (
    <StyledButton
      type="button"
      onClick={() => !isDisabled && !isLoading && onClick?.()}
      aria-disabled={isDisabled || isLoading ? "true" : undefined}
      $isDisabled={isDisabled}
      $type={type}
      $isLoading={isLoading}
      $flex={flex}
    >
      {isLoading && <CircularProgress style={{ color: "inherit", width: "16px", height: "16px" }} />}
      {!isLoading && leftIcon}
      {text}
      {isLoading && <>. . .</>}
      {rightIcon}
    </StyledButton>
  );
};

export default Button;
