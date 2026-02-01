# How to Deploy Deno Applications to Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, Deployment, Docker, Kubernetes

Description: A comprehensive guide to deploying Deno applications to production environments using Docker, Kubernetes, systemd, and CI/CD pipelines with best practices for security, monitoring, and scalability.

---

Deno has emerged as a modern, secure runtime for JavaScript and TypeScript that addresses many of the pain points developers experienced with Node.js. With built-in TypeScript support, a secure-by-default permission model, and a standard library that follows web standards, Deno is becoming an attractive choice for production applications. However, deploying Deno applications to production requires careful consideration of containerization, process management, orchestration, and observability.

This guide walks you through everything you need to know to deploy Deno applications to production environments confidently and securely.

## Understanding Deno's Production Requirements

Before diving into deployment strategies, it is essential to understand what makes Deno different from traditional Node.js deployments:

- **Permission-based security**: Deno requires explicit permissions for network, file system, and environment access
- **Single executable compilation**: Deno can compile applications into standalone binaries
- **Built-in tooling**: Deno includes formatting, linting, testing, and bundling out of the box
- **URL-based imports**: Dependencies are fetched from URLs rather than a central registry

## Deployment Architecture Overview

Here is a typical production architecture for Deno applications:

```mermaid
flowchart TB
    subgraph Internet
        Users[Users/Clients]
    end
    
    subgraph LoadBalancer[Load Balancer Layer]
        LB[NGINX/HAProxy]
        SSL[SSL Termination]
    end
    
    subgraph Container[Container Orchestration]
        subgraph K8s[Kubernetes Cluster]
            Pod1[Deno Pod 1]
            Pod2[Deno Pod 2]
            Pod3[Deno Pod 3]
        end
        HPA[Horizontal Pod Autoscaler]
    end
    
    subgraph Observability[Observability Stack]
        Prometheus[Prometheus]
        Grafana[Grafana]
        Loki[Loki/Logs]
    end
    
    subgraph Data[Data Layer]
        DB[(PostgreSQL)]
        Cache[(Redis)]
    end
    
    Users --> LB
    LB --> SSL
    SSL --> Pod1
    SSL --> Pod2
    SSL --> Pod3
    HPA --> K8s
    Pod1 --> DB
    Pod2 --> DB
    Pod3 --> DB
    Pod1 --> Cache
    Pod2 --> Cache
    Pod3 --> Cache
    Pod1 --> Prometheus
    Pod2 --> Prometheus
    Pod3 --> Prometheus
    Prometheus --> Grafana
    Pod1 --> Loki
    Pod2 --> Loki
    Pod3 --> Loki
```

## Creating a Production-Ready Deno Application

Let us start with a simple but production-ready Deno HTTP server that includes health checks and graceful shutdown.

This server implements health check endpoints and handles SIGTERM signals for graceful shutdown in containerized environments:

```typescript
// main.ts - Production-ready Deno HTTP server
import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// Application state for health checks
const appState = {
  isReady: false,
  isHealthy: true,
  startTime: Date.now(),
};

const app = new Application();
const router = new Router();

// Health check endpoint for liveness probes
router.get("/health/live", (ctx) => {
  if (appState.isHealthy) {
    ctx.response.status = 200;
    ctx.response.body = { status: "healthy", uptime: Date.now() - appState.startTime };
  } else {
    ctx.response.status = 503;
    ctx.response.body = { status: "unhealthy" };
  }
});

// Readiness endpoint for readiness probes
router.get("/health/ready", (ctx) => {
  if (appState.isReady) {
    ctx.response.status = 200;
    ctx.response.body = { status: "ready" };
  } else {
    ctx.response.status = 503;
    ctx.response.body = { status: "not ready" };
  }
});

// Main application route
router.get("/", (ctx) => {
  ctx.response.body = { message: "Hello from Deno!", timestamp: new Date().toISOString() };
});

// Request logging middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.request.method} ${ctx.request.url.pathname} - ${ctx.response.status} - ${ms}ms`);
});

app.use(router.routes());
app.use(router.allowedMethods());

// Graceful shutdown handler
const controller = new AbortController();
const { signal } = controller;

Deno.addSignalListener("SIGTERM", () => {
  console.log("Received SIGTERM, initiating graceful shutdown...");
  appState.isReady = false;
  // Allow time for load balancer to stop sending traffic
  setTimeout(() => {
    controller.abort();
  }, 10000);
});

Deno.addSignalListener("SIGINT", () => {
  console.log("Received SIGINT, shutting down...");
  controller.abort();
});

// Initialize application
const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Starting server on port ${port}...`);

// Mark application as ready after startup
appState.isReady = true;

await app.listen({ port, signal });
console.log("Server shut down gracefully");
```

