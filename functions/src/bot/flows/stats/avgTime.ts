import { calculateAverageTime } from "../../../sevices/statsService";
import { statsMenu } from "../statsMenu";

export async function avgTimeMessage(userId: string): Promise<string> {
  const avg = await calculateAverageTime(userId);
  // Retorno esperado do service: { minutes: number, seconds: number }

  if (!avg) {
    return (
      "⏱️ *Tempo Médio por Entrega*\n" +
      "──────────────────────────────\n\n" +
      "Ainda não foi possível calcular seu tempo médio " +
      "porque você ainda não possui entregas registradas.\n\n" +
      statsMenu()
    );
  }

  return (
    "⏱️ *Tempo Médio por Entrega*\n" +
    "──────────────────────────────\n\n" +
    `📌 Seu tempo médio por entrega é:\n` +
    `➡️ *${avg.minutes}m ${avg.seconds}s*\n\n` +
    statsMenu()
  );
}
