# How to Use Deno Deploy for Serverless Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, Serverless, Edge Computing, Deployment

Description: A comprehensive guide to building and deploying serverless applications with Deno Deploy, covering edge functions, KV storage, database connections, and production best practices.

---

Serverless computing has revolutionized how we build and deploy applications. Instead of managing servers, scaling infrastructure, or worrying about uptime, developers can focus purely on writing code. Deno Deploy takes this a step further by providing a globally distributed edge runtime that executes your TypeScript and JavaScript code close to your users. In this guide, we will explore everything you need to know to build production-ready serverless applications with Deno Deploy.

## What is Deno Deploy?

Deno Deploy is a distributed serverless platform built on the Deno runtime. It allows you to deploy JavaScript and TypeScript applications to edge locations around the world with zero configuration. Your code runs on V8 isolates, which provide fast cold starts (typically under 10ms) and excellent performance characteristics.

Key features of Deno Deploy include:

- **Global Edge Network**: Your code runs in 35+ regions worldwide, ensuring low latency for users everywhere
- **Native TypeScript Support**: No build step required for TypeScript
- **Web Standard APIs**: Uses familiar web APIs like `fetch`, `Request`, `Response`, and `URL`
- **Deno KV**: Built-in globally distributed key-value database
- **Automatic HTTPS**: All deployments get SSL certificates automatically
- **GitHub Integration**: Deploy directly from your repository with automatic deployments on push
- **Free Tier**: Generous free tier for development and small projects

## Getting Started with Deno Deploy

Before deploying your first application, you need to set up your development environment and understand the basic structure of a Deno Deploy project.

### Installing Deno

First, install Deno on your local machine for development and testing.

```bash
# macOS/Linux using curl
curl -fsSL https://deno.land/install.sh | sh

# macOS using Homebrew
brew install deno

# Windows using PowerShell
irm https://deno.land/install.ps1 | iex
```

### Your First Deno Deploy Application

Let us create a simple HTTP server that responds to requests.

This basic example demonstrates the core pattern for Deno Deploy applications using the `Deno.serve` API.

```typescript
// main.ts
// A simple HTTP server that returns a greeting message
Deno.serve((request: Request): Response => {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") || "World";
  
  return new Response(`Hello, ${name}!`, {
    headers: { "Content-Type": "text/plain" },
  });
});
```

You can test this locally before deploying.

```bash
deno run --allow-net main.ts
```

## Deployment Process

Deno Deploy offers multiple ways to deploy your applications. The most common approaches are through the web dashboard, the `deployctl` CLI tool, or GitHub integration.

### Using deployctl CLI

The `deployctl` CLI provides a straightforward way to deploy from your terminal. First, install the tool.

```bash
deno install -Arf jsr:@deno/deployctl
```

Now you can deploy your application with a single command. The `--project` flag specifies your project name on Deno Deploy.

```bash
# Deploy to production
deployctl deploy --project=my-app --prod main.ts

# Deploy a preview version
deployctl deploy --project=my-app main.ts
```

### GitHub Integration

For production workflows, GitHub integration provides automatic deployments. Connect your repository through the Deno Deploy dashboard, and every push to your main branch triggers a production deployment. Pull requests automatically get preview deployments with unique URLs.

Create a `deno.json` configuration file to specify your entry point and dependencies.

```json
{
  "tasks": {
    "start": "deno run --allow-net --allow-env main.ts",
    "dev": "deno run --watch --allow-net --allow-env main.ts"
  },
  "imports": {
    "@std/http": "jsr:@std/http@^1.0.0",
    "@std/assert": "jsr:@std/assert@^1.0.0"
  }
}
```

## Working with Environment Variables

Environment variables are essential for managing configuration and secrets in serverless applications. Deno Deploy provides a secure way to store and access environment variables.

### Setting Environment Variables

You can set environment variables through the Deno Deploy dashboard under your project settings. For local development, create a `.env` file.

```bash
# .env (for local development only, do not commit this file)
DATABASE_URL=postgres://user:password@localhost:5432/mydb
API_KEY=your-secret-api-key
ENVIRONMENT=development
```

Access environment variables in your code using `Deno.env.get()`.

```typescript
// config.ts
// Centralized configuration management using environment variables
export const config = {
  databaseUrl: Deno.env.get("DATABASE_URL") || "",
  apiKey: Deno.env.get("API_KEY") || "",
  environment: Deno.env.get("ENVIRONMENT") || "production",
  isProduction: Deno.env.get("ENVIRONMENT") === "production",
};

// Validate required environment variables at startup
export function validateConfig(): void {
  const required = ["DATABASE_URL", "API_KEY"];
  const missing = required.filter((key) => !Deno.env.get(key));
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
```

## Building Edge Functions

Edge functions are the core building blocks of Deno Deploy applications. They handle HTTP requests and can perform various tasks like API routing, data processing, and serving dynamic content.

### Creating a REST API

This example demonstrates a complete REST API with routing, request handling, and JSON responses.

```typescript
// api.ts
// A RESTful API server with proper routing and error handling
interface User {
  id: string;
  name: string;
  email: string;
}

// In-memory storage for demonstration (use Deno KV in production)
const users = new Map<string, User>();

// Route handler for different HTTP methods and paths
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers for cross-origin requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight requests
  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Route: GET /api/users - List all users
    if (path === "/api/users" && method === "GET") {
      const userList = Array.from(users.values());
      return new Response(JSON.stringify(userList), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /api/users - Create a new user
    if (path === "/api/users" && method === "POST") {
      const body = await request.json() as Omit<User, "id">;
      const id = crypto.randomUUID();
      const user: User = { id, ...body };
      users.set(id, user);
      
      return new Response(JSON.stringify(user), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /api/users/:id - Get a specific user
    const userMatch = path.match(/^\/api\/users\/([a-f0-9-]+)$/);
    if (userMatch && method === "GET") {
      const user = users.get(userMatch[1]);
      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(user), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 404 for unmatched routes
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // Handle errors gracefully
    console.error("Request error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve(handleRequest);
```

## Deno KV Storage

Deno KV is a globally distributed key-value database built into Deno Deploy. It provides strong consistency within regions and eventual consistency globally, making it perfect for serverless applications.

### Basic KV Operations

This example shows how to perform CRUD operations with Deno KV.

```typescript
// kv-example.ts
// Demonstrates Deno KV operations for data persistence

// Open the KV database (automatically available on Deno Deploy)
const kv = await Deno.openKv();

// Define a type for our data
interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
}

// Create a new blog post with atomic operation
async function createPost(
  title: string,
  content: string,
  authorId: string
): Promise<BlogPost> {
  const id = crypto.randomUUID();
  const now = Date.now();
  
  const post: BlogPost = {
    id,
    title,
    content,
    authorId,
    createdAt: now,
    updatedAt: now,
  };

  // Use atomic operations for consistency
  // Store by ID and create a secondary index by author
  const result = await kv.atomic()
    .set(["posts", id], post)
    .set(["posts_by_author", authorId, id], post)
    .commit();

  if (!result.ok) {
    throw new Error("Failed to create post");
  }

  return post;
}

// Retrieve a post by ID
async function getPost(id: string): Promise<BlogPost | null> {
  const result = await kv.get<BlogPost>(["posts", id]);
  return result.value;
}

// List all posts by a specific author
async function getPostsByAuthor(authorId: string): Promise<BlogPost[]> {
  const posts: BlogPost[] = [];
  const entries = kv.list<BlogPost>({ prefix: ["posts_by_author", authorId] });
  
  for await (const entry of entries) {
    posts.push(entry.value);
  }
  
  return posts;
}

// Update a post with optimistic concurrency control
async function updatePost(
  id: string,
  updates: Partial<Pick<BlogPost, "title" | "content">>
): Promise<BlogPost | null> {
  // Get current version
  const current = await kv.get<BlogPost>(["posts", id]);
  if (!current.value) {
    return null;
  }

  const updated: BlogPost = {
    ...current.value,
    ...updates,
    updatedAt: Date.now(),
  };

  // Atomic update with version check to prevent race conditions
  const result = await kv.atomic()
    .check(current) // Ensures no concurrent modifications
    .set(["posts", id], updated)
    .set(["posts_by_author", updated.authorId, id], updated)
    .commit();

  if (!result.ok) {
    throw new Error("Concurrent modification detected, please retry");
  }

  return updated;
}

// Delete a post and its secondary index
async function deletePost(id: string): Promise<boolean> {
  const post = await getPost(id);
  if (!post) {
    return false;
  }

  await kv.atomic()
    .delete(["posts", id])
    .delete(["posts_by_author", post.authorId, id])
    .commit();

  return true;
}

// Export functions for use in your API handlers
export { createPost, getPost, getPostsByAuthor, updatePost, deletePost };
```

