# How to Handle HTTP Requests in Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, HTTP, Fetch, API

Description: A comprehensive guide to making HTTP requests in Deno using the native fetch API, covering GET, POST, PUT, DELETE operations, error handling, timeouts, retries, and streaming responses.

---

Deno is a modern runtime for JavaScript and TypeScript that provides built-in support for making HTTP requests through the standard Web Fetch API. Unlike Node.js, Deno does not require external packages like `axios` or `node-fetch` to make HTTP calls. The fetch API is available globally and works exactly as it does in the browser, making it intuitive for developers familiar with frontend development.

In this guide, we will explore everything you need to know about handling HTTP requests in Deno, from basic GET requests to advanced topics like streaming responses, implementing retries with exponential backoff, and handling timeouts gracefully.

## Understanding the Fetch API in Deno

The Fetch API in Deno follows the WHATWG Fetch Standard, which means it behaves identically to the browser's fetch function. This consistency reduces the learning curve and makes code portable between frontend and backend environments.

The basic signature of fetch is straightforward: it takes a URL (and optional configuration) and returns a Promise that resolves to a Response object.

Here is a minimal example of making a GET request:

```typescript
// Simple GET request to fetch data from an API
const response = await fetch("https://api.example.com/data");
const data = await response.json();
console.log(data);
```

## Making GET Requests

GET requests are the most common type of HTTP request, used to retrieve data from a server. Deno makes this simple with the fetch API.

This example demonstrates fetching JSON data from a public API:

```typescript
// Fetch a list of users from a REST API
async function getUsers(): Promise<void> {
  const response = await fetch("https://jsonplaceholder.typicode.com/users");
  
  // Check if the request was successful
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  
  // Parse the JSON response
  const users = await response.json();
  
  // Display the fetched data
  console.log("Fetched users:", users);
}

await getUsers();
```

You can also pass query parameters by constructing the URL with URLSearchParams:

```typescript
// Using URLSearchParams to build query strings
async function searchUsers(name: string, limit: number): Promise<void> {
  const params = new URLSearchParams({
    name: name,
    limit: limit.toString(),
  });
  
  const url = `https://api.example.com/users?${params}`;
  const response = await fetch(url);
  const results = await response.json();
  
  console.log("Search results:", results);
}

await searchUsers("John", 10);
```

## Making POST Requests

POST requests are used to send data to a server, typically for creating new resources. You need to specify the HTTP method, headers, and body in the fetch options.

This example shows how to create a new user by sending JSON data:

```typescript
// Define the user data structure
interface User {
  name: string;
  email: string;
  role: string;
}

// Create a new user via POST request
async function createUser(user: User): Promise<void> {
  const response = await fetch("https://jsonplaceholder.typicode.com/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(user),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.status}`);
  }
  
  const createdUser = await response.json();
  console.log("Created user:", createdUser);
}