## Docker Container Deployment

Docker is the most common way to deploy Deno applications. Here is a multi-stage Dockerfile optimized for production.

This Dockerfile uses multi-stage builds to create a minimal production image with only the necessary runtime dependencies:

```dockerfile
# Dockerfile - Multi-stage build for Deno application
# Stage 1: Cache dependencies
FROM denoland/deno:1.40.0 as cache

WORKDIR /app

# Copy dependency files first for better caching
COPY deno.json deno.lock ./

# Cache dependencies
RUN deno cache --lock=deno.lock deno.json

# Stage 2: Build (if using compile)
FROM denoland/deno:1.40.0 as builder

WORKDIR /app

# Copy cached dependencies
COPY --from=cache /deno-dir /deno-dir

# Copy source code
COPY . .

# Type check and cache all imports
RUN deno check main.ts
RUN deno cache --lock=deno.lock main.ts

# Optional: Compile to standalone binary
# RUN deno compile --allow-net --allow-env --allow-read --output=app main.ts

# Stage 3: Production runtime
FROM denoland/deno:1.40.0 as production

# Create non-root user for security
RUN addgroup --system --gid 1001 deno && \
    adduser --system --uid 1001 deno

WORKDIR /app

# Copy application files
COPY --from=builder /app .
COPY --from=builder /deno-dir /deno-dir

# Set ownership
RUN chown -R deno:deno /app

# Switch to non-root user
USER deno

# Expose application port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["deno", "run", "--allow-net", "-", "fetch('http://localhost:8000/health/live').then(r => r.ok ? Deno.exit(0) : Deno.exit(1))"]

# Run with minimal permissions
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]
```

You can build and run the container with these commands:

```bash
# Build the Docker image
docker build -t my-deno-app:latest .

# Run the container with environment variables
docker run -d \
  --name deno-app \
  -p 8000:8000 \
  -e PORT=8000 \
  -e NODE_ENV=production \
  --restart unless-stopped \
  my-deno-app:latest
```

## Systemd Service Deployment

For bare-metal or VM deployments without containers, systemd provides robust process management.

This systemd service file configures automatic restarts, resource limits, and security hardening for the Deno application:

```ini
# /etc/systemd/system/deno-app.service
[Unit]
Description=Deno Application Server
Documentation=https://github.com/your-org/your-app
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=deno
Group=deno
WorkingDirectory=/opt/deno-app

# Environment configuration
Environment=PORT=8000
Environment=DENO_DIR=/opt/deno-app/.deno
EnvironmentFile=-/etc/deno-app/env

# Command to start the application
ExecStart=/usr/bin/deno run \
    --allow-net \
    --allow-env \
    --allow-read=/opt/deno-app \
    --cached-only \
    /opt/deno-app/main.ts

# Graceful shutdown with 30 second timeout
ExecStop=/bin/kill -SIGTERM $MAINPID
TimeoutStopSec=30
KillMode=mixed

# Restart configuration
Restart=always
RestartSec=5
StartLimitInterval=60
StartLimitBurst=3

# Resource limits
LimitNOFILE=65535
MemoryMax=512M
CPUQuota=100%

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/deno-app/logs

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=deno-app

[Install]
WantedBy=multi-user.target
```

Enable and manage the service with these commands:

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable deno-app

# Start the service
sudo systemctl start deno-app

# Check service status
sudo systemctl status deno-app

# View logs
sudo journalctl -u deno-app -f
```

## Kubernetes Deployment

Kubernetes provides scalable, resilient deployment for production workloads. Here is a complete set of manifests.

This deployment configuration includes resource limits, health probes, and security contexts for running Deno in Kubernetes:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deno-app
  labels:
    app: deno-app
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: deno-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: deno-app
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: deno-app
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      containers:
        - name: deno-app
          image: your-registry/deno-app:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 8000
              protocol: TCP
          env:
            - name: PORT
              value: "8000"
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: deno-app-secrets
                  key: database-url
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
            initialDelaySeconds: 10
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
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
                    app: deno-app
                topologyKey: kubernetes.io/hostname
```

This service and ingress configuration exposes the application with TLS termination:

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: deno-app
  labels:
    app: deno-app
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app: deno-app

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: deno-app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: deno-app-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: deno-app
                port:
                  number: 80
```

This Horizontal Pod Autoscaler automatically scales based on CPU and memory usage:

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: deno-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: deno-app
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
```

## Environment Configuration

Managing environment variables securely is critical for production deployments.

This configuration module validates required environment variables at startup and provides type-safe access:

