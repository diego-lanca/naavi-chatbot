import vision from "@google-cloud/vision";
import axios from "axios";
import { env } from "../config/env";

const client = new vision.ImageAnnotatorClient();

export async function extractTextFromImage(mediaUrl: string): Promise<string> {
  const imageBuffer = await _downloadTwilioImage(mediaUrl);

  const [result] = await client.textDetection({
    image: {
      content: imageBuffer.toString("base64"),
    },
  });

  return result.fullTextAnnotation?.text || "";
}

async function _downloadTwilioImage(mediaUrl: string): Promise<Buffer> {
  const response = await axios.get(mediaUrl, {
    auth: {
      username: env.TWILIO_SID,
      password: env.TWILIO_AUTH,
    },
    responseType: "arraybuffer",
  });

  return Buffer.from(response.data);
}
