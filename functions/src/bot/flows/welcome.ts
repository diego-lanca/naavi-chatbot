import { UserDoc } from "../../models/user";
import { setSession } from "../../sevices/databaseService";

export async function welcome(user: UserDoc): Promise<string> {
  await setSession(user.id, {
    step: "welcome",
  });

  return (
    "Oi! Sou o Naavi, seu assistente inteligente de " +
    "navegação e logística. 🗺️🚚\n" +
    "Minha missão é simples: garantir que suas entregas cheguem mais rápido, " +
    "sem estresse e com máxima eficiência. Como seu parceiro digital, vou:\n" +
    "✅ Criar rotas otimizadas para economizar tempo e combustível.\n" +
    "✅ Alertar sobre trânsito e imprevistos para que você " +
    "nunca perca um prazo.\n" +
    "✅ Acompanhar seu progresso e ajudar a entregar com " +
    "precisão e segurança.\n\n" +
    "Para começar, qual é o seu nome? 📍"
  );
}
