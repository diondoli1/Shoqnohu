import {
  Box,
  Button,
  Container,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { EmailOutlined, LockOutlined, PersonOutline } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { routes } from "../config/routes";

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(username.trim(), email.trim(), password);
      navigate(routes.feed, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
          setError(
            "Cannot reach the API. Start the backend: open a terminal in the project folder and run \"npm run dev\" (or run the server on port 4000), then try again."
          );
        } else {
          const data = err.response?.data as { error?: unknown } | undefined;
          const apiErr = data?.error;
          const msg =
            typeof apiErr === "string"
              ? apiErr
              : err.response?.status === 409
                ? "Username or email already taken."
                : err.response?.status === 400
                  ? "Check your email format and password (at least 6 characters)."
                  : "Could not create account. If the problem continues, confirm PostgreSQL is running and DATABASE_URL in server/.env is correct, then run: cd server && npx prisma db push";
          setError(msg);
        }
      } else {
        setError("Could not create account. Try again.");
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
          <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={800}>
              Join Shoqnohu
            </Typography>
            <Typography color="text.secondary" textAlign="center">
              Create your account and start connecting
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
                  Email
                </Typography>
                <TextField
                  fullWidth
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  InputProps={{
                    startAdornment: (
                      <EmailOutlined sx={{ mr: 1, color: "action.active" }} fontSize="small" />
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
                Sign Up
              </Button>
            </Stack>
          </form>
          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Or continue with
            </Typography>
          </Divider>
          <Button fullWidth variant="outlined" color="inherit" disabled sx={{ mb: 2 }}>
            Sign up with Google (coming soon)
          </Button>
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Already have an account?{" "}
            <MuiLink component={Link} to={routes.login} fontWeight={700} underline="hover">
              Sign in
            </MuiLink>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
