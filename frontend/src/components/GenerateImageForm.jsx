import React from "react";
import styled from "styled-components";
import Button from "./Button";
import TextInput from "./TextInput";
import { AddToQueue, AutoAwesome, CreateRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { createPost, generateImage } from "../api";
import { useNotify } from "./Notifications";
import { CloudflareBanner, useCloudflareStatus } from "./CloudflareStatus";

const Form = styled.form`
  flex: 1;
  padding: 46px 20px;
  display: flex;
  flex-direction: column;
  gap: 9%;
  justify-content: center;
`;
const Top = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  & > [role="alert"] {
    margin-top: 10px;
  }
`;
const Title = styled.div`
  font-size: 28px;
  font-weight: 500;
  color: ${({ theme }) => theme.text_primary};
`;
const Desc = styled.div`
  font-size: 17px;
  font-weight: 400;
  color: ${({ theme }) => theme.text_secondary};
`;
const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.text_secondary};
`;
const Actions = styled.div`
  flex: 1;
  display: flex;
  gap: 8px;
  margin-top: 15px;
  flex-wrap: wrap;
`;

const GenerateImageForm = ({ post, setPost, postLoading, setPostLoading, imageLoading, setImageLoading }) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const cloudflare = useCloudflareStatus();

  const handleError = (error) => {
    console.error(error);
    notify(error.message || "Something went wrong", error.code === "CF_LIMIT" ? "warning" : "error");
    // Грешка от Cloudflare/мрежата → обновяваме статуса в навигацията
    if (error.code?.startsWith("CF_") || error.code === "NETWORK") cloudflare.refresh(true);
  };

  const generateImageFun = async () => {
    setImageLoading(true);
    setPost((prev) => ({ ...prev, photo: "" }));
    try {
      const photo = await generateImage(post.prompt);
      setPost((prev) => ({ ...prev, photo }));
      if (cloudflare.status !== "connected") cloudflare.refresh(true);
    } catch (error) {
      handleError(error);
    } finally {
      setImageLoading(false);
    }
  };

  const createPostFun = async () => {
    setPostLoading(true);
    try {
      await createPost(post);
      notify("Image posted successfully", "success");
      navigate("/");
    } catch (error) {
      handleError(error);
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Top>
        <Title>Generate Image with prompt</Title>
        <Desc>Write your prompt according to the image you want to generate!</Desc>
        <CloudflareBanner />
      </Top>
      <Body>
        <TextInput
          label="Author"
          placeholder="Enter your name . . ."
          name="name"
          maxLength={60}
          value={post.name}
          handleChange={(e) => setPost({ ...post, name: e.target.value })}
        />
        <TextInput
          label="Image Prompt"
          placeholder="Write a detailed prompt about the image . . ."
          name="prompt"
          rows="8"
          maxLength={2048}
          isDisabled={post.photo !== "" || imageLoading}
          textArea
          value={post.prompt}
          handleChange={(e) => setPost({ ...post, prompt: e.target.value })}
        />
        ** You can post the AI Generated Image to the Community **
      </Body>
      <Actions>
        {post.photo !== "" && (
          <Button
            text="New Photo"
            leftIcon={<AddToQueue />}
            type="secondary"
            isDisabled={postLoading}
            onClick={() => setPost({ name: post.name, prompt: "", photo: "" })}
          />
        )}

        <Button
          text={post.photo ? "Regenerate" : "Generate Image"}
          leftIcon={<AutoAwesome />}
          isLoading={imageLoading}
          isDisabled={post.name.trim() === "" || post.prompt.trim() === "" || postLoading}
          onClick={generateImageFun}
        />
        <Button
          text="Post Image"
          type="green"
          leftIcon={<CreateRounded />}
          isLoading={postLoading}
          isDisabled={post.name.trim() === "" || post.prompt.trim() === "" || post.photo === "" || imageLoading}
          onClick={createPostFun}
        />
      </Actions>
    </Form>
  );
};

export default GenerateImageForm;
