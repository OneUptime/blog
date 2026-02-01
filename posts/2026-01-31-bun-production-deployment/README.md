# How to Deploy Bun Applications to Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Deployment, Docker, Kubernetes

Description: A comprehensive guide to deploying Bun applications to production using Docker, Kubernetes, systemd, with health checks, logging, monitoring, and CI/CD pipelines.

---

Bun has emerged as a powerful JavaScript runtime that offers significant performance improvements over Node.js. With its fast startup times, built-in TypeScript support, and native bundler, Bun is becoming increasingly popular for production workloads. However, deploying Bun applications to production requires careful consideration of containerization, orchestration, process management, and observability.

In this comprehensive guide, we will walk through everything you need to know to deploy Bun applications to production environments. We will cover Docker containerization, Kubernetes deployments, systemd services for bare metal, environment configuration, health checks, logging, monitoring, and CI/CD pipelines.

## Understanding the Deployment Architecture

Before diving into implementation details, let us understand the typical architecture for deploying Bun applications in production:

```mermaid
flowchart TB
    subgraph Internet
        Users["Users/Clients"]
    end
    
    subgraph LoadBalancer["Load Balancer / Ingress"]
        LB["NGINX / Traefik / ALB"]
    end
    
    subgraph Cluster["Kubernetes Cluster / Servers"]
        subgraph Node1["Node 1"]
            Pod1["Bun App Pod 1"]
        end
        subgraph Node2["Node 2"]
            Pod2["Bun App Pod 2"]
        end
        subgraph Node3["Node 3"]
            Pod3["Bun App Pod 3"]
        end
    end
    
    subgraph Backend["Backend Services"]
        DB[(Database)]
        Cache[(Redis Cache)]
        MQ[Message Queue]
    end
    
    subgraph Observability["Observability Stack"]
        Logs["Logging System"]
        Metrics["Prometheus/Grafana"]
        Traces["Tracing System"]
    end
    
    Users --> LB
    LB --> Pod1
    LB --> Pod2
    LB --> Pod3
    
    Pod1 --> DB
    Pod1 --> Cache
    Pod1 --> MQ
    Pod2 --> DB
    Pod2 --> Cache
    Pod2 --> MQ
    Pod3 --> DB
    Pod3 --> Cache
    Pod3 --> MQ
    
    Pod1 --> Logs
    Pod2 --> Logs
    Pod3 --> Logs
    Pod1 --> Metrics
    Pod2 --> Metrics
    Pod3 --> Metrics
```

This architecture provides high availability, scalability, and proper separation of concerns. Now let us implement each component.

## Preparing Your Bun Application for Production

Before deploying, your application needs to be production-ready. Here is a sample application structure that follows best practices:

```
bun-app/
├── src/
│   ├── index.ts
│   ├── routes/
│   ├── middleware/
│   └── utils/
├── tests/
├── Dockerfile
├── docker-compose.yml
├── kubernetes/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
├── package.json
├── bunfig.toml
└── tsconfig.json
```

Here is a production-ready Bun HTTP server with health endpoints:

```typescript
// src/index.ts - Main application entry point
// Includes health check endpoints and graceful shutdown handling

const PORT = parseInt(process.env.PORT || "3000");
const HOST = process.env.HOST || "0.0.0.0";

// Track application state for health checks
let isReady = false;
let isShuttingDown = false;

// Simulated database connection check
async function checkDatabaseConnection(): Promise<boolean> {
  // Replace with actual database health check
  try {
    // Example: await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

// Main request handler
const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Liveness probe - checks if the process is running
    if (url.pathname === "/health/live") {
      if (isShuttingDown) {
        return new Response("Shutting down", { status: 503 });
      }
      return new Response("OK", { status: 200 });
    }
    
    // Readiness probe - checks if the app can accept traffic
    if (url.pathname === "/health/ready") {
      if (!isReady || isShuttingDown) {
        return new Response("Not ready", { status: 503 });
      }
      
      const dbHealthy = await checkDatabaseConnection();
      if (!dbHealthy) {
        return new Response("Database unavailable", { status: 503 });
      }
      
      return new Response("Ready", { status: 200 });
    }
    
    // Metrics endpoint for Prometheus
    if (url.pathname === "/metrics") {
      const metrics = generateMetrics();
      return new Response(metrics, {
        headers: { "Content-Type": "text/plain" },
      });
    }
    
    // Your application routes here
    return new Response("Hello from Bun!", { status: 200 });
  },
  
  error(error: Error): Response {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

// Generate Prometheus-compatible metrics
function generateMetrics(): string {
  const memUsage = process.memoryUsage();
  return `
