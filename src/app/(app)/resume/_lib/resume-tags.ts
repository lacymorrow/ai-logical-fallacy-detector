import type { ResumeSchema } from "./resume-types";

const TAG_ALIASES: Record<string, string> = {
  nextjs: "Next.js",
  "next.js": "Next.js",
  reactjs: "React",
  "react.js": "React",
  "react native": "React Native",
  "react-native": "React Native",
  typescript: "TypeScript",
  javascript: "JavaScript",
  nodejs: "Node.js",
  "node.js": "Node.js",
  node: "Node.js",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  "aws ec2": "AWS",
  "g cloud": "GCP",
  scss: "SASS",
  sass: "SASS",
  "styled components": "CSS",
  tailwind: "Tailwind",
  webpack: "Webpack",
  docker: "Docker",
  python: "Python",
  django: "Django",
  flask: "Flask",
  php: "PHP",
  laravel: "Laravel",
  wordpress: "WordPress",
  electron: "Electron",
  tauri: "Tauri",
  rust: "Rust",
  swift: "Swift",
  go: "Go",
  vue: "Vue",
  svelte: "Svelte",
  angular: "Angular",
  astro: "Astro",
  graphql: "GraphQL",
  selenium: "Selenium",
  jenkins: "Jenkins",
  figma: "Figma",
  stripe: "Stripe",
  contentful: "Contentful",
  algolia: "Algolia",
  flutter: "Flutter",
  sequelizejs: "Sequelize",
  "nw.js": "NW.js",
  wagtail: "Wagtail",
  "ci/cd": "CI/CD",
  regex: "Regex",
  cron: "Cron",
  azure: "Azure",
  linux: "Linux",
  apache: "Apache",
  redis: "Redis",
  "react query": "React Query",
  jotai: "Jotai",
  zustand: "Zustand",
};

function normalize(tag: string): string {
  const lower = tag.trim().toLowerCase();
  return TAG_ALIASES[lower] ?? tag.trim();
}

// Known tech terms to look for in summaries
const KNOWN_TAGS = new Set([
  "TypeScript",
  "JavaScript",
  "React",
  "React Native",
  "Next.js",
  "Vue",
  "Svelte",
  "Angular",
  "Astro",
  "Node.js",
  "Python",
  "PHP",
  "Rust",
  "Swift",
  "Go",
  "Docker",
  "AWS",
  "Azure",
  "GCP",
  "Electron",
  "Tauri",
  "Flutter",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Django",
  "Flask",
  "Laravel",
  "WordPress",
  "Wagtail",
  "GraphQL",
  "Selenium",
  "Jenkins",
  "Figma",
  "Stripe",
  "Contentful",
  "Algolia",
  "SASS",
  "Tailwind",
  "Webpack",
  "CI/CD",
  "Linux",
  "Apache",
  "Sequelize",
  "NW.js",
  "React Query",
  "Tachyons",
  "Datadog",
  "Netlify",
  "Vercel",
  "Heroku",
  "Cron",
  "Regex",
]);

function extractTagsFromText(text: string): string[] {
  const tags = new Set<string>();

  // Split on common delimiters
  const parts = text.split(/[,;|]/);

  for (const part of parts) {
    const trimmed = part.trim();
    // Check for known tags (case-insensitive)
    for (const known of KNOWN_TAGS) {
      if (trimmed.toLowerCase().includes(known.toLowerCase())) {
        tags.add(known);
      }
    }
    // Also normalize any terms that match aliases
    const normalized = normalize(trimmed);
    if (KNOWN_TAGS.has(normalized)) {
      tags.add(normalized);
    }
  }

  return Array.from(tags);
}

export function extractWorkTags(work: ResumeSchema["work"]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (let i = 0; i < work.length; i++) {
    const entry = work[i];
    if (!entry) continue;
    const tags = extractTagsFromText(entry.summary);
    if (entry.highlights) {
      for (const h of entry.highlights) {
        tags.push(...extractTagsFromText(h));
      }
    }
    map.set(i, [...new Set(tags)]);
  }
  return map;
}

export function extractProjectTags(projects: ResumeSchema["projects"]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (let i = 0; i < projects.length; i++) {
    const entry = projects[i];
    if (!entry) continue;
    const tags = extractTagsFromText(entry.summary);
    if (entry.highlights) {
      for (const h of entry.highlights) {
        tags.push(...extractTagsFromText(h));
      }
    }
    map.set(i, [...new Set(tags)]);
  }
  return map;
}

export function getAllTags(data: ResumeSchema): string[] {
  const all = new Set<string>();

  // From skills
  for (const skill of data.skills) {
    for (const kw of skill.keywords) {
      const n = normalize(kw);
      if (KNOWN_TAGS.has(n)) all.add(n);
    }
  }

  // From work
  const workTags = extractWorkTags(data.work);
  for (const tags of workTags.values()) {
    for (const t of tags) all.add(t);
  }

  // From projects
  const projectTags = extractProjectTags(data.projects);
  for (const tags of projectTags.values()) {
    for (const t of tags) all.add(t);
  }

  return Array.from(all).sort();
}