await createUser({
  name: "Jane Doe",
  email: "jane@example.com",
  role: "admin",
});
```

## Making PUT Requests

PUT requests are used to update existing resources on the server. The structure is similar to POST, but you typically target a specific resource ID.

This example demonstrates updating an existing user:

```typescript
// Update an existing user with PUT request
async function updateUser(userId: number, updates: Partial<User>): Promise<void> {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${userId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to update user: ${response.status}`);
  }
  
  const updatedUser = await response.json();
  console.log("Updated user:", updatedUser);
}

await updateUser(1, {
  name: "Jane Smith",
  email: "jane.smith@example.com",
});
```

## Making DELETE Requests

DELETE requests remove resources from the server. They typically do not require a request body.

This example shows how to delete a user:

```typescript
// Delete a user by ID
async function deleteUser(userId: number): Promise<void> {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${userId}`,
    {
      method: "DELETE",
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to delete user: ${response.status}`);
  }
  
  console.log(`User ${userId} deleted successfully`);
}

await deleteUser(1);
```

## Working with Headers

Headers are crucial for authentication, content negotiation, and passing metadata. Deno provides the Headers class to manage request and response headers.

This example demonstrates setting various headers including authentication:

```typescript
// Create headers with authentication and custom values
const headers = new Headers();
headers.set("Content-Type", "application/json");
headers.set("Authorization", "Bearer your-jwt-token-here");
headers.set("X-Custom-Header", "custom-value");
headers.set("Accept-Language", "en-US");

// Make an authenticated request
async function fetchProtectedResource(): Promise<void> {
  const response = await fetch("https://api.example.com/protected", {
    method: "GET",
    headers: headers,
  });
  
  // Access response headers
  console.log("Response Content-Type:", response.headers.get("content-type"));
  console.log("Response Date:", response.headers.get("date"));
  
  const data = await response.json();
  console.log("Protected data:", data);
}

await fetchProtectedResource();
```

You can also iterate over headers:

```typescript
// Iterate over all response headers
async function inspectHeaders(): Promise<void> {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
  
  console.log("All response headers:");
  for (const [key, value] of response.headers) {
    console.log(`  ${key}: ${value}`);
  }
}

await inspectHeaders();
```

## Handling JSON Data

JSON is the most common data format for REST APIs. Deno provides convenient methods for parsing and sending JSON.

This example shows a complete CRUD operation with proper JSON handling:

```typescript
// Type definitions for type safety
interface Post {
  id?: number;
  title: string;
  body: string;
  userId: number;
}

// Generic function to handle JSON responses
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json() as Promise<T>;
}

// Usage examples
async function demonstrateJsonHandling(): Promise<void> {
  // Fetch a single post
  const post = await fetchJson<Post>(
    "https://jsonplaceholder.typicode.com/posts/1"
  );
  console.log("Fetched post:", post);
  
  // Create a new post
  const newPost = await fetchJson<Post>(
    "https://jsonplaceholder.typicode.com/posts",
    {
      method: "POST",
      body: JSON.stringify({
        title: "My New Post",
        body: "This is the content of my post.",
        userId: 1,
      }),
    }
  );
  console.log("Created post:", newPost);
}

await demonstrateJsonHandling();
```

## Error Handling

Robust error handling is essential for production applications. The fetch API does not throw errors for HTTP error status codes, so you must check the response status manually.

This example demonstrates comprehensive error handling:

```typescript
// Custom error class for HTTP errors
class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string
  ) {
    super(`HTTP Error ${status}: ${statusText}`);
    this.name = "HttpError";
  }
}

// Function with comprehensive error handling
async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Handle different HTTP status codes
    if (!response.ok) {
      const body = await response.text();
      
      switch (response.status) {
        case 400:
          throw new HttpError(400, "Bad Request", body);
        case 401:
          throw new HttpError(401, "Unauthorized", body);
        case 403:
          throw new HttpError(403, "Forbidden", body);
        case 404:
          throw new HttpError(404, "Not Found", body);
        case 429:
          throw new HttpError(429, "Too Many Requests", body);
        case 500:
          throw new HttpError(500, "Internal Server Error", body);
        default:
          throw new HttpError(response.status, response.statusText, body);
      }
    }
    
    return response;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError) {
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }
}

// Usage with error handling
async function fetchWithErrorHandling(): Promise<void> {
  try {
    const response = await safeFetch("https://api.example.com/data");
    const data = await response.json();
    console.log("Data:", data);
  } catch (error) {
    if (error instanceof HttpError) {
      console.error(`HTTP Error ${error.status}: ${error.body}`);
      // Handle specific status codes
      if (error.status === 401) {
        console.log("Please log in again");
      }
    } else {
      console.error("Unexpected error:", error);
    }
  }
}

await fetchWithErrorHandling();
```

## Implementing Timeouts

The fetch API does not have built-in timeout support, but you can implement it using AbortController. This is important for preventing requests from hanging indefinitely.

This example shows how to implement request timeouts:

```typescript
// Fetch with timeout using AbortController
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<Response> {
  // Create an AbortController instance
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    // Clear the timeout if request completes
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    // Clear the timeout on error
    clearTimeout(timeoutId);
    
    // Check if the error is due to abort
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Usage example
async function demonstrateTimeout(): Promise<void> {
  try {
    // This request will timeout after 3 seconds
    const response = await fetchWithTimeout(
      "https://jsonplaceholder.typicode.com/posts",
      {},
      3000
    );
    const posts = await response.json();
    console.log(`Fetched ${posts.length} posts`);
  } catch (error) {
    console.error("Request failed:", error);
  }
}

await demonstrateTimeout();
```

## Implementing Retries with Exponential Backoff

For resilient applications, implementing retry logic with exponential backoff helps handle transient failures gracefully.

This example demonstrates a robust retry mechanism:

```typescript
// Configuration for retry behavior
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Sleep utility function
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch with retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError: Error | null = null;
  let delay = finalConfig.initialDelayMs;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Check if we should retry based on status code
      if (
        !response.ok &&
        finalConfig.retryableStatuses.includes(response.status) &&
        attempt < finalConfig.maxRetries
      ) {
        console.log(
          `Attempt ${attempt + 1} failed with status ${response.status}. ` +
          `Retrying in ${delay}ms...`
        );
        await sleep(delay);
        delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Only retry on network errors
      if (attempt < finalConfig.maxRetries) {
        console.log(
          `Attempt ${attempt + 1} failed: ${lastError.message}. ` +
          `Retrying in ${delay}ms...`
        );
        await sleep(delay);
        delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
      }
    }
  }
  
  throw new Error(
    `Request failed after ${finalConfig.maxRetries + 1} attempts: ${lastError?.message}`
  );
}

// Usage example
async function demonstrateRetry(): Promise<void> {
  try {
    const response = await fetchWithRetry(
      "https://jsonplaceholder.typicode.com/posts/1",
      {},
      { maxRetries: 3, initialDelayMs: 500 }
    );
    const post = await response.json();
    console.log("Successfully fetched post:", post.title);
  } catch (error) {
    console.error("All retries failed:", error);
  }
}

await demonstrateRetry();
```

## Handling Streaming Responses

For large responses or real-time data, streaming allows you to process data as it arrives rather than waiting for the entire response.

This example demonstrates reading a streaming response:

```typescript
// Process a streaming response chunk by chunk
async function streamResponse(url: string): Promise<void> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  
  // Get the readable stream from the response body
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }
  
  const decoder = new TextDecoder();
  let totalBytes = 0;
  
  console.log("Starting to stream response...");
  
  // Read the stream chunk by chunk
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      console.log("\nStream complete!");
      break;
    }
    
    // Process the chunk
    totalBytes += value.length;
    const text = decoder.decode(value, { stream: true });
    console.log(`Received ${value.length} bytes. Total: ${totalBytes} bytes`);
    
    // You can process each chunk here
    // For example, parse JSON lines or handle SSE events
  }
  
  console.log(`Total bytes received: ${totalBytes}`);
}

await streamResponse("https://jsonplaceholder.typicode.com/posts");
```

For Server-Sent Events (SSE), you can parse the stream:

```typescript
// Handle Server-Sent Events stream
async function handleSSE(url: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      "Accept": "text/event-stream",
    },
  });
  
  const reader = response.body?.getReader();
  if (!reader) return;
  
  const decoder = new TextDecoder();
  let buffer = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Process complete events (separated by double newlines)
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    
    for (const event of events) {
      if (event.trim()) {
        // Parse the event data
        const dataMatch = event.match(/^data: (.+)$/m);
        if (dataMatch) {
          console.log("Received event:", dataMatch[1]);
        }
      }
    }
  }
}
```

## Sending Form Data

Sometimes you need to send form data instead of JSON, especially when uploading files.

This example shows how to send form data:

```typescript
// Send form data (multipart/form-data)
async function uploadFile(file: Uint8Array, filename: string): Promise<void> {
  const formData = new FormData();
  formData.append("file", new Blob([file]), filename);
  formData.append("description", "My uploaded file");
  formData.append("tags", "important,backup");
  
  const response = await fetch("https://api.example.com/upload", {
    method: "POST",
    body: formData,
    // Note: Do not set Content-Type header manually
    // fetch will set it automatically with the boundary
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  const result = await response.json();
  console.log("Upload result:", result);
}

// Send URL-encoded form data
async function submitForm(data: Record<string, string>): Promise<void> {
  const formBody = new URLSearchParams(data);
  
  const response = await fetch("https://api.example.com/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  });
  
  const result = await response.json();
  console.log("Form submission result:", result);
}

await submitForm({
  username: "john_doe",
  email: "john@example.com",
});
```

## Creating a Reusable HTTP Client

For larger applications, creating a reusable HTTP client class helps maintain consistency and reduces code duplication.

This example shows a complete HTTP client implementation:

```typescript
// Reusable HTTP client with common functionality
class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Headers;
  private timeout: number;
  
  constructor(baseUrl: string, timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = new Headers({
      "Content-Type": "application/json",
      "Accept": "application/json",
    });
    this.timeout = timeout;
  }
  
  // Set authorization token
  setAuthToken(token: string): void {
    this.defaultHeaders.set("Authorization", `Bearer ${token}`);
  }
  
  // Remove authorization token
  clearAuthToken(): void {
    this.defaultHeaders.delete("Authorization");
  }
  
  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...Object.fromEntries(this.defaultHeaders),
          ...options.headers,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }
      
      // Handle empty responses
      const contentLength = response.headers.get("content-length");
      if (contentLength === "0" || response.status === 204) {
        return {} as T;
      }
      
      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Request to ${endpoint} timed out`);
      }
      throw error;
    }
  }
  
  // HTTP method shortcuts
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }
  
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  
  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
  
  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Usage example
