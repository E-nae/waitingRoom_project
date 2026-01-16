import 'ioredis';

declare module 'ioredis' {
  interface Redis {
    atomicPurchase(
      stockKey: string,
      activeUsersKey: string,
      userId: string,
      quantity: number
    ): Promise<number>;
  }
}
