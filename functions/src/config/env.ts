export const env = {
  TWILIO_SID: process.env.TWILIO_SID ?? "",
  TWILIO_AUTH: process.env.TWILIO_AUTH ?? "",
  TWILIO_FROM: process.env.TWILIO_FROM ?? "whatsapp:+55",
  TWILIO_MESSAGE_SID: process.env.TWILIO_MESSAGE_SID ?? "",
  GOOGLEAPI_KEY: process.env.GOOGLEAPI_KEY ?? "",
  OPENAI_API_KEY: process.env.OPENAI_KEY ?? "",
  BOT_LOGO_URL: process.env.LOGO_URL ?? "",
};
