import type { Metadata } from "next";
import type React from "react";

import { Icon } from "@/components/assets/icon";
import { RootLayout } from "@/components/layouts/root-layout";
import { metadata as defaultMetadata } from "@/config/metadata";
import MainLayout from "@/components/layouts/main-layout";
import { ThemeToggle } from "@/components/ui/shipkit/theme";
import { siteConfig } from "@/config/site-config";
import Link from "next/link";

export const metadata: Metadata = defaultMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<RootLayout>
			<MainLayout
				header={
					<header className="p-md">
						<nav className="container flex items-center justify-between">
							<Link href="/" className="flex items-center gap-2 text-lg font-semibold">
								<Icon />
								<span>{siteConfig.name}</span>
							</Link>
							<ThemeToggle variant="ghost" size="icon" className="rounded-full" />
						</nav>
					</header>
				}
				footer={false}
			>
				<main className="container mx-auto py-8 space-y-6">

					{children}
					<div className="block text-center text-sm text-muted-foreground">
						Created by <Link href="https://www.lacymorrow.com">Lacy Morrow</Link>
					</div>
				</main>
			</MainLayout>
		</RootLayout>
	);
}
