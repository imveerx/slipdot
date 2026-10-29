import { createFileRoute } from "@tanstack/react-router";
import { SlipApp } from "@/components/slip/slip-app";

type Search = { room?: string; pin?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const raw = typeof search.room === "string" ? search.room.toUpperCase() : "";
    const pin = typeof search.pin === "string" && /^[0-9]{4}$/.test(search.pin) ? search.pin : undefined;
    return { room: /^[A-Z0-9]{4,8}$/.test(raw) ? raw : undefined, pin };
  },
  component: Home,
});

function Home() {
  const { room, pin } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SlipApp
      room={room}
      pin={pin}
      onRoom={(next, nextPin) => {
        void navigate({ search: { room: next, pin: next ? nextPin : undefined } });
      }}
    />
  );
}
