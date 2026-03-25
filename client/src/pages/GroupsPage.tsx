import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  MenuList,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ChatBubbleOutline, Groups2, KeyboardArrowDown, Public } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  privacy: "PUBLIC" | "PRIVATE";
  memberCount: number;
  isMember: boolean;
  conversationId: string | null;
};

type GroupDetailDto = {
  id: string;
  name: string;
  conversationId: string | null;
  members: { id: string; username: string; name: string | null; avatarUrl: string | null }[];
};

export function GroupsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuGroupId, setMenuGroupId] = useState<string | null>(null);

  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data } = await api.get<GroupRow[]>("/api/groups");
      return data;
    },
  });

  const groupDetail = useQuery({
    queryKey: ["group-detail", menuGroupId],
    enabled: Boolean(menuGroupId),
    queryFn: async () => {
      const id = menuGroupId!;
      const { data } = await api.get<GroupDetailDto>(`/api/groups/${encodeURIComponent(id)}/detail`);
      return data;
    },
  });

  const openJoinedMenu = (event: React.MouseEvent<HTMLElement>, groupId: string) => {
    setMenuAnchor(event.currentTarget);
    setMenuGroupId(groupId);
  };

  const closeJoinedMenu = () => {
    setMenuAnchor(null);
    setMenuGroupId(null);
  };

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/api/groups", {
        name,
        description: description || null,
        category: category || null,
        privacy,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      setOpen(false);
      setName("");
      setDescription("");
      setCategory("");
      setPrivacy("PUBLIC");
    },
  });

  const join = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ joined: boolean; memberCount: number; conversationId: string | null }>(
        `/api/groups/${id}/join`
      );
      return { id, ...data };
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["group-detail", res.id] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const goToGroupChat = (conversationId: string | null) => {
    if (!conversationId) return;
    closeJoinedMenu();
    navigate(`/messages?c=${encodeURIComponent(conversationId)}`);
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Groups
          </Typography>
          <Typography color="text.secondary">Connect with people who share your interests</Typography>
        </Box>
        <Button variant="contained" onClick={() => setOpen(true)}>
          + Create Group
        </Button>
      </Stack>

      {groups.length === 0 ? (
        <Card variant="outlined" sx={{ py: 8, textAlign: "center" }}>
          <Groups2 sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary">No groups yet. Create the first one!</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {groups.map((g) => (
            <Card key={g.id}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" spacing={2}>
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: 2,
                        background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Groups2 sx={{ color: "common.white" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {g.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {g.category || "General"}
                      </Typography>
                      {g.description ? (
                        <Typography variant="body2" sx={{ mt: 1, maxWidth: 560 }}>
                          {g.description}
                        </Typography>
                      ) : null}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {g.memberCount} members
                      </Typography>
                    </Box>
                  </Stack>
                  <Public fontSize="small" color="action" titleAccess={g.privacy === "PUBLIC" ? "Public" : "Private"} />
                </Stack>
                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                  {g.isMember ? (
                    <Button
                      variant="outlined"
                      color="primary"
                      endIcon={<KeyboardArrowDown />}
                      onClick={(e) => openJoinedMenu(e, g.id)}
                    >
                      Joined
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={() => join.mutate(g.id)} disabled={join.isPending}>
                      Join Group
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor) && Boolean(menuGroupId)}
        onClose={closeJoinedMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 280, maxWidth: 360 } } }}
      >
        <MenuList dense autoFocusItem>
          {groupDetail.isPending && (
            <MenuItem disabled sx={{ justifyContent: "center", py: 2 }}>
              <CircularProgress size={22} />
            </MenuItem>
          )}
          {groupDetail.isError && (
            <MenuItem disabled>
              <Typography color="error" variant="body2">
                Could not load group details.
              </Typography>
            </MenuItem>
          )}
          {groupDetail.data && (
            <>
              <MenuItem
                onClick={() => goToGroupChat(groupDetail.data.conversationId)}
                disabled={!groupDetail.data.conversationId}
              >
                <ListItemIcon>
                  <ChatBubbleOutline fontSize="small" />
                </ListItemIcon>
                Group chat
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem disabled sx={{ opacity: 1, py: 0.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Members ({groupDetail.data.members.length})
                </Typography>
              </MenuItem>
              {groupDetail.data.members.map((m) => (
                <MenuItem
                  key={m.id}
                  sx={{ py: 1, pointerEvents: "none", cursor: "default" }}
                  tabIndex={-1}
                >
                  <Avatar src={m.avatarUrl ?? undefined} sx={{ width: 32, height: 32, mr: 1.5 }}>
                    {m.username.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {m.name || m.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      @{m.username}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </>
          )}
        </MenuList>
      </Menu>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Group Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField
              label="Category"
              fullWidth
              placeholder="Gaming, Sports..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <TextField select label="Privacy" fullWidth value={privacy} onChange={(e) => setPrivacy(e.target.value as "PUBLIC" | "PRIVATE")}>
              <MenuItem value="PUBLIC">Public — Anyone can join</MenuItem>
              <MenuItem value="PRIVATE">Private — Approval required</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending} variant="contained">
            Create Group
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
