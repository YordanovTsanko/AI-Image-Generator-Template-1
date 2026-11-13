import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { SearchBar } from "../components/SearchBar";
import ImageCard from "../components/ImageCard";
import { CircularProgress } from "@mui/material";
import { AutoAwesome } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getPosts } from "../api";

const Container = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.bg};
  padding: 30px 30px;
  padding-bottom: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
  @media (max-width: 768px) {
    padding: 6px 10px;
  }
`;

const Headline = styled.div`
  font-size: 34px;
  font-weight: 500;
  color: ${({ theme }) => theme.text_primary};
  display: flex;
  align-items: center;
  flex-direction: column;
  @media (max-width: 600px) {
    font-size: 24px;
  }
`;

const Span = styled.span`
  font-size: 30px;
  font-weight: 800;
  color: ${({ theme }) => theme.secondary};
  @media (max-width: 600px) {
    font-size: 20px;
  }
`;

const Wrapper = styled.div`
  width: 100%;
  max-width: 1400px;
  padding: 32px 0px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const CardWrapper = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: 15px 20px;
  overflow: hidden;
  display: grid;
  gap: 20px;

  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (min-width: 640px) and (max-width: 1199px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 639px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Message = styled.h3`
  font-weight: 500;
  color: ${({ theme }) => theme.text_secondary};
`;

const RetryButton = styled.button`
  border: none;
  border-radius: 8px;
  padding: 8px 18px;
  font-weight: 600;
  color: white;
  background: ${({ theme }) => theme.primary};
  cursor: pointer;
`;

const GenerateButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 90%;
  max-width: 550px;
  padding: 18px 32px;
  border: none;
  border-radius: 14px;
  font-family: inherit;
  font-size: 20px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  background: linear-gradient(135deg, ${({ theme }) => theme.primary}, ${({ theme }) => theme.secondary});
  box-shadow: 0 8px 24px ${({ theme }) => theme.primary + "55"};
  transition: all 0.25s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px ${({ theme }) => theme.primary + "77"};
    filter: brightness(1.08);
  }
  &:active {
    transform: translateY(0);
  }
  @media (max-width: 600px) {
    font-size: 17px;
    padding: 14px 20px;
  }
`;

const Home = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPosts = async () => {
    setPostsLoading(true);
    setError("");
    try {
      setPosts(await getPosts());
    } catch (err) {
      setError(err.message);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const filteredPosts = posts.filter(
    (item) => item.prompt?.toLowerCase().includes(query) || item.name?.toLowerCase().includes(query)
  );

  return (
    <Container>
      <Headline>
        Explore popular posts in the Community! <Span>Generated with AI</Span>
      </Headline>
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <GenerateButton type="button" onClick={() => navigate("/post")}>
        <AutoAwesome /> Generate Image
      </GenerateButton>
      <Wrapper>
        {postsLoading ? (
          <>
            <CircularProgress size="2.5rem" color="secondary" />
            <Message>Loading . . .</Message>
          </>
        ) : error ? (
          <>
            <Message>{error}</Message>
            <RetryButton onClick={fetchPosts}>Try again</RetryButton>
          </>
        ) : filteredPosts.length === 0 ? (
          <Message>{query ? "No posts match your search" : "No posts yet – generate the first image!"}</Message>
        ) : (
          <CardWrapper>
            {filteredPosts.map((item) => (
              <ImageCard key={item._id} item={item} />
            ))}
          </CardWrapper>
        )}
      </Wrapper>
    </Container>
  );
};

export default Home;