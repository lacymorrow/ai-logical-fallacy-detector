import type { Metadata } from "next";
import type React from "react";

import { RootLayout } from "@/components/layouts/root-layout";
import { metadata as defaultMetadata } from "@/config/metadata";
import MainLayout from "@/components/layouts/main-layout";
import { Header } from "@/components/headers/header";
import Link from "next/link";

export const metadata: Metadata = defaultMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<RootLayout>
			<MainLayout header={<Header />} footer={false}>
				{children}
			</MainLayout>
		</RootLayout>
	);
}
