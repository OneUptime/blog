# How to Build Microservices with Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Microservices, Docker, Distributed Systems

Description: A comprehensive guide to building production-ready microservices using Bun runtime with service communication, API gateway, health checks, and observability.

---

Bun has emerged as a lightning-fast JavaScript runtime that offers exceptional performance for building server-side applications. With its built-in bundler, package manager, and native TypeScript support, Bun is an excellent choice for building microservices architectures. In this guide, we will explore how to build a complete microservices system using Bun, covering everything from basic service creation to deployment and observability.

## Why Bun for Microservices?

Bun offers several advantages that make it ideal for microservices:

- **Performance**: Bun is significantly faster than Node.js for HTTP operations, reducing latency between services
- **Native TypeScript**: No compilation step needed, simplifying your build process
- **Built-in HTTP Server**: High-performance HTTP server out of the box
- **Low Memory Footprint**: Efficient memory usage means more services per server
- **Fast Startup Time**: Services spin up quickly, improving deployment and scaling

## Microservices Architecture Overview

Before diving into code, let us understand the architecture we will build. Our system will consist of multiple services that communicate through HTTP and message queues.

```mermaid
graph TB
    subgraph "Client Layer"
        C[Client Applications]
    end
    
    subgraph "Gateway Layer"
        AG[API Gateway<br/>Port 3000]
    end
    
    subgraph "Service Layer"
        US[User Service<br/>Port 3001]
        OS[Order Service<br/>Port 3002]
        PS[Product Service<br/>Port 3003]
        NS[Notification Service<br/>Port 3004]
    end
    
    subgraph "Data Layer"
        DB1[(User DB)]
        DB2[(Order DB)]
        DB3[(Product DB)]
        RD[Redis Cache]
    end
    
    C --> AG
    AG --> US
    AG --> OS
    AG --> PS
    AG --> NS
    
    US --> DB1
    OS --> DB2
    PS --> DB3
    
    US --> RD
    OS --> RD
    PS --> RD
    
    OS -.->|Events| NS
```

## Setting Up the Project Structure

Let us start by creating a well-organized project structure for our microservices.

The following structure keeps each service isolated with its own dependencies while sharing common utilities through a shared package:

```
bun-microservices/
├── services/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes.ts
│   │   │   └── middleware/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── user-service/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes.ts
│   │   │   └── handlers/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── order-service/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes.ts
│   │   │   └── handlers/
│   │   ├── package.json
│   │   └── Dockerfile
│   └── product-service/
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes.ts
│       │   └── handlers/
│       ├── package.json
│       └── Dockerfile
├── shared/
│   ├── types/
│   ├── utils/
│   └── middleware/
├── docker-compose.yml
└── package.json
```

## Creating a Base Service Template

Every microservice needs common functionality like health checks, logging, and error handling. Let us create a reusable base service class.

This base service class provides built-in health checks, graceful shutdown handling, and a consistent interface for all services:

