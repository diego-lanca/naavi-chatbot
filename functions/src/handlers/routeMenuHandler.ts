import {
  batchRouteInstructions,
} from "../bot/flows/route/batchRouteInstructions";
import {
  manualRouteInstructions,
} from "../bot/flows/route/manualRouteInstructions";
import { routeMenu } from "../bot/flows/routeMenu";
import { Address } from "../models/address";
import { UserDoc } from "../models/user";
import {
  clearSessionData,
  getSessionData,
  setSession,
} from "../sevices/databaseService";
import { extractTextFromImage } from "../sevices/googleService";
import {
  extractAddressesFromText,
  transcribeAudio,
} from "../sevices/openAiService";
import {
  generateMapsLinks,
  optimizeChunkWithGoogle,
} from "../sevices/routesService";
import { saveRouteStats, updateRouteSummary } from "../sevices/statsService";
import {
  buildOptimizedRoute,
  calculateDistanceKm,
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
    longitude?: string,
  ) => Promise<{ msg: string; mediaUrl?: string }>
  > {
  return {
    user_send_location: handleUserSendLocation,
    user_confirm_location: handleUserConfirmLocation,
    manual_route_insert: handleManualRouteInsert,
    batch_route_insert: handleRouteBatchInsert,
    ask_final_destination: handleAskFinalDestination,
    user_send_final_destination: handleUserSendFinalDestination,
    // automatic_route_insert: handleAutomaticRouteInsert,
    route_review: handleRouteReview,
    route_edit: handleRouteEdit,
  };
}

