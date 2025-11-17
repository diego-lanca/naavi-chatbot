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
  const data = await res.json() as any;

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