```typescript
// shared/utils/base-service.ts
import { serve, type Server } from "bun";

// Define types for route handlers and configuration
type RouteHandler = (req: Request) => Promise<Response> | Response;
type Routes = Map<string, Map<string, RouteHandler>>;

interface ServiceConfig {
  name: string;
  port: number;
  version: string;
}

interface HealthStatus {
  status: "healthy" | "unhealthy";
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  checks: Record<string, boolean>;
}

export class BaseService {
  protected routes: Routes = new Map();
  protected server: Server | null = null;
  protected startTime: number = Date.now();
  protected healthChecks: Map<string, () => Promise<boolean>> = new Map();

  constructor(protected config: ServiceConfig) {
    // Register default health check endpoint
    this.registerRoute("GET", "/health", this.handleHealth.bind(this));
    this.registerRoute("GET", "/ready", this.handleReady.bind(this));
    
    // Set up graceful shutdown handlers
    this.setupGracefulShutdown();
  }

  // Register a route with method and path
  protected registerRoute(method: string, path: string, handler: RouteHandler): void {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }
    this.routes.get(method)!.set(path, handler);
  }

  // Add custom health checks for dependencies
  protected addHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
  }

  // Handle health check requests
  private async handleHealth(): Promise<Response> {
    const checks: Record<string, boolean> = {};
    
    // Run all registered health checks
    for (const [name, check] of this.healthChecks) {
      try {
        checks[name] = await check();
      } catch {
        checks[name] = false;
      }
    }
    
    const allHealthy = Object.values(checks).every(v => v);
    
    const status: HealthStatus = {
      status: allHealthy ? "healthy" : "unhealthy",
      service: this.config.name,
      version: this.config.version,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      checks,
    };
    
    return new Response(JSON.stringify(status), {
      status: allHealthy ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle readiness check for Kubernetes
  private async handleReady(): Promise<Response> {
    return new Response(JSON.stringify({ ready: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Set up graceful shutdown to handle SIGTERM and SIGINT
  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      console.log(`[${this.config.name}] Shutting down gracefully...`);
      
      if (this.server) {
        this.server.stop();
      }
      
      // Allow time for in-flight requests to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }

  // Main request handler that routes to appropriate handler
  protected async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    const methodRoutes = this.routes.get(method);
    if (methodRoutes) {
      const handler = methodRoutes.get(path);
      if (handler) {
        try {
          return await handler(req);
        } catch (error) {
          console.error(`[${this.config.name}] Error handling ${method} ${path}:`, error);
          return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Start the service
  public start(): void {
    this.server = serve({
      port: this.config.port,
      fetch: this.handleRequest.bind(this),
    });

    console.log(`[${this.config.name}] Service started on port ${this.config.port}`);
  }
}
```

## Building the User Service

Now let us create a concrete User Service that handles user management operations.

The User Service demonstrates CRUD operations with in-memory storage. In production, you would replace this with a real database:

```typescript
// services/user-service/src/index.ts
import { BaseService } from "../../../shared/utils/base-service";

// Define user type
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// In-memory store for demonstration, use a real database in production
const users: Map<string, User> = new Map();

class UserService extends BaseService {
  constructor() {
    super({
      name: "user-service",
      port: parseInt(process.env.PORT || "3001"),
      version: "1.0.0",
    });

    // Register user routes
    this.registerRoute("GET", "/users", this.listUsers.bind(this));
    this.registerRoute("GET", "/users/:id", this.getUser.bind(this));
    this.registerRoute("POST", "/users", this.createUser.bind(this));
    this.registerRoute("PUT", "/users/:id", this.updateUser.bind(this));
    this.registerRoute("DELETE", "/users/:id", this.deleteUser.bind(this));

    // Add database health check
    this.addHealthCheck("database", async () => {
      // Simulate database connectivity check
      return true;
    });
  }

  // List all users with optional pagination
  private async listUsers(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    const allUsers = Array.from(users.values());
    const paginatedUsers = allUsers.slice(offset, offset + limit);
    
    return new Response(JSON.stringify({
      users: paginatedUsers,
      total: allUsers.length,
      limit,
      offset,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get a single user by ID
  private async getUser(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop()!;
    
    const user = users.get(id);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify(user), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a new user
  private async createUser(req: Request): Promise<Response> {
    const body = await req.json() as { email: string; name: string };
    
    // Validate required fields
    if (!body.email || !body.name) {
      return new Response(JSON.stringify({ error: "Email and name are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const user: User = {
      id: crypto.randomUUID(),
      email: body.email,
      name: body.name,
      createdAt: new Date().toISOString(),
    };
    
    users.set(user.id, user);
    
    return new Response(JSON.stringify(user), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Update an existing user
  private async updateUser(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop()!;
    const body = await req.json() as Partial<User>;
    
    const user = users.get(id);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const updatedUser = { ...user, ...body, id }; // Prevent ID modification
    users.set(id, updatedUser);
    
    return new Response(JSON.stringify(updatedUser), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Delete a user
  private async deleteUser(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop()!;
    
    if (!users.has(id)) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    users.delete(id);
    
    return new Response(JSON.stringify({ message: "User deleted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Start the service
const service = new UserService();
service.start();
```

## Building the API Gateway

The API Gateway serves as the single entry point for all client requests, handling routing, authentication, and rate limiting.

```mermaid
sequenceDiagram
    participant C as Client
    participant AG as API Gateway
    participant Auth as Auth Middleware
    participant RL as Rate Limiter
    participant US as User Service
    participant OS as Order Service
    
    C->>AG: Request /api/users
    AG->>Auth: Validate Token
    Auth-->>AG: Token Valid
    AG->>RL: Check Rate Limit
    RL-->>AG: Allowed
    AG->>US: Forward Request
    US-->>AG: Response
    AG-->>C: Response
```

The API Gateway handles routing, authentication verification, rate limiting, and request forwarding to downstream services:

```typescript
// services/api-gateway/src/index.ts
import { serve } from "bun";

// Service registry with health status tracking
interface ServiceInfo {
  url: string;
  healthy: boolean;
  lastCheck: number;
}

const services: Map<string, ServiceInfo> = new Map([
  ["users", { url: process.env.USER_SERVICE_URL || "http://localhost:3001", healthy: true, lastCheck: Date.now() }],
  ["orders", { url: process.env.ORDER_SERVICE_URL || "http://localhost:3002", healthy: true, lastCheck: Date.now() }],
  ["products", { url: process.env.PRODUCT_SERVICE_URL || "http://localhost:3003", healthy: true, lastCheck: Date.now() }],
]);

// Simple in-memory rate limiter
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60000; // 1 minute in milliseconds

// Check if request exceeds rate limit
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(clientId);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// Extract client identifier from request
function getClientId(req: Request): string {
  return req.headers.get("x-forwarded-for") || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

// Verify JWT token from Authorization header
async function verifyToken(token: string): Promise<boolean> {
  // Implement your JWT verification logic here
  // This is a placeholder that accepts any token starting with "Bearer "
  return token.startsWith("Bearer ") && token.length > 7;
}

// Forward request to the appropriate service
async function forwardRequest(
  serviceName: string, 
  path: string, 
  req: Request
): Promise<Response> {
  const serviceInfo = services.get(serviceName);
  
  if (!serviceInfo) {
    return new Response(JSON.stringify({ error: "Service not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  if (!serviceInfo.healthy) {
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  try {
    // Build the target URL
    const targetUrl = `${serviceInfo.url}${path}`;
    
    // Forward the request with all headers
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    });
    
    // Create new response with service response
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "X-Service": serviceName,
      },
    });
  } catch (error) {
    console.error(`[API Gateway] Error forwarding to ${serviceName}:`, error);
    
    // Mark service as unhealthy
    serviceInfo.healthy = false;
    
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Periodically check health of all services
async function healthCheckLoop(): Promise<void> {
  setInterval(async () => {
    for (const [name, info] of services) {
      try {
        const response = await fetch(`${info.url}/health`, { 
          signal: AbortSignal.timeout(5000) 
        });
        info.healthy = response.ok;
        info.lastCheck = Date.now();
      } catch {
        info.healthy = false;
        info.lastCheck = Date.now();
      }
    }
  }, 10000); // Check every 10 seconds
}

// Main request handler
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Health check endpoint for the gateway itself
  if (path === "/health") {
    const serviceStatuses = Object.fromEntries(
      Array.from(services.entries()).map(([name, info]) => [name, info.healthy])
    );
    
    return new Response(JSON.stringify({
      status: "healthy",
      services: serviceStatuses,
      timestamp: new Date().toISOString(),
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  
  // Rate limiting check
  const clientId = getClientId(req);
  if (!checkRateLimit(clientId)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { 
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    });
  }
  
  // Authentication check for protected routes
  if (path.startsWith("/api/")) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !(await verifyToken(authHeader))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  
  // Route to appropriate service based on path
  if (path.startsWith("/api/users")) {
    const servicePath = path.replace("/api/users", "/users");
    return forwardRequest("users", servicePath + url.search, req);
  }
  
  if (path.startsWith("/api/orders")) {
    const servicePath = path.replace("/api/orders", "/orders");
    return forwardRequest("orders", servicePath + url.search, req);
  }
  
  if (path.startsWith("/api/products")) {
    const servicePath = path.replace("/api/products", "/products");
    return forwardRequest("products", servicePath + url.search, req);
  }
  
  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

// Start the gateway
const port = parseInt(process.env.PORT || "3000");
serve({
  port,
  fetch: handleRequest,
});

console.log(`[API Gateway] Started on port ${port}`);
healthCheckLoop();
```