## Connecting to External Databases

While Deno KV is excellent for many use cases, you might need to connect to external databases like PostgreSQL, MySQL, or MongoDB.

### PostgreSQL Connection

This example demonstrates connecting to PostgreSQL using the popular `postgres` driver.

```typescript
// database.ts
// PostgreSQL connection pool for Deno Deploy

import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

// Create a connection pool using environment variables
const sql = postgres(Deno.env.get("DATABASE_URL")!, {
  // Connection pool settings optimized for serverless
  max: 10,              // Maximum connections in pool
  idle_timeout: 20,     // Close idle connections after 20 seconds
  connect_timeout: 10,  // Connection timeout in seconds
});

// Type definitions for our data
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

// Fetch all products with optional filtering
async function getProducts(minPrice?: number): Promise<Product[]> {
  if (minPrice !== undefined) {
    return await sql<Product[]>`
      SELECT id, name, price, stock 
      FROM products 
      WHERE price >= ${minPrice}
      ORDER BY name
    `;
  }
  
  return await sql<Product[]>`
    SELECT id, name, price, stock 
    FROM products 
    ORDER BY name
  `;
}

// Insert a new product using parameterized queries (prevents SQL injection)
async function createProduct(
  name: string,
  price: number,
  stock: number
): Promise<Product> {
  const [product] = await sql<Product[]>`
    INSERT INTO products (name, price, stock)
    VALUES (${name}, ${price}, ${stock})
    RETURNING id, name, price, stock
  `;
  
  return product;
}

// Update product stock with transaction support
async function updateStock(productId: number, quantity: number): Promise<void> {
  await sql.begin(async (transaction) => {
    // Check current stock
    const [product] = await transaction<Product[]>`
      SELECT stock FROM products WHERE id = ${productId} FOR UPDATE
    `;
    
    if (!product || product.stock + quantity < 0) {
      throw new Error("Insufficient stock");
    }
    
    // Update stock
    await transaction`
      UPDATE products 
      SET stock = stock + ${quantity}
      WHERE id = ${productId}
    `;
  });
}

export { sql, getProducts, createProduct, updateStock };
```

## Custom Domains

Deno Deploy allows you to configure custom domains for your applications. This provides a professional appearance and better branding.

### Setting Up a Custom Domain

1. Navigate to your project settings in the Deno Deploy dashboard
2. Click on "Domains" and add your custom domain
3. Configure your DNS settings with the provided values

You will need to add either a CNAME record or A records depending on whether you are using a subdomain or apex domain.

For a subdomain (recommended):
```
Type: CNAME
Name: app
Value: your-project.deno.dev
```

For an apex domain:
```
Type: A
Name: @
Value: [IP addresses provided by Deno Deploy]
```

### Handling Multiple Domains

