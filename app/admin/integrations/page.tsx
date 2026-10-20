import React from "react";
import { IntegrationsManager } from "@/components/admin/integrations-manager";

export const metadata = {
  title: "External Integrations | Verifi Admin Console",
  description: "Register and manage relying party verifier applications, API keys, and session parameters.",
};

export default function AdminIntegrationsPage() {
  return <IntegrationsManager />;
}