## Service Communication Patterns

Microservices need to communicate with each other. Let us implement both synchronous HTTP calls and asynchronous event-driven communication.

This HTTP client wrapper provides retry logic with exponential backoff and circuit breaker pattern for resilient inter-service communication:

```typescript
// shared/utils/service-client.ts

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 5000,
};

// Circuit breaker storage per service
const circuitBreakers: Map<string, CircuitBreakerState> = new Map();
const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT = 30000;

export class ServiceClient {
  private baseUrl: string;
  private serviceName: string;
  private retryConfig: RetryConfig;

  constructor(serviceName: string, baseUrl: string, retryConfig?: Partial<RetryConfig>) {
    this.serviceName = serviceName;
    this.baseUrl = baseUrl;
    this.retryConfig = { ...defaultRetryConfig, ...retryConfig };
    
    // Initialize circuit breaker state
    if (!circuitBreakers.has(serviceName)) {
      circuitBreakers.set(serviceName, { failures: 0, lastFailure: 0, state: "closed" });
    }
  }

  // Check if circuit breaker allows request
  private canMakeRequest(): boolean {
    const breaker = circuitBreakers.get(this.serviceName)!;
    
    if (breaker.state === "closed") {
      return true;
    }
    
    if (breaker.state === "open") {
      // Check if recovery timeout has passed
      if (Date.now() - breaker.lastFailure > RECOVERY_TIMEOUT) {
        breaker.state = "half-open";
        return true;
      }
      return false;
    }
    
    // half-open state allows one request through
    return true;
  }

  // Record a successful request
  private recordSuccess(): void {
    const breaker = circuitBreakers.get(this.serviceName)!;
    breaker.failures = 0;
    breaker.state = "closed";
  }

  // Record a failed request
  private recordFailure(): void {
    const breaker = circuitBreakers.get(this.serviceName)!;
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= FAILURE_THRESHOLD) {
      breaker.state = "open";
      console.warn(`[ServiceClient] Circuit breaker opened for ${this.serviceName}`);
    }
  }

  // Calculate delay with exponential backoff
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  // Make HTTP request with retry and circuit breaker
  async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string> }
  ): Promise<T> {
    // Check circuit breaker
    if (!this.canMakeRequest()) {
      throw new Error(`Circuit breaker open for ${this.serviceName}`);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        this.recordSuccess();
        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[ServiceClient] Request to ${this.serviceName} failed (attempt ${attempt + 1}):`,
          lastError.message
        );

        if (attempt < this.retryConfig.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.calculateDelay(attempt)));
        }
      }
    }

    this.recordFailure();
    throw lastError;
  }

  // Convenience methods for common HTTP operations
  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, { headers });
  }

  async post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("POST", path, { body, headers });
  }

  async put<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("PUT", path, { body, headers });
  }

  async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("DELETE", path, { headers });
  }
}
```

## Implementing Distributed Tracing

Observability is crucial in microservices. Let us implement distributed tracing to track requests across services.

```mermaid
graph LR
    subgraph "Trace Context Flow"
        R[Request] --> AG[API Gateway]
        AG -->|trace-id: abc123| US[User Service]
        AG -->|trace-id: abc123| OS[Order Service]
        OS -->|trace-id: abc123| PS[Product Service]
    end
    
    subgraph "Trace Collection"
        AG -.-> TC[Trace Collector]
        US -.-> TC
        OS -.-> TC
        PS -.-> TC
    end
