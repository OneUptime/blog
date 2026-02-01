# How to Handle HTTP Requests in Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, JavaScript, HTTP, Fetch

Description: Learn how to make HTTP requests in Bun using the native fetch API with practical examples covering GET, POST, PUT, DELETE, streaming, file uploads, and error handling.

---

Bun is a fast all-in-one JavaScript runtime that comes with a powerful built-in HTTP client based on the Web Standard `fetch` API. Unlike Node.js where you might need external libraries like `axios` or `node-fetch`, Bun provides native support for making HTTP requests out of the box. In this comprehensive guide, we will explore how to handle HTTP requests in Bun effectively, covering everything from basic requests to advanced patterns like streaming and retries.

## Why Use Bun for HTTP Requests?

Bun's HTTP client offers several advantages over traditional Node.js approaches:

- **Native fetch support**: No need to install additional packages
- **High performance**: Bun is optimized for speed and uses native code under the hood
- **Web Standard compliant**: Uses the same `fetch` API you know from browsers
- **Built-in TypeScript support**: No configuration needed for TypeScript projects
- **Automatic decompression**: Handles gzip and brotli compression automatically

## Getting Started with fetch in Bun

The `fetch` function is globally available in Bun, so you can start making requests immediately without any imports.

Here is a simple example that fetches data from a public API:

```typescript
// Basic GET request to fetch JSON data
const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
const data = await response.json();

console.log(data);
// Output: { userId: 1, id: 1, title: "...", body: "..." }
```

## Making GET Requests

GET requests are the most common type of HTTP request, used for retrieving data from servers.

### Basic GET Request

This example demonstrates a straightforward GET request with response status checking:

```typescript
async function fetchPost(id: number) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  
  // Always check if the request was successful
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  
  const post = await response.json();
  return post;
}

// Usage
const post = await fetchPost(1);
console.log(post.title);
```

### GET Request with Query Parameters

When you need to pass query parameters, use the URLSearchParams class for proper encoding:

```typescript
// Build URL with query parameters safely
const baseUrl = "https://jsonplaceholder.typicode.com/posts";
const params = new URLSearchParams({
  userId: "1",
  _limit: "5",
  _sort: "title"
});

const url = `${baseUrl}?${params.toString()}`;
const response = await fetch(url);
const posts = await response.json();

console.log(`Fetched ${posts.length} posts`);
```

### Adding Custom Headers

Many APIs require authentication or custom headers. Here is how to include them:

```typescript
// GET request with custom headers for authentication
const response = await fetch("https://api.example.com/protected/data", {
  method: "GET",
  headers: {
    "Authorization": "Bearer your-api-token-here",
    "Accept": "application/json",
    "X-Custom-Header": "custom-value"
  }
});

if (!response.ok) {
  throw new Error(`Request failed: ${response.status}`);
}

const data = await response.json();
```

## Making POST Requests

POST requests are used to send data to a server, typically to create new resources.

### Sending JSON Data

This is the most common way to send structured data to an API:

```typescript
// POST request with JSON body
async function createPost(title: string, body: string, userId: number) {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      title,
      body,
      userId
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create post: ${response.status}`);
  }

  const newPost = await response.json();
  console.log("Created post with ID:", newPost.id);
  return newPost;
}

// Usage
const post = await createPost("My New Post", "This is the content", 1);
```

### Sending Form Data

When working with forms or file uploads, use the FormData API:

```typescript
// POST request with form data
const formData = new FormData();
formData.append("username", "johndoe");
formData.append("email", "john@example.com");
formData.append("age", "30");

const response = await fetch("https://api.example.com/users/register", {
  method: "POST",
  // Note: Don't set Content-Type header manually for FormData
  // The browser/runtime will set it with the correct boundary
  body: formData
});

const result = await response.json();
console.log("Registration result:", result);
```

## Making PUT and PATCH Requests

PUT requests replace an entire resource, while PATCH requests update specific fields.

### PUT Request Example

Use PUT when you want to completely replace a resource:

```typescript
// PUT request to update an entire resource
async function updatePost(id: number, postData: { title: string; body: string; userId: number }) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    throw new Error(`Failed to update post: ${response.status}`);
  }

  return await response.json();
}

