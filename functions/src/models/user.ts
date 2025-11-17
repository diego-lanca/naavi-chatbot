import { Timestamp } from "firebase-admin/firestore";

export interface User {
  // Dados pessoais
  name?: string;
  phone: string;
  acceptedTerms: boolean;
  age?: number;
  sex?: string;
  createdAt: Timestamp;
  lastSeen?: Timestamp;
}

export interface UserDoc extends User {
  id: string;
}
