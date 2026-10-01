import type { ReactNode } from "react";

// The site header (logo + theme toggle) comes from the root layout, so legal
// pages render their content directly.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
