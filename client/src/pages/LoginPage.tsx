import {
  Box,
  Button,
  Container,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LockOutlined, PersonOutline } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { routes } from "../config/routes";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(routes.feed, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
          setError(
            "Cannot reach the API. Start the backend (e.g. npm run dev from the project root so the server runs on port 4000), then try again."
          );
        } else if (err.response?.status === 401) {
          setError("Invalid username or password. Usernames ignore capital letters; check for extra spaces.");
        } else if (err.response?.status && err.response.status >= 500) {
          setError("Server error. Confirm PostgreSQL is running and DATABASE_URL in server/.env is correct.");
        } else {
          setError("Could not sign in. Try again.");
        }
      } else {
        setError("Could not sign in. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #4facfe 0%, #667eea 45%, #f093fb 100%)",
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={8} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
          <Stack spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={800}>
              Shoqnohu
            </Typography>
            <Typography color="text.secondary" textAlign="center">
              Connect, Share, Meet
            </Typography>
          </Stack>
          <form onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Username
                </Typography>
                <TextField
                  fullWidth
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  InputProps={{
                    startAdornment: (
                      <PersonOutline sx={{ mr: 1, color: "action.active" }} fontSize="small" />
                    ),
                  }}
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Password
                </Typography>
                <TextField
                  fullWidth
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  InputProps={{
                    startAdornment: (
                      <LockOutlined sx={{ mr: 1, color: "action.active" }} fontSize="small" />
                    ),
                  }}
                />
              </Box>
              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}
              <Button type="submit" size="large" disabled={loading} fullWidth>
                Sign In
              </Button>
            </Stack>
          </form>
          <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }} color="text.secondary">
            Don&apos;t have an account?{" "}
            <MuiLink component={Link} to={routes.signup} fontWeight={700} underline="hover">
              Sign up
            </MuiLink>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
