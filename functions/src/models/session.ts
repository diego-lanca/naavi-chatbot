export interface Session {
    step: string,
    data: object,
    userId: string,
    updatedAt: FirebaseFirestore.Timestamp
}
