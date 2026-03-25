import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ChatBubbleOutline, Favorite, FavoriteBorder, ImageOutlined } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { api } from "../api/client";
import type { CommentDto, PostDto } from "../types";

type Props = {
  post: PostDto;
  onLike: (postId: string) => void;
};

export function PostCard({ post, onLike }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["post-comments", post.id],
    enabled: expanded,
    queryFn: async () => {
      const { data } = await api.get<CommentDto[]>(`/api/posts/${post.id}/comments`);
      return data;
    },
  });

  const addComment = useMutation({
    mutationFn: async (payload: { content: string; mediaUrl: string | null }) => {
      const body: { content: string; mediaUrl?: string } = {
        content: payload.content.trim(),
      };
      const url = payload.mediaUrl?.trim();
      if (url) body.mediaUrl = url;
      await api.post(`/api/posts/${post.id}/comments`, body);
    },
    onSuccess: () => {
      setDraft("");
      setPendingImageUrl(null);
      if (fileRef.current) fileRef.current.value = "";
      void qc.invalidateQueries({ queryKey: ["post-comments", post.id] });
      void qc.invalidateQueries({ queryKey: ["feed"] });
      void qc.invalidateQueries({ queryKey: ["posts", "user"] });
    },
  });

  const uploadImage = useCallback(async (file: File | null) => {
    if (!file) return;
    setIsUploadingImage(true);
    setPendingImageUrl(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Let the browser set multipart boundary — manual Content-Type breaks multer
      const { data } = await api.post<{ url: string }>("/api/upload/image", fd);
      setPendingImageUrl(data.url);
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const submitComment = () => {
    if (isUploadingImage) return;
    const text = draft.trim();
    if (!text && !pendingImageUrl) return;
    addComment.mutate({ content: text, mediaUrl: pendingImageUrl });
  };

  return (
    <Card id={`post-${post.id}`}>
      <CardContent>
        <Stack direction="row" spacing={2}>
          <Avatar src={post.author.avatarUrl ?? undefined}>
            {post.author.username.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box flex={1}>
            <Typography fontWeight={700}>@{post.author.username}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {new Date(post.createdAt).toLocaleString()}
            </Typography>
            <Typography sx={{ whiteSpace: "pre-wrap" }}>{post.content}</Typography>
            {post.mediaUrl && (
              <Box
                component="img"
                src={post.mediaUrl}
                alt=""
                sx={{ mt: 1, maxWidth: "100%", borderRadius: 2 }}
              />
            )}
            <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
              {post.hashtags.map((h) => (
                <Chip key={h} size="small" label={`#${h}`} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
              <IconButton
                size="small"
                aria-label="like"
                onClick={() => onLike(post.id)}
                color={post.liked ? "primary" : "default"}
              >
                {post.liked ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                {post.likeCount}
              </Typography>
              <IconButton
                size="small"
                aria-expanded={expanded}
                aria-label={expanded ? "Hide comments" : "Show comments"}
                onClick={() => setExpanded((e) => !e)}
                color={expanded ? "primary" : "default"}
              >
                <ChatBubbleOutline />
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                {post.commentCount}
              </Typography>
            </Stack>

            <Collapse in={expanded}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Comments
              </Typography>
              {commentsLoading && <Typography variant="body2">Loading comments…</Typography>}
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {comments.map((c) => (
                  <Stack key={c.id} direction="row" spacing={1} alignItems="flex-start">
                    <Avatar src={c.user.avatarUrl ?? undefined} sx={{ width: 32, height: 32 }}>
                      {c.user.username.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography variant="caption" color="text.secondary">
                        {c.user.name || c.user.username} · @{c.user.username}
                      </Typography>
                      {c.content ? (
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {c.content}
                        </Typography>
                      ) : null}
                      {c.mediaUrl && (
                        <Box
                          component="img"
                          src={c.mediaUrl}
                          alt=""
                          sx={{ mt: 0.5, maxWidth: 280, maxHeight: 200, borderRadius: 1, objectFit: "cover" }}
                        />
                      )}
                    </Box>
                  </Stack>
                ))}
              </Stack>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  placeholder="Write a comment…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitComment();
                    }
                  }}
                />
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => void uploadImage(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    size="small"
                    startIcon={<ImageOutlined />}
                    onClick={() => fileRef.current?.click()}
                    color="inherit"
                    disabled={isUploadingImage}
                  >
                    Add image
                  </Button>
                  {isUploadingImage && (
                    <Typography variant="caption" color="text.secondary">
                      Uploading image…
                    </Typography>
                  )}
                  {!isUploadingImage && pendingImageUrl && (
                    <Typography variant="caption" color="success.main">
                      Image ready to send
                    </Typography>
                  )}
                </Stack>
                {pendingImageUrl && !isUploadingImage && (
                  <Box
                    component="img"
                    src={pendingImageUrl}
                    alt=""
                    sx={{ maxWidth: 200, maxHeight: 120, borderRadius: 1, objectFit: "cover" }}
                  />
                )}
                <Button
                  variant="contained"
                  size="small"
                  disabled={
                    addComment.isPending ||
                    isUploadingImage ||
                    (!draft.trim() && !pendingImageUrl)
                  }
                  onClick={submitComment}
                >
                  Post comment
                </Button>
              </Stack>
            </Collapse>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
