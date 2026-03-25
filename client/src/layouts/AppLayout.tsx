import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  CalendarMonthOutlined,
  ChatBubbleOutline,
  ExitToApp,
  Groups2Outlined,
  HelpOutline,
  HomeOutlined,
  NotificationsNone,
  PersonOutline,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { routes } from "../config/routes";

const drawerWidth = 260;

const nav = [
  { label: "Feed", path: routes.feed, icon: <HomeOutlined /> },
  { label: "Events", path: routes.events, icon: <CalendarMonthOutlined /> },
  { label: "Groups", path: routes.groups, icon: <Groups2Outlined /> },
  { label: "Messages", path: routes.messages, icon: <ChatBubbleOutline /> },
  { label: "Profile", path: routes.profile, icon: <PersonOutline /> },
  { label: "Support", path: routes.support, icon: <HelpOutline /> },
];

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", "dropdown"],
    queryFn: async () => {
      const { data } = await api.get<NotificationItem[]>("/api/notifications?limit=5");
      return data;
    },
    refetchInterval: 60_000,
  });

  const unread = notifications.filter((n) => !n.read).length;

  const submitSearch = () => {
    const q = search.trim();
    if (!q) return;
    navigate(`${routes.feed}?q=${encodeURIComponent(q)}`);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "sidebarBg",
          },
        }}
      >
        <Box sx={{ px: 2.5, pt: 3, pb: 2 }}>
          <Typography variant="h5" color="primary" fontWeight={800}>
            Shoqnohu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect &amp; Share
          </Typography>
        </Box>
        <List sx={{ px: 1 }}>
          {nav.map((item) => {
            const selected =
              item.path === routes.feed
                ? location.pathname === routes.feed
                : location.pathname.startsWith(item.path);
            return (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                selected={selected}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: selected ? "primary.main" : "text.secondary" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: selected ? 600 : 400 }} />
              </ListItemButton>
            );
          })}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        <List sx={{ px: 1, py: 2 }}>
          <ListItemButton
            onClick={() => {
              logout();
              navigate(routes.login);
            }}
            sx={{ borderRadius: 2, color: "error.main" }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
              <ExitToApp />
            </ListItemIcon>
            <ListItemText primary="Sign Out" />
          </ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          color="inherit"
          sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
        >
          <Toolbar sx={{ gap: 2, py: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search users, posts, events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                maxWidth: 720,
                bgcolor: "grey.100",
                borderRadius: 999,
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} aria-label="Notifications">
              <Badge color="error" variant="dot" invisible={unread === 0}>
                <NotificationsNone />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={() => setNotifAnchor(null)}
              PaperProps={{ sx: { width: 320, maxHeight: 360 } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">Notifications</Typography>
              </Box>
              <Divider />
              {notifications.length === 0 ? (
                <MenuItem disabled>No notifications yet</MenuItem>
              ) : (
                notifications.map((n) => (
                  <MenuItem
                    key={n.id}
                    onClick={() => {
                      void api.post(`/api/notifications/${n.id}/read`);
                      setNotifAnchor(null);
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {n.title}
                      </Typography>
                      {n.body && (
                        <Typography variant="caption" color="text.secondary">
                          {n.body}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))
              )}
            </Menu>
            <Box
              component={Link}
              to={routes.profile}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Avatar src={user?.avatarUrl ?? undefined} sx={{ bgcolor: "secondary.main", width: 40, height: 40 }}>
                {(user?.name || user?.username || "?").slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {user?.name || user?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{user?.username}
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 3 }, flexGrow: 1 }}>{children}</Box>
      </Box>
    </Box>
  );
}
