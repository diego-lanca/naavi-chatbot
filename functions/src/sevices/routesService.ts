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
  const intermediateAddresses = valid.slice(0, -1);

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

  const MAX_WAYPOINTS = 9;

  let i = 0;

  while (i < clean.length - 1) {
    // destino real do trecho
    const destination = clean[i + 1 + MAX_WAYPOINTS] ?? clean.at(-1)!;

    // waypoints = pontos ENTRE onde o usuário está e o destino
    const waypoints = clean.slice(i + 1, clean.indexOf(destination));

    const params = new URLSearchParams({
      api: "1",
      destination: `${destination.lat},${destination.lon}`,
      travelmode: "driving",
    });

    if (waypoints.length) {
      params.append(
        "waypoints",
        waypoints.map((p) => `${p.lat},${p.lon}`).join("|")
      );
    }

    links.push(`https://www.google.com/maps/dir/?${params.toString()}`);

    // próximo trecho começa no destino atual
    i = clean.indexOf(destination);
  }

  return links;
}
