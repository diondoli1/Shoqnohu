import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "./context/AuthContext";
import { routes } from "./config/routes";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { FeedPage } from "./pages/FeedPage";
import { EventsPage } from "./pages/EventsPage";
import { GroupsPage } from "./pages/GroupsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SupportPage } from "./pages/SupportPage";

function Protected() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) {
    return <Navigate to={routes.login} replace />;
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export function App() {
  return (
    <Routes>
      <Route path={routes.login} element={<LoginPage />} />
      <Route path={routes.signup} element={<SignupPage />} />
      <Route element={<Protected />}>
        <Route path={routes.feed} element={<FeedPage />} />
        <Route path={routes.events} element={<EventsPage />} />
        <Route path={routes.groups} element={<GroupsPage />} />
        <Route path={routes.messages} element={<MessagesPage />} />
        <Route path={routes.profile} element={<ProfilePage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path={routes.support} element={<SupportPage />} />
      </Route>
      <Route path="*" element={<Navigate to={routes.feed} replace />} />
    </Routes>
  );
}
