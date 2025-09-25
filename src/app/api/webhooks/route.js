import { Webhook } from "svix";
import { headers } from "next/headers";
import User from "@/lib/models/user.model";
// import { createOrUpdateUser, deleteUser } from "@/lib/actions/user";
// import { clerkClient } from "@clerk/nextjs/server";
// import { connect } from "mongoose";

export async function POST(req) {
  await connect();
  console.log("Vercel WEBHOOK_SECRET:", process.env.WEBHOOK_SECRET);
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  // console.log("hello api koi", WEBHOOK_SECRET);
  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Do something with the payload
  // For this guide, you simply log the payload to the console
  const { id } = evt?.data;
  const eventType = evt?.type;
  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  console.log("Webhook body:", body);

  // if (eventType === "user.created" || eventType === "user.updated") {
  //   const { id, first_name, last_name, image_url, email_addresses, username } =
  //     evt?.data;
  //   try {
  //     const user = await createOrUpdateUser(
  //       id,
  //       first_name,
  //       last_name,
  //       image_url,
  //       email_addresses,
  //       username
  //     );

  //     // const user = await User.create({
  //     //   id,
  //     //   first_name,
  //     //   last_name,
  //     //   image_url,
  //     //   email_addresses,
  //     //   username,
  //     // });
  //     console.log("👉 Mongo user object from DB:", user);
  //     console.log("👉 Mongo user _id:", user?._id);
  //     if (user && eventType === "user.created") {
  //       try {
  //         console.log("👉 Trying to update metadata for:", id);
  //         await clerkClient.users.updateUser(id, {
  //           publicMetadata: {
  //             userMongoId: user._id.toString(),
  //             isAdmin: user.isAdmin,
  //           },
  //         });
  //       } catch (error) {
  //         console.log("Error updating user metadata:", error);
  //       }
  //     }
  //   } catch (error) {
  //     console.log("Error creating or updating user:", error);
  //     return new Response("Error occured", {
  //       status: 400,
  //     });
  //   }
  // }

  // if (eventType === "user.deleted") {
  //   const { id } = evt?.data;
  //   try {
  //     await deleteUser(id);
  //   } catch (error) {
  //     console.log("Error deleting user:", error);
  //     return new Response("Error occured", {
  //       status: 400,
  //     });
  //   }
  // }
  if (evt.type === "user.created") {
    console.log("userId:", evt.data.id);
  }

  if (evt.type === "user.updated") {
    console.log("user is updated:", evt.data.id);
  }
  return new Response("", { status: 200 });
}
