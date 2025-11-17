import { mainMenu } from "../bot/flows/mainMenu";
import { profileMenu } from "../bot/flows/profileMenu";
import { automaticRouteInstructions } from "../bot/flows/route/automaticRoute";
import {
  sendLocationInstructions,
} from "../bot/flows/route/userLocationInstructions";
import { routeMenu } from "../bot/flows/routeMenu";
import { statsMenu } from "../bot/flows/statsMenu";
import { UserDoc } from "../models/user";
import { setSession } from "../sevices/databaseService";

export async function handleMainMenu(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  const option = msg.trim().toLowerCase();

  if (option === "0") {
    return { msg: mainMenu() };
  }

  const mapping: Record<
    string,
    { step: string; text: string; mediaUrl?: string }
  > = {
    "1": { step: "route_menu", text: routeMenu() },
    "2": { step: "stats_menu", text: statsMenu() },
    "3": { step: "profile_menu", text: profileMenu() },
  };

  const choice = mapping[option] || mapping[msg.toLowerCase()];
  if (!choice) {
    return {
      msg:
        "Opção inválida. Por favor, digite um número de 1 a 3.\n\n" +
        mainMenu(),
    };
  }

  await setSession(user.id, { step: choice.step });
  return { msg: choice.text, mediaUrl: choice.mediaUrl };
}

export async function handleRouteMenu(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  const option = msg.trim().toLowerCase();

  if (option === "0") {
    return { msg: mainMenu() };
  }

  const mapping: Record<
    string,
    { step: string; text: string; mediaUrl?: string }
  > = {
    "1": { step: "user_send_location", text: sendLocationInstructions() },
    "2": { step: "automatic_route_insert", text: automaticRouteInstructions() },
    "3": { step: "main_menu", text: mainMenu() },
  };

  const choice = mapping[option] || mapping[msg.toLowerCase()];
  if (!choice) {
    return {
      msg:
        "Opção inválida. Por favor, digite um número de 1 a 3.\n\n" +
        mainMenu(),
    };
  }

  await setSession(user.id, { step: choice.step });
  return { msg: choice.text, mediaUrl: choice.mediaUrl };
}