If your application serves multiple domains, you can handle routing based on the hostname.

```typescript
// multi-domain.ts
// Route requests based on the incoming hostname

Deno.serve((request: Request): Response => {
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Route to different handlers based on domain
  switch (hostname) {
    case "api.example.com":
      return handleApiRequest(request);
    
    case "admin.example.com":
      return handleAdminRequest(request);
    
    case "example.com":
    case "www.example.com":
      return handleMainSiteRequest(request);
    
    default:
      return new Response("Domain not configured", { status: 404 });
  }
});

function handleApiRequest(request: Request): Response {
  return new Response(JSON.stringify({ service: "api" }), {
    headers: { "Content-Type": "application/json" },
  });
}

function handleAdminRequest(request: Request): Response {
  return new Response("<h1>Admin Dashboard</h1>", {
    headers: { "Content-Type": "text/html" },
  });
}

function handleMainSiteRequest(request: Request): Response {
  return new Response("<h1>Welcome to Example.com</h1>", {
    headers: { "Content-Type": "text/html" },
  });
}
```

## Monitoring and Observability

Monitoring your Deno Deploy applications is crucial for maintaining reliability and performance. Deno Deploy provides built-in analytics and logging, and you can integrate with external monitoring tools.

### Built-in Logging

Use structured logging to make your logs searchable and analyzable.

```typescript
// logging.ts
// Structured logging utility for Deno Deploy

interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  requestId?: string;
  [key: string]: unknown;
}

function log(entry: Omit<LogEntry, "timestamp">): void {
  const logEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  
  // Output as JSON for structured logging
  console.log(JSON.stringify(logEntry));
}

// Middleware to add request logging
async function withLogging(
  request: Request,
  handler: (request: Request) => Promise<Response>
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  const url = new URL(request.url);

  log({
    level: "info",
    message: "Request received",
    requestId,
    method: request.method,
    path: url.pathname,
    userAgent: request.headers.get("user-agent"),
  });

  try {
    const response = await handler(request);
    const duration = performance.now() - startTime;

    log({
      level: "info",
      message: "Request completed",
      requestId,
      status: response.status,
      durationMs: Math.round(duration),
    });

    // Add request ID to response headers for tracing
    const headers = new Headers(response.headers);
    headers.set("X-Request-ID", requestId);

    return new Response(response.body, {
      status: response.status,
      headers,
    });

  } catch (error) {
    const duration = performance.now() - startTime;

    log({
      level: "error",
      message: "Request failed",
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: Math.round(duration),
    });

    throw error;
  }
}

export { log, withLogging };
```

### Integrating with OneUptime

For comprehensive monitoring, you can integrate Deno Deploy with OneUptime to track uptime, performance metrics, and errors.

```typescript
// monitoring.ts
// Integration with OneUptime for application monitoring

const ONEUPTIME_ENDPOINT = Deno.env.get("ONEUPTIME_ENDPOINT");
const ONEUPTIME_API_KEY = Deno.env.get("ONEUPTIME_API_KEY");

interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

// Send custom metrics to OneUptime
async function sendMetric(metric: MetricData): Promise<void> {
  if (!ONEUPTIME_ENDPOINT || !ONEUPTIME_API_KEY) {
    console.warn("OneUptime not configured, skipping metric");
    return;
  }

  try {
    await fetch(`${ONEUPTIME_ENDPOINT}/metrics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ONEUPTIME_API_KEY}`,
      },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        timestamp: Date.now(),
        tags: metric.tags,
      }),
    });
  } catch (error) {
    console.error("Failed to send metric:", error);
  }
}

// Track response times and error rates
function createMetricsMiddleware() {
  return async function metricsMiddleware(
    request: Request,
    handler: (request: Request) => Promise<Response>
  ): Promise<Response> {
    const startTime = performance.now();
    const url = new URL(request.url);

    try {
      const response = await handler(request);
      const duration = performance.now() - startTime;

      // Send response time metric
      sendMetric({
        name: "http_request_duration_ms",
        value: duration,
        tags: {
          method: request.method,
          path: url.pathname,
          status: response.status.toString(),
        },
      });

      return response;

    } catch (error) {
      const duration = performance.now() - startTime;

      // Send error metric
      sendMetric({
        name: "http_request_error",
        value: 1,
        tags: {
          method: request.method,
          path: url.pathname,
          error: error instanceof Error ? error.name : "Unknown",
        },
      });

      throw error;
    }
  };
}

export { sendMetric, createMetricsMiddleware };
```