# HELP bun_memory_heap_used_bytes Heap memory used
# TYPE bun_memory_heap_used_bytes gauge
bun_memory_heap_used_bytes ${memUsage.heapUsed}

# HELP bun_memory_rss_bytes Resident set size
# TYPE bun_memory_rss_bytes gauge
bun_memory_rss_bytes ${memUsage.rss}

# HELP bun_uptime_seconds Process uptime in seconds
# TYPE bun_uptime_seconds counter
bun_uptime_seconds ${process.uptime()}
`.trim();
}

// Application initialization
async function initialize(): Promise<void> {
  console.log("Initializing application...");
  
  // Perform startup tasks here
  // Example: await connectToDatabase();
  // Example: await loadConfiguration();
  
  isReady = true;
  console.log(`Server running at http://${HOST}:${PORT}`);
}

// Graceful shutdown handler
async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, starting graceful shutdown...`);
  isShuttingDown = true;
  
  // Stop accepting new connections
  server.stop();
  
  // Give existing requests time to complete
  const gracePeriod = parseInt(process.env.SHUTDOWN_GRACE_PERIOD || "10000");
  await new Promise((resolve) => setTimeout(resolve, gracePeriod));
  
  // Clean up resources
  // Example: await closeDatabase();
  
  console.log("Shutdown complete");
  process.exit(0);
}

// Register signal handlers for graceful shutdown
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start the application
initialize().catch((error) => {
  console.error("Failed to initialize:", error);
  process.exit(1);
});
```

## Docker Containerization

Docker is the standard for packaging applications for deployment. Here is an optimized multi-stage Dockerfile for Bun applications:

```dockerfile
# Dockerfile - Multi-stage build for Bun applications
# Uses official Bun image with minimal production footprint

# Stage 1: Install dependencies
FROM oven/bun:1.1-alpine AS dependencies

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lockb ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Stage 2: Build the application
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Copy all package files
COPY package.json bun.lockb ./

# Install all dependencies including devDependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build the application (if you have a build step)
RUN bun build ./src/index.ts --outdir ./dist --target bun

# Stage 3: Production image
FROM oven/bun:1.1-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S bunuser && \
    adduser -u 1001 -S bunuser -G bunuser

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Set ownership to non-root user
RUN chown -R bunuser:bunuser /app

# Switch to non-root user
USER bunuser

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check instruction
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

# Start the application
CMD ["bun", "run", "./dist/index.js"]
```

Create a docker-compose file for local development and testing:

```yaml
# docker-compose.yml - Local development environment
# Includes the Bun app with supporting services

version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health/live"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Build and run your containerized application:

```bash
# Build the Docker image
docker build -t bun-app:latest .

# Run the container
docker run -d \
  --name bun-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=your-database-url \
  bun-app:latest
```

## Kubernetes Deployment

For production environments, Kubernetes provides robust orchestration capabilities. Here are the Kubernetes manifests for deploying your Bun application:

```yaml
# kubernetes/deployment.yaml - Kubernetes Deployment manifest
# Defines how your Bun application pods should be created and managed

apiVersion: apps/v1
kind: Deployment
metadata:
  name: bun-app
  labels:
    app: bun-app
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bun-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: bun-app
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: bun-app
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: bun-app
          image: your-registry/bun-app:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: bun-app-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: bun-app-secrets
                  key: redis-url
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
      terminationGracePeriodSeconds: 30
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: bun-app
                topologyKey: kubernetes.io/hostname
```

Create a Service to expose your application internally:

```yaml
# kubernetes/service.yaml - Kubernetes Service manifest
# Exposes the Bun application pods as a network service

apiVersion: v1
kind: Service
metadata:
  name: bun-app
  labels:
    app: bun-app
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  selector:
    app: bun-app
```

Configure an Ingress for external access with TLS:

```yaml
# kubernetes/ingress.yaml - Kubernetes Ingress manifest
# Routes external traffic to the service with SSL/TLS termination

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bun-app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
spec:
  tls:
    - hosts:
        - api.yourdomain.com
      secretName: bun-app-tls
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: bun-app
                port:
                  name: http
```

Create a HorizontalPodAutoscaler for automatic scaling:

```yaml
# kubernetes/hpa.yaml - Horizontal Pod Autoscaler
# Automatically scales pods based on CPU and memory usage

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bun-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bun-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

Store secrets securely:

```yaml
# kubernetes/secrets.yaml - Kubernetes Secrets
# Store sensitive configuration securely (use sealed-secrets or external-secrets in production)

apiVersion: v1
kind: Secret
metadata:
  name: bun-app-secrets
type: Opaque
stringData:
  database-url: "postgresql://user:password@host:5432/database"
  redis-url: "redis://cache:6379"
```

Deploy to Kubernetes with these commands:

```bash
# Create the namespace
kubectl create namespace production

# Apply secrets first
kubectl apply -f kubernetes/secrets.yaml -n production

# Deploy the application
kubectl apply -f kubernetes/deployment.yaml -n production
kubectl apply -f kubernetes/service.yaml -n production
kubectl apply -f kubernetes/ingress.yaml -n production
kubectl apply -f kubernetes/hpa.yaml -n production

# Verify the deployment
kubectl get pods -n production -l app=bun-app
kubectl get svc -n production
kubectl get ingress -n production
```

## Systemd Service for Bare Metal Deployment

For bare metal or VM deployments without Kubernetes, systemd provides robust process management:

```ini
# /etc/systemd/system/bun-app.service - Systemd service unit file
# Manages the Bun application as a system service

[Unit]
Description=Bun Application Server
Documentation=https://yourdomain.com/docs
After=network.target postgresql.service redis.service
Wants=network-online.target

[Service]
Type=simple
User=bunapp
Group=bunapp
WorkingDirectory=/opt/bun-app

# Environment configuration
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0
EnvironmentFile=/opt/bun-app/.env

# Run the application
ExecStart=/usr/local/bin/bun run /opt/bun-app/dist/index.js

# Graceful shutdown
ExecStop=/bin/kill -SIGTERM $MAINPID
TimeoutStopSec=30

# Restart policy
Restart=always
RestartSec=5

# Resource limits
MemoryMax=512M
CPUQuota=50%

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/bun-app/logs

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bun-app

[Install]
WantedBy=multi-user.target
```

Create the application user and set up the service:

```bash
# Create application user
sudo useradd -r -s /bin/false bunapp

# Create application directory
sudo mkdir -p /opt/bun-app
sudo chown bunapp:bunapp /opt/bun-app

# Copy application files
sudo cp -r dist package.json /opt/bun-app/

# Install production dependencies
cd /opt/bun-app
sudo -u bunapp bun install --production

# Create environment file
sudo tee /opt/bun-app/.env > /dev/null << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/app
REDIS_URL=redis://localhost:6379
EOF

# Secure the environment file
sudo chmod 600 /opt/bun-app/.env
sudo chown bunapp:bunapp /opt/bun-app/.env

# Reload systemd and enable the service
sudo systemctl daemon-reload
sudo systemctl enable bun-app
sudo systemctl start bun-app

# Check status
sudo systemctl status bun-app
```

## Environment Configuration Management

Proper environment configuration is critical for production deployments. Here is a configuration management approach:

```typescript
// src/config.ts - Centralized configuration management
// Validates environment variables at startup to catch misconfigurations early

interface Config {
  env: string;
  port: number;
  host: string;
  database: {
    url: string;
    maxConnections: number;
  };
  redis: {
    url: string;
  };
  logging: {
    level: string;
    format: string;
  };
  security: {
    jwtSecret: string;
    corsOrigins: string[];
  };
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function parseInteger(value: string, defaultValue: number): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseList(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function loadConfig(): Config {
  const env = getEnvOrDefault("NODE_ENV", "development");
  
  // Validate that we are not running production code without production config
  if (env === "production") {
    // These must be set in production
    getEnvOrThrow("DATABASE_URL");
    getEnvOrThrow("JWT_SECRET");
  }
  
  return {
    env,
    port: parseInteger(getEnvOrDefault("PORT", "3000"), 3000),
    host: getEnvOrDefault("HOST", "0.0.0.0"),
    database: {
      url: getEnvOrDefault("DATABASE_URL", "postgresql://localhost:5432/app"),
      maxConnections: parseInteger(getEnvOrDefault("DB_MAX_CONNECTIONS", "10"), 10),
    },
    redis: {
      url: getEnvOrDefault("REDIS_URL", "redis://localhost:6379"),
    },
    logging: {
      level: getEnvOrDefault("LOG_LEVEL", env === "production" ? "info" : "debug"),
      format: getEnvOrDefault("LOG_FORMAT", "json"),
    },
    security: {
      jwtSecret: getEnvOrDefault("JWT_SECRET", "development-secret-change-in-production"),
      corsOrigins: parseList(getEnvOrDefault("CORS_ORIGINS", "*")),
    },
  };
}

// Export singleton config instance
export const config = loadConfig();
```

## Structured Logging

Proper logging is essential for debugging and monitoring production applications:

```typescript
// src/logger.ts - Structured JSON logging for production
// Provides consistent log format compatible with log aggregation systems

import { config } from "./config.ts";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private serviceName: string;
  private minLevel: number;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.minLevel = LOG_LEVELS[config.logging.level as LogLevel] || 1;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      ...meta,
    };

    if (config.logging.format === "json") {
      return JSON.stringify(entry);
    }
    
    // Human-readable format for development
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `[${entry.timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatEntry("debug", message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      console.log(this.formatEntry("info", message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatEntry("warn", message, meta));
    }
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      const errorMeta = error
        ? { error: error.message, stack: error.stack, ...meta }
        : meta;
      console.error(this.formatEntry("error", message, errorMeta));
    }
  }

  // Create a child logger with additional context
  child(context: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, context);
  }
}

class ChildLogger {
  private parent: Logger;
  private context: Record<string, unknown>;

  constructor(parent: Logger, context: Record<string, unknown>) {
    this.parent = parent;
    this.context = context;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.parent.debug(message, { ...this.context, ...meta });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.parent.info(message, { ...this.context, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.parent.warn(message, { ...this.context, ...meta });
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.parent.error(message, error, { ...this.context, ...meta });
  }
}

export const logger = new Logger("bun-app");
```

## Health Checks and Readiness Probes

The health check implementation shown earlier covers the basics. Here is an enhanced version with dependency health tracking:

```typescript
// src/health.ts - Comprehensive health check system
// Tracks health of all dependencies and reports overall application health

import { logger } from "./logger.ts";

interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  timeout: number;
}

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  checks: Record<string, { healthy: boolean; latencyMs: number }>;
  uptime: number;
  timestamp: string;
}

class HealthChecker {
  private checks: HealthCheck[] = [];

  // Register a new health check
  register(name: string, check: () => Promise<boolean>, timeout = 5000): void {
    this.checks.push({ name, check, timeout });
    logger.info(`Registered health check: ${name}`);
  }

  // Run a single check with timeout
  private async runCheck(check: HealthCheck): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = performance.now();
    
