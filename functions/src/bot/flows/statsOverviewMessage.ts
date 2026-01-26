import {
  getRoutesHistory,
  calculateFuelSaving,
  getUserRouteSummary,
} from "../../sevices/statsService";
import { mainMenu } from "./mainMenu";

export async function statsOverviewMessage(userId: string): Promise<string> {
  const summary = await getUserRouteSummary(userId);
  const history = await getRoutesHistory(userId);
  const fuel = await calculateFuelSaving(userId);

  if (!summary) {
    return "📊 Você ainda não gerou nenhuma rota.\n\n" + mainMenu();
  }

  let msg =
    "📊 *Suas estatísticas*\n\n" +
    `🚀 Rotas geradas: ${summary.totalRoutes}\n` +
    `📍 Paradas totais: ${summary.totalStops}\n` +
    `🛣️ KM planejados: ${summary.totalKm.toFixed(1)} km\n\n`;

  if (fuel) {
    msg +=
      "⛽ *Economia estimada*\n" +
      `• ${fuel.liters.toFixed(1)} litros\n` +
      `• R$ ${fuel.money.toFixed(2)}\n\n`;
  }

  if (history.length > 0) {
    msg += "📅 *Últimas rotas:*\n";
    history.forEach((h) => {
      msg += `• ${h.date} – ${h.km.toFixed(1)} km\n`;
    });
  }

  msg += "\nDigite *0* para voltar ao menu.";

  return msg;
}
