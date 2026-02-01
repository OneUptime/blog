# How to Optimize Bun Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Performance, Optimization, Backend

Description: A comprehensive guide to optimizing Bun runtime performance covering profiling, memory management, HTTP servers, database queries, and caching strategies.

---

Bun has emerged as one of the fastest JavaScript runtimes available, offering significant performance improvements over Node.js out of the box. However, to truly maximize Bun's potential, you need to understand its internals and apply specific optimization techniques. This guide covers everything from profiling and memory management to HTTP server optimization and caching strategies.

## Understanding Bun's Architecture

Bun is built on JavaScriptCore (the same engine that powers Safari) rather than V8. This fundamental difference means that some optimization techniques that work well in Node.js may not apply to Bun, and vice versa. Bun also includes a built-in bundler, test runner, and package manager, all optimized for speed.

Key architectural features that affect performance:
- Native TypeScript and JSX support without transpilation overhead
- Built-in SQLite database
- Native file system operations using io_uring on Linux
- Zero-copy networking with native HTTP implementation

## Profiling Bun Applications

Before optimizing, you need to identify bottlenecks. Bun provides several built-in profiling tools that help you understand where time is being spent.

### Using the Built-in Profiler

The following code demonstrates how to use Bun's native profiling capabilities to measure function execution time:

```typescript
// profiling-example.ts
const startTime = Bun.nanoseconds();

// Your code to profile
async function processData(items: string[]) {
    const results = [];
    for (const item of items) {
        results.push(await transformItem(item));
    }
    return results;
}

async function transformItem(item: string): Promise<string> {
    // Simulate processing
    await Bun.sleep(1);
    return item.toUpperCase();
}

// Execute and measure
const data = Array.from({ length: 100 }, (_, i) => `item-${i}`);
await processData(data);

const endTime = Bun.nanoseconds();
const durationMs = (endTime - startTime) / 1_000_000;
console.log(`Execution time: ${durationMs.toFixed(2)}ms`);
```

### CPU Profiling with Bun

You can generate CPU profiles to analyze performance hotspots using the inspect flag:

```bash
bun --inspect run server.ts
```

For more detailed profiling, create a custom profiler wrapper that tracks function calls:

```typescript
// custom-profiler.ts
interface ProfileResult {
    name: string;
    calls: number;
    totalTime: number;
    avgTime: number;
}

const profiles = new Map<string, { calls: number; totalTime: number }>();

export function profile<T extends (...args: any[]) => any>(
    name: string,
    fn: T
): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
        const start = Bun.nanoseconds();
        const result = fn(...args);
        const duration = Bun.nanoseconds() - start;
        
        const existing = profiles.get(name) || { calls: 0, totalTime: 0 };
        profiles.set(name, {
            calls: existing.calls + 1,
            totalTime: existing.totalTime + duration
        });
        
        return result;
    }) as T;
}

export function getProfileResults(): ProfileResult[] {
    return Array.from(profiles.entries()).map(([name, data]) => ({
        name,
        calls: data.calls,
        totalTime: data.totalTime / 1_000_000,
        avgTime: (data.totalTime / data.calls) / 1_000_000
    }));
}
```

## Memory Optimization

Memory management is crucial for long-running Bun applications. Unlike V8, JavaScriptCore has different garbage collection characteristics that you should understand.

### Monitoring Memory Usage

This utility class helps track memory consumption throughout your application lifecycle:

```typescript
// memory-monitor.ts
export class MemoryMonitor {
    private snapshots: Array<{ timestamp: number; heapUsed: number }> = [];
    private intervalId: Timer | null = null;

    start(intervalMs: number = 1000): void {
        this.intervalId = setInterval(() => {
            // Bun uses process.memoryUsage() similar to Node.js
            const usage = process.memoryUsage();
            this.snapshots.push({
                timestamp: Date.now(),
                heapUsed: usage.heapUsed
            });
        }, intervalMs);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    getReport(): {
        initialHeap: number;
        finalHeap: number;
        peakHeap: number;
        growth: number;
    } {
        if (this.snapshots.length < 2) {
            throw new Error("Not enough snapshots collected");
        }

        const heapValues = this.snapshots.map(s => s.heapUsed);
        return {
            initialHeap: heapValues[0],
            finalHeap: heapValues[heapValues.length - 1],
            peakHeap: Math.max(...heapValues),
            growth: heapValues[heapValues.length - 1] - heapValues[0]
        };
    }
}
```