// Usage: Replace the entire post
const updated = await updatePost(1, {
  title: "Updated Title",
  body: "Completely new content",
  userId: 1
});
```

### PATCH Request Example

Use PATCH when you only want to modify specific fields:

```typescript
// PATCH request to partially update a resource
async function patchPost(id: number, updates: Partial<{ title: string; body: string }>) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    throw new Error(`Failed to patch post: ${response.status}`);
  }

  return await response.json();
}

// Usage: Only update the title
const patched = await patchPost(1, { title: "Just Changed the Title" });
```

## Making DELETE Requests

DELETE requests remove resources from the server.

Here is how to delete a resource with proper error handling:

```typescript
// DELETE request to remove a resource
async function deletePost(id: number): Promise<boolean> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer your-token"
    }
  });

  if (response.status === 404) {
    console.log("Post not found");
    return false;
  }

  if (!response.ok) {
    throw new Error(`Failed to delete post: ${response.status}`);
  }

  console.log(`Post ${id} deleted successfully`);
  return true;
}

// Usage
const deleted = await deletePost(1);
```

## Handling Different Response Types

APIs can return different content types. Here is how to handle them:

### JSON Response

The most common response type for REST APIs:

```typescript
const response = await fetch("https://api.example.com/data");
const jsonData = await response.json();
```

### Text Response

For plain text, HTML, or XML responses:

```typescript
const response = await fetch("https://example.com/page.html");
const htmlContent = await response.text();
console.log(htmlContent);
```

### Binary Data (Blob/ArrayBuffer)

For images, PDFs, or other binary files:

```typescript
// Download an image as a blob
const response = await fetch("https://example.com/image.png");
const imageBlob = await response.blob();

// Or as an ArrayBuffer for processing
const response2 = await fetch("https://example.com/file.pdf");
const buffer = await response2.arrayBuffer();

// In Bun, you can write to a file directly
await Bun.write("downloaded-file.pdf", buffer);
```

## File Uploads in Bun

Bun makes file uploads straightforward using FormData and the Bun file API.

### Uploading a Single File

This example shows how to upload a file from the filesystem:

```typescript
// Upload a file using Bun's file API
async function uploadFile(filePath: string, uploadUrl: string) {
  const file = Bun.file(filePath);
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("description", "My uploaded file");

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return await response.json();
}

// Usage
const result = await uploadFile("./document.pdf", "https://api.example.com/upload");
```

### Uploading Multiple Files

When you need to upload multiple files at once:

```typescript
// Upload multiple files in a single request
async function uploadMultipleFiles(filePaths: string[], uploadUrl: string) {
  const formData = new FormData();

  for (const path of filePaths) {
    const file = Bun.file(path);
    const fileName = path.split("/").pop() || "file";
    formData.append("files", file, fileName);
  }

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData
  });

  return await response.json();
}

// Usage
const result = await uploadMultipleFiles(
  ["./image1.png", "./image2.jpg", "./document.pdf"],
  "https://api.example.com/upload-multiple"
);
```

## Implementing Request Timeouts

Bun supports the AbortController API for implementing request timeouts.

Here is a reusable function that adds timeout support to any fetch request:

```typescript
// Fetch with timeout using AbortController
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Usage with 3 second timeout
try {
  const response = await fetchWithTimeout(
    "https://api.example.com/slow-endpoint",
    { method: "GET" },
    3000
  );
  const data = await response.json();
} catch (error) {
  console.error("Request failed:", error.message);
}
```

## Implementing Retry Logic

Network requests can fail for various reasons. Implementing retry logic improves reliability.

This function implements exponential backoff for failed requests:

```typescript
// Fetch with automatic retry and exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Retry on server errors (5xx)
      if (response.status >= 500 && attempt < maxRetries) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`All ${maxRetries + 1} attempts failed. Last error: ${lastError?.message}`);
}

// Usage
const response = await fetchWithRetry("https://api.example.com/data", {
  method: "GET"
}, 3, 1000);
```

## Streaming Responses

For large responses, streaming allows you to process data as it arrives instead of waiting for the entire response.

### Reading a Stream Line by Line

This is useful for server-sent events or streaming APIs:

```typescript
// Process a streaming response line by line
async function processStream(url: string) {
  const response = await fetch(url);
  
  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      // Process any remaining data in buffer
      if (buffer.trim()) {
        console.log("Final line:", buffer);
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    
    // Process complete lines
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        console.log("Received line:", line);
      }
    }
  }
}
```

### Streaming to a File

For large file downloads, stream directly to disk:

```typescript
// Stream a large file download to disk
async function downloadLargeFile(url: string, outputPath: string) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  // Bun provides a convenient way to write streams
  await Bun.write(outputPath, response);
  
  console.log(`File saved to ${outputPath}`);
}

