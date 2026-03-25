import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    sidebarBg: string;
  }
  interface PaletteOptions {
    sidebarBg?: string;
  }
}

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#7c4dff" },
    error: { main: "#d32f2f" },
    background: { default: "#f5f7fa", paper: "#ffffff" },
    sidebarBg: "#ffffff",
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { variant: "contained", disableElevation: true },
      styleOverrides: { root: { textTransform: "none", borderRadius: 999 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
  },
});
