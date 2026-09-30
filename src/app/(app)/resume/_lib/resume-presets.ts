import type { SectionKey } from "./resume-types";

export interface FilterPreset {
  id: string;
  label: string;
  description: string;
  tags: string[];
  sections: Record<SectionKey, boolean>;
}

const ALL_SECTIONS: Record<SectionKey, boolean> = {
  work: true,
  projects: true,
  skills: true,
  education: true,
  interests: true,
  awards: true,
  references: true,
};

export const PRESETS: FilterPreset[] = [
  {
    id: "all",
    label: "Complete Resume",
    description: "Show everything",
    tags: [],
    sections: ALL_SECTIONS,
  },
  {
    id: "frontend",
    label: "Frontend Developer",
    description: "React, Next.js, TypeScript focused",
    tags: [
      "React",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "Vue",
      "Svelte",
      "Tailwind",
      "SASS",
      "Angular",
      "Astro",
    ],
    sections: { ...ALL_SECTIONS, interests: false, references: false },
  },
  {
    id: "fullstack",
    label: "Full Stack Engineer",
    description: "Frontend + Backend + DevOps",
    tags: [
      "React",
      "Next.js",
      "TypeScript",
      "Node.js",
      "Python",
      "Django",
      "PostgreSQL",
      "Docker",
      "AWS",
    ],
    sections: { ...ALL_SECTIONS, interests: false },
  },
  {
    id: "devops",
    label: "DevOps Engineer",
    description: "Infrastructure, Docker, AWS, CI/CD",
    tags: ["Docker", "AWS", "Azure", "CI/CD", "Jenkins", "Linux", "Vercel", "Netlify"],
    sections: { ...ALL_SECTIONS, interests: false, references: false },
  },
  {
    id: "ai",
    label: "AI / Agentic Engineer",
    description: "AI, LLMs, and agentic systems",
    tags: ["Python", "Rust", "Tauri", "TypeScript", "Docker", "AWS"],
    sections: { ...ALL_SECTIONS },
  },
  {
    id: "mobile",
    label: "Mobile Developer",
    description: "React Native, Flutter, cross-platform",
    tags: ["React Native", "Flutter", "TypeScript", "React", "Swift"],
    sections: {
      ...ALL_SECTIONS,
      interests: false,
      references: false,
      awards: false,
    },
  },
];
