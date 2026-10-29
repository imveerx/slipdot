import { createFileRoute } from "@tanstack/react-router";
import { handleSlipMail } from "@/lib/transfer/relay.server";

const handle = ({ request }: { request: Request }) => handleSlipMail(request);

export const Route = createFileRoute("/api/slip")({
  server: { handlers: { GET: handle, POST: handle } },
});
