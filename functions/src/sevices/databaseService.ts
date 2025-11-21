import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { Session } from "../models/session";
import { Subscription } from "../models/subscription";

const db = getFirestore();
const sessionsRef = db.collection("sessions");
const subRef = db.collection("subscriptions");

export async function getSession(userId: string): Promise<Session | null> {
  // Busca o documento diretamente pelo seu ID (a "etiqueta da gaveta")
  const docRef = sessionsRef.doc(userId);
  const docSnap = await docRef.get();

  // Se existir, retorna os dados do documento
  return docSnap.data() as Session;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSessionData(userId: string): Promise<any | null> {
  const session = await getSession(userId);

  return session?.data ?? null;
}

export async function setSession(
  userId: string,
  session: Partial<Session>
): Promise<void> {
  await sessionsRef.doc(userId).set(
    {
      ...session,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

export async function getSubscription(
  userId: string
): Promise<Subscription | null> {
  const doc = await subRef.doc(userId).get();
  return doc.exists ? (doc.data() as Subscription) : null;
}

export async function upsertSubscription(
  userId: string,
  data: Subscription
): Promise<void> {
  const userSub = subRef.doc(userId);

  const payload = {
    ...data,
    updatedAt: Timestamp.fromDate(new Date()),
  };
  await userSub.set(payload, { merge: true });
}