```

This tracing module creates spans and propagates trace context across service boundaries for complete request visibility:

```typescript
// shared/utils/tracing.ts

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, string>;
  logs: Array<{ timestamp: number; message: string }>;
}

// In-memory span storage, replace with actual collector in production
const spans: Span[] = [];

export class Tracer {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // Generate a random ID for trace or span
  private generateId(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }

  // Extract trace context from incoming request headers
  extractContext(headers: Headers): { traceId: string; parentSpanId?: string } {
    const traceId = headers.get("x-trace-id") || this.generateId();
    const parentSpanId = headers.get("x-span-id") || undefined;
    
    return { traceId, parentSpanId };
  }

  // Create headers to propagate trace context to downstream services
  injectContext(traceId: string, spanId: string): Record<string, string> {
    return {
      "x-trace-id": traceId,
      "x-span-id": spanId,
    };
  }

  // Start a new span for an operation
  startSpan(
    operationName: string,
    context: { traceId: string; parentSpanId?: string }
  ): Span {
    const span: Span = {
      traceId: context.traceId,
      spanId: this.generateId(),
      parentSpanId: context.parentSpanId,
      operationName,
      serviceName: this.serviceName,
      startTime: Date.now(),
      tags: {},
      logs: [],
    };

    return span;
  }

  // Add a tag to the span
  addTag(span: Span, key: string, value: string): void {
    span.tags[key] = value;
  }

  // Add a log entry to the span
  addLog(span: Span, message: string): void {
    span.logs.push({ timestamp: Date.now(), message });
  }

  // Finish the span and record it
  finishSpan(span: Span): void {
    span.endTime = Date.now();
    spans.push(span);
    
    // Log span information for debugging
    const duration = span.endTime - span.startTime;
    console.log(
      `[Trace] ${span.traceId} | ${span.serviceName} | ${span.operationName} | ${duration}ms`
    );
    
    // In production, send to trace collector (Jaeger, Zipkin, etc.)
    this.exportSpan(span);
  }

  // Export span to external collector
  private async exportSpan(span: Span): Promise<void> {
    const collectorUrl = process.env.TRACE_COLLECTOR_URL;
    if (!collectorUrl) return;

    try {
      await fetch(collectorUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(span),
      });
    } catch (error) {
      console.error("[Tracer] Failed to export span:", error);
    }
  }
}

// Middleware to automatically trace incoming requests
export function tracingMiddleware(tracer: Tracer) {
  return async (req: Request, next: (req: Request) => Promise<Response>): Promise<Response> => {
    const context = tracer.extractContext(req.headers);
    const span = tracer.startSpan(`${req.method} ${new URL(req.url).pathname}`, context);
    
    tracer.addTag(span, "http.method", req.method);
    tracer.addTag(span, "http.url", req.url);
    
    try {
      const response = await next(req);
      tracer.addTag(span, "http.status_code", response.status.toString());
      return response;
    } catch (error) {
      tracer.addTag(span, "error", "true");
      tracer.addLog(span, `Error: ${(error as Error).message}`);
      throw error;
    } finally {
      tracer.finishSpan(span);
    }
  };
}
```

## Structured Logging

Consistent logging across services is essential for debugging and monitoring.

This logger creates structured JSON logs with consistent fields across all services, making log aggregation and searching easier:

```typescript
// shared/utils/logger.ts

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  traceId?: string;
  spanId?: string;
  data?: Record<string, unknown>;
}