    try {
      const result = await Promise.race([
        check.check(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), check.timeout)
        ),
      ]);
      
      return {
        healthy: result,
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (error) {
      logger.warn(`Health check failed: ${check.name}`, { error: String(error) });
      return {
        healthy: false,
        latencyMs: Math.round(performance.now() - start),
      };
    }
  }

  // Run all health checks and return overall status
  async getStatus(): Promise<HealthStatus> {
    const results: Record<string, { healthy: boolean; latencyMs: number }> = {};
    
    await Promise.all(
      this.checks.map(async (check) => {
        results[check.name] = await this.runCheck(check);
      })
    );

    const allHealthy = Object.values(results).every((r) => r.healthy);
    const someHealthy = Object.values(results).some((r) => r.healthy);

    let status: "healthy" | "unhealthy" | "degraded";
    if (allHealthy) {
      status = "healthy";
    } else if (someHealthy) {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    return {
      status,
      checks: results,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthChecker = new HealthChecker();

// Example: Register database health check
// healthChecker.register("database", async () => {
//   const result = await db.query("SELECT 1");
//   return result.rows.length > 0;
// });

// Example: Register Redis health check
// healthChecker.register("redis", async () => {
//   const pong = await redis.ping();
//   return pong === "PONG";
// });
```

## CI/CD Pipeline

Here is a complete GitHub Actions workflow for building, testing, and deploying your Bun application:

```yaml
# .github/workflows/deploy.yml - CI/CD pipeline for Bun applications
# Builds, tests, and deploys to Kubernetes on merge to main

name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run linting
        run: bun run lint

      - name: Run type checking
        run: bun run typecheck

      - name: Run tests
        run: bun test

  build:
    name: Build and Push Docker Image
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

  deploy:
    name: Deploy to Kubernetes
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Update deployment image
        run: |
          kubectl set image deployment/bun-app \
            bun-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n production

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/bun-app -n production --timeout=300s

      - name: Verify deployment
        run: |
          kubectl get pods -n production -l app=bun-app
          kubectl get ingress -n production
```

## SSL/TLS Configuration

For direct TLS termination at the application level, here is how to configure Bun with HTTPS:

```typescript
// src/https-server.ts - HTTPS server configuration for Bun
// Use this when TLS termination happens at the application level

const TLS_CERT_PATH = process.env.TLS_CERT_PATH || "/etc/ssl/certs/server.crt";
const TLS_KEY_PATH = process.env.TLS_KEY_PATH || "/etc/ssl/private/server.key";

// Load TLS certificates
const tlsCert = await Bun.file(TLS_CERT_PATH).text();
const tlsKey = await Bun.file(TLS_KEY_PATH).text();

const server = Bun.serve({
  port: 443,
  hostname: "0.0.0.0",
  
  // TLS configuration
  tls: {
    cert: tlsCert,
    key: tlsKey,
  },
  
  fetch(request: Request): Response {
    // Your request handler
    return new Response("Hello over HTTPS!");
  },
});

console.log(`HTTPS server running on https://localhost:443`);
```

For most production deployments, TLS termination at the load balancer or ingress level is recommended. Here is an NGINX configuration for TLS termination:

```nginx
# nginx.conf - NGINX reverse proxy with TLS termination
# Place in front of your Bun application for SSL handling

upstream bun_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://bun_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Monitoring and Observability

Here is how the monitoring architecture connects:

```mermaid
flowchart LR
    subgraph Application["Bun Application"]
        App["App Code"]
        Metrics["Metrics Endpoint\n/metrics"]
        Logs["Structured Logs"]
        Traces["Trace Context"]
    end
    
    subgraph Collection["Collection Layer"]
        Prom["Prometheus"]
        FB["Fluent Bit"]
        Jaeger["Jaeger/Tempo"]
    end
    
    subgraph Visualization["Visualization"]
        Grafana["Grafana Dashboards"]
    end
    
    subgraph Alerting["Alerting"]
        AM["Alert Manager"]
        PD["PagerDuty/Slack"]
    end
    
    Metrics --> Prom
    Logs --> FB
    Traces --> Jaeger
    
    Prom --> Grafana
    FB --> Grafana
    Jaeger --> Grafana
    
    Prom --> AM
    AM --> PD
```

## Best Practices Summary

Following these best practices will help you deploy reliable Bun applications to production:

1. **Use multi-stage Docker builds**: Keep your production images small by separating build dependencies from runtime dependencies. This reduces attack surface and improves deployment speed.

2. **Implement proper health checks**: Create separate liveness and readiness probes. Liveness checks verify the process is running, while readiness checks verify the application can handle requests.

3. **Configure graceful shutdown**: Handle SIGTERM and SIGINT signals properly. Allow in-flight requests to complete before terminating.

4. **Use non-root containers**: Run your application as a non-root user inside containers for improved security.

5. **Externalize configuration**: Use environment variables or configuration files for all environment-specific settings. Never hardcode secrets.

6. **Implement structured logging**: Use JSON logging in production for easier parsing by log aggregation systems. Include correlation IDs for request tracing.

7. **Set resource limits**: Always define memory and CPU limits in Kubernetes to prevent runaway processes from affecting other workloads.

8. **Enable horizontal pod autoscaling**: Configure HPA based on CPU, memory, or custom metrics to handle traffic spikes automatically.

9. **Use rolling deployments**: Configure zero-downtime deployments with proper maxSurge and maxUnavailable settings.

10. **Implement circuit breakers**: Protect your application from cascading failures when dependencies become unavailable.

11. **Monitor key metrics**: Track request latency, error rates, request counts, and resource utilization. Set up alerts for anomalies.

12. **Secure your endpoints**: Use TLS everywhere, implement rate limiting, and validate all inputs.

## Conclusion

Deploying Bun applications to production requires careful attention to containerization, orchestration, process management, and observability. By following the patterns and configurations outlined in this guide, you can build reliable, scalable, and maintainable production deployments.

Key takeaways from this guide:

- Docker multi-stage builds create optimized production images
- Kubernetes provides robust orchestration with health checks and autoscaling
- Systemd offers a simpler alternative for bare metal deployments
- Structured logging and metrics are essential for production debugging
- CI/CD pipelines automate the entire deployment process
- TLS termination can happen at the application, load balancer, or ingress level

Bun's fast startup times and low memory footprint make it particularly well-suited for containerized deployments where quick scaling is important. Combined with proper health checks and graceful shutdown handling, your Bun applications will be ready for production traffic.

Start with the basic Docker deployment, then progressively add Kubernetes orchestration, monitoring, and CI/CD automation as your application grows. Always test your deployment configuration in a staging environment before rolling out to production.

With these foundations in place, your Bun applications will be well-prepared to handle production workloads reliably and efficiently.