### Avoiding Memory Leaks

Common memory leak patterns and their solutions in Bun applications:

```typescript
// memory-leak-prevention.ts

// BAD: Unbounded cache growth
const badCache = new Map<string, object>();

// GOOD: LRU cache with size limit
class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private readonly maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }

    get size(): number {
        return this.cache.size;
    }
}

// Usage example
const cache = new LRUCache<string, object>(1000);
```

### Using TypedArrays for Better Memory Efficiency

TypedArrays provide predictable memory layout and better performance for numeric data:

```typescript
// typed-array-optimization.ts

// BAD: Regular array for numeric data
const regularArray = new Array(10000).fill(0).map((_, i) => i * 2);

// GOOD: TypedArray for numeric data
const typedArray = new Int32Array(10000);
for (let i = 0; i < 10000; i++) {
    typedArray[i] = i * 2;
}

// Benchmark comparison
function benchmarkArrayOperations() {
    const iterations = 1000;
    const size = 100000;

    // Regular array benchmark
    const regularStart = Bun.nanoseconds();
    for (let iter = 0; iter < iterations; iter++) {
        const arr = new Array(size);
        for (let i = 0; i < size; i++) {
            arr[i] = i * 2;
        }
    }
    const regularTime = (Bun.nanoseconds() - regularStart) / 1_000_000;

    // TypedArray benchmark
    const typedStart = Bun.nanoseconds();
    for (let iter = 0; iter < iterations; iter++) {
        const arr = new Int32Array(size);
        for (let i = 0; i < size; i++) {
            arr[i] = i * 2;
        }
    }
    const typedTime = (Bun.nanoseconds() - typedStart) / 1_000_000;

    console.log(`Regular Array: ${regularTime.toFixed(2)}ms`);
    console.log(`TypedArray: ${typedTime.toFixed(2)}ms`);
    console.log(`Speedup: ${(regularTime / typedTime).toFixed(2)}x`);
}
```

## Startup Time Optimization

Bun already has excellent startup times, but you can make them even faster with these techniques.

### Lazy Loading Modules

Only load modules when they are actually needed:

```typescript
// lazy-loading.ts

// BAD: Eager loading all modules at startup
import { heavyModule1 } from "./heavy-module-1";
import { heavyModule2 } from "./heavy-module-2";

// GOOD: Lazy loading with dynamic imports
async function getHeavyModule1() {
    const { heavyModule1 } = await import("./heavy-module-1");
    return heavyModule1;
}

// Even better: Lazy singleton pattern
class LazyModuleLoader {
    private static instance: typeof import("./heavy-module-1") | null = null;

    static async getModule() {
        if (!this.instance) {
            this.instance = await import("./heavy-module-1");
        }
        return this.instance;
    }
}
```

### Preloading Critical Modules

Use Bun's preload feature for modules that are always needed:

```typescript
// bunfig.toml
// preload = ["./src/critical-setup.ts"]

// critical-setup.ts
// Initialize critical shared state
globalThis.appConfig = {
    startTime: Date.now(),
    environment: process.env.NODE_ENV || "development"
};

// Pre-warm frequently used imports
import "./database/connection";
import "./cache/redis-client";
```

## Bundle Size Optimization

Smaller bundles mean faster loading and less memory usage. Bun's built-in bundler can help optimize your code.

### Configuring the Bun Bundler

Create an optimized build configuration:

```typescript
// build.ts
const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    minify: {
        whitespace: true,
        identifiers: true,
        syntax: true
    },
    splitting: true,
    sourcemap: "external",
    target: "bun",
    define: {
        "process.env.NODE_ENV": JSON.stringify("production")
    }
});

if (!result.success) {
    console.error("Build failed:");
    for (const message of result.logs) {
        console.error(message);
    }
    process.exit(1);
}

// Report bundle sizes
for (const output of result.outputs) {
    const size = output.size;
    const sizeKB = (size / 1024).toFixed(2);
    console.log(`${output.path}: ${sizeKB} KB`);
}
```

### Tree Shaking Best Practices

Ensure your code is tree-shakeable by avoiding side effects:

```typescript
// tree-shakeable-module.ts

// BAD: Side effect on import
console.log("Module loaded");
export const value = 42;

// GOOD: Pure exports with no side effects
export const value = 42;

export function computeValue(): number {
    return 42;
}

// BAD: Class with static initialization block
export class BadService {
    static instance = new BadService();
    constructor() {
        console.log("Service created");
    }
}

// GOOD: Lazy initialization
export class GoodService {
    private static _instance: GoodService | null = null;
    
    static getInstance(): GoodService {
        if (!this._instance) {
            this._instance = new GoodService();
        }
        return this._instance;
    }
}
```

## HTTP Server Optimization

Bun's HTTP server is extremely fast, but proper configuration can make it even faster.

### High-Performance Server Setup

Configure Bun.serve for maximum throughput:

```typescript
// optimized-server.ts
const server = Bun.serve({
    port: 3000,
    
    // Use fetch handler for request processing
    fetch(request: Request): Response | Promise<Response> {
        const url = new URL(request.url);
        
        // Fast path for common routes
        switch (url.pathname) {
            case "/health":
                return new Response("OK", {
                    headers: { "Content-Type": "text/plain" }
                });
            
            case "/api/data":
                return handleApiData(request);
            
            default:
                return new Response("Not Found", { status: 404 });
        }
    },
    
    // Enable development mode only in dev
    development: process.env.NODE_ENV !== "production",
    
    // Increase max request body size if needed
    maxRequestBodySize: 1024 * 1024 * 10, // 10MB
});

async function handleApiData(request: Request): Promise<Response> {
    const data = { timestamp: Date.now(), status: "success" };
    
    return Response.json(data, {
        headers: {
            "Cache-Control": "public, max-age=60",
            "X-Response-Time": `${Bun.nanoseconds()}`
        }
    });
}

console.log(`Server running at http://localhost:${server.port}`);
```

### Response Streaming for Large Data

Use streaming responses to reduce memory pressure and improve time-to-first-byte:

```typescript
// streaming-response.ts
import { Readable } from "stream";

async function streamLargeDataset(request: Request): Promise<Response> {
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
        async start(controller) {
            // Stream data in chunks
            for (let i = 0; i < 10000; i++) {
                const chunk = JSON.stringify({ id: i, data: `item-${i}` }) + "\n";
                controller.enqueue(encoder.encode(chunk));
                
                // Yield to event loop periodically
                if (i % 100 === 0) {
                    await Bun.sleep(0);
                }
            }
            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson",
            "Transfer-Encoding": "chunked"
        }
    });
}
```

### Connection Keep-Alive and HTTP/2

Bun automatically handles keep-alive connections. For optimal performance, configure your reverse proxy appropriately:

```typescript
// connection-management.ts
const connectionStats = {
    activeConnections: 0,
    totalRequests: 0
};

const server = Bun.serve({
    port: 3000,
    
    fetch(request: Request): Response {
        connectionStats.totalRequests++;
        
        return Response.json({
            activeConnections: connectionStats.activeConnections,
            totalRequests: connectionStats.totalRequests
        });
    },
    
    // WebSocket support for persistent connections
    websocket: {
        open(ws) {
            connectionStats.activeConnections++;
        },
        close(ws) {
            connectionStats.activeConnections--;
        },
        message(ws, message) {
            ws.send(`Echo: ${message}`);
        }
    }
});
```

## Database Query Optimization

Bun includes built-in SQLite support and works well with external databases. Proper query optimization is essential.

### Using Bun's Built-in SQLite

Leverage prepared statements and transactions for better performance:

```typescript
// sqlite-optimization.ts
import { Database } from "bun:sqlite";

const db = new Database("app.db", { create: true });

// Enable WAL mode for better concurrent performance
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");
db.run("PRAGMA cache_size = 10000");

// Create table
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
    )
`);

// BAD: Creating new statement each time
function badInsertUser(name: string, email: string) {
    return db.run(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        [name, email]
    );
}

// GOOD: Prepared statement reuse
const insertUserStmt = db.prepare(
    "INSERT INTO users (name, email) VALUES ($name, $email)"
);

function goodInsertUser(name: string, email: string) {
    return insertUserStmt.run({ $name: name, $email: email });
}

// GOOD: Batch inserts with transactions
function batchInsertUsers(users: Array<{ name: string; email: string }>) {
    const transaction = db.transaction((userList) => {
        for (const user of userList) {
            insertUserStmt.run({ $name: user.name, $email: user.email });
        }
    });
    
    transaction(users);
}

// Benchmark comparison
const testUsers = Array.from({ length: 1000 }, (_, i) => ({
    name: `User ${i}`,
    email: `user${i}@example.com`
}));

const start = Bun.nanoseconds();
batchInsertUsers(testUsers);
const duration = (Bun.nanoseconds() - start) / 1_000_000;
console.log(`Batch insert of 1000 users: ${duration.toFixed(2)}ms`);
```