```typescript
// config.ts - Type-safe environment configuration
interface Config {
  port: number;
  environment: "development" | "staging" | "production";
  databaseUrl: string;
  redisUrl: string;
  logLevel: "debug" | "info" | "warn" | "error";
  corsOrigins: string[];
  jwtSecret: string;
  rateLimitRequests: number;
  rateLimitWindow: number;
}

function getEnvOrThrow(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return Deno.env.get(key) || defaultValue;
}

export function loadConfig(): Config {
  const environment = getEnvOrDefault("NODE_ENV", "development") as Config["environment"];
  
  return {
    port: parseInt(getEnvOrDefault("PORT", "8000")),
    environment,
    databaseUrl: getEnvOrThrow("DATABASE_URL"),
    redisUrl: getEnvOrDefault("REDIS_URL", "redis://localhost:6379"),
    logLevel: getEnvOrDefault("LOG_LEVEL", "info") as Config["logLevel"],
    corsOrigins: getEnvOrDefault("CORS_ORIGINS", "*").split(","),
    jwtSecret: getEnvOrThrow("JWT_SECRET"),
    rateLimitRequests: parseInt(getEnvOrDefault("RATE_LIMIT_REQUESTS", "100")),
    rateLimitWindow: parseInt(getEnvOrDefault("RATE_LIMIT_WINDOW", "60000")),
  };
}

// Validate config on import
export const config = loadConfig();
console.log(`Loaded configuration for ${config.environment} environment`);
```

Store secrets in Kubernetes using this Secret manifest:

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: deno-app-secrets
type: Opaque
stringData:
  database-url: "postgresql://user:password@postgres:5432/mydb"
  jwt-secret: "your-super-secret-jwt-key"
  redis-url: "redis://redis:6379"
