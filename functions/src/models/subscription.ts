import { Timestamp } from "firebase-admin/firestore";

export interface Subscription {
    userId?: string,
    plan?: string,
    status?: 'active' | 'past_due' | 'canceled',
    lastPaymentAt?: Timestamp,
    nextDueDate?: Timestamp,
    createdAt?: Timestamp,
    updatedAt?: Timestamp,
}
