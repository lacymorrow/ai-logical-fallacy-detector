export interface ResumeSchema {
  basics: ResumeBasics;
  work: ResumeWork[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  skills: ResumeSkill[];
  interests: ResumeInterest[];
  awards: ResumeAward[];
  references: ResumeReference[];
  languages: ResumeLanguage[];
}

export interface ResumeBasics {
  name: string;
  label: string;
  image: string;
  email: string;
  phone: string;
  url: string;
  summary: string;
  location: {
    countryCode: string;
    city: string;
    state: string;
    address: string;
  };
  profiles: {
    network: string;
    username: string;
    url: string;
  }[];
}

export interface ResumeWork {
  name: string;
  position: string;
  startDate: string;
  endDate?: string;
  summary: string;
  url?: string;
  location?: string;
  highlights?: string[];
}

export interface ResumeProject {
  name: string;
  startDate: string;
  endDate?: string;
  summary: string;
  url?: string;
  highlights?: string[];
}

export interface ResumeEducation {
  institution: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate: string;
  score: string;
  courses: string[];
}

export interface ResumeSkill {
  name: string;
  level: string;
  keywords: string[];
}

export interface ResumeInterest {
  name: string;
}

export interface ResumeAward {
  title: string;
  awarder: string;
  date: string;
}

export interface ResumeReference {
  reference: string;
  name: string;
}

export interface ResumeLanguage {
  language: string;
  fluency: string;
}

export type SectionKey =
  "work" | "projects" | "skills" | "education" | "interests" | "awards" | "references";
