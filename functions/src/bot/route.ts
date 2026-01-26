import { Timestamp } from "firebase-admin/firestore";
// import { env } from "../config/env";
import { UserDoc } from "../models/user";
import {
  getSubscription,
  upsertSubscription,
  getSession,
  setSession,
} from "../sevices/databaseService";
import { differenceInDays } from "date-fns";
import { mainMenu } from "./flows/mainMenu";
import { welcome } from "./flows/welcome";
import { handleIntrodutionOptions } from "../handlers/introdutionHandler";
import {
  handleMainMenu,
  handleRouteMenu,
} from "../handlers/menusHandler";
import { handleRouteMenuOptions } from "../handlers/routeMenuHandler";
import { env } from "../config/env";

export async function route(
  user: UserDoc,
  msg: string,
  media?: string,
  contentType?: string,
  latitude?: string,
  longitude?: string
): Promise<{ msg: string; mediaUrl?: string }> {
  const subscription = await getSubscription(user.id);

  if (subscription === null) {
    await upsertSubscription(user.id, {
      userId: user.id,
      createdAt: Timestamp.fromDate(new Date()),
      // ToDO: Alterar pra começar inactive no lançamento
      status: "active",
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } else {
    if (subscription.status !== "active") {
      return {
        msg:
          "⚠️ Olá! Seu plano não está ativo no momento, por isso o " +
          "bot está temporariamente indisponível. " +
          "Assim que o pagamento for confirmado, " +
          "tudo volta a funcionar normalmente 😊",
      };
    }
  }

  const session = await getSession(user.id);

  if (!session) {
    return { msg: await welcome(user) };
  }

  if (isMainMenuGreeting(msg)) {
    await setSession(user.id, { step: "main_menu" });
    return { msg: mainMenu(), mediaUrl: env.BOT_LOGO_URL };
  }

  const stepHandlers: Record<
    string,
    (
      user: UserDoc,
      msg: string,
      media?: string,
      contentType?: string,
      latitude?: string,
      longitude?: string
    ) => Promise<{ msg: string; mediaUrl?: string }>
  > = {
    ...handleIntrodutionOptions(),
    main_menu: handleMainMenu,
    route_menu: handleRouteMenu,
    ...handleRouteMenuOptions(),
  };

  const daysDiff = differenceInDays(new Date(), session.updatedAt.toDate());

  if (daysDiff > 0) {
    return { msg: mainMenu(), mediaUrl: env.BOT_LOGO_URL };
  }

  const handler = stepHandlers[session.step];
  if (handler) {
    const handlerResponse = await handler(
      user,
      msg,
      media,
      contentType,
      latitude,
      longitude
    );
    return { msg: handlerResponse.msg, mediaUrl: handlerResponse.mediaUrl };
  }

  if (msg.trim() === "0") {
    await setSession(user.id, { step: "main_menu" });
    return { msg: mainMenu(), mediaUrl: env.BOT_LOGO_URL };
  }

  return {
    msg:
      'Desculpa, não entendi. Digite "0" para voltar ao ' + "menu principal.",
  };
}

export const isMainMenuGreeting = (msg: string): boolean => {
  const normalized = normalize(msg);
  return MAIN_MENU_GREETINGS.some((greet) => normalized === normalize(greet));
};

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD") // remove acentos
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const MAIN_MENU_GREETINGS = [
  "oi",
  "ola",
  "olá",
  "opa",
  "eai",
  "e aí",
  "bom dia",
  "boa tarde",
  "boa noite",
  "inicio",
  "menu principal",
  "start",
  "home",
  "comecar",
  "fala aí",
  "salve",
  "oii",
  "oie",
  "oiii",
  "ola!",
  "olá!",
  "opa!",
];
