//

import { Webhook } from "svix";
import { createOrUpdateUser, deleteUser } from "@/lib/actions/user";
import { clerkClient } from "@clerk/nextjs/server";
import { connect } from "../../../lib/mongodb/mongoose";

export async function POST(req) {
  console.log("=== WEBHOOK CALLED ===");
  console.log("WEBHOOK_SECRET exists:", !!process.env.WEBHOOK_SECRET);

  try {
    await connect();
    console.log("MongoDB connected successfully❤️❤️❤️❤️❤️❤️❤️❤️");
  } catch (dbError) {
    console.error("MongoDB connection error:", dbError);
    return new Response("Database connection failed", { status: 500 });
  }

  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("Missing WEBHOOK_SECRET env var");
    return new Response("Server misconfiguration", { status: 500 });
  }

  // Use the incoming Request headers directly (avoid headers() sync/await issues)
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  // siv-id log kora holo
  console.log("Incoming svix headers:", {
    "svix-id": svix_id,
    "svix-timestamp": svix_timestamp,
    "svix-signature": svix_signature,
  });
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix headers:", {
      svix_id,
      svix_timestamp,
      svix_signature,
    });
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get raw body text (Svix needs the raw payload)
  let body;
  try {
    body = await req.text();
  } catch (err) {
    console.error("Failed to read request body:", err);
    return new Response("Invalid body", { status: 400 });
  }

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Good to log the whole verified event shape so you know what fields are present
  console.log("Verified Svix event:", JSON.stringify(evt, null, 2));

  const eventType = evt?.type;
  const payloadData = evt?.data;
  console.log("Event type:", eventType, "Event data:", payloadData);

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      // Log what you will pass into your DB function
      console.log("Handling user.create/update with data:", payloadData);

      // Ensure your createOrUpdateUser accepts the shape you pass here.
      const {
        id,
        first_name,
        last_name,
        image_url,
        email_addresses,
        username,
      } = payloadData;
      const user = await createOrUpdateUser(
        id,
        first_name,
        last_name,
        image_url,
        email_addresses,
        username
      );

      console.log("createOrUpdateUser result:", user);

      if (user && eventType === "user.created") {
        try {
          await clerkClient.users.updateUserMetadata(id, {
            publicMetadata: {
              userMongoId: user._id,
              isAdmin: user.isAdmin,
            },
          });
        } catch (error) {
          console.error("Error updating user metadata in Clerk:", error);
        }
      }
    } else if (eventType === "user.deleted") {
      console.log("Handling user.deleted for:", payloadData);
      const { id } = payloadData;
      await deleteUser(id);
      console.log("Deleted user in Mongo for Clerk id:", id);
    } else {
      console.log("Unhandled event type:", eventType);
    }
  } catch (error) {
    console.error("Error handling event:", error);
    return new Response("Error occured", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
