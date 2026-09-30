import { extractProjectTags, extractWorkTags } from "./resume-tags";
import type { ResumeSchema, SectionKey } from "./resume-types";

export interface FilterState {
  sections: Record<SectionKey, boolean>;
  selectedTags: string[];
  tagMatchMode: "any" | "all";
  dateRange: { from: Date | null; to: Date | null };
  activePreset: string | null;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  sections: {
    work: true,
    projects: true,
    skills: true,
    education: true,
    interests: true,
    awards: true,
    references: true,
  },
  selectedTags: [],
  tagMatchMode: "any",
  dateRange: { from: null, to: null },
  activePreset: "all",
};

export interface MatchResult {
  matched: boolean;
  score: number; // 0-1, for partial dimming
}

function isInDateRange(
  startDate: string,
  endDate: string | undefined,
  range: FilterState["dateRange"]
): boolean {
  if (!range.from && !range.to) return true;

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  if (range.from && end < range.from) return false;
  if (range.to && start > range.to) return false;

  return true;
}

function matchesTags(
  entryTags: string[],
  selectedTags: string[],
  mode: "any" | "all"
): MatchResult {
  if (selectedTags.length === 0) return { matched: true, score: 1 };

  const entrySet = new Set(entryTags.map((t) => t.toLowerCase()));
  const matchCount = selectedTags.filter((t) => entrySet.has(t.toLowerCase())).length;

  if (mode === "any") {
    return {
      matched: matchCount > 0,
      score: matchCount / selectedTags.length,
    };
  }

  return {
    matched: matchCount === selectedTags.length,
    score: matchCount / selectedTags.length,
  };
}

export function computeWorkMatches(
  data: ResumeSchema,
  filters: FilterState
): Map<number, MatchResult> {
  const results = new Map<number, MatchResult>();
  const workTags = extractWorkTags(data.work);

  for (let i = 0; i < data.work.length; i++) {
    const entry = data.work[i];
    if (!entry) continue;
    const tags = workTags.get(i) ?? [];

    const dateMatch = isInDateRange(entry.startDate, entry.endDate, filters.dateRange);
    const tagMatch = matchesTags(tags, filters.selectedTags, filters.tagMatchMode);

    if (!dateMatch) {
      results.set(i, { matched: false, score: 0 });
    } else {
      results.set(i, tagMatch);
    }
  }

  return results;
}

export function computeProjectMatches(
  data: ResumeSchema,
  filters: FilterState
): Map<number, MatchResult> {
  const results = new Map<number, MatchResult>();
  const projectTags = extractProjectTags(data.projects);

  for (let i = 0; i < data.projects.length; i++) {
    const entry = data.projects[i];
    if (!entry) continue;
    const tags = projectTags.get(i) ?? [];

    const dateMatch = isInDateRange(entry.startDate, entry.endDate, filters.dateRange);
    const tagMatch = matchesTags(tags, filters.selectedTags, filters.tagMatchMode);

    if (!dateMatch) {
      results.set(i, { matched: false, score: 0 });
    } else {
      results.set(i, tagMatch);
    }
  }

  return results;
}
