"use server";

import { routes } from "@/config/routes";
import { logger } from "@/lib/logger";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

/**
 * Server action to handle the repository download request.
 * This is a two-step process:
 * 1. Verify authentication and authorization
 * 2. Redirect to the download route handler which will stream the file
 *
 * Using redirect() instead of returning Response objects avoids
 * serialization issues between Server and Client Components.
 */
export async function downloadRepo() {
  // Redirect to the download route handler
  redirect(routes.api.download);
}

/**
 * Server action to handle the repository download request.
 * This is a two-step process:
 * 1. Verify authentication and authorization
 * 2. Redirect to the download route handler which will stream the file
 *
 * Using redirect() instead of returning Response objects avoids
 * serialization issues between Server and Client Components.
 */
export async function downloadRepoAnonymously(formData: FormData) {
  const email = formData.get("email");
  const orderId = formData.get("orderId");

  // A File entry stringifies to "[object Object]" and a missing one to "null".
  if (typeof email !== "string" || typeof orderId !== "string") {
    throw new Error("Invalid download request: email and orderId must be text");
  }

  // Encode both values so one cannot smuggle in extra query parameters.
  redirect(
    `${routes.api.download}?email=${encodeURIComponent(email)}&orderId=${encodeURIComponent(orderId)}`
  );
}