export class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(serviceName: string, minLevel: LogLevel = "info") {
    this.serviceName = serviceName;
    this.minLevel = minLevel;
  }

  // Check if log level should be output
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  // Format and output log entry
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    traceId?: string,
    spanId?: string
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      traceId,
      spanId,
      data,
    };

    // Output as JSON for log aggregation tools
    const output = JSON.stringify(entry);
    
    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  // Log level methods
  debug(message: string, data?: Record<string, unknown>, traceId?: string, spanId?: string): void {
    this.log("debug", message, data, traceId, spanId);
  }

  info(message: string, data?: Record<string, unknown>, traceId?: string, spanId?: string): void {
    this.log("info", message, data, traceId, spanId);
  }

  warn(message: string, data?: Record<string, unknown>, traceId?: string, spanId?: string): void {
    this.log("warn", message, data, traceId, spanId);
  }

  error(message: string, data?: Record<string, unknown>, traceId?: string, spanId?: string): void {
    this.log("error", message, data, traceId, spanId);
  }
}
```

## Docker Deployment

Let us containerize our services for deployment. Each service gets its own lightweight Dockerfile.

This Dockerfile uses multi-stage builds to create a minimal production image with only the necessary runtime:

```dockerfile
# services/user-service/Dockerfile

# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY shared ../shared

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src

# Production stage
FROM oven/bun:1-slim AS production
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunjs && \
    chown -R bunjs:nodejs /app

USER bunjs

# Expose service port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the service
CMD ["bun", "run", "src/index.ts"]
```

The docker-compose.yml file orchestrates all services with proper networking, environment variables, and health checks:

```yaml
# docker-compose.yml
version: '3.8'

services:
  api-gateway:
    build:
      context: .
      dockerfile: services/api-gateway/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - USER_SERVICE_URL=http://user-service:3001
      - ORDER_SERVICE_URL=http://order-service:3002
      - PRODUCT_SERVICE_URL=http://product-service:3003
      - TRACE_COLLECTOR_URL=http://jaeger:14268/api/traces
    depends_on:
      user-service:
        condition: service_healthy
      order-service:
        condition: service_healthy
      product-service:
        condition: service_healthy
    networks:
      - microservices-network
    restart: unless-stopped

  user-service:
    build:
      context: .
      dockerfile: services/user-service/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/users
      - REDIS_URL=redis://redis:6379
      - TRACE_COLLECTOR_URL=http://jaeger:14268/api/traces
    depends_on:
      - postgres
      - redis
    networks:
      - microservices-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  order-service:
    build:
      context: .
      dockerfile: services/order-service/Dockerfile
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/orders
      - USER_SERVICE_URL=http://user-service:3001
      - PRODUCT_SERVICE_URL=http://product-service:3003
      - REDIS_URL=redis://redis:6379
      - TRACE_COLLECTOR_URL=http://jaeger:14268/api/traces
    depends_on:
      - postgres
      - redis
    networks:
      - microservices-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  product-service:
    build:
      context: .
      dockerfile: services/product-service/Dockerfile
    ports:
      - "3003:3003"
    environment:
      - PORT=3003
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/products
      - REDIS_URL=redis://redis:6379
      - TRACE_COLLECTOR_URL=http://jaeger:14268/api/traces
    depends_on:
      - postgres
      - redis
    networks:
      - microservices-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - microservices-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - microservices-network
    restart: unless-stopped

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
    networks:
      - microservices-network
    restart: unless-stopped

networks:
  microservices-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
```

## Service Discovery with Consul

For production environments, you need proper service discovery. Here is how to integrate Consul with your Bun microservices.

This Consul client handles service registration, health check registration, and discovering other services dynamically:

```typescript
// shared/utils/consul-client.ts

interface ServiceRegistration {
  ID: string;
  Name: string;
  Address: string;
  Port: number;
  Tags: string[];
  Check: {
    HTTP: string;
    Interval: string;
    Timeout: string;
    DeregisterCriticalServiceAfter: string;
  };
}

interface ServiceInstance {
  ID: string;
  Service: string;
  Address: string;
  Port: number;
  Tags: string[];
}

export class ConsulClient {
  private consulUrl: string;

  constructor(consulUrl: string = "http://localhost:8500") {
    this.consulUrl = consulUrl;
  }

