"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme";
import { UserMenu } from "@/components/ui/user-menu";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { useWindowScroll } from "@uidotdev/usehooks";
import { cva } from "class-variance-authority";
import { useSession } from "next-auth/react";
import { Link } from "@/components/primitives/link-with-transition";
import type React from "react";
import { useMemo } from "react";

import { Logo } from "@/components/images/logo";
import { Search } from "@/components/search/search";
import styles from "@/styles/header.module.css";
import { BuyButton } from "../buttons/buy-button";

interface NavLink {
	href: string;
	label: string;
	isCurrent?: boolean;
}

interface HeaderProps {
	navLinks?: NavLink[];
	logoHref?: string;
	logoIcon?: React.ReactNode;
	logoText?: string;
	searchPlaceholder?: string;
	variant?: "default" | "sticky" | "floating";
}

const defaultNavLinks = [
	{ href: routes.faq, label: "Faqs", isCurrent: false },
	{ href: routes.features, label: "Features", isCurrent: false },
	{ href: routes.pricing, label: "Pricing", isCurrent: false },
];

const headerVariants = cva(
	"translate-z-0 z-50 p-md",
	{
		variants: {
			variant: {
				default: "relative",
				floating: "sticky top-0 h-24",
				sticky: "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

export const Header: React.FC<HeaderProps> = ({
	logoHref = siteConfig.url,
	logoIcon = <Logo />,
	logoText = siteConfig.name,
	navLinks = defaultNavLinks,
	variant = "default",
}) => {
	const [{ y }] = useWindowScroll();
	const isOpaque = useMemo(() => variant === "floating" && y && y > 100, [y, variant]);
	const { data: session } = useSession();

	return (
		<>
			<header
				className={cn(
					headerVariants({ variant }),
					variant === "floating" && styles.header,
					variant === "floating" && isOpaque && styles.opaque,
					variant === "floating" &&
					isOpaque &&
					"-top-[12px] [--background:#fafafc70] dark:[--background:#1c1c2270]"
				)}
			>
				{variant === "floating" && <div className="h-[12px] w-full" />}
				<nav className="container flex items-center justify-between gap-md">
					<div className="flex-col gap-md flex md:flex-row md:items-center">
						<Link
							href={logoHref}
							className="flex grow items-center gap-2 text-lg font-semibold md:mr-6 md:text-base"
						>
							{logoIcon}
							<span className="block whitespace-nowrap">{logoText}</span>
						</Link>
						{/* <Search /> */}
					</div>
				</nav>
			</header>
			{variant === "floating" && <div className="-mt-24" />}
		</>
	);
};
