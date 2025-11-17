export interface Address {
  original: string;
  found: boolean;
  provider?: string;
  formatted?: string;
  lat?: number;
  lon?: number;
}
