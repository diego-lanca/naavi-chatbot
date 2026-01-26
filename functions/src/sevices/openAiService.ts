import OpenAI from "openai";
import axios from "axios";
import { env } from "../config/env";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function extractAddressesFromText(
  rawText: string,
): Promise<string[]> {
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
Você recebe um texto falado contendo UM OU MAIS endereços.

REGRAS:
- Identifique TODOS os endereços mencionados
- Mesmo que estejam na mesma frase
- Use conectores como separadores
- NÃO retorne países, cidades ou estados sozinhos
- Nunca invente informações
- Retorne SOMENTE JSON válido neste formato:

{
  "addresses": ["endereço 1", "endereço 2"]
}

Nunca una endereços diferentes.
Nunca retorne menos endereços do que o texto contém.
`,
      },
      { role: "user", content: rawText },
    ],
  });

  const json = JSON.parse(completion.choices[0].message.content ?? "");

  console.log(json);

  return json.addresses ?? [];
}

export async function transcribeAudio(mediaUrl: string): Promise<string> {
  const audioBuffer = await axios.get(mediaUrl, {
    auth: {
      username: env.TWILIO_SID,
      password: env.TWILIO_AUTH,
    },
    responseType: "arraybuffer",
  });

  if (!audioBuffer.data) {
    throw new Error(`Falha ao baixar áudio do Twilio: ${audioBuffer.status}`);
  }

  const buffer = Buffer.from(audioBuffer.data);

  const file = new File([buffer], "audio.ogg", { type: "audio/ogg" });

  const response = await client.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
    language: "pt",
    prompt: `
Este áudio contém endereços brasileiros completos.
Priorize:
- nomes de ruas
- números (ex: "cento e vinte e três" → 123)
- bairros, cidades e estados
Não omita números.
`,
  });

  console.log("TRANSCRIÇÃO:", response.text);
  return response.text;
}
