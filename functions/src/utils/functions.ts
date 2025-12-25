import fetch from "node-fetch";
import {
  GeocodeResponse,
  GoogleGeocodingResult,
} from "../models/googleGeocoding";
import { env } from "../config/env";
import { Address } from "../models/address";

const GOOGLE_API_KEY = env.GOOGLEAPI_KEY !== "" ? env.GOOGLEAPI_KEY : null;

export function parseAge(msg: string): number | null {
  const age = parseInt(msg.trim(), 10);
  return isNaN(age) ? null : age;
}

export async function validateAddresses(
  addresses: string[]
): Promise<Address[]> {
  const results: Address[] = [];

  for (const address of addresses) {
    const res = await geocodeAddress(address);

    if (res) {
      results.push({
        original: address,
        found: true,
        provider: res.provider,
        formatted: res.address,
        lat: res.lat,
        lon: res.lon,
      });
    } else {
      results.push({
        original: address,
        found: false,
      });
    }

    await new Promise((r) => setTimeout(r, 1000)); // respeita limite
  }

  return results;
}

export async function getAddressFromCoords(
  lat: string,
  lon: string
): Promise<string | null> {
  const apiKey = GOOGLE_API_KEY;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;

  const res = await fetch(url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;

  if (data.status !== "OK") return null;

  return data.results[0]?.formatted_address || null;
}

export async function geocodeAddress(
  endereco: string
): Promise<GeocodeResponse | null> {
  const enderecoComPais = endereco.includes("Brasil")
    ? endereco
    : `${endereco}, Brasil`;

  const googleURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    enderecoComPais
  )}&region=br&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(googleURL);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;

    if (data.status === "OK" && data.results.length > 0) {
      const result: GoogleGeocodingResult = data.results[0];
      return {
        provider: "google",
        address: result.formatted_address,
        lat: result.geometry.location.lat,
        lon: result.geometry.location.lng,
      };
    } else {
      console.warn("Google não encontrou:", data.status);
      return null;
    }
  } catch (err) {
    console.error("Erro Google Geocoding:", err);
    return null;
  }
}

export function haversineDistance(a: Address, b: Address): number {
  if (!hasCoords(a) || !hasCoords(b)) {
    return Number.POSITIVE_INFINITY;
  }

  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function buildOptimizedRoute(
  origin: Address,
  destinations: Address[]
): Address[] {
  const remaining = [...destinations];
  const route: Address[] = [];

  let current = origin;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(current, remaining[i]);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestIndex = i;
      }
    }

    const next = remaining.splice(nearestIndex, 1)[0];
    route.push(next);
    current = next;
  }

  return route;
}

export function hasCoords(
  a: Address
): a is Address & { lat: number; lon: number } {
  return (
    a.found === true && typeof a.lat === "number" && typeof a.lon === "number"
  );
}

export function chunkRoute<T>(points: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < points.length; i += size) {
    chunks.push(points.slice(i, i + size));
  }
  return chunks;
}

function almostEqual(a: number, b: number, epsilon = 1e-5) {
  return Math.abs(a - b) < epsilon;
}

export function removeNearDuplicatePoints(route: Address[]): Address[] {
  return route.filter((p, i, arr) => {
    if (i === 0) return true;

    const prev = arr[i - 1];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return !(almostEqual(p.lat!, prev.lat!) && almostEqual(p.lon!, prev.lon!));
  });
}
