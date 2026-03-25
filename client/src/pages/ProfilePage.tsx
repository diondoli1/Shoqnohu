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
import {
  CalendarMonthOutlined,
  CameraAltOutlined,
  SaveOutlined,
  EditOutlined,
  PersonAddAlt1,
  HowToReg,
} from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PostCard } from "../components/PostCard";
import type { PostDto } from "../types";

type ProfileDto = {
  id: string;
  username: string;
  email?: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  interests: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  createdAt: string;
};

type FeedResponse = { items: PostDto[]; nextCursor: string | null };

export function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const highlightPostId = (location.state as { highlightPostId?: string } | null)?.highlightPostId;
  const { user: me, refreshMe } = useAuth();
  const qc = useQueryClient();
  const isSelf = !username || username === me?.username;
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [locationState, setLocationState] = useState("");
  const [interests, setInterests] = useState("");

  const canLoadProfile = Boolean(isSelf ? me : username);

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErr,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["profile", username ?? me?.username],
    queryFn: async () => {
      const path = isSelf ? "/api/users/me" : `/api/users/${encodeURIComponent(username!)}`;
      const { data } = await api.get<ProfileDto>(path);
      return data;
    },
    enabled: canLoadProfile,
  });

  const { data: followStatus } = useQuery({
    queryKey: ["follow-status", profile?.username],
    enabled: Boolean(profile && !isSelf && profile.username),
    queryFn: async () => {
      const { data } = await api.get<{ following: boolean }>(
        `/api/follow/${encodeURIComponent(profile!.username)}/status`
      );
      return data;
    },
  });

  const followToggle = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ following: boolean }>(
        `/api/follow/${encodeURIComponent(profile!.username)}/follow`
      );
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["follow-status", profile?.username] });
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const userPosts = useInfiniteQuery({
    queryKey: ["posts", "user", profile?.username],
    enabled: Boolean(profile?.username),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", "10");
      if (pageParam) params.set("cursor", pageParam);
      const { data } = await api.get<FeedResponse>(
        `/api/posts/user/${encodeURIComponent(profile!.username)}?${params.toString()}`
      );
      return data;
    },
    getNextPageParam: (last) => last.nextCursor,
  });

  const { ref: loadMoreRef, inView } = useInView();
  useEffect(() => {
    if (inView && userPosts.hasNextPage && !userPosts.isFetchingNextPage) {
      void userPosts.fetchNextPage();
    }
  }, [inView, userPosts.hasNextPage, userPosts.isFetchingNextPage, userPosts.fetchNextPage]);

  useEffect(() => {
    if (!highlightPostId) return;
    const el = document.getElementById(`post-${highlightPostId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightPostId, userPosts.data]);

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/api/posts/${postId}/like`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["posts", "user", profile?.username] });
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setBio(profile.bio ?? "");
    setLocationState(profile.location ?? "");
    setInterests(profile.interests ?? "");
  }, [profile]);

  const uploadFile = async (file: File | null) => {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post<{ url: string }>("/api/upload/image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.url;
  };

  const save = useMutation({
    mutationFn: async () => {
      await api.patch("/api/users/me", {
        name,
        bio,
        location: locationState,
        interests,
      });
    },
    onSuccess: async () => {
      await refreshMe();
      void qc.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
    },
  });

  const patchMedia = useMutation({
    mutationFn: async (payload: { avatarUrl?: string | null; coverUrl?: string | null }) => {
      await api.patch("/api/users/me", payload);
    },
    onSuccess: async () => {
      await refreshMe();
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const startDm = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post<{ id: string }>("/api/messages/conversations", { userId });
      return data.id;
    },
    onSuccess: (conversationId) => {
      navigate(`/messages?c=${encodeURIComponent(conversationId)}`);
    },
  });

  if (!canLoadProfile) {
    return <Typography color="text.secondary">Loading…</Typography>;
  }

  if (profileLoading) {
    return <Typography color="text.secondary">Loading…</Typography>;
  }

  if (profileError) {
    const msg =
      profileErr instanceof Error ? profileErr.message : "Could not load this profile.";
    return (
      <Box sx={{ maxWidth: 560, mx: "auto", py: 4 }}>
        <Typography color="error" sx={{ mb: 2 }}>
          {msg}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          If you were signed in before, your session may have expired — try signing in again. Make sure the API is
          running (port 4000) and the database is up.
        </Typography>
        <Button variant="contained" onClick={() => void refetchProfile()}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!profile) {
    return null;
  }

  const postItems = userPosts.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <Card>
        <Box
          sx={{
            height: 200,
            background: profile.coverUrl
              ? `url(${profile.coverUrl}) center/cover`
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            position: "relative",
          }}
        >
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const url = await uploadFile(e.target.files?.[0] ?? null);
              if (url) await patchMedia.mutateAsync({ coverUrl: url });
            }}
          />
          {isSelf && (
            <Button
              size="small"
              sx={{
                position: "absolute",
                bottom: 12,
                right: 12,
                minWidth: 0,
                borderRadius: "50%",
                width: 40,
                height: 40,
                bgcolor: "background.paper",
              }}
              onClick={() => coverInput.current?.click()}
            >
              <CameraAltOutlined fontSize="small" />
            </Button>
          )}
        </Box>
        <CardContent sx={{ pt: 0 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }} justifyContent="space-between">
            <Box sx={{ position: "relative", mt: -8 }}>
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const url = await uploadFile(e.target.files?.[0] ?? null);
                  if (url) await patchMedia.mutateAsync({ avatarUrl: url });
                }}
              />
              <Avatar
                src={profile.avatarUrl ?? undefined}
                sx={{ width: 120, height: 120, border: "4px solid white" }}
              >
                {profile.username.slice(0, 1).toUpperCase()}
              </Avatar>
              {isSelf && (
                <Button
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: 4,
                    right: -8,
                    minWidth: 0,
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    bgcolor: "background.paper",
                  }}
                  onClick={() => avatarInput.current?.click()}
                >
                  <CameraAltOutlined fontSize="small" />
                </Button>
              )}
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ alignSelf: { sm: "center" } }}>
              {isSelf && !editing && (
                <Button startIcon={<EditOutlined />} variant="contained" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              )}
              {!isSelf && (
                <>
                  <Button
                    variant={followStatus?.following ? "outlined" : "contained"}
                    color="primary"
                    startIcon={followStatus?.following ? <HowToReg /> : <PersonAddAlt1 />}
                    onClick={() => followToggle.mutate()}
                    disabled={followToggle.isPending}
                  >
                    {followStatus?.following ? "Following" : "Add friend"}
                  </Button>
                  <Button variant="outlined" onClick={() => startDm.mutate(profile.id)} disabled={startDm.isPending}>
                    Send Message
                  </Button>
                </>
              )}
            </Stack>
          </Stack>

          <Box sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight={800}>
              {profile.name || profile.username}
            </Typography>
            <Typography color="text.secondary">@{profile.username}</Typography>
            {isSelf && profile.email && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {profile.email}
              </Typography>
            )}
            {!isSelf && profile.bio && (
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                {profile.bio}
              </Typography>
            )}
            {!isSelf && profile.location && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {profile.location}
              </Typography>
            )}
            {!isSelf && profile.interests && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Interests: {profile.interests}
              </Typography>
            )}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <CalendarMonthOutlined fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </Typography>
            </Stack>
          </Box>

          {isSelf && editing && (
            <Stack spacing={2} sx={{ mt: 3 }}>
              <TextField label="Full Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
              <TextField label="Bio" fullWidth multiline minRows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
              <TextField label="Location" fullWidth value={locationState} onChange={(e) => setLocationState(e.target.value)} />
              <TextField
                label="Interests (comma separated)"
                fullWidth
                placeholder="Photography, Travel, Technology"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
              <Stack direction="row" spacing={2}>
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={() => save.mutate()} disabled={save.isPending}>
                  Save Profile
                </Button>
                <Button color="inherit" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight={700} sx={{ mt: 3, mb: 2 }}>
        Posts
      </Typography>
      {userPosts.isLoading && <Typography color="text.secondary">Loading posts…</Typography>}
      {postItems.length === 0 && !userPosts.isLoading && (
        <Typography color="text.secondary">No posts yet.</Typography>
      )}
      <Stack spacing={2}>
        {postItems.map((post) => (
          <PostCard key={post.id} post={post} onLike={(id) => toggleLike.mutate(id)} />
        ))}
      </Stack>
      <Box ref={loadMoreRef} sx={{ height: 24 }} />
      {userPosts.isFetchingNextPage && (
        <Typography align="center" color="text.secondary">
          Loading…
        </Typography>
      )}
    </Box>
  );
}
