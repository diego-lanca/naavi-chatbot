import { onRequest } from "firebase-functions/https";
import { fetchUser } from "../sevices/userService";
import { route } from "../bot/route";
import { sendMessage } from "../sevices/twilioService";

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
        Longitude
      );

      // await sendMessage(userPhone, reply.msg, reply.mediaUrl);

      res.status(200).send(reply);
    } catch (err) {
      console.error("Error processing message:", err);
      await sendMessage(
        userPhone,
        "Oops! Ocorreu um erro ao processar a mensagem, " + "tente novamente."
      );
      res.status(500).send("Internal Server Error: " + err);
    }
  }
);