```

## Logging and Monitoring

Production applications need structured logging and metrics collection.

This logging module provides structured JSON output compatible with log aggregation systems:

```typescript
// logger.ts - Structured logging for production
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: LogLevel;
  private service: string;

  constructor(service: string, minLevel: LogLevel = "info") {
    this.service = service;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...meta,
    };
  }

  private output(entry: LogEntry): void {
    console.log(JSON.stringify(entry));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      this.output(this.formatEntry("debug", message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      this.output(this.formatEntry("info", message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      this.output(this.formatEntry("warn", message, meta));
    }
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      this.output(this.formatEntry("error", message, {
        ...meta,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      }));
    }
  }
}

export const logger = new Logger("deno-app", (Deno.env.get("LOG_LEVEL") as LogLevel) || "info");
```

This metrics endpoint exposes Prometheus-compatible metrics for monitoring:

```typescript
// metrics.ts - Prometheus metrics endpoint
interface Metrics {
  httpRequestsTotal: Map<string, number>;
  httpRequestDuration: number[];
  activeConnections: number;
  errorCount: number;
}

class MetricsCollector {
  private metrics: Metrics = {
    httpRequestsTotal: new Map(),
    httpRequestDuration: [],
    activeConnections: 0,
    errorCount: 0,
  };

  incrementRequest(method: string, path: string, status: number): void {
    const key = `${method}:${path}:${status}`;
    const current = this.metrics.httpRequestsTotal.get(key) || 0;
    this.metrics.httpRequestsTotal.set(key, current + 1);
  }

  recordDuration(duration: number): void {
    this.metrics.httpRequestDuration.push(duration);
    // Keep only last 1000 measurements
    if (this.metrics.httpRequestDuration.length > 1000) {
      this.metrics.httpRequestDuration.shift();
    }
  }

  incrementConnections(): void {
    this.metrics.activeConnections++;
  }

  decrementConnections(): void {
    this.metrics.activeConnections--;
  }

  incrementErrors(): void {
    this.metrics.errorCount++;
  }

  toPrometheus(): string {
    const lines: string[] = [];
    
    // HTTP requests counter
    lines.push("# HELP http_requests_total Total number of HTTP requests");
    lines.push("# TYPE http_requests_total counter");
    for (const [key, value] of this.metrics.httpRequestsTotal) {
      const [method, path, status] = key.split(":");
      lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${value}`);
    }

    // Request duration histogram
    const durations = this.metrics.httpRequestDuration;
    if (durations.length > 0) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const sorted = [...durations].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      lines.push("# HELP http_request_duration_ms HTTP request duration in milliseconds");
      lines.push("# TYPE http_request_duration_ms summary");
      lines.push(`http_request_duration_ms{quantile="0.5"} ${p50}`);
      lines.push(`http_request_duration_ms{quantile="0.95"} ${p95}`);
      lines.push(`http_request_duration_ms{quantile="0.99"} ${p99}`);
      lines.push(`http_request_duration_ms_avg ${avg}`);
    }

    // Active connections gauge
    lines.push("# HELP active_connections Current number of active connections");
    lines.push("# TYPE active_connections gauge");
    lines.push(`active_connections ${this.metrics.activeConnections}`);

    // Error counter
    lines.push("# HELP error_count_total Total number of errors");
    lines.push("# TYPE error_count_total counter");
    lines.push(`error_count_total ${this.metrics.errorCount}`);

    return lines.join("\n");
  }
}

export const metricsCollector = new MetricsCollector();
```

## CI/CD Pipeline

Automate your deployments with a comprehensive CI/CD pipeline.

This GitHub Actions workflow handles testing, building, and deploying to Kubernetes:

```yaml
# .github/workflows/deploy.yaml
name: Deploy Deno Application

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
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Verify formatting
        run: deno fmt --check

      - name: Run linter
        run: deno lint

      - name: Run type check
        run: deno check main.ts

      - name: Run tests
        run: deno test --allow-all --coverage=coverage

      - name: Generate coverage report
        run: deno coverage coverage --lcov --output=coverage.lcov

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: coverage.lcov

  build:
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

      - name: Login to Container Registry
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

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          echo "KUBECONFIG=$(pwd)/kubeconfig" >> $GITHUB_ENV

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/deno-app \
            deno-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --record

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/deno-app --timeout=300s

      - name: Verify deployment
        run: |
          kubectl get pods -l app=deno-app
          kubectl get services -l app=deno-app
```

## SSL/TLS Configuration

Secure your application with proper TLS configuration.

This reverse proxy configuration with NGINX handles SSL termination and proxies requests to the Deno application:

```nginx
# nginx.conf - SSL termination and reverse proxy
upstream deno_backend {
    least_conn;
    server 127.0.0.1:8000 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8001 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8002 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL certificate configuration
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy configuration
    location / {
        proxy_pass http://deno_backend;
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
        proxy_buffering off;
    }

    # Health check endpoint (no caching)
    location /health {
        proxy_pass http://deno_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache off;
        access_log off;
    }
}
```

## Monitoring Architecture

Here is how your monitoring stack should be configured:

```mermaid
flowchart LR
    subgraph Application
        Deno[Deno App]
        Metrics[/metrics endpoint]
    end
    
    subgraph Collection
        Prometheus[Prometheus]
        Loki[Loki]
    end
    
    subgraph Visualization
        Grafana[Grafana]
    end
    
    subgraph Alerting
        AlertManager[AlertManager]
        PagerDuty[PagerDuty]
        Slack[Slack]
    end
    
    Deno --> |logs| Loki
    Deno --> Metrics
    Metrics --> |scrape| Prometheus
    Prometheus --> Grafana
    Loki --> Grafana
    Prometheus --> AlertManager
    AlertManager --> PagerDuty
    AlertManager --> Slack
```

## Best Practices Summary

Following these best practices will ensure your Deno application runs reliably in production:

**Security**
- Always run containers as non-root users
- Use minimal Deno permissions (only request what you need)
- Store secrets in environment variables or secret managers, never in code
- Enable SSL/TLS for all external traffic
- Implement rate limiting to prevent abuse
- Use read-only file systems where possible

**Reliability**
- Implement health check endpoints for both liveness and readiness
- Configure graceful shutdown handlers for SIGTERM signals
- Set appropriate resource limits in containers and pods
- Use rolling deployments with proper update strategies
- Configure pod anti-affinity for high availability

**Observability**
- Use structured JSON logging for easy parsing
- Export Prometheus metrics for monitoring
- Include trace IDs in logs for request correlation
- Set up alerting for critical metrics
- Monitor both application and infrastructure metrics

**Performance**
- Cache dependencies in Docker builds
- Use connection pooling for databases
- Configure horizontal pod autoscaling
- Implement response compression
- Use a CDN for static assets

**Operations**
- Automate deployments with CI/CD pipelines
- Version your container images with git SHA
- Maintain separate configurations for each environment
- Document your deployment process
- Test your disaster recovery procedures

## Conclusion

Deploying Deno applications to production requires careful attention to security, reliability, and observability. By leveraging Docker containers, Kubernetes orchestration, proper health checks, and comprehensive monitoring, you can build robust production systems that scale with your needs.

The permission-based security model in Deno adds an extra layer of protection when properly configured, while the built-in tooling simplifies your CI/CD pipelines. Whether you choose to deploy on bare metal with systemd or in a Kubernetes cluster, the patterns and configurations in this guide provide a solid foundation for your production Deno deployments.

Start with a simple deployment and gradually add complexity as your application grows. Focus on getting the basics right first: health checks, logging, and graceful shutdown. Then expand to include metrics, autoscaling, and advanced monitoring as your operational maturity increases.

With the right infrastructure and practices in place, Deno applications can be just as production-ready as any other runtime, while benefiting from its modern design and security features.
