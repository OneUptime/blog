# How to Run BullMQ Workers in Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Docker, Node.js, Redis, Container, Microservices, DevOps

Description: A comprehensive guide to running BullMQ workers in Docker containers, including Dockerfile optimization, Docker Compose setups, health checks, graceful shutdown handling, and production deployment patterns.

---

Docker containers provide an excellent environment for running BullMQ workers, offering isolation, scalability, and consistent deployments. This guide covers everything from basic Docker setups to production-ready configurations with proper health checks and graceful shutdown handling.

## Basic Dockerfile for BullMQ Workers

Start with a simple Dockerfile for your BullMQ worker:

```dockerfile
# Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build TypeScript (if applicable)
RUN npm run build

# Run as non-root user
USER node

# Start the worker
CMD ["node", "dist/worker.js"]
```

## Optimized Multi-Stage Dockerfile

For production, use a multi-stage build to minimize image size:

```dockerfile
# Dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

# Set environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S bullmq && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G bullmq bullmq

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder --chown=bullmq:bullmq /app/node_modules ./node_modules
COPY --from=builder --chown=bullmq:bullmq /app/dist ./dist
COPY --from=builder --chown=bullmq:bullmq /app/package.json ./

# Switch to non-root user
USER bullmq

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

# Start worker
CMD ["node", "dist/worker.js"]
```

## Worker Application Code

Create a production-ready worker with proper signal handling:

```typescript
// src/worker.ts
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

interface JobData {
  taskId: string;
  payload: Record<string, unknown>;
}

interface JobResult {
  processedAt: string;
  success: boolean;
}

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Create worker
const worker = new Worker<JobData, JobResult>(
  process.env.QUEUE_NAME || 'default',
  async (job: Job<JobData, JobResult>) => {
    console.log(`Processing job ${job.id}: ${job.data.taskId}`);

    // Update progress
    await job.updateProgress(50);

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));

    await job.updateProgress(100);

    return {
      processedAt: new Date().toISOString(),
      success: true,
    };
  },
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
    limiter: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      duration: parseInt(process.env.RATE_LIMIT_DURATION || '1000'),
    },
  }
);

// Event handlers
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('Worker error:', error);
});

// Graceful shutdown
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new jobs
  await worker.pause();
  console.log('Worker paused, waiting for active jobs to complete...');

  // Wait for active jobs with timeout
  const timeout = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000');
  const shutdownPromise = worker.close();

  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => reject(new Error('Shutdown timeout')), timeout);
  });

  try {
    await Promise.race([shutdownPromise, timeoutPromise]);
    console.log('Worker closed gracefully');
  } catch (error) {
    console.error('Forced shutdown after timeout');
  }

  // Close Redis connection
  await connection.quit();
  console.log('Redis connection closed');

  process.exit(0);
}

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log(`Worker started for queue: ${process.env.QUEUE_NAME || 'default'}`);
```

## Health Check Script

Create a health check script for Docker:

```typescript
// src/healthcheck.ts
import { Redis } from 'ioredis';

async function healthCheck(): Promise<void> {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 5000,
  });

  try {
    // Check Redis connectivity
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }

    // Additional checks can be added here
    // - Check worker is processing jobs
    // - Check memory usage
    // - Check error rates

    console.log('Health check passed');
    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error('Health check failed:', error);
    await redis.quit();
    process.exit(1);
  }
}

healthCheck();
```

## Docker Compose Setup

Create a complete development environment with Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: bullmq-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bullmq-network

  worker-email:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bullmq-worker-email
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - QUEUE_NAME=email
      - WORKER_CONCURRENCY=10
      - RATE_LIMIT_MAX=100
      - RATE_LIMIT_DURATION=1000
      - SHUTDOWN_TIMEOUT=30000
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - bullmq-network

  worker-notifications:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bullmq-worker-notifications
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - QUEUE_NAME=notifications
      - WORKER_CONCURRENCY=20
      - RATE_LIMIT_MAX=200
      - RATE_LIMIT_DURATION=1000
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - bullmq-network

  # Bull Board UI for monitoring
  bull-board:
    build:
      context: ./bull-board
      dockerfile: Dockerfile
    container_name: bullmq-dashboard
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - bullmq-network

networks:
  bullmq-network:
    driver: bridge

volumes:
  redis-data:
```

## Scaling Workers with Docker Compose

Scale workers horizontally:

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  worker-email:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - QUEUE_NAME=email
      - WORKER_CONCURRENCY=5
    depends_on:
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

Run with scaling:

```bash
# Scale to 5 worker instances
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale worker-email=5
```

## Production Docker Compose with Monitoring

Add monitoring and logging for production:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: bullmq-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - bullmq-network

  worker:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - QUEUE_NAME=${QUEUE_NAME:-default}
      - WORKER_CONCURRENCY=${WORKER_CONCURRENCY:-5}
      - LOG_LEVEL=info
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: ${WORKER_REPLICAS:-2}
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      update_config:
        parallelism: 1
        delay: 10s
        order: stop-first
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
    healthcheck:
      test: ["CMD", "node", "dist/healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - bullmq-network

  # Redis exporter for Prometheus
  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis-exporter
    environment:
      - REDIS_ADDR=redis:6379
    ports:
      - "9121:9121"
    depends_on:
      - redis
    networks:
      - bullmq-network

  # Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - bullmq-network

  # Grafana for dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    depends_on:
      - prometheus
    networks:
      - bullmq-network

networks:
  bullmq-network:
    driver: bridge

volumes:
  redis-data:
  prometheus-data:
  grafana-data:
```

## Environment-Specific Configuration

Create environment files for different deployments:

```bash
# .env.development
REDIS_HOST=localhost
REDIS_PORT=6379
QUEUE_NAME=default
WORKER_CONCURRENCY=2
WORKER_REPLICAS=1
LOG_LEVEL=debug

# .env.staging
REDIS_HOST=redis-staging.internal
REDIS_PORT=6379
REDIS_PASSWORD=staging-password
QUEUE_NAME=default
WORKER_CONCURRENCY=5
WORKER_REPLICAS=2
LOG_LEVEL=info

# .env.production
REDIS_HOST=redis-production.internal
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
QUEUE_NAME=default
WORKER_CONCURRENCY=10
WORKER_REPLICAS=5
LOG_LEVEL=warn
```

Run with specific environment:

```bash
docker-compose --env-file .env.production -f docker-compose.prod.yml up -d
```

## Advanced Worker with Metrics

Add Prometheus metrics to your worker:

```typescript
// src/worker-with-metrics.ts
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import express from 'express';

// Create metrics registry
const register = new Registry();
collectDefaultMetrics({ register });

// Custom metrics
const jobsProcessed = new Counter({
  name: 'bullmq_jobs_processed_total',
  help: 'Total number of jobs processed',
  labelNames: ['queue', 'status'],
  registers: [register],
});

const jobDuration = new Histogram({
  name: 'bullmq_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

const activeJobs = new Gauge({
  name: 'bullmq_active_jobs',
  help: 'Number of currently active jobs',
  labelNames: ['queue'],
  registers: [register],
});

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const queueName = process.env.QUEUE_NAME || 'default';

// Create worker
const worker = new Worker(
  queueName,
  async (job: Job) => {
    const startTime = Date.now();
    activeJobs.inc({ queue: queueName });

    try {
      // Process job
      await job.updateProgress(50);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await job.updateProgress(100);

      return { success: true };
    } finally {
      activeJobs.dec({ queue: queueName });
      jobDuration.observe(
        { queue: queueName },
        (Date.now() - startTime) / 1000
      );
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
  }
);

// Event handlers with metrics
worker.on('completed', () => {
  jobsProcessed.inc({ queue: queueName, status: 'completed' });
});

worker.on('failed', () => {
  jobsProcessed.inc({ queue: queueName, status: 'failed' });
});

// Metrics server
const app = express();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const metricsPort = parseInt(process.env.METRICS_PORT || '9090');
app.listen(metricsPort, () => {
  console.log(`Metrics server running on port ${metricsPort}`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Shutting down...`);
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log(`Worker started for queue: ${queueName}`);
```

## Docker Build Optimization Tips

1. **Use .dockerignore** to exclude unnecessary files:

```
# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
.env*
*.md
tests
coverage
.nyc_output
```

2. **Cache dependencies** by copying package files first:

```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
```

3. **Use specific base image tags** instead of `latest`:

```dockerfile
FROM node:20.10-alpine3.18
```

4. **Minimize layers** by combining commands:

```dockerfile
RUN npm ci && npm run build && npm prune --production
```

## Best Practices

1. **Always handle SIGTERM** - Docker sends SIGTERM before SIGKILL. Use graceful shutdown to complete in-progress jobs.

2. **Use health checks** - Docker health checks help orchestrators know when workers are ready.

3. **Run as non-root** - Use a non-root user for security.

4. **Set resource limits** - Prevent runaway workers from consuming all resources.

5. **Use restart policies** - Configure automatic restarts for transient failures.

6. **Externalize configuration** - Use environment variables for all configuration.

7. **Implement proper logging** - Use structured logging with log levels.

8. **Monitor with metrics** - Export Prometheus metrics for observability.

9. **Use multi-stage builds** - Minimize production image size.

10. **Test locally with Compose** - Mirror production setup in development.

## Conclusion

Running BullMQ workers in Docker provides a consistent and scalable deployment model. With proper Dockerfile optimization, health checks, graceful shutdown handling, and monitoring, you can build production-ready containerized job processing systems. Docker Compose simplifies local development and testing, while the same patterns apply when deploying to container orchestrators like Kubernetes.