### Connection Pooling for External Databases

Implement connection pooling for PostgreSQL or MySQL:

```typescript
// connection-pool.ts
interface PoolConfig {
    maxConnections: number;
    minConnections: number;
    acquireTimeout: number;
}

class ConnectionPool<T> {
    private available: T[] = [];
    private inUse = new Set<T>();
    private waiting: Array<(conn: T) => void> = [];
    
    constructor(
        private createConnection: () => Promise<T>,
        private config: PoolConfig
    ) {}

    async initialize(): Promise<void> {
        for (let i = 0; i < this.config.minConnections; i++) {
            const conn = await this.createConnection();
            this.available.push(conn);
        }
    }

    async acquire(): Promise<T> {
        // Return available connection
        if (this.available.length > 0) {
            const conn = this.available.pop()!;
            this.inUse.add(conn);
            return conn;
        }

        // Create new connection if under limit
        if (this.inUse.size < this.config.maxConnections) {
            const conn = await this.createConnection();
            this.inUse.add(conn);
            return conn;
        }

        // Wait for available connection
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waiting.indexOf(resolve);
                if (index > -1) {
                    this.waiting.splice(index, 1);
                }
                reject(new Error("Connection acquire timeout"));
            }, this.config.acquireTimeout);

            this.waiting.push((conn) => {
                clearTimeout(timeout);
                resolve(conn);
            });
        });
    }

    release(conn: T): void {
        this.inUse.delete(conn);

        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift()!;
            this.inUse.add(conn);
            resolve(conn);
        } else {
            this.available.push(conn);
        }
    }

    get stats() {
        return {
            available: this.available.length,
            inUse: this.inUse.size,
            waiting: this.waiting.length
        };
    }
}
```

## Caching Strategies

Effective caching dramatically improves application performance by reducing redundant computations and I/O.

### In-Memory Caching with TTL

Implement a cache with time-to-live expiration:

```typescript
// ttl-cache.ts
interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export class TTLCache<K, V> {
    private cache = new Map<K, CacheEntry<V>>();
    private cleanupInterval: Timer;

    constructor(private defaultTTL: number = 60000) {
        // Periodic cleanup of expired entries
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, defaultTTL);
    }

    get(key: K): V | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        
        return entry.value;
    }

    set(key: K, value: V, ttl?: number): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttl ?? this.defaultTTL)
        });
    }

    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.cache.clear();
    }
}

// Usage with memoization pattern
const apiCache = new TTLCache<string, object>(30000); // 30 second TTL

async function fetchWithCache(url: string): Promise<object> {
    const cached = apiCache.get(url);
    if (cached) {
        return cached;
    }

    const response = await fetch(url);
    const data = await response.json();
    apiCache.set(url, data);
    return data;
}
```

### Request-Level Caching

Implement request deduplication for concurrent identical requests:

```typescript
// request-dedup.ts
class RequestDeduplicator {
    private inflight = new Map<string, Promise<Response>>();

    async fetch(url: string, options?: RequestInit): Promise<Response> {
        const key = `${options?.method || "GET"}:${url}`;
        
        // Return existing promise if request is in flight
        const existing = this.inflight.get(key);
        if (existing) {
            return existing.then(r => r.clone());
        }

        // Create new request
        const promise = fetch(url, options);
        this.inflight.set(key, promise);

        try {
            const response = await promise;
            return response;
        } finally {
            this.inflight.delete(key);
        }
    }
}

const deduplicator = new RequestDeduplicator();

// Multiple concurrent calls to same endpoint will share one request
await Promise.all([
    deduplicator.fetch("https://api.example.com/data"),
    deduplicator.fetch("https://api.example.com/data"),
    deduplicator.fetch("https://api.example.com/data")
]);
```

## Benchmarking Your Application

Accurate benchmarking is essential for measuring optimization impact.

### Creating Reproducible Benchmarks

Build a benchmark framework for consistent measurements:

