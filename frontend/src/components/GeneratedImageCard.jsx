import { CircularProgress } from "@mui/material";
import React from "react";
import styled from "styled-components";

const Container = styled.div`
  flex: 1;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  align-items: center;
  justify-content: center;
  border: 2px dashed ${({ theme }) => theme.yellow};
  color: ${({ theme }) => theme.arrow + 80};
  border-radius: 20px;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 24px;
  background: ${({ theme }) => theme.black + 50};
`;

const LoadingDiv = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const GeneratedImageCard = ({ src, loading }) => {
  return (
    <Container>
      {loading ? (
        <LoadingDiv>
          <CircularProgress sx={{ color: "yellow" }} size={30} />
          Generating your image . . .<br />
          This usually takes a few seconds
        </LoadingDiv>
      ) : (
        <>{src ? <Image src={src} alt="Generated" /> : <>Write a prompt to generate image</>}</>
      )}
    </Container>
  );
};

export default GeneratedImageCard;
