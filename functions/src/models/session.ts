export interface Session {
    step: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    userId: string,
    updatedAt: FirebaseFirestore.Timestamp
}