  // Register a service with Consul
  async registerService(registration: ServiceRegistration): Promise<void> {
    const response = await fetch(`${this.consulUrl}/v1/agent/service/register`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registration),
    });

    if (!response.ok) {
      throw new Error(`Failed to register service: ${response.statusText}`);
    }

    console.log(`[Consul] Registered service: ${registration.Name}`);
  }

  // Deregister a service from Consul
  async deregisterService(serviceId: string): Promise<void> {
    const response = await fetch(
      `${this.consulUrl}/v1/agent/service/deregister/${serviceId}`,
      { method: "PUT" }
    );

    if (!response.ok) {
      throw new Error(`Failed to deregister service: ${response.statusText}`);
    }

    console.log(`[Consul] Deregistered service: ${serviceId}`);
  }

  // Discover healthy service instances
  async discoverService(serviceName: string): Promise<ServiceInstance[]> {
    const response = await fetch(
      `${this.consulUrl}/v1/health/service/${serviceName}?passing=true`
    );

    if (!response.ok) {
      throw new Error(`Failed to discover service: ${response.statusText}`);
    }

    const data = await response.json() as Array<{ Service: ServiceInstance }>;
    return data.map(item => item.Service);
  }

  // Get a random healthy instance for load balancing
  async getServiceUrl(serviceName: string): Promise<string | null> {
    const instances = await this.discoverService(serviceName);
    
    if (instances.length === 0) {
      return null;
    }

    // Simple random selection for load balancing
    const instance = instances[Math.floor(Math.random() * instances.length)];
    return `http://${instance.Address}:${instance.Port}`;
  }
}

// Helper function to create service registration
export function createServiceRegistration(
  name: string,
  port: number,
  tags: string[] = []
): ServiceRegistration {
  const hostname = process.env.HOSTNAME || "localhost";
  
  return {
    ID: `${name}-${hostname}-${port}`,
    Name: name,
    Address: hostname,
    Port: port,
    Tags: ["bun", "microservice", ...tags],
    Check: {
      HTTP: `http://${hostname}:${port}/health`,
      Interval: "10s",
      Timeout: "5s",
      DeregisterCriticalServiceAfter: "1m",
    },
  };
}
```

## Best Practices Summary

When building microservices with Bun, follow these proven practices to ensure reliability and maintainability:

### Service Design
- Keep services small and focused on a single business capability
- Use async/await consistently for non-blocking operations
- Implement proper error handling with clear error messages
- Version your APIs to allow for backward compatibility

### Communication
- Use circuit breakers to prevent cascade failures
- Implement retry logic with exponential backoff
- Set appropriate timeouts for all external calls
- Propagate trace context through all service-to-service calls

### Health and Monitoring
- Implement both liveness (`/health`) and readiness (`/ready`) endpoints
- Include dependency checks in health responses
- Use structured JSON logging for easy aggregation
- Export metrics in Prometheus format for monitoring

### Security
- Run containers as non-root users
- Use environment variables for configuration and secrets
- Implement rate limiting at the gateway level
- Validate and sanitize all input data

### Deployment
- Use multi-stage Docker builds to minimize image size
- Implement graceful shutdown to complete in-flight requests
- Configure proper resource limits in Kubernetes
- Use rolling updates for zero-downtime deployments

### Testing
- Write unit tests for business logic
- Use integration tests for service interactions
- Implement contract tests between services
- Run chaos engineering experiments in staging

## Conclusion

Bun provides an excellent foundation for building high-performance microservices. Its native TypeScript support, fast startup times, and efficient HTTP server make it ideal for containerized environments where quick scaling is essential.

In this guide, we covered the essential components of a microservices architecture: creating reusable base services, building an API gateway with rate limiting and authentication, implementing service-to-service communication with circuit breakers, setting up distributed tracing and structured logging, containerizing services with Docker, and integrating service discovery.

The patterns and code examples provided here give you a solid starting point for your own microservices projects. Remember that microservices architecture adds complexity, so start with a simpler architecture and evolve toward microservices as your team and requirements grow.

As you build out your system, consider integrating with observability platforms like OneUptime to gain deeper insights into your services' performance and reliability. Proper monitoring becomes increasingly important as your service count grows and interactions become more complex.
