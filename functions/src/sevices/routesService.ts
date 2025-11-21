import { env } from "../config/env";
import { Address } from "../models/address";

const API_KEY = env.GOOGLEAPI_KEY;

export async function computeBestRoute(addresses: Address[]) {
  const valid = addresses.filter((a) => a.lat && a.lon);

  if (valid.length < 2) {
    throw new Error("Envie pelo menos um destino além da localização atual.");
  }

  // Origem é sempre o primeiro item
  const origin = valid[0];

  const intermediates = valid.slice(1).map((a) => ({
    location: {
      latLng: { latitude: a.lat, longitude: a.lon },
    },
  }));

  const destination = {
    location: {
      latLng: { latitude: origin.lat, longitude: origin.lon },
    },
  };

  const body = {
    origin: {
      location: { latLng: { latitude: origin.lat, longitude: origin.lon } },
    },
    destination,
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
        "X-Goog-FieldMask":
          "routes.optimizedIntermediateWaypointIndex," + "routes.polyline",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();

  const optimizedIdx =
    data.routes?.[0]?.optimizedIntermediateWaypointIndex || [];

  const ordered = [origin, ...optimizedIdx.map((i: number) => valid[i + 1])];

  // Gera rota no Maps (sem volta para origem)
  const mapsLink =
    "https://www.google.com/maps/dir/" +
    ordered.map((a) => `${a.lat},${a.lon}`).join("/");

  return {
    ordered,
    mapsLink,
  };
}
