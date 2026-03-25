/**
 * App route inventory (maps to plan screens and mockups).
 */
export const routes = {
  login: "/login",
  signup: "/signup",
  feed: "/",
  events: "/events",
  groups: "/groups",
  messages: "/messages",
  profile: "/profile",
  profileUser: (username: string) => `/profile/${encodeURIComponent(username)}`,
  support: "/support",
} as const;
