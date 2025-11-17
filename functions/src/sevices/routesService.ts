import { env } from "../config/env";
import { Address } from "../models/address";

const API_KEY = env.GOOGLEAPI_KEY;

export async function computeBestRoute(addresses: Address[]) {
  const valid = addresses.filter((a) => a.lat && a.lon);

  if (valid.length < 2) {
    throw new Error(
      "É necessário pelo menos dois endereços com latitude e longitude."
    );
  }

  const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;

  const body = {
    origin: {
      location: { latLng: { latitude: valid[0].lat, longitude: valid[0].lon } },
    },
    destination: {
      location: {
        latLng: {
          latitude: valid[valid.length - 1].lat,
          longitude: valid[valid.length - 1].lon,
        },
      },
    },
    intermediates: valid.slice(1, -1).map((a) => ({
      location: { latLng: { latitude: a.lat, longitude: a.lon } },
    })),
    travelMode: "DRIVE",
    optimizeWaypointOrder: true,
    routingPreference: "TRAFFIC_AWARE",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask":
        "routes.optimizedIntermediateWaypointIndex.routes" +
        ".routeLabels.routes.distanceMeters.routes.duration.routes.polyline",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  // 👇 extrai a melhor ordem dos pontos intermediários
  const optimizedOrder =
    data.routes?.[0]?.optimizedIntermediateWaypointIndex || [];

  // monta a lista na nova ordem
  const ordered = [
    valid[0],
    // intermediários reordenados
    ...optimizedOrder.map((i: number) => valid[i + 1]),
    valid[valid.length - 1],
  ];

  // 👇 gera link do Google Maps
  const mapsLink =
    "https://www.google.com/maps/dir/" +
    ordered.map((a) => `${a.lat},${a.lon}`).join("/");

  return {
    optimizedOrder,
    mapsLink,
  };
}