// Usage
await downloadLargeFile(
  "https://example.com/large-file.zip",
  "./downloads/large-file.zip"
);
```

## Comprehensive Error Handling

Proper error handling is crucial for production applications. Here is a robust error handling pattern:

```typescript
// Custom error class for HTTP errors
class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public responseBody?: string
  ) {
    super(`HTTP ${status} ${statusText} for ${url}`);
    this.name = "HttpError";
  }
}

// Robust fetch wrapper with comprehensive error handling
async function safeFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    // Network errors (DNS failure, connection refused, etc.)
    if (error instanceof TypeError) {
      throw new Error(`Network error: Unable to connect to ${url}`);
    }
    throw error;
  }

  // Handle HTTP errors
  if (!response.ok) {
    let errorBody: string | undefined;
    try {
      errorBody = await response.text();
    } catch {
      // Ignore errors reading error body
    }
    throw new HttpError(response.status, response.statusText, url, errorBody);
  }

  // Parse JSON response
  try {
    return await response.json() as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${url}`);
  }
}

// Usage with proper error handling
interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

try {
  const post = await safeFetch<Post>("https://jsonplaceholder.typicode.com/posts/1");
  console.log("Post title:", post.title);
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`HTTP Error ${error.status}: ${error.statusText}`);
    if (error.status === 404) {
      console.error("Resource not found");
    } else if (error.status === 401) {
      console.error("Authentication required");
    }
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Building a Reusable HTTP Client

For larger applications, create a reusable HTTP client class:

```typescript
// Reusable HTTP client with common configuration
class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(config: {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
  }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...config.headers
    };
    this.timeout = config.timeout || 30000;
  }

  private async request<T>(
    method: string,
    path: string,
    options: { body?: unknown; headers?: Record<string, string> } = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { ...this.defaultHeaders, ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, { headers });
  }

  async post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("POST", path, { body, headers });
  }

  async put<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("PUT", path, { body, headers });
  }

  async patch<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("PATCH", path, { body, headers });
  }

  async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("DELETE", path, { headers });
  }
}

// Usage
const api = new HttpClient({
  baseUrl: "https://jsonplaceholder.typicode.com",
  headers: {
    "Authorization": "Bearer your-token"
  },
  timeout: 10000
});

const post = await api.get<Post>("/posts/1");
const newPost = await api.post<Post>("/posts", { title: "New Post", body: "Content", userId: 1 });
```

## Best Practices Summary

When working with HTTP requests in Bun, follow these best practices for robust and maintainable code:

1. **Always check response status**: Use `response.ok` or check `response.status` before processing data.

2. **Set appropriate timeouts**: Use AbortController to prevent requests from hanging indefinitely.

3. **Implement retry logic**: Add retry mechanisms with exponential backoff for unreliable networks.

4. **Use TypeScript interfaces**: Define types for your API responses to catch errors at compile time.

5. **Handle errors gracefully**: Catch and handle different error types (network, HTTP, parsing) appropriately.

6. **Set proper Content-Type headers**: Always specify the content type when sending data.

7. **Use URLSearchParams for query strings**: This ensures proper encoding of special characters.

8. **Stream large responses**: Use streaming for large files to avoid memory issues.

9. **Create reusable clients**: Build HTTP client classes for applications with many API calls.

10. **Log appropriately**: Log errors and important events, but avoid logging sensitive data.

## Conclusion

Bun provides an excellent developer experience for handling HTTP requests with its native fetch implementation. The Web Standard compliant API means your knowledge transfers directly from browser development, and Bun's performance optimizations make it ideal for high-throughput applications.

We covered the essential patterns for making HTTP requests in Bun, from basic GET and POST requests to advanced topics like streaming, file uploads, and retry logic. The reusable HTTP client pattern shown above can serve as a foundation for building robust API integrations in your Bun applications.

As you build more complex applications, consider extending these patterns with features like request caching, rate limiting, and request deduplication. Bun's fast startup time and efficient HTTP handling make it an excellent choice for CLI tools, API services, and microservices that need to communicate over HTTP.

Start with the simple patterns and progressively add complexity as your application requirements grow. The examples in this guide provide a solid foundation for any HTTP-based communication needs in your Bun projects.
