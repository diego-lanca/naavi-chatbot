import { routeMenu } from "../bot/flows/routeMenu";
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
    user_confirm_location: handleUserConfirmLocation,
    manual_route_insert: handleManualRouteInsert,
    automatic_route_insert: handleAutomaticRouteInsert,
    route_review: handleRouteReview,
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
        "Hmm, essa localização não parece válida. 🤔\n" +
        "Por favor, envie sua *localização atual* para continuarmos.",
    };
  }

  const address = await getAddressFromCoords(latitude, longitude);

  // Se não identificar endereço
  if (!address) {
    return {
      msg:
        "Não consegui identificar seu endereço a partir " +
        "dessa localização 😕.\n" +
        "Pode enviar novamente sua *localização atual*?",
    };
  }

  await setSession(user.id, {
    step: "user_confirm_location",
    data: {
      userLocation: {
        lat: Number(latitude),
        lon: Number(longitude),
        formatted: address,
      },
    },
  });

  return {
    msg:
      `Perfeito! 📍\nRecebi sua localização:\n\n*${address}*\n\n` +
      "Confirme se está próximo da sua localização?\n" +
      "1️⃣ Sim\n2️⃣ Enviar outra localização",
  };
}

export async function handleUserConfirmLocation(user: UserDoc, msg: string) {
  msg = msg.trim();

  if (msg == "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  if (msg === "1") {
    await setSession(user.id, { step: "manual_route_insert" });

    return {
      msg:
        "Ótimo! 🚀\nAgora envie todos os *endereços das entregas* " +
        "em uma única mensagem, cada um em uma linha.\n\n" +
        "📍 *Exemplo:*\n" +
        "Rua das Flores, 123 - Centro\n" +
        "Av. Paulista, 1000 - Bela Vista",
    };
  }

  if (msg === "2") {
    await setSession(user.id, { step: "user_send_location" });

    return {
      msg: "Tudo bem! 😊\nEnvie novamente sua *localização atual*.",
    };
  }

  return { msg: "Opção inválida. Responda com 1️⃣ ou 2️⃣." };
}

export async function handleManualRouteInsert(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  if (msg.trim() === "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  const addresses = msg.trim().split("\n");

  if (addresses.length === 0) {
    return {
      msg: "Não consegui reconhecer nenhum endereço, tente novamente!",
    };
  }

  const validatedAddresses = await validateAddresses(addresses);

  await setSession(user.id, {
    step: "route_review",
    data: { validatedAddresses },
  });

  const foundList = validatedAddresses
    .filter((a) => a.formatted)
    .map((a, i) => `${i + 1}. ${a.formatted}`)
    .join("\n");

  const notFoundArr = validatedAddresses.filter((a) => !a.formatted);

  let response = `📍 *Endereços encontrados:*\n${foundList}\n\n`;

  if (notFoundArr.length > 0) {
    const nf = notFoundArr.map((a, i) => `${i + 1}. ${a.original}`).join("\n");

    response += `⚠️ *Endereços não reconhecidos:*\n${nf}\n\n`;
  }

  response +=
    "Deseja corrigir algum endereço?\n" +
    "Digite o número para editar, ou envie *OK* para gerar a rota.";

  return { msg: response };
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

export async function handleRouteReview(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  msg = msg.trim().toUpperCase();

  const sessionData = await getSessionData(user.id);
  const validated = sessionData?.validatedAddresses;
  const userLocation = sessionData?.userLocation;

  if (!validated || !userLocation) {
    return { msg: "Erro ao recuperar dados. Envie sua localização novamente." };
  }

  // Correção de endereço (se usuário enviou número)
  const num = Number(msg);
  if (!isNaN(num)) {
    const index = num - 1;

    if (!validated[index]) {
      return { msg: "Número inválido. Escolha um endereço da lista." };
    }

    await setSession(user.id, {
      step: "route_edit",
      data: {
        indexToEdit: index,
        validatedAddresses: validated,
        userLocation,
      },
    });

    return {
      msg:
        `Digite o novo endereço para substituir:\n\n` +
        `📍 *${validated[index].original}*`,
    };
  }

  // Geração da rota
  if (msg === "OK") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validOnly = validated.filter((a: any) => a.lat && a.lon);

    const fullRoute = [
      {
        lat: userLocation.lat,
        lon: userLocation.lon,
        formatted: userLocation.formatted,
        original: userLocation.formatted,
      },
      ...validOnly,
    ];

    if (fullRoute.length < 2) {
      return {
        msg: "❌ Para gerar a rota, preciso pelo menos de *1 destino*" +
        " além da sua localização.",
      };
    }

    const { mapsLink } = await computeBestRoute(fullRoute);

    return {
      msg:
        "🚀 *Rota otimizada a partir da sua localização!*\n\n" +
        "Clique no link abaixo para abrir no Google Maps:\n\n" +
        mapsLink,
    };
  }

  return { msg: "Opção inválida. Envie um número ou *OK* para continuar." };
}
