import Script from "next/script";

const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? "788ea4f5-f00f-494e-8c47-91462e8fe9d2";

export const UmamiAnalytics = () => {
	return (
		<Script
			src="https://analytics.lacy.sh/script.js"
			data-website-id={WEBSITE_ID}
			defer
		/>
	);
};
