import { getRoutesHistory } from "../../../sevices/statsService";
import { statsMenu } from "../statsMenu";

export async function historyMessage(userId: string): Promise<string> {
  const history = await getRoutesHistory(userId);
  // Retorno esperado:
  // [ { date: "10/01/2025", km: 12.5 }, ... ]

  if (!history || history.length === 0) {
    return (
      "🗓️ *Histórico de Rotas*\n" +
      "───────────────────────────\n\n" +
      "Você ainda não registrou nenhuma rota.\n" +
      "Assim que fizer suas primeiras entregas, mostrarei tudo aqui! 📦🚚\n\n" +
      statsMenu()
    );
  }

  const list = history
    .map((r) => `📅 ${r.date}  —  🛣️ ${r.km.toFixed(1)} km`)
    .join("\n");

  return (
    "🗓️ *Histórico de Rotas*\n" +
    "───────────────────────────\n\n" +
    `${list}\n\n` +
    statsMenu()
  );
}
