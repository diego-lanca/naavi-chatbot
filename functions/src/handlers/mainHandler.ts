import { onRequest } from "firebase-functions/https";
import { fetchUser } from "../sevices/userService";
import { route } from "../bot/route";
import { sendMessage } from "../sevices/twilioService";
import { Timestamp } from "firebase-admin/firestore";
import { env } from "../config/env";
import { upsertSubscription } from "../sevices/databaseService";
import { KiwifyOrder } from "../models/kiwifyOrder";
import * as crypto from "crypto";

export const onMessage = onRequest(
  { timeoutSeconds: 1200, region: "southamerica-east1" },
  async (req, res): Promise<void> => {
    if (req.method !== "POST") {
      console.log("Invalid method:", req.method);
      res.status(405).send("Only POST");
      return;
    }

    const { Body, MediaUrl0, MediaContentType0, From, Latitude, Longitude } =
      req.body;

    const userMessage = (Body ?? "") as string;
    const userPhone = (From ?? "") as string;

    try {
      const user = await fetchUser(userPhone);

      const reply = await route(
        user,
        userMessage,
        MediaUrl0,
        MediaContentType0,
        Latitude,
        Longitude,
      );

      if (reply.msg && reply.msg.trim() !== "") {
        await sendMessage(userPhone, reply.msg, reply.mediaUrl);
      }

      res.status(200).send(reply);
    } catch (err) {
      console.error("Error processing message:", err);
      await sendMessage(
        userPhone,
        "Oops! Ocorreu um erro ao processar a mensagem, " + "tente novamente.",
      );
      res.status(500).send("Internal Server Error: " + err);
    }
  },
);

export const updateSubscription = onRequest(
  { timeoutSeconds: 1200, region: "southamerica-east1" },
  async (req, res): Promise<void> => {
    const startTime = Date.now();
    console.log("📩 Received request to update subscription");
    console.log(req.body);

    // webhook testing
    if (req.body.event == "ping") {
      res.status(200).send("pong!");
      return;
    }

    if (req.method !== "POST") {
      console.warn("❌ Invalid method:", req.method);
      res.status(405).send("Only POST allowed");
      return;
    }

    const { signature } = req.query;
    const calculatedSignature = crypto
      .createHmac("sha1", env.KIWIFY_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (signature !== calculatedSignature) {
      res.status(400).send({ error: "Incorrect signature" });
      return;
    }

    try {
      const order = req.body as KiwifyOrder;
      const event = order.webhook_event_type;
      const customerPhone = order.Customer.mobile;

      const formattedPhone = "whatsapp:" + customerPhone;

      console.log("👤 Processing order:", {
        orderId: order.order_id,
        event,
        formattedPhone,
      });

      if (
        event !== "subscription_canceled" &&
        event !== "subscription_renewed" &&
        event !== "subscription_late" &&
        event !== "order_refunded" &&
        event !== "order_approved"
      ) {
        res.status(400).send("Event not allowed.");
        return;
      }

      const user = await fetchUser(formattedPhone);
      console.log("✅ User fetched successfully:", { userId: user.id });

      const nextDueDate = new Date(order.Subscription.next_payment);
      const nextDue = Timestamp.fromDate(nextDueDate);

      const currentDueDate = new Date(order.Subscription.start_date);
      const currentDue = Timestamp.fromDate(currentDueDate);

      const orderStatus = order.order_status;

      let newStatus: "active" | "past_due" | "canceled" | undefined = "active";

      newStatus = orderStatus === "paid" ? "active" : "past_due";

      // ────────────────────────────────
      // EVENT: order CREATED
      // ────────────────────────────────
      if (event === "order_approved") {
        console.log("🆕 Handling new order creation event");

        await upsertSubscription(user.id, {
          userId: user.id,
          contractId: order.subscription_id,
          status: newStatus,
          lastPaymentAt: currentDue,
          nextDueDate: nextDue,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log("✅ New subscription created:", {
          userId: user.id,
          nextDue: nextDueDate.toISOString(),
        });

        res
          .status(200)
          .send(
            `✅ New subscription created\nPhone: ${formattedPhone}` +
              "\nUserId: ${user.id}",
          );
        return;
      }

      // ────────────────────────────────
      // EVENT: order UPDATED
      // ────────────────────────────────
      console.log("🔄 Updating subscription for order:", {
        orderId: order.subscription_id,
        orderStatus,
      });

      if (event !== "subscription_renewed") {
        newStatus = event === "subscription_late" ? "past_due" : "canceled";

        console.warn("⚠️ order not in good standing, updating status:", {
          orderId: order.subscription_id,
          newStatus,
        });
      }

      await upsertSubscription(user.id, {
        updatedAt: Timestamp.now(),
        lastPaymentAt: currentDue,
        nextDueDate: nextDue,
        status: newStatus,
      });

      console.log("✅ Subscription updated successfully:", {
        userId: user.id,
        status: newStatus,
      });

      res
        .status(200)
        .send(`Subscription updated\nUserId: ${user.id}\nStatus: ${newStatus}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("🔥 Error updating subscription:", {
        message: error.message,
        stack: error.stack,
      });

      res.status(500).send("Internal Server Error: " + error.message);
    } finally {
      console.log(
        "⏱️ Request finished in",
        (Date.now() - startTime).toFixed(0),
        "ms",
      );
    }
  },
);
