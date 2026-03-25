import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { EmailOutlined, ExpandMore, HelpOutline } from "@mui/icons-material";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

const categories = [
  "All",
  "Getting Started",
  "Account",
  "Posts",
  "Events",
  "Groups",
  "Safety",
  "Privacy",
  "Messaging",
] as const;

type Faq = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

export function SupportPage() {
  const [filter, setFilter] = useState<string>("All");

  const { data: faqs = [] } = useQuery({
    queryKey: ["support-faqs"],
    queryFn: async () => {
      const { data } = await api.get<Faq[]>("/api/support/faqs");
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (filter === "All") return faqs;
    return faqs.filter((f) => f.category === filter);
  }, [faqs, filter]);

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: "primary.light",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HelpOutline sx={{ fontSize: 40, color: "primary.main" }} />
        </Box>
        <Typography variant="h4" fontWeight={800}>
          Support Center
        </Typography>
        <Typography color="text.secondary">Find answers to common questions</Typography>
      </Stack>

      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 3 }}>
        {categories.map((c) => (
          <Chip
            key={c}
            label={c}
            color={filter === c ? "primary" : "default"}
            onClick={() => setFilter(c)}
            sx={{ fontWeight: filter === c ? 700 : 400 }}
          />
        ))}
      </Stack>

      <Stack spacing={1}>
        {filtered.map((item) => (
          <Accordion key={item.id} defaultExpanded={filter !== "All"}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ width: "100%", pr: 1 }}>
                <HelpOutline color="primary" fontSize="small" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography fontWeight={700}>{item.question}</Typography>
                  <Chip size="small" label={item.category} sx={{ mt: 0.5 }} variant="outlined" />
                </Box>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">{item.answer}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      <Box
        sx={{
          mt: 4,
          p: 3,
          borderRadius: 3,
          bgcolor: "primary.light",
          textAlign: "center",
        }}
      >
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Still need help?
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Can&apos;t find what you&apos;re looking for? Email us or use the button below.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
          <EmailOutlined fontSize="small" color="primary" />
          <Link href="mailto:bonevet_ai@bonevet.org" fontWeight={700} underline="hover" color="primary">
            bonevet_ai@bonevet.org
          </Link>
        </Stack>
        <Button
          variant="contained"
          size="large"
          href="mailto:bonevet_ai@bonevet.org?subject=Shoqnohu%20support"
          component="a"
        >
          Contact Support
        </Button>
      </Box>
    </Box>
  );
}
