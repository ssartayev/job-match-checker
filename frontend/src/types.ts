export type Status = "covered" | "partial" | "missing";

export interface Requirement {
  requirement: string;
  score: number;
  evidence: string;
  status: Status;
}

export interface MatchResult {
  overall_score: number;
  covered: number;
  total: number;
  requirements: Requirement[];
}
