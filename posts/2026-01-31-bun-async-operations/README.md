# How to Handle Async Operations in Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Async, JavaScript, Concurrency

Description: A comprehensive guide to mastering asynchronous programming in Bun, covering promises, async/await, concurrency patterns, and Bun-specific APIs.

---

Asynchronous programming is at the heart of modern JavaScript and TypeScript applications. Bun, the fast all-in-one JavaScript runtime, provides excellent support for async operations along with some unique APIs that make handling concurrency even more powerful. In this guide, we will explore everything you need to know about handling async operations in Bun, from basic promises to advanced concurrency patterns.

## Understanding Promises in Bun

Promises are the foundation of async programming in JavaScript. Bun fully supports the standard Promise API with excellent performance characteristics due to its JavaScriptCore engine.

A basic promise represents a value that may be available now, in the future, or never. Here is how you create and use promises in Bun:

```typescript
// Creating a basic promise that resolves after a delay
const fetchUserData = (userId: string): Promise<{ id: string; name: string }> => {
  return new Promise((resolve, reject) => {
    // Simulate an async operation
    setTimeout(() => {
      if (userId) {
        resolve({ id: userId, name: "John Doe" });
      } else {
        reject(new Error("User ID is required"));
      }
    }, 100);
  });
};

// Using the promise with .then() and .catch()
fetchUserData("123")
  .then((user) => {
    console.log("User fetched:", user);
  })
  .catch((error) => {
    console.error("Failed to fetch user:", error.message);
  });
```

## Async/Await Syntax

The async/await syntax provides a cleaner way to work with promises. It makes asynchronous code look and behave more like synchronous code, which improves readability significantly.

Here is the same example using async/await:

```typescript
// Function to fetch user data asynchronously
async function getUserById(userId: string): Promise<{ id: string; name: string }> {
  // Simulate database lookup
  await Bun.sleep(100);
  
  if (!userId) {
    throw new Error("User ID is required");
  }
  
  return { id: userId, name: "John Doe" };
}

// Using async/await to call the function
async function main() {
  try {
    const user = await getUserById("123");
    console.log("User:", user);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
```

## Bun.sleep for Delays

Bun provides a built-in `Bun.sleep()` function that returns a promise resolving after a specified number of milliseconds. This is more efficient than using `setTimeout` wrapped in a promise.

The `Bun.sleep()` function is optimized for the Bun runtime and provides precise timing:

```typescript
// Using Bun.sleep for delays
async function demonstrateSleep() {
  console.log("Starting...");
  
  // Wait for 1 second
  await Bun.sleep(1000);
  console.log("1 second passed");
  
  // Wait for 500 milliseconds
  await Bun.sleep(500);
  console.log("Another 500ms passed");
}

demonstrateSleep();
```

You can also use `Bun.sleepSync()` for synchronous delays, though this should be used sparingly as it blocks the event loop:

```typescript
// Synchronous sleep (use sparingly)
console.log("Before sync sleep");
Bun.sleepSync(100); // Blocks for 100ms
console.log("After sync sleep");
```

## Parallel Execution with Promise.all

When you have multiple independent async operations, running them in parallel can significantly improve performance. `Promise.all` waits for all promises to resolve and returns an array of results.

Here is an example of fetching multiple resources in parallel:

```typescript
// Functions to simulate different API calls
async function fetchUser(id: string) {
  await Bun.sleep(100);
  return { id, type: "user", name: "Alice" };
}

async function fetchOrders(userId: string) {
  await Bun.sleep(150);
  return [
    { orderId: "001", userId, total: 99.99 },
    { orderId: "002", userId, total: 149.99 },
  ];
}

async function fetchPreferences(userId: string) {
  await Bun.sleep(80);
  return { userId, theme: "dark", notifications: true };
}

// Fetch all data in parallel using Promise.all
async function loadUserDashboard(userId: string) {
  const startTime = performance.now();
  
  // All three requests run simultaneously
  const [user, orders, preferences] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
    fetchPreferences(userId),
  ]);
  
  const duration = performance.now() - startTime;
  console.log(`Loaded in ${duration.toFixed(2)}ms`); // ~150ms instead of ~330ms
  
  return { user, orders, preferences };
}

loadUserDashboard("user-123");
```

## Promise.race for Competitive Execution

`Promise.race` returns a promise that resolves or rejects as soon as one of the promises resolves or rejects. This is useful for implementing timeouts or selecting the fastest response.

