import { env } from "../config/env";
import { Twilio } from "twilio";
import { fromZonedTime } from "date-fns-tz";

const client = new Twilio(env.TWILIO_SID, env.TWILIO_AUTH);

export async function sendMessage(
  to: string,
  body: string,
  mediaUrl?: string,
  contentVariables?: string,
): Promise<void> {
  const contentSidMapping: Record<string, boolean> = {
    // HX7ee867afe41d6ad43796d4645744f412: true,
  };

  const MAX_LENGTH = 1500;
  const mediaUrls = [];

  if (mediaUrl) {
    mediaUrls.push(mediaUrl);
  }

  const hasContentSid = Object.prototype.hasOwnProperty.call(
    contentSidMapping,
    body
  );

  // Função interna para dividir mensagens longas
  const splitMessage = (text: string, limit: number): string[] => {
    const parts: string[] = [];
    let start = 0;
    while (start < text.length) {
      parts.push(text.substring(start, start + limit));
      start += limit;
    }
    return parts;
  };

  // Se for contentSid, envia direto
  if (hasContentSid) {
    await client.messages.create({
      from: env.TWILIO_FROM,
      to,
      contentSid: body,
      contentVariables,
      mediaUrl: mediaUrls,
    });
    return;
  }

  // Se for texto, divide se necessário
  const messages =
    body.length > MAX_LENGTH ? splitMessage(body, MAX_LENGTH) : [body];

  for (let i = 0; i < messages.length; i++) {
    const text =
      messages.length > 1
        ? `(${i + 1}/${messages.length})\n${messages[i]}`
        : messages[i];

    await client.messages.create({
      from: env.TWILIO_FROM,
      to,
      body: text,
      mediaUrl: mediaUrls,
    });
  }
}

export async function scheduleMessage(
  to: string,
  body: string,
  date: Date,
): Promise<void> {
  const utcDate = fromZonedTime(date, 'America/Sao_Paulo');

  await client.messages.create({
    from: env.TWILIO_FROM,
    to,
    body,
    messagingServiceSid: env.TWILIO_MESSAGE_SID,
    scheduleType: "fixed",
    sendAt: utcDate,
  });
}
