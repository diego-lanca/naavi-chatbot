import { askAge } from "../bot/flows/introdution/askAge";
import { askSex } from "../bot/flows/introdution/askSex";
import { mainMenu } from "../bot/flows/mainMenu";
import { UserDoc } from "../models/user";
import { setSession } from "../sevices/databaseService";
import { setUser } from "../sevices/userService";
import { parseAge } from "../utils/functions";

export function handleIntrodutionOptions(): Record<
  string,
  (user: UserDoc, msg: string) => Promise<{ msg: string; mediaUrl?: string }>
  > {
  return {
    welcome: handleAskName,
    ask_age: handleAskAge,
    ask_sex: handleAskSex,
  };
}

export async function handleAskName(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  const userName = msg.trim();

  if (userName.length < 2 || userName.length > 50 || /^\d+$/.test(userName)) {
    return {
      msg:
        "Hmm, esse nome não parece válido. 🤔\n" +
        "Por favor, digite um nome real para que a " +
        "gente possa se conhecer melhor.",
    };
  }

  await setUser(user.id, { name: userName });
  await setSession(user.id, { step: "ask_age" });
  return {
    msg: `🙋‍♂️ Nome registrado com sucesso: *${userName}*.\n\n${askAge()}`,
  };
}

export async function handleAskAge(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  const age = parseAge(msg);
  if (age === null || age < 12 || age > 100) {
    return { msg: "Por favor, digite um número válido para a sua idade." };
  }

  await setUser(user.id, { age });
  await setSession(user.id, { step: "ask_sex" });
  return {
    msg:
      `🎉 Ótimo! Sua idade foi registrada como *${age}* com sucesso!\n\n` +
      askSex(),
  };
}

export async function handleAskSex(
  user: UserDoc,
  msg: string
): Promise<{ msg: string; mediaUrl?: string }> {
  const sex = msg.trim().toUpperCase();
  if (!["M", "F"].includes(sex)) {
    return { msg: "Por favor, digite M para Masculino ou F para Feminino." };
  }

  // const sexoFormatado = sex === "M" ? "Masculino" : "Feminino";
  await setUser(user.id, { sex });
  await setSession(user.id, { step: "main_menu" });
  return {
    msg: mainMenu(),
  };
}
