export interface GoogleGeocodingResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface GeocodeResponse {
  provider: "nominatim" | "google";
  address: string;
  lat: number;
  lon: number;
}
