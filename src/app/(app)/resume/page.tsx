import type { Metadata } from "next";
import { constructMetadata } from "@/config/metadata";
import { ResumeViewer } from "./_components/resume-viewer";
import { resumeData } from "./_lib/resume-data";

export const metadata: Metadata = constructMetadata({
  title: "Resume - Lacy Morrow",
  description:
    "Interactive resume with filtering by role, technology, and date range. Export custom versions as PDF.",
});

export default function ResumePage() {
  return <ResumeViewer data={resumeData} />;
}
