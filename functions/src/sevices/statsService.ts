import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Retorna { minutes: number, seconds: number }
 */
export async function calculateAverageTime(userId: string) {
  const ref = db.collection("routes").doc(userId).collection("items");
  const snap = await ref.get();

  if (snap.empty) return null;

  let totalSeconds = 0;
  let count = 0;

  snap.forEach((doc) => {
    const data = doc.data();

    if (!data.startAt || !data.endAt) return;

    const start = data.startAt.toDate();
    const end = data.endAt.toDate();

    const diff = (end.getTime() - start.getTime()) / 1000; // seg
    if (diff > 0) {
      totalSeconds += diff;
      count++;
    }
  });

  if (count === 0) return null;

  const avg = Math.floor(totalSeconds / count);

  return {
    minutes: Math.floor(avg / 60),
    seconds: Math.floor(avg % 60),
  };
}

/**
 * Retorna total de KM percorridos
 */
export async function calculateTotalDistance(userId: string): Promise<number> {
  const ref = db.collection("routes").doc(userId).collection("items");
  const snap = await ref.get();

  if (snap.empty) return 0;

  let total = 0;

  snap.forEach((doc) => {
    const data = doc.data();
    if (typeof data.distanceKm === "number") {
      total += data.distanceKm;
    }
  });

  return total;
}

const KM_PER_LITER = 35; // ajuste se quiser
const FUEL_PRICE = 6.0; // preço médio da gasolina

/**
 * Retorna: { liters: number, money: number }
 */
export async function calculateFuelSaving(userId: string) {
  const km = await calculateTotalDistance(userId);

  if (!km || km <= 0) return null;

  const liters = km / KM_PER_LITER;
  const money = liters * FUEL_PRICE;

  return {
    liters,
    money,
  };
}

/**
 * Retorna lista:
 * [
 *   { date: "10/01/2025", km: 12.5 },
 *   ...
 * ]
 */
export async function getRoutesHistory(userId: string) {
  const ref = db.collection("routes").doc(userId).collection("items");
  const snap = await ref.orderBy("startAt", "desc").limit(15).get();

  if (snap.empty) return [];

  const result: Array<{ date: string; km: number }> = [];

  snap.forEach((doc) => {
    const data = doc.data();
    if (!data.startAt || typeof data.distanceKm !== "number") return;

    const d = data.startAt.toDate();
    const formatted =
      String(d.getDate()).padStart(2, "0") +
      "/" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "/" +
      d.getFullYear();

    result.push({
      date: formatted,
      km: data.distanceKm,
    });
  });

  return result;
}