```typescript
// benchmark-framework.ts
interface BenchmarkResult {
    name: string;
    iterations: number;
    totalTimeMs: number;
    avgTimeMs: number;
    opsPerSecond: number;
    minTimeMs: number;
    maxTimeMs: number;
}

export async function benchmark(
    name: string,
    fn: () => void | Promise<void>,
    options: { iterations?: number; warmup?: number } = {}
): Promise<BenchmarkResult> {
    const { iterations = 1000, warmup = 100 } = options;
    
    // Warmup phase
    for (let i = 0; i < warmup; i++) {
        await fn();
    }

    // Measurement phase
    const times: number[] = [];
    const totalStart = Bun.nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
        const start = Bun.nanoseconds();
        await fn();
        const end = Bun.nanoseconds();
        times.push((end - start) / 1_000_000);
    }
    
    const totalEnd = Bun.nanoseconds();
    const totalTimeMs = (totalEnd - totalStart) / 1_000_000;

    return {
        name,
        iterations,
        totalTimeMs,
        avgTimeMs: totalTimeMs / iterations,
        opsPerSecond: (iterations / totalTimeMs) * 1000,
        minTimeMs: Math.min(...times),
        maxTimeMs: Math.max(...times)
    };
}

// Compare multiple implementations
export async function compareBenchmarks(
    benchmarks: Array<{ name: string; fn: () => void | Promise<void> }>
): Promise<void> {
    const results: BenchmarkResult[] = [];

    for (const { name, fn } of benchmarks) {
        const result = await benchmark(name, fn);
        results.push(result);
    }

    // Print comparison table
    console.log("\nBenchmark Results:");
    console.log("-".repeat(70));
    console.log(
        "Name".padEnd(25),
        "Avg (ms)".padStart(12),
        "Ops/sec".padStart(15),
        "Min (ms)".padStart(10),
        "Max (ms)".padStart(10)
    );
    console.log("-".repeat(70));

    for (const r of results) {
        console.log(
            r.name.padEnd(25),
            r.avgTimeMs.toFixed(4).padStart(12),
            r.opsPerSecond.toFixed(0).padStart(15),
            r.minTimeMs.toFixed(4).padStart(10),
            r.maxTimeMs.toFixed(4).padStart(10)
        );
    }
}

// Example usage
await compareBenchmarks([
    {
        name: "JSON.parse",
        fn: () => JSON.parse('{"key": "value", "number": 42}')
    },
    {
        name: "Object literal",
        fn: () => ({ key: "value", number: 42 })
    }
]);
```

## Best Practices Summary

Following these best practices will help you maintain optimal performance in your Bun applications:

1. **Profile before optimizing**: Use Bun's built-in profiling tools to identify actual bottlenecks rather than guessing.

2. **Use prepared statements**: Always use prepared statements for database queries to avoid parsing overhead.

3. **Implement connection pooling**: Pool database connections to reduce connection establishment overhead.

4. **Cache strategically**: Use TTL-based caching with appropriate expiration times and implement request deduplication.

5. **Prefer TypedArrays**: Use TypedArrays for numeric data processing to reduce memory overhead and improve performance.

6. **Lazy load modules**: Only import heavy modules when they are actually needed to improve startup time.

7. **Stream large responses**: Use streaming responses for large datasets to reduce memory pressure.

8. **Enable WAL mode for SQLite**: Set `PRAGMA journal_mode = WAL` for better concurrent read/write performance.

9. **Minimize bundle size**: Use tree-shaking, code splitting, and minification to produce smaller bundles.

10. **Benchmark regularly**: Create reproducible benchmarks and track performance over time to catch regressions.

## Conclusion

Optimizing Bun applications requires understanding both the runtime's architecture and applying JavaScript performance best practices. While Bun provides excellent performance out of the box, careful attention to profiling, memory management, database optimization, and caching can yield significant additional improvements.

Start by profiling your application to identify the actual bottlenecks. Focus your optimization efforts on the areas that will have the most impact. Remember that premature optimization is the root of many problems, so always measure before and after making changes to ensure your optimizations are actually improving performance.

The techniques covered in this guide, from connection pooling to request deduplication, are applicable across many types of applications. Adapt them to your specific use case and workload characteristics for the best results.

As Bun continues to evolve, keep an eye on the official documentation for new features and optimizations. The runtime is actively developed, and new performance improvements are regularly added. By combining these optimization techniques with Bun's inherent speed advantages, you can build exceptionally fast and efficient applications.
