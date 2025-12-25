import { routeMenu } from "../bot/flows/routeMenu";
import { Address } from "../models/address";
import { UserDoc } from "../models/user";
import { getSessionData, setSession } from "../sevices/databaseService";
import {
  generateMapsLinks,
  optimizeChunkWithGoogle,
} from "../sevices/routesService";
import {
  buildOptimizedRoute,
  chunkRoute,
  getAddressFromCoords,
  hasCoords,
  removeNearDuplicatePoints,
  validateAddresses,
} from "../utils/functions";

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
    // automatic_route_insert: handleAutomaticRouteInsert,
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
        found: true,
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

// export async function handleAutomaticRouteInsert(
//   user: UserDoc,
//   msg: string
// ): Promise<{ msg: string; mediaUrl?: string }> {
//   if (msg.trim() == "0") {
//     await setSession(user.id, { step: "route_menu" });
//     return { msg: routeMenu() };
//   }

//   const userName = msg.trim();

//   if (userName.length < 2 || userName.length > 50
// || /^\d+$/.test(userName)) {
//     return {
//       msg:
//         "Hmm, esse nome não parece válido. 🤔\n" +
//         "Por favor, digite um nome real para que a " +
//         "gente possa se conhecer melhor.",
//     };
//   }

//   await setSession(user.id, { step: "profile_menu" });

//   return {
//     msg: "",
//   };
// }

export async function handleRouteReview(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  msg = msg.trim().toUpperCase();

  if (msg == "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  const sessionData = await getSessionData(user.id);
  const validated = sessionData?.validatedAddresses as Address[];
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

  if (msg === "OK") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validOnly = validated.filter(hasCoords);

    if (validOnly.length === 0) {
      return {
        msg: "❌ Para gerar a rota, preciso pelo menos de *1 destino válido*.",
      };
    }

    const origin: Address = {
      original: userLocation.formatted,
      formatted: userLocation.formatted,
      found: true,
      lat: userLocation.lat,
      lon: userLocation.lon,
    };

    const orderedWithOrigin = buildOptimizedRoute(origin, validated);

    const apiChunks = chunkRoute(orderedWithOrigin, 25);

    let currentOrigin = origin;
    const refined: Address[] = [];

    for (const chunk of apiChunks) {
      const optimized = await optimizeChunkWithGoogle(currentOrigin, chunk);
      refined.push(...optimized.splice(1));
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      currentOrigin = optimized.at(-1)!;
    }

    const cleanRoute = removeNearDuplicatePoints(refined.filter(hasCoords));

    const links = generateMapsLinks(cleanRoute);

    let response =
      "🚀 *Rota otimizada gerada!*\n" +
      "📐 Ordenada por proximidade geográfica\n" +
      "⚠️ Dividida em etapas por limite do Google Maps\n\n";

    links.forEach((link, i) => {
      response += `🗺️ *Trecho ${i + 1}:*\n${link}\n\n`;
    });

    response += "Digite *0* para voltar ao menu.";

    return { msg: response };
  }

  return { msg: "Opção inválida. Envie um número ou *OK* para continuar." };
}