Here is a timeout pattern using Promise.race:

```typescript
// Create a timeout promise
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

// Simulate a slow API call
async function slowApiCall(): Promise<string> {
  await Bun.sleep(2000);
  return "API Response";
}

// Race between the API call and a timeout
async function fetchWithTimeout() {
  try {
    const result = await Promise.race([
      slowApiCall(),
      timeout(1000), // 1 second timeout
    ]);
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

fetchWithTimeout(); // Will timeout after 1 second
```

## Promise.allSettled for Fault-Tolerant Operations

When you want all promises to complete regardless of whether they succeed or fail, use `Promise.allSettled`. It returns an array of objects describing the outcome of each promise.

This is useful when you want to process all results even if some operations fail:

```typescript
// Functions that may succeed or fail
async function fetchFromPrimaryServer() {
  await Bun.sleep(100);
  return { source: "primary", data: "Primary data" };
}

async function fetchFromBackupServer() {
  await Bun.sleep(150);
  throw new Error("Backup server unavailable");
}

async function fetchFromCacheServer() {
  await Bun.sleep(50);
  return { source: "cache", data: "Cached data" };
}

// Fetch from all sources and handle results individually
async function fetchFromAllSources() {
  const results = await Promise.allSettled([
    fetchFromPrimaryServer(),
    fetchFromBackupServer(),
    fetchFromCacheServer(),
  ]);
  
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`Source ${index}: Success -`, result.value);
    } else {
      console.log(`Source ${index}: Failed -`, result.reason.message);
    }
  });
  
  // Get all successful results
  const successfulData = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);
  
  return successfulData;
}

fetchFromAllSources();
```

## Error Handling Patterns

Proper error handling is crucial in async code. Here are several patterns for handling errors effectively in Bun applications.

The try/catch block is the most straightforward approach for handling errors with async/await:

```typescript
// Basic try/catch error handling
async function processData(data: string) {
  try {
    const parsed = JSON.parse(data);
    await Bun.sleep(100);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, error: "Invalid JSON format" };
    }
    return { success: false, error: "Unknown error occurred" };
  }
}
```

For more complex scenarios, you can create a wrapper function that returns a tuple of error and result:

```typescript
// Utility function for safe async execution
type Result<T> = [null, T] | [Error, null];

async function safeAsync<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}

// Usage example
async function fetchDataSafely() {
  const [error, data] = await safeAsync(
    fetch("https://api.example.com/data").then((r) => r.json())
  );
  
  if (error) {
    console.error("Failed to fetch:", error.message);
    return null;
  }
  
  return data;
}
```

## Concurrency Control Patterns

Sometimes you need to limit the number of concurrent operations to avoid overwhelming resources. Here is a pattern for controlling concurrency:

```typescript
// Concurrency limiter class
class ConcurrencyLimiter {
  private running = 0;
  private queue: (() => void)[] = [];
  
  constructor(private maxConcurrent: number) {}
  
  async run<T>(task: () => Promise<T>): Promise<T> {
    // Wait if at max concurrency
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }
    
    this.running++;
    
    try {
      return await task();
    } finally {
      this.running--;
      // Release next waiting task
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

// Example: Process 10 items with max 3 concurrent operations
async function processWithLimitedConcurrency() {
  const limiter = new ConcurrencyLimiter(3);
  const items = Array.from({ length: 10 }, (_, i) => i);
  
  const results = await Promise.all(
    items.map((item) =>
      limiter.run(async () => {
        console.log(`Processing item ${item}`);
        await Bun.sleep(Math.random() * 500);
        console.log(`Completed item ${item}`);
        return item * 2;
      })
    )
  );
  
  console.log("All results:", results);
}

processWithLimitedConcurrency();
```

## Cancellation Patterns with AbortController

Bun supports the standard AbortController API for cancelling async operations. This is especially useful for cancelling fetch requests or long-running operations.

Here is how to implement cancellable operations:

```typescript
// Cancellable fetch example
async function fetchWithCancellation(url: string, signal: AbortSignal) {
  try {
    const response = await fetch(url, { signal });
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Fetch was cancelled");
      return null;
    }
    throw error;
  }
}

// Usage with AbortController
async function main() {
  const controller = new AbortController();
  
  // Cancel after 500ms
  setTimeout(() => controller.abort(), 500);
  
  const result = await fetchWithCancellation(
    "https://api.example.com/slow-endpoint",
    controller.signal
  );
  
  console.log("Result:", result);
}
```

