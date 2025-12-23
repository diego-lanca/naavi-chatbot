/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { env } from "../config/env";
import { Address } from "../models/address";
import { hasCoords } from "../utils/functions";

const API_KEY = env.GOOGLEAPI_KEY;

export async function computeBestRoute(
  origin: Address,
  destinations: Address[]
): Promise<Address[]> {
  const valid = destinations.filter(
    (a) => a.found && typeof a.lat === "number" && typeof a.lon === "number"
  );

  if (valid.length === 0) return [origin];
  if (valid.length === 1) return [origin, valid[0]];

  const destinationFinal = valid[valid.length - 1];
  const intermediateAddresses = valid.slice(0, -1); // 👈 TODOS menos o último

  const intermediates = intermediateAddresses.map((a) => ({
    location: {
      latLng: {
        latitude: a.lat!,
        longitude: a.lon!,
      },
    },
  }));

  const body = {
    origin: {
      location: {
        latLng: {
          latitude: origin.lat!,
          longitude: origin.lon!,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destinationFinal.lat!,
          longitude: destinationFinal.lon!,
        },
      },
    },
    intermediates,
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    optimizeWaypointOrder: true,
  };

  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "routes.optimizedIntermediateWaypointIndex",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();

  const optimizedIdx: number[] =
    data.routes?.[0]?.optimizedIntermediateWaypointIndex ?? [];

  const ordered = [
    origin,
    ...optimizedIdx.map((i) => intermediateAddresses[i]),
    destinationFinal,
  ];

  return ordered;
}

export async function optimizeChunkWithGoogle(
  origin: Address,
  chunk: Address[]
): Promise<Address[]> {
  if (chunk.length <= 1) return chunk;

  return await computeBestRoute(origin, chunk);
}

export function generateMapsLinks(route: Address[]): string[] {
  const clean = route.filter(hasCoords);

  const links: string[] = [];
  let i = 0;

  while (i < clean.length - 1) {
    const chunk = clean.slice(i, i + 10);

    if (i !== 0) {
      chunk.unshift(clean[i - 1]);
    }

    const link =
      "https://www.google.com/maps/dir/" +
      chunk.map((p) => `${p.lat},${p.lon}`).join("/");

    links.push(link);
    i += 9;
  }

  return links;
}
