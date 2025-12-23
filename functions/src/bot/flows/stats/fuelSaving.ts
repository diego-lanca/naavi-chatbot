import { calculateFuelSaving } from "../../../sevices/statsService";
import { statsMenu } from "../statsMenu";

export async function fuelSavingMessage(userId: string): Promise<string> {
  const savings = await calculateFuelSaving(userId);
  // Retorno esperado: { liters: number, money: number }

  if (!savings) {
    return (
      "⛽ *Economia de Combustível*\n" +
      "──────────────────────────────\n\n" +
      "Ainda não temos dados suficientes " +
      "para estimar sua economia de combustível.\n" +
      "Quando suas rotas forem registradas, mostrarei tudo aqui! 🚗💨\n\n" +
      statsMenu()
    );
  }

  return (
    "⛽ *Economia de Combustível*\n" +
    "──────────────────────────────\n\n" +
    `💧 Combustível economizado: *${savings.liters.toFixed(1)} L*\n` +
    `💰 Economia estimada: *R$ ${savings.money.toFixed(2)}*\n\n` +
    "Excelente resultado! Continue economizando! 🔥\n\n" +
    statsMenu()
  );
}