export async function handleUserSendLocation(
  user: UserDoc,
  msg: string,
  _?: string,
  __?: string,
  latitude?: string,
  longitude?: string,
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
    await setSession(user.id, {
      step: "ask_final_destination",
    });

    return {
      msg:
        "🏁 *Destino final*\n\n" +
        "Como você quer definir o destino da rota?\n\n" +
        "1️⃣ Não definir *destino* final (rota otimizada apenas com origem)\n" +
        "2️⃣ Informar um *destino diferente*\n\n" +
        "0️⃣ Voltar ao menu",
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

export async function handleAskFinalDestination(
  user: UserDoc,
  msg: string,
): Promise<{ msg: string }> {
  msg = msg.trim();

  if (msg === "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  if (msg === "1") {
    const sessionData = await getSessionData(user.id);
    const instructions = sessionData.batchMode
      ? batchRouteInstructions()
      : manualRouteInstructions();

    await setSession(user.id, {
      step: sessionData.batchMode
        ? "batch_route_insert"
        : "manual_route_insert",
    });

    return {
      msg: "🔁 *Rota otimizada selecionada!*\n\n" + instructions,
    };
  }

  if (msg === "2") {
    await setSession(user.id, {
      step: "user_send_final_destination",
    });

    return {
      msg:
        "📍 *Destino final*\n\n" +
        "Envie *em texto* o endereço do *destino final*.\n" +
        "0️⃣ Cancelar",
    };
  }

  return { msg: "Opção inválida. Responda com 1️⃣ ou 2️⃣." };
}

export async function handleUserSendFinalDestination(
  user: UserDoc,
  msg: string,
): Promise<{ msg: string }> {
  msg = msg.trim();

  if (msg === "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  const address = (await validateAddresses([msg])).at(0);

  if (!address || !address.found) {
    return {
      msg:
        "❌ Não consegui identificar esse destino.\n\n" +
        "Por favor, envie um endereço válido para o *destino final*.",
    };
  }

  const sessionData = await getSessionData(user.id);
  const instructions = sessionData.batchMode
    ? batchRouteInstructions()
    : manualRouteInstructions();

  await setSession(user.id, {
    step: sessionData.batchMode ? "batch_route_insert" : "manual_route_insert",
    data: {
      finalDestination: address,
    },
  });

  return {
    msg:
      "🏁 *Destino final confirmado!*\n\n" +
      `📍 *${address.formatted}*\n\n` +
      instructions,
  };
}

function normalizeSpokenText(text: string): string {
  return text
    .replace(/\b(e depois|depois|e também|mais um|também|em seguida)\b/gi, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function _handleTextRouteInsert(
  user: UserDoc,
  msg: string,
): Promise<{ msg: string; mediaUrl?: string }> {
  const session = await getSessionData(user.id);

  const appendMode = session?.appendMode === true;
  const previous = (session?.validatedAddresses as Address[]) || [];

  const addresses = msg.trim().split("\n");

  if (addresses.length === 0) {
    return {
      msg:
        "❌ Não consegui gerar a rota.\n\n" +
        "Preciso de pelo menos *1 endereço válido*.\n" +
        "Digite o número para corrigir ou *0* para cancelar.",
    };
  }

  const validatedAddresses = await validateAddresses(addresses);

  const merged = appendMode
    ? [...previous, ...validatedAddresses]
    : validatedAddresses;

  await setSession(user.id, {
    step: "route_review",
    data: { validatedAddresses: merged, appendMode: false },
  });

  const foundList = merged
    .filter((a) => a.formatted)
    .map((a, i) => `${i + 1}. ${a.formatted}`)
    .join("\n");

  const notFoundArr = merged.filter((a) => !a.formatted);

  let response = `📍 *Endereços encontrados:*\n${foundList}\n\n`;

  if (notFoundArr.length > 0) {
    const nf = notFoundArr.map((a, i) => `${i + 1}. ${a.original}`).join("\n");

    response += `⚠️ *Endereços não reconhecidos:*\n${nf}\n\n`;
  }

  response +=
    "👉 Digite o número para editar ou excluir um endereço\n" +
    "👉 Envie *A* para adicionar mais endereços\n" +
    "👉 Envie *OK* para gerar a rota\n" +
    "👉 Ou *0* para voltar ao menu";

  return { msg: response };
}

async function resolveAddressesFromInput(
  user: UserDoc,
  msg: string,
  mediaUrl?: string,
  mediaType?: string,
): Promise<string[] | null> {
  if (mediaUrl && mediaType?.startsWith("image/")) {
    const ocrText = await extractTextFromImage(mediaUrl);
    if (!ocrText) return null;
    return extractAddressesFromText(ocrText);
  }

  if (mediaUrl && mediaType?.startsWith("audio/")) {
    const text = await transcribeAudio(mediaUrl);
    if (!text) return null;
    const normalized = normalizeSpokenText(text);
    return extractAddressesFromText(normalized);
  }

  // texto puro
  return extractAddressesFromText(msg);
}

export async function handleManualRouteInsert(
  user: UserDoc,
  msg: string,
  mediaUrl?: string,
  mediaType?: string,
): Promise<{ msg: string; mediaUrl?: string }> {
  if (msg.trim() === "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  const addresses = await resolveAddressesFromInput(
    user,
    msg,
    mediaUrl,
    mediaType,
  );

  if (!addresses || addresses.length === 0) {
    return {
      msg:
        "Não consegui identificar nenhum endereço 😕\n\n" +
        "👉 Você pode:\n" +
        "• Enviar o texto novamente\n" +
        "• Enviar uma foto com os endereços\n\n" +
        "Digite *0* para cancelar.",
    };
  }

  return _handleTextRouteInsert(user, addresses.join("\n"));
}

export async function handleRouteBatchInsert(
  user: UserDoc,
  msg: string,
  mediaUrl?: string,
  mediaType?: string,
): Promise<{ msg: string }> {
  const session = await getSessionData(user.id);

  if (!session?.collected) {
    session.collected = {
      texts: [],
      images: [],
      audios: [],
    };
  }

  // Cancelar tudo
  if (msg.trim() === "0") {
    await setSession(user.id, { step: "route_menu" });
    return { msg: routeMenu() };
  }

  // Finalizar coleta
  if (msg.trim().toUpperCase() === "OK") {
    return finalizeBatchRoute(user, session.collected);
  }

  // Coleta silenciosa
  if (mediaUrl && mediaType?.startsWith("image/")) {
    session.collected.images.push(mediaUrl);
  } else if (mediaUrl && mediaType?.startsWith("audio/")) {
    session.collected.audios.push(mediaUrl);
  } else if (msg.trim().length > 3) {
    session.collected.texts.push(msg);
  }

  await setSession(user.id, {
    step: "batch_route_insert",
    data: session,
  });

  // Não responde nada
  return { msg: "" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function finalizeBatchRoute(user: UserDoc, collected: any) {
  const extracted: string[] = [];

  for (const img of collected.images) {
    const text = await extractTextFromImage(img);
    if (text) extracted.push(...(await extractAddressesFromText(text)));
  }

  for (const audio of collected.audios) {
    const t = await transcribeAudio(audio);
    if (t) {
      extracted.push(
        ...(await extractAddressesFromText(normalizeSpokenText(t))),
      );
    }
  }

  for (const txt of collected.texts) {
    extracted.push(...(await extractAddressesFromText(txt)));
  }

  if (extracted.length === 0) {
    return {
      msg:
        "❌ Não consegui identificar endereços.\n\n" +
        "Envie novamente ou digite *0* para cancelar.",
    };
  }

  const validated = await validateAddresses(extracted);

  await setSession(user.id, {
    step: "route_review",
    data: {
      validatedAddresses: validated,
    },
  });

  return {
    msg: "✅ Endereços recebidos!\n\n" + buildRouteReviewMessage(validated),
  };
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
  msg: string,
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
    await setSession(user.id, { step: "user_send_location" });

    return {
      msg:
        "⚠️ Parece que perdi algumas informações da sua rota.\n\n" +
        "Vamos recomeçar rapidinho 😊\n" +
        "📍 Envie novamente sua *localização atual*.",
    };
  }

  // Tentativa de edição por número
  if (/^\d+$/.test(msg)) {
    const index = Number(msg) - 1;

    if (index < 0 || index >= validated.length) {
      return {
        msg:
          "❌ Esse número não corresponde a nenhum endereço da lista.\n\n" +
          "Digite um número válido ou envie *OK* para gerar a rota.",
      };
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
        "✏️ *Edição de endereço*\n\n" +
        "Digite o *novo endereço* para substituir\n" +
        "ou envie *DEL* para excluir este endereço.\n\n" +
        `📍 *${validated[index].original}*\n\n` +
        "0️⃣ Cancelar",
    };
  }

  if (msg === "A") {
    await setSession(user.id, {
      step: "manual_route_insert",
      data: {
        appendMode: true,
      },
    });

    return {
      msg:
        "➕ *Adicionar mais endereços*\n\n" +
        "Envie os novos endereços (texto ou imagem).\n" +
        "Eles serão adicionados à lista atual.\n\n" +
        "❌ Envie *0* para cancelar.",
    };
  }

  if (msg === "OK") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validOnly = validated.filter(hasCoords);

    if (validOnly.length === 0) {
      return {
        msg:
          "❌ Nenhum endereço válido encontrado.\n\n" +
          "Edite algum endereço ou envie novos destinos antes de gerar a rota.",
      };
    }

    const origin: Address = {
      original: userLocation.formatted,
      formatted: userLocation.formatted,
      found: true,
      lat: userLocation.lat,
      lon: userLocation.lon,
    };

    const waypoints = validated.filter(hasCoords);

    const finalDestination =
      sessionData.finalDestination && hasCoords(sessionData.finalDestination)
        ? (sessionData.finalDestination as Address)
        : null;

    const optimizedWaypoints = buildOptimizedRoute(origin, waypoints);

    const orderedWithOrigin = finalDestination
      ? [...optimizedWaypoints, finalDestination]
      : optimizedWaypoints;

    const apiChunks = chunkRoute(orderedWithOrigin, 25);

    let currentOrigin = origin;
    const refined: Address[] = [];

    for (const chunk of apiChunks) {
      const optimized = await optimizeChunkWithGoogle(currentOrigin, chunk);
      refined.push(...optimized);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      currentOrigin = optimized.at(-1)!;
    }

    const cleanRoute = removeNearDuplicatePoints(refined.filter(hasCoords));
    const totalKm = calculateDistanceKm(cleanRoute);

    const links = generateMapsLinks(cleanRoute);

    await Promise.allSettled([
      saveRouteStats(user.id, {
        distanceKm: totalKm,
        stops: cleanRoute.length - 1,
        chunks: links.length,
      }),
      updateRouteSummary(user.id, {
        km: totalKm,
        stops: cleanRoute.length - 1,
      }),
    ]);

    let response =
      "🚀 *Rota otimizada gerada!*\n" +
      "📐 Ordenada por proximidade geográfica\n" +
      "⚠️ Dividida em etapas por limite do Google Maps\n\n";

    links.forEach((link, i) => {
      response += `🗺️ *Trecho ${i + 1}:*\n${link}\n\n`;
    });

    await clearSessionData(user.id);
    await setSession(user.id, { step: "route_menu" });

    response +=
      "Digite *1* para começar uma nova rota\n" +
      "Digite *0* para voltar ao menu principal.";

    return { msg: response };
  }

  return {
    msg:
      "🤔 Não entendi sua resposta.\n\n" +
      "👉 Digite o número para editar ou excluir um endereço\n" +
      "👉 Envie *A* para adicionar mais endereços\n" +
      "👉 Envie *OK* para gerar a rota\n" +
      "👉 Ou *0* para voltar ao menu",
  };
}

export async function handleRouteEdit(
  user: UserDoc,
  msg: string,
): Promise<{ msg: string; mediaUrl?: string }> {
  msg = msg.trim();

  const sessionData = await getSessionData(user.id);

  const index = sessionData?.indexToEdit as number | undefined;
  const validated = sessionData?.validatedAddresses as Address[] | undefined;
  const userLocation = sessionData?.userLocation;

  if (!validated || !userLocation || index === undefined) {
    await setSession(user.id, { step: "route_menu" });
    return {
      msg:
        "⚠️ Ocorreu um erro durante a edição.\n" +
        "Voltando ao menu principal.",
    };
  }

  // Cancelar edição
  if (msg === "0") {
    await setSession(user.id, {
      step: "route_review",
      data: {
        validatedAddresses: validated,
        userLocation,
      },
    });

    return {
      msg: "❌ *Edição cancelada.*\n\n" + buildRouteReviewMessage(validated),
    };
  }

  // 🗑️ Excluir endereço
  if (msg.toUpperCase() === "DEL") {
    const removed = validated.splice(index, 1);

    await setSession(user.id, {
      step: "route_review",
      data: { validatedAddresses: validated, userLocation },
    });

    if (validated.length === 0) {
      return {
        msg:
          "🗑️ *Endereço removido.*\n\n" +
          "⚠️ Nenhum endereço restante.\n" +
          "Envie novos endereços para continuar ou *0* para voltar.",
      };
    }

    return {
      msg:
        `🗑️ *Endereço removido:*\n📍 ${removed[0].original}\n\n` +
        buildRouteReviewMessage(validated),
    };
  }

  if (msg.length < 5) {
    return {
      msg:
        "🤔 Esse endereço parece muito curto.\n" +
        "Digite o endereço completo ou *0* para cancelar.",
    };
  }

  const [updated] = await validateAddresses([msg]);

  validated[index] = updated;

  await setSession(user.id, {
    step: "route_review",
    data: {
      validatedAddresses: validated,
      userLocation,
    },
  });

  return {
    msg:
      "✅ *Endereço atualizado com sucesso!*\n\n" +
      buildRouteReviewMessage(validated),
  };
}

function buildRouteReviewMessage(validated: Address[]): string {
  const found = validated
    .filter((a) => a.formatted)
    .map((a, i) => `${i + 1}. ${a.formatted}`)
    .join("\n");

  const notFound = validated.filter((a) => !a.formatted);

  let msg =
    "📍 *Endereços encontrados:*\n" +
    `${found || "Nenhum endereço válido"}\n\n`;

  if (notFound.length > 0) {
    msg +=
      "⚠️ *Endereços não reconhecidos:*\n" +
      notFound.map((a, i) => `${i + 1}. ${a.original}`).join("\n") +
      "\n\n";
  }

  msg +=
    "👉 Digite o número para editar ou excluir um endereço\n" +
    "👉 Envie *A* para adicionar mais endereços\n" +
    "👉 Envie *OK* para gerar a rota\n" +
    "👉 Ou *0* para voltar ao menu";

  return msg;
}
