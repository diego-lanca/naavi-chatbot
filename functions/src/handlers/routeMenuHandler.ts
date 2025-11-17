import { routeMenu } from "../bot/flows/routeMenu";
import { Address } from "../models/address";
import { UserDoc } from "../models/user";
import { getSessionData, setSession } from "../sevices/databaseService";
import { computeBestRoute } from "../sevices/routesService";
import { getAddressFromCoords, validateAddresses } from "../utils/functions";

export function handleRouteMenuOptions(): Record<
  string,
  (
    user: UserDoc,
    msg: string,
    media?: string,
    contentType?: string,
    latitude?: string,
    longitude?: string
  ) => Promise<{ msg: string; mediaUrl?: string }>
  > {
  return {
    user_send_location: handleUserSendLocation,
    manual_route_insert: handleManualRouteInsert,
    automatic_route_insert: handleAutomaticRouteInsert,
    review_route: handleReviewRoute,
  };
}

export async function handleUserSendLocation(
  user: UserDoc,
  msg: string,
  _?: string,
  __?: string,
  latitude?: string,
  longitude?: string
): Promise<{ msg: string; mediaUrl?: string }> {
  if (msg.trim() == "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  if (!latitude || !longitude) {
    return {
      msg:
        "Hmm, esse seu endereço não parece válido. 🤔\n" +
        "Por favor, mande sua localização atual para que " +
        "gente possa tratar a rota da melhor forma..",
    };
  }

  const address = await getAddressFromCoords(latitude, longitude);

  await setSession(user.id, { step: "manual_route_insert" });

  return {
    msg: `Perfeito! 📍\nRecebi sua localização:\n\n*${
      address || "Não consegui identificar o endereço 😕"
    }*\n\nDeseja confirmar?\n1️⃣ Sim\n2️⃣ Enviar outra localização`,
  };
}

export async function handleManualRouteInsert(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  if (msg.trim() == "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  const addresses = msg.trim().split("\n");

  if (addresses.length === 0) {
    return {
      msg: "Não consegui reconhecer nenhum endereço, tente novamente!",
    };
  }

  // await setSession(user.id, { step: "profile_menu" });

  const validatedAddresses = await validateAddresses(addresses);

  await setSession(user.id, {
    step: "route_review",
    data: {
      validatedAddresses,
    },
  });

  const found = validatedAddresses
    .filter((a) => a.formatted)
    .map((a, i) => `${i + 1}. ${a.formatted}`)
    .join("\n");

  const notFound = validatedAddresses
    .filter((a) => !a.formatted)
    .map((a, i) => `${i + 1}. ${a.original}`)
    .join("\n");

  return {
    msg:
      `✅ Endereços encontrados:\n${found}` +
      `❌ Endereços não encontrados:\n${notFound}` +
      "\n\nDeseja editar algum endereço?\n" +
      "Responda com o número do endereço para editar,\n" +
      "ou envie 'OK' para continuar.",
  };
}

export async function handleAutomaticRouteInsert(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  if (msg.trim() == "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  const userName = msg.trim();

  if (userName.length < 2 || userName.length > 50 || /^\d+$/.test(userName)) {
    return {
      msg:
        "Hmm, esse nome não parece válido. 🤔\n" +
        "Por favor, digite um nome real para que a " +
        "gente possa se conhecer melhor.",
    };
  }

  await setSession(user.id, { step: "profile_menu" });

  return {
    msg: "",
  };
}

export async function handleReviewRoute(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  if (msg.trim() == "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  const addresses = (await getSessionData(user.id)) as Address[];

  const { mapsLink } = await computeBestRoute(addresses);

  return {
    msg: mapsLink,
  };
}
