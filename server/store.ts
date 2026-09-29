export interface Prepared {
  bind(...values: any[]): Prepared;
  first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[] }>;
  run(): Promise<any>;
}
export interface Database {
  prepare(sql: string): Prepared;
  batch(statements: Prepared[]): Promise<any>;
}
export class Store {
  constructor(public db: Database) {}
  async get<T>(kind: string, id: string): Promise<T | null> {
    const r = await this.db
      .prepare("SELECT value FROM records WHERE kind = ? AND id = ?")
      .bind(kind, id)
      .first<{ value: string }>();
    return r ? JSON.parse(r.value) : null;
  }
  async list<T>(kind: string): Promise<T[]> {
    const r = await this.db
      .prepare(
        "SELECT value FROM records WHERE kind = ? ORDER BY created_at, id",
      )
      .bind(kind)
      .all<{ value: string }>();
    return r.results.map((x) => JSON.parse(x.value));
  }
  async put(kind: string, id: string, value: unknown) {
    await this.db
      .prepare(
        "INSERT INTO records (kind,id,value,created_at) VALUES (?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value",
      )
      .bind(kind, id, JSON.stringify(value), new Date().toISOString())
      .run();
  }
  async acquire(key: string) {
    const now = Date.now();
    const result = await this.db
      .prepare(
        "INSERT INTO locks (id,expires_at) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET expires_at=excluded.expires_at WHERE locks.expires_at < ?",
      )
      .bind(key, now + 90000, now)
      .run();
    return (result?.meta?.changes || 0) > 0;
  }
  async release(key: string) {
    await this.db.prepare("DELETE FROM locks WHERE id=?").bind(key).run();
  }
  async rate(key: string, limit: number, window = 3600000) {
    const bucket = Math.floor(Date.now() / window);
    const id = key + ":" + bucket;
    await this.db
      .prepare(
        "INSERT INTO counters (id,count) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET count=count+1",
      )
      .bind(id)
      .run();
    const r = await this.db
      .prepare("SELECT count FROM counters WHERE id=?")
      .bind(id)
      .first<{ count: number }>();
    return (r?.count || 0) <= limit;
  }
}
