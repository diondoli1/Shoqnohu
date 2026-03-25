import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ImageOutlined, SendOutlined } from "@mui/icons-material";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { PostDto } from "../types";
import { PostCard } from "../components/PostCard";
import { routes } from "../config/routes";

type FeedResponse = { items: PostDto[]; nextCursor: string | null };

export function FeedPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q")?.trim() ?? "";
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchQuery = useQuery({
    queryKey: ["search", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data } = await api.get(`/api/search?q=${encodeURIComponent(q)}`);
      return data as {
        users: { id: string; username: string; name: string | null; avatarUrl: string | null }[];
        posts: {
          id: string;
          snippet: string;
          mediaUrl: string | null;
          author: { username: string; name: string | null; avatarUrl: string | null };
        }[];
        events: { id: string; title: string }[];
        groups: { id: string; name: string }[];
      };
    },
  });

  const feed = useInfiniteQuery({
    queryKey: ["feed"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", "10");
      if (pageParam) params.set("cursor", pageParam);
      const { data } = await api.get<FeedResponse>(`/api/posts/feed?${params.toString()}`);
      return data;
    },
    getNextPageParam: (last) => last.nextCursor,
  });

  const { ref, inView } = useInView();
  useEffect(() => {
    if (inView && feed.hasNextPage && !feed.isFetchingNextPage) {
      void feed.fetchNextPage();
    }
  }, [inView, feed.hasNextPage, feed.isFetchingNextPage, feed.fetchNextPage]);

  const createPost = useMutation({
    mutationFn: async () => {
      await api.post("/api/posts", {
        content,
        hashtags,
        mediaUrl,
      });
    },
    onSuccess: () => {
      setContent("");
      setHashtags("");
      setMediaUrl(null);
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/api/posts/${postId}/like`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["feed"] });
      void qc.invalidateQueries({ queryKey: ["posts", "user"] });
    },
  });

  const onPickPhoto = useCallback(async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post<{ url: string }>("/api/upload/image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setMediaUrl(data.url);
  }, []);

  if (q.length >= 2) {
    const s = searchQuery.data;
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Search results for &quot;{q}&quot;
        </Typography>
        {searchQuery.isLoading && <Typography>Searching…</Typography>}
        {s && (
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                People
              </Typography>
              {s.users.length === 0 ? (
                <Typography variant="body2">No people matched.</Typography>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={2}>
                  {s.users.map((u) => (
                    <Card
                      key={u.id}
                      component={RouterLink}
                      to={routes.profileUser(u.username)}
                      sx={{
                        width: 160,
                        textDecoration: "none",
                        color: "inherit",
                        transition: "box-shadow 0.2s",
                        "&:hover": { boxShadow: 4 },
                      }}
                    >
                      <CardContent sx={{ textAlign: "center", py: 2 }}>
                        <Avatar
                          src={u.avatarUrl ?? undefined}
                          sx={{ width: 72, height: 72, mx: "auto", mb: 1, bgcolor: "secondary.main" }}
                        >
                          {u.username.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>
                          {u.name || u.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          @{u.username}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Posts
              </Typography>
              {s.posts.length === 0 ? (
                <Typography variant="body2">No posts matched.</Typography>
              ) : (
                <Stack spacing={2}>
                  {s.posts.map((p) => (
                    <Card
                      key={p.id}
                      component={RouterLink}
                      to={routes.profileUser(p.author.username)}
                      state={{ highlightPostId: p.id }}
                      sx={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "block",
                        "&:hover": { boxShadow: 3 },
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Avatar src={p.author.avatarUrl ?? undefined} sx={{ bgcolor: "secondary.main" }}>
                            {p.author.username.slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box
                            sx={{
                              width: 120,
                              height: 80,
                              flexShrink: 0,
                              borderRadius: 1,
                              overflow: "hidden",
                              bgcolor: "grey.200",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {p.mediaUrl ? (
                              <Box
                                component="img"
                                src={p.mediaUrl}
                                alt=""
                                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary" sx={{ px: 1 }} align="center">
                                No image
                              </Typography>
                            )}
                          </Box>
                          <Box flex={1} minWidth={0}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              @{p.author.username}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
                              {p.snippet}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </Box>
    );
  }

  const posts = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar src={user?.avatarUrl ?? undefined} sx={{ bgcolor: "secondary.main" }}>
              {(user?.username ?? "U").slice(0, 1).toUpperCase()}
            </Avatar>
            <Box flex={1}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <TextField
                fullWidth
                sx={{ mt: 2 }}
                size="small"
                placeholder="Add hashtags (comma separated)"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    startIcon={<ImageOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                    color="inherit"
                  >
                    Photo
                  </Button>
                  {mediaUrl && (
                    <Typography variant="caption" sx={{ ml: 1 }} color="success.main">
                      Image attached
                    </Typography>
                  )}
                </div>
                <Button
                  variant="contained"
                  disabled={!content.trim() || createPost.isPending}
                  onClick={() => createPost.mutate()}
                  startIcon={<SendOutlined />}
                >
                  Post
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {posts.length === 0 && !feed.isLoading && (
        <Card>
          <CardContent>
            <Typography color="text.secondary" textAlign="center">
              No posts yet. Be the first to share something!
            </Typography>
          </CardContent>
        </Card>
      )}

      <Stack spacing={2}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onLike={(id) => toggleLike.mutate(id)} />
        ))}
      </Stack>
      <Box ref={ref} sx={{ height: 24 }} />
      {feed.isFetchingNextPage && (
        <Typography align="center" color="text.secondary">
          Loading…
        </Typography>
      )}
    </Box>
  );
}
