import { UserDoc } from "../../models/user";
import { setSession } from "../../sevices/databaseService";

export async function welcome(user: UserDoc): Promise<string> {
  await setSession(user.id, {
    step: "welcome",
  });

  return (
    "Oi! 👋 Sou o *Rastro+ / Rotas*, seu " +
    "assistente de navegação e logística. 🗺️🚚\n\n" +
    "Ajudo você a criar rotas mais rápidas " +
    "e eficientes para suas entregas.\n\n" +
    "Para começar, me diga *em uma única mensagem*:\n" +
    "👉 *Nome, idade e sexo*\n\n" +
    "Exemplo:\n" +
    "João, 25, M\n\n" +
    "(Pode responder do jeito que for mais fácil 😉)"
  );
}
