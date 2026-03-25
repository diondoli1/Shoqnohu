import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Groups2 } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

type ConvRow = {
  id: string;
  other: { id: string; username: string; name: string | null; avatarUrl: string | null } | undefined;
  group: { id: string; name: string } | null;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  updatedAt: string;
};

type Msg = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; username: string; name: string | null; avatarUrl: string | null };
};

type FriendUser = {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
};

export function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get("c") ?? "";
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");

  const { data: friends = [], isFetching: friendsLoading } = useQuery({
    queryKey: ["following-for-messages", q],
    queryFn: async () => {
      const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const { data } = await api.get<FriendUser[]>(`/api/follow/following${params}`);
      return data;
    },
    enabled: q.trim().length >= 1,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", q],
    queryFn: async () => {
      const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const { data } = await api.get<ConvRow[]>(`/api/messages/conversations${params}`);
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeId],
    enabled: Boolean(activeId),
    queryFn: async () => {
      const { data } = await api.get<Msg[]>(`/api/messages/conversations/${activeId}/messages`);
      return data;
    },
  });

  const openOrCreate = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post<{ id: string }>("/api/messages/conversations", { userId });
      return data.id;
    },
    onSuccess: (conversationId) => {
      setSearchParams({ c: conversationId });
      setQ("");
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      await api.post(`/api/messages/conversations/${activeId}/messages`, { content: draft });
    },
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["messages", activeId] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  useEffect(() => {
    if (activeId || conversations.length === 0) return;
    setSearchParams({ c: conversations[0].id }, { replace: true });
  }, [activeId, conversations, setSearchParams]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId), [conversations, activeId]);
  const isGroupChat = Boolean(active?.group);

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>
        Messages
      </Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch" sx={{ minHeight: 520 }}>
        <Paper sx={{ width: { xs: "100%", md: 360 }, p: 2, display: "flex", flexDirection: "column" }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            Find a friend
          </Typography>
          <Autocomplete<FriendUser, false, false, false>
            value={null}
            onChange={(_, v) => {
              if (v) openOrCreate.mutate(v.id);
            }}
            onInputChange={(_, v) => setQ(v)}
            inputValue={q}
            options={friends}
            loading={friendsLoading}
            getOptionLabel={(o) => o.name || o.username}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={(x) => x}
            noOptionsText={
              q.trim().length < 1
                ? "Type a name or username"
                : friendsLoading
                  ? "Loading…"
                  : "No one you follow matches. Follow people from their profile, then message them here."
            }
            renderOption={(props, u) => (
              <li {...props}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
                  <Avatar src={u.avatarUrl ?? undefined} sx={{ width: 40, height: 40 }}>
                    {u.username.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {u.name || u.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      @{u.username}
                    </Typography>
                  </Box>
                </Stack>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Type a friend’s username…"
                helperText="Shows people you follow. Select one to open the chat."
              />
            )}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Conversations
          </Typography>
          <List dense sx={{ flex: 1, overflow: "auto" }}>
            {conversations.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No conversations yet. Pick a friend above.
              </Typography>
            ) : (
              conversations.map((c) => (
                <ListItemButton
                  key={c.id}
                  selected={c.id === activeId}
                  onClick={() => setSearchParams({ c: c.id })}
                >
                  <ListItemAvatar>
                    {c.group ? (
                      <Avatar sx={{ bgcolor: "success.main" }}>
                        <Groups2 sx={{ fontSize: 22, color: "common.white" }} />
                      </Avatar>
                    ) : (
                      <Avatar src={c.other?.avatarUrl ?? undefined}>
                        {c.other?.username?.slice(0, 1).toUpperCase() ?? "?"}
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={c.group?.name ?? (c.other?.name || c.other?.username) ?? "Conversation"}
                    secondary={
                      <>
                        {c.group ? (
                          <>Group · {c.lastMessage?.content?.slice(0, 48) ?? "No messages yet"}</>
                        ) : (
                          <>
                            {c.other?.name ? `@${c.other.username} · ` : ""}
                            {c.lastMessage?.content?.slice(0, 48) ?? "No messages yet"}
                          </>
                        )}
                      </>
                    }
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Paper>
        <Paper sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column" }}>
          {!activeId ? (
            <Box sx={{ m: "auto", textAlign: "center" }}>
              <Typography color="text.secondary">
                Select a conversation or choose a friend from the search above.
              </Typography>
            </Box>
          ) : (
            <>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                {isGroupChat ? (
                  <Avatar sx={{ bgcolor: "success.main" }}>
                    <Groups2 sx={{ fontSize: 24, color: "common.white" }} />
                  </Avatar>
                ) : (
                  <Avatar src={active?.other?.avatarUrl ?? undefined}>
                    {active?.other?.username?.slice(0, 1).toUpperCase()}
                  </Avatar>
                )}
                <Box>
                  <Typography fontWeight={700}>
                    {active?.group?.name ?? active?.other?.name ?? active?.other?.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isGroupChat ? "Group chat" : `@${active?.other?.username}`}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ flex: 1, overflow: "auto", pr: 1 }}>
                <Stack spacing={1.5}>
                  {messages.map((m) => {
                    const mine = m.sender.id === user?.id;
                    return (
                      <Stack
                        key={m.id}
                        spacing={0.25}
                        alignItems={mine ? "flex-end" : "flex-start"}
                        sx={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "100%" }}
                      >
                        {isGroupChat && (
                          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                            {mine ? "You" : `@${m.sender.username}`}
                          </Typography>
                        )}
                        <Stack direction="row" justifyContent={mine ? "flex-end" : "flex-start"} sx={{ width: "100%" }}>
                          <Box
                            sx={{
                              maxWidth: "80%",
                              bgcolor: mine ? "primary.light" : "grey.100",
                              color: mine ? "primary.contrastText" : "text.primary",
                              px: 2,
                              py: 1,
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="body2">{m.content}</Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (draft.trim()) send.mutate();
                    }
                  }}
                />
                <Button variant="contained" disabled={!draft.trim() || send.isPending} onClick={() => send.mutate()}>
                  Send
                </Button>
              </Stack>
            </>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
