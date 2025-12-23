import { calculateTotalDistance } from "../../../sevices/statsService";
import { statsMenu } from "../statsMenu";

export async function totalDistanceMessage(userId: string): Promise<string> {
  const totalKm = await calculateTotalDistance(userId);
  // Retorno esperado: number (km)

  if (!totalKm || totalKm <= 0) {
    return (
      "🛣️ *Distância Total Percorrida*\n" +
      "─────────────────────────────────\n\n" +
      "Você ainda não possui rotas registradas.\n" +
      "Assim que suas entregas forem registradas, " +
      "mostrarei a distância total aqui! 🚀\n\n" +
      statsMenu()
    );
  }

  return (
    "🛣️ *Distância Total Percorrida*\n" +
    "─────────────────────────────────\n\n" +
    `📏 Você já percorreu:\n` +
    `➡️ *${totalKm.toFixed(1)} km*\n\n` +
    "Continue assim! 🚚💨\n\n" +
    statsMenu()
  );
}
