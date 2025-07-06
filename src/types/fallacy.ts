export interface LogicalFallacy {
	type: FallacyType;
	description: string;
	startIndex: number;
	endIndex: number;
	explanation: string;
	confidence: number;
}

export enum FallacyType {
	AdHominem = "AD_HOMINEM",
	StrawMan = "STRAW_MAN",
	FalseEquivalence = "FALSE_EQUIVALENCE",
	AppealToAuthority = "APPEAL_TO_AUTHORITY",
	SlipperySlope = "SLIPPERY_SLOPE",
	FalseDichotomy = "FALSE_DICHOTOMY",
	CircularReasoning = "CIRCULAR_REASONING",
	HastyGeneralization = "HASTY_GENERALIZATION",
	AppealToEmotion = "APPEAL_TO_EMOTION",
	RedHerring = "RED_HERRING",
}

export interface AnalysisResult {
	text: string;
	fallacies: LogicalFallacy[];
	analysisId: string;
	timestamp: Date;
	isFinalResult?: boolean;
}

export interface AnnotatedText {
	text: string;
	annotations: LogicalFallacy[];
}