## Scheduling and Cron Jobs

Deno Deploy supports Deno Cron for scheduling periodic tasks without external services.

```typescript
// cron.ts
// Scheduled tasks using Deno Cron

// Run a cleanup task every hour
Deno.cron("cleanup old data", "0 * * * *", async () => {
  console.log("Running hourly cleanup task");
  
  const kv = await Deno.openKv();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  // Find and delete old entries
  const entries = kv.list({ prefix: ["temp_data"] });
  
  for await (const entry of entries) {
    const data = entry.value as { createdAt: number };
    if (data.createdAt < oneWeekAgo) {
      await kv.delete(entry.key);
      console.log(`Deleted old entry: ${entry.key}`);
    }
  }
});

// Send daily reports at 9 AM UTC
Deno.cron("daily report", "0 9 * * *", async () => {
  console.log("Generating daily report");
  
  // Your report generation logic here
  const report = await generateDailyReport();
  await sendReportEmail(report);
});

async function generateDailyReport(): Promise<string> {
  // Implementation details
  return "Daily report content";
}

async function sendReportEmail(report: string): Promise<void> {
  // Implementation details
  console.log("Report sent:", report);
}
```

## Best Practices Summary

When building applications with Deno Deploy, follow these best practices to ensure reliability, performance, and maintainability:

1. **Use Environment Variables for Configuration**: Never hardcode secrets or configuration values. Use Deno Deploy's environment variable management for all sensitive data.

2. **Implement Proper Error Handling**: Always wrap your handlers in try-catch blocks and return appropriate error responses. Log errors with context for debugging.

3. **Leverage Deno KV for State**: Use Deno KV for persistent state instead of in-memory storage. It scales automatically and persists across deployments.

4. **Optimize Cold Starts**: Keep your entry point minimal and use dynamic imports for heavy dependencies. This reduces cold start times.

5. **Use Atomic Operations**: When working with Deno KV, use atomic operations for related writes to maintain data consistency.

6. **Implement Request Timeouts**: External API calls should have timeouts to prevent hanging requests in serverless environments.

7. **Structure Your Code**: Separate routing, business logic, and data access into different modules for better maintainability.

8. **Enable CORS Appropriately**: Configure CORS headers based on your security requirements rather than using wildcards in production.

9. **Monitor and Log**: Implement structured logging and integrate with monitoring tools to track performance and errors.

10. **Test Locally First**: Use `deno run` with appropriate permissions to test your application locally before deploying.

## Conclusion

Deno Deploy provides a powerful platform for building serverless applications with minimal configuration and excellent developer experience. Its global edge network ensures low latency for users worldwide, while features like Deno KV and Deno Cron eliminate the need for external services in many cases.

The combination of TypeScript support, web standard APIs, and seamless GitHub integration makes Deno Deploy an attractive choice for modern web applications. Whether you are building APIs, webhooks, or full-stack applications, Deno Deploy offers the tools and infrastructure to deploy confidently.

Start with a simple application, gradually add features like KV storage and scheduled tasks, and leverage the monitoring capabilities to maintain visibility into your application's performance. With the practices and patterns covered in this guide, you are well-equipped to build production-ready serverless applications on Deno Deploy.

For more advanced use cases, explore the official Deno Deploy documentation and consider integrating with OneUptime for comprehensive application monitoring and incident management.
