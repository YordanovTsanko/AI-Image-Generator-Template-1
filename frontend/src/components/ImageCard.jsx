import React from "react";
import styled from "styled-components";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { Avatar } from "@mui/material";
import { DownloadRounded } from "@mui/icons-material";
import FileSaver from "file-saver";
import { imageUrl } from "../api";

const Card = styled.div`
  position: relative;
  display: flex;
  border-radius: 20px;
  box-shadow: 1px 2px 10px 1px ${({ theme }) => theme.black + 60};
  transition: all 0.3s ease;
  overflow: hidden;
  backface-visibility: hidden;
  &:hover {
    box-shadow: 1px 2px 10px 1px ${({ theme }) => theme.black + 80};
    scale: 1.05;
  }
  &:nth-child(7n + 1) {
    grid-column: auto/span 2;
    grid-row: auto/span 2;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;
const HoverOverlay = styled.div`
  position: absolute;
  height: 100%;
  opacity: 0;
  top: -20px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: end;
  cursor: default;
  align-items: start;
  gap: 5.5px;
  backdrop-filter: blur(5px);
  background: rgba(0, 0, 0, 0.5);
  color: ${({ theme }) => theme.white};
  transition: opacity 0.3s ease;
  padding: 12px;
  text-align: left;

  ${Card}:hover & {
    opacity: 1;
  }
`;

const Prompt = styled.div`
  font-weight: 400;
  font-size: 15px;
  color: ${({ theme }) => theme.white};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Author = styled.div`
  font-weight: 600;
  font-size: 14px;
  display: flex;
  gap: 8px;
  align-items: center;
  color: ${({ theme }) => theme.white};
`;
const DownloadButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;
  &:hover {
    text-decoration: underline;
  }
`;

const ImageCard = ({ item }) => {
  const src = imageUrl(item?.photo);
  const fileName = `${(item?.name || "image").replace(/[^\p{L}\p{N}_-]+/gu, "_")}-${item?._id || "ai"}.jpg`;

  return (
    <Card>
      <LazyLoadImage alt={item?.prompt} width="100%" src={src} />
      <HoverOverlay>
        <Prompt>{item?.prompt}</Prompt>
        <Author style={{ fontSize: "15px" }}>
          <Avatar style={{ width: "24px", height: "24px", fontSize: "13px" }}>
            {item?.name?.slice(0, 1).toUpperCase()}
          </Avatar>
          {item?.name}
        </Author>
        <DownloadButton type="button" onClick={() => FileSaver.saveAs(src, fileName)}>
          <DownloadRounded /> Download
        </DownloadButton>
      </HoverOverlay>
    </Card>
  );
};

export default ImageCard;