const api = new HttpClient("https://jsonplaceholder.typicode.com");

async function demonstrateHttpClient(): Promise<void> {
  // GET request
  const posts = await api.get<Post[]>("/posts?_limit=5");
  console.log(`Fetched ${posts.length} posts`);
  
  // POST request
  const newPost = await api.post<Post>("/posts", {
    title: "New Post",
    body: "Content here",
    userId: 1,
  });
  console.log("Created post:", newPost);
  
  // PUT request
  const updatedPost = await api.put<Post>("/posts/1", {
    title: "Updated Title",
    body: "Updated content",
    userId: 1,
  });
  console.log("Updated post:", updatedPost);
}

await demonstrateHttpClient();
```

## Best Practices Summary

When working with HTTP requests in Deno, follow these best practices:

1. **Always check response status**: The fetch API does not throw errors for HTTP error codes. Always verify `response.ok` before processing the response.

2. **Implement timeouts**: Use `AbortController` to prevent requests from hanging indefinitely. Set reasonable timeout values based on your use case.

3. **Handle errors gracefully**: Create custom error classes for different HTTP errors and handle network failures separately from HTTP errors.

4. **Use TypeScript types**: Define interfaces for your request and response data to catch errors at compile time.

5. **Implement retry logic**: For transient failures, implement exponential backoff to avoid overwhelming servers during outages.

6. **Set appropriate headers**: Always set `Content-Type` and `Accept` headers. Include authentication headers when required.

7. **Use streaming for large responses**: Process large responses as streams to reduce memory usage and improve responsiveness.

8. **Create reusable clients**: Encapsulate common functionality in a reusable HTTP client class to maintain consistency across your application.

9. **Log requests in development**: Add logging to help debug issues during development, but be careful not to log sensitive data in production.

10. **Respect rate limits**: Handle 429 status codes and implement backoff when you hit rate limits.

## Conclusion

Deno provides a powerful and familiar way to handle HTTP requests through the Web Fetch API. By leveraging the same API that browsers use, Deno makes it easy for developers to write consistent code that works across different environments.

In this guide, we covered the fundamentals of making GET, POST, PUT, and DELETE requests, working with headers and JSON data, implementing robust error handling, adding timeouts and retry logic, and processing streaming responses. We also built a reusable HTTP client that encapsulates these best practices.

The key takeaway is that while the fetch API is simple to use for basic requests, production applications require additional consideration for error handling, timeouts, and retries. By following the patterns and examples in this guide, you can build reliable HTTP communication in your Deno applications.

Whether you are building a REST API client, integrating with third-party services, or processing real-time data streams, Deno's built-in fetch API provides all the tools you need without requiring external dependencies.