You can also create cancellable custom async operations:

```typescript
// Custom cancellable operation
function cancellableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    
    const timeoutId = setTimeout(resolve, ms);
    
    // Listen for abort signal
    signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

// Usage
async function runCancellableTask() {
  const controller = new AbortController();
  
  // Simulate user cancellation after 200ms
  setTimeout(() => {
    console.log("Cancelling operation...");
    controller.abort();
  }, 200);
  
  try {
    await cancellableDelay(1000, controller.signal);
    console.log("Delay completed");
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Operation was cancelled");
    }
  }
}

runCancellableTask();
```

## Async Iterators and Generators

Bun supports async iterators and generators, which are powerful for handling streams of async data.

Here is an example of an async generator for paginated data:

```typescript
// Async generator for paginated API
async function* fetchPaginatedData(baseUrl: string) {
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    await Bun.sleep(100); // Simulate API delay
    
    // Simulate paginated response
    const data = {
      items: [`Item ${page}-1`, `Item ${page}-2`, `Item ${page}-3`],
      hasNextPage: page < 5,
    };
    
    yield data.items;
    
    hasMore = data.hasNextPage;
    page++;
  }
}

// Consuming the async generator
async function loadAllPages() {
  const allItems: string[] = [];
  
  for await (const items of fetchPaginatedData("https://api.example.com/items")) {
    console.log("Received page:", items);
    allItems.push(...items);
  }
  
  console.log("Total items:", allItems.length);
}

loadAllPages();
```

## Bun-Specific Async APIs

Bun provides several built-in async APIs that are optimized for performance. Here are some commonly used ones:

File operations in Bun are async by default and very fast:

```typescript
// Async file operations in Bun
async function fileOperations() {
  // Write file asynchronously
  await Bun.write("output.txt", "Hello, Bun!");
  
  // Read file asynchronously
  const file = Bun.file("output.txt");
  const content = await file.text();
  console.log("File content:", content);
  
  // Check if file exists
  const exists = await file.exists();
  console.log("File exists:", exists);
  
  // Get file size
  console.log("File size:", file.size);
}

fileOperations();
```

Bun also provides async subprocess spawning:

```typescript
// Running subprocesses asynchronously
async function runCommand() {
  const proc = Bun.spawn(["echo", "Hello from subprocess"]);
  
  // Wait for the process to complete
  const exitCode = await proc.exited;
  console.log("Exit code:", exitCode);
  
  // Read stdout
  const output = await new Response(proc.stdout).text();
  console.log("Output:", output);
}

runCommand();
```

## Best Practices Summary

Here are the key best practices for handling async operations in Bun:

1. **Prefer async/await over raw promises** for better readability and error handling. The syntax is cleaner and stack traces are more useful.

2. **Use Bun.sleep instead of setTimeout** when you need delays. It is optimized for the Bun runtime and provides cleaner syntax.

3. **Parallelize independent operations** with Promise.all to improve performance. Do not await sequential operations that can run concurrently.

4. **Always handle errors** with try/catch blocks or consider using a safe wrapper function that returns tuples of error and result.

5. **Implement timeouts** for external operations using Promise.race to prevent hanging requests.

6. **Use AbortController** for cancellable operations, especially for fetch requests and long-running tasks.

7. **Control concurrency** when dealing with many parallel operations to avoid overwhelming resources or rate limits.

8. **Use Promise.allSettled** when you need all operations to complete regardless of individual failures.

9. **Leverage async iterators** for streaming data and paginated results to handle large datasets efficiently.

10. **Use Bun-specific APIs** like Bun.write and Bun.file for file operations as they are highly optimized.

## Conclusion

Bun provides a powerful and performant environment for handling async operations in JavaScript and TypeScript applications. By leveraging standard JavaScript async patterns alongside Bun-specific APIs like Bun.sleep, you can write efficient and maintainable async code.

The key to mastering async programming in Bun is understanding when to use each pattern. Use Promise.all for parallel independent operations, Promise.race for timeouts and competitive execution, and Promise.allSettled when you need fault tolerance. Implement proper error handling with try/catch, and use AbortController for cancellable operations.

With the patterns and examples covered in this guide, you should be well-equipped to handle any async scenario in your Bun applications. Remember to always consider the performance implications of your async code and leverage Bun's optimized APIs whenever possible.

Start experimenting with these patterns in your projects, and you will quickly see how powerful and elegant async programming in Bun can be.
