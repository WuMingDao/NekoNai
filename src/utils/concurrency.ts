export interface LockStore {
  tryAcquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

export class MemoryLockStore implements LockStore {
  private locks = new Map<string, number>(); // key -> expiresAtMs

  async tryAcquire(key: string, ttlMs: number): Promise<boolean> {
    this.cleanup();

    const now = Date.now();
    const expiresAt = this.locks.get(key);
    if (expiresAt !== undefined && expiresAt > now) return false;

    this.locks.set(key, now + ttlMs);
    return true;
  }

  async release(key: string): Promise<void> {
    this.locks.delete(key);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, expiresAt] of this.locks) {
      if (expiresAt <= now) this.locks.delete(key);
    }
  }
}

export const defaultLockStore = new MemoryLockStore();

