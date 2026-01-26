export interface RouteStats {
  distanceKm: number;
  stops: number;
  chunks: number;
  createdAt: FirebaseFirestore.Timestamp;
}
