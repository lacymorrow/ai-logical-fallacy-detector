export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { constructMetadata } from "@/config/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Google Docs Integration",
  description: "View content imported from Google Docs.",
  noIndex: true,
});

export default async function DocPage() {
  // Dynamic import to avoid googleapis module evaluation at build time
  const { importGoogleDoc } = await import("./_components/google-docs");
  const { DocLayout } = await import("./_components/doc-layout");

  const { content, headings } = await importGoogleDoc(
    "1qhd9BN-6995ROtOktxFuMOcFyTzskRnVT1yTNRtJrXA"
  ).catch((error) => {
    console.error("Error importing Google Doc:", error);
    return { content: "", headings: [] };
  });

  return <DocLayout toc={headings}>{content}</DocLayout>;
}
