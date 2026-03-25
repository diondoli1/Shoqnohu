import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AccessTime,
  AddPhotoAlternateOutlined,
  CalendarMonth,
  Close,
  LocationOnOutlined,
  PeopleOutline,
} from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { api } from "../api/client";

/** Store paths as /uploads/… so they match API validation even if the server returns an absolute URL. */
function normalizeUploadUrl(url: string): string {
  const t = url.trim();
  if (t.startsWith("/uploads/")) return t;
  try {
    const u = new URL(t, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (u.pathname.startsWith("/uploads/")) return `${u.pathname}${u.search}`;
  } catch {
    /* ignore */
  }
  return t;
}

const categories = ["Social", "Networking", "Conference", "Workshop", "Sports", "Entertainment"] as const;

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  category: string;
  goingCount: number;
  interestedCount: number;
  myRsvp: "GOING" | "INTERESTED" | null;
  placeImages: string[];
};

export function EventsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Social");
  const [placeImageUrls, setPlaceImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErr,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await api.get<EventRow[]>("/api/events");
      return data;
    },
  });

  const uploadVenuePhoto = useCallback(async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{ url: string }>("/api/upload/image", fd);
      setPlaceImageUrls((prev) => [...prev, normalizeUploadUrl(data.url)]);
    } finally {
      setUploadingImage(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, []);

  const create = useMutation({
    mutationFn: async () => {
      const d = new Date(startsAt);
      if (Number.isNaN(d.getTime())) {
        throw new Error("Choose a valid date and time for the event.");
      }
      const placeImages = placeImageUrls.map(normalizeUploadUrl);
      await api.post("/api/events", {
        title: title.trim(),
        description: description || null,
        location: location || null,
        startsAt: d.toISOString(),
        category,
        placeImages,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setStartsAt("");
      setCategory("Social");
      setPlaceImageUrls([]);
    },
  });

  const rsvp = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "GOING" | "INTERESTED" }) => {
      await api.post(`/api/events/${id}/rsvp`, { status });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const canCreate =
    title.trim().length > 0 && Boolean(startsAt) && placeImageUrls.length >= 2 && !uploadingImage;

  const createErrorMessage = (() => {
    const err = create.error;
    if (!err) return null;
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data as { error?: unknown } | undefined;
      if (status === 400) {
        if (typeof data?.error === "string") return data.error;
        return "Could not create the event. Check the date and that venue photos uploaded correctly.";
      }
      if (status === 401) return "Sign in again and retry.";
      if (status && status >= 500) {
        return "Server error — run npm run db:sync in the project (adds event photos column), restart the API, and try again.";
      }
      return err.message || "Could not create the event.";
    }
    if (err instanceof Error) return err.message;
    return "Could not create the event.";
  })();

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Events
          </Typography>
          <Typography color="text.secondary">Discover and join events in your area</Typography>
        </Box>
        <Button variant="contained" onClick={() => setOpen(true)} sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}>
          + Create Event
        </Button>
      </Stack>

      {eventsLoading && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Loading events…
        </Typography>
      )}
      {eventsError && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error" sx={{ mb: 1 }}>
            {eventsErr instanceof Error ? eventsErr.message : "Could not load events."}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Check that the API is running and you are signed in. If your session expired, sign out and sign in again.
          </Typography>
          <Button variant="outlined" size="small" onClick={() => void refetchEvents()}>
            Retry
          </Button>
        </Box>
      )}

      <Stack spacing={2}>
        {!eventsLoading && !eventsError && events.length === 0 && (
          <Typography color="text.secondary">No events yet. Create one to get started.</Typography>
        )}
        {events.map((ev) => {
          const photos = ev.placeImages?.length ? ev.placeImages : [];
          const showGallery = photos.length >= 2;
          return (
            <Card key={ev.id}>
              {showGallery ? (
                <Stack direction="row" spacing={0} sx={{ height: { xs: 200, sm: 220 }, overflow: "hidden" }}>
                  {photos.slice(0, 4).map((url, i) => (
                    <Box
                      key={`${ev.id}-img-${i}`}
                      component="img"
                      src={url}
                      alt=""
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        objectFit: "cover",
                        height: "100%",
                      }}
                    />
                  ))}
                </Stack>
              ) : (
                <Box
                  sx={{
                    height: 140,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CalendarMonth sx={{ fontSize: 56, color: "common.white", opacity: 0.9 }} />
                </Box>
              )}
              <CardContent>
                <Typography variant="h6" fontWeight={700}>
                  {ev.title}
                </Typography>
                <Typography variant="caption" color="primary" fontWeight={600}>
                  {ev.category}
                </Typography>
                {ev.description && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {ev.description}
                  </Typography>
                )}
                <Stack spacing={0.5} sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AccessTime fontSize="small" color="action" />
                    <Typography variant="body2">{new Date(ev.startsAt).toLocaleString()}</Typography>
                  </Stack>
                  {ev.location && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LocationOnOutlined fontSize="small" color="action" />
                      <Typography variant="body2">{ev.location}</Typography>
                    </Stack>
                  )}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PeopleOutline fontSize="small" color="action" />
                    <Typography variant="body2">
                      {ev.goingCount} going · {ev.interestedCount} interested
                    </Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant={ev.myRsvp === "GOING" ? "contained" : "outlined"}
                    onClick={() => rsvp.mutate({ id: ev.id, status: "GOING" })}
                  >
                    Going
                  </Button>
                  <Button
                    variant={ev.myRsvp === "INTERESTED" ? "contained" : "outlined"}
                    onClick={() => rsvp.mutate({ id: ev.id, status: "INTERESTED" })}
                  >
                    Interested
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          create.reset();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Event Title"
              fullWidth
              placeholder="Summer Networking Meetup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              placeholder="Tell people about your event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField
              label="Location"
              fullWidth
              placeholder="123 Main St, City, State"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <TextField
              label="Date & Time"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <TextField select label="Category" fullWidth value={category} onChange={(e) => setCategory(e.target.value as (typeof categories)[number])}>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                Venue photos (required)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Add at least 2 photos of the place so others can see the venue. You can add more.
              </Typography>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void uploadVenuePhoto(e.target.files?.[0] ?? null)}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddPhotoAlternateOutlined />}
                onClick={() => fileRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? "Uploading…" : "Add photo"}
              </Button>
              {placeImageUrls.length > 0 && (
                <Typography variant="caption" color={placeImageUrls.length >= 2 ? "success.main" : "warning.main"} sx={{ display: "block", mt: 1 }}>
                  {placeImageUrls.length} photo{placeImageUrls.length === 1 ? "" : "s"}
                  {placeImageUrls.length < 2 ? " — add at least one more" : " — ready"}
                </Typography>
              )}
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
                {placeImageUrls.map((url, idx) => (
                  <Box key={`${url}-${idx}`} sx={{ position: "relative" }}>
                    <Box
                      component="img"
                      src={url}
                      alt=""
                      sx={{ width: 96, height: 72, borderRadius: 1, objectFit: "cover", border: "1px solid", borderColor: "divider" }}
                    />
                    <IconButton
                      size="small"
                      aria-label="Remove photo"
                      onClick={() => setPlaceImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                      sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        bgcolor: "background.paper",
                        boxShadow: 1,
                        "&:hover": { bgcolor: "background.paper" },
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>
            {createErrorMessage && (
              <Typography variant="body2" color="error" role="alert">
                {createErrorMessage}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            type="button"
            onClick={() => {
              setOpen(false);
              create.reset();
            }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void create.mutateAsync().catch(() => undefined)}
            disabled={!canCreate || create.isPending}
            variant="contained"
          >
            {create.isPending ? "Creating…" : "Create Event"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
