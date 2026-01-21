# How to Deploy BullMQ Workers on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Kubernetes, Node.js, Redis, HPA, Autoscaling, DevOps, Cloud Native

Description: A comprehensive guide to deploying BullMQ workers on Kubernetes with horizontal pod autoscaling, graceful shutdown, health probes, and production-ready configurations for reliable job processing at scale.

---

Kubernetes provides an excellent platform for running BullMQ workers at scale. With features like horizontal pod autoscaling, rolling updates, and self-healing, Kubernetes ensures your job processing system remains reliable and responsive. This guide covers everything from basic deployments to production-ready configurations.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (local with minikube/kind or cloud-based)
- kubectl configured to access your cluster
- Docker for building images
- Redis deployed on Kubernetes or accessible externally

## Worker Application Setup

First, create a worker application with proper Kubernetes compatibility:

```typescript
// src/worker.ts
import { Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import express from 'express';

// Configuration from environment
const config = {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  queue: {
    name: process.env.QUEUE_NAME || 'default',
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
  },
  server: {
    port: parseInt(process.env.HEALTH_PORT || '8080'),
  },
  shutdown: {
    timeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '30000'),
  },
};

// Redis connection
const connection = new Redis({
  ...config.redis,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

// Worker state
let isReady = false;
let isShuttingDown = false;
let activeJobs = 0;

// Create worker
const worker = new Worker(
  config.queue.name,
  async (job: Job) => {
    activeJobs++;
    try {
      console.log(`Processing job ${job.id}`);
      await job.updateProgress(50);

      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 1000));

      await job.updateProgress(100);
      return { success: true, processedAt: new Date().toISOString() };
    } finally {
      activeJobs--;
    }
  },
  {
    connection,
    concurrency: config.queue.concurrency,
  }
);

// Event handlers
worker.on('ready', () => {
  isReady = true;
  console.log('Worker is ready');
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('Worker error:', error);
});

// Health and metrics server
const app = express();

// Liveness probe - is the process running?
app.get('/health/live', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting_down' });
  }
  res.json({ status: 'alive' });
});

// Readiness probe - can the worker accept jobs?
app.get('/health/ready', async (req, res) => {
  if (!isReady || isShuttingDown) {
    return res.status(503).json({
      status: 'not_ready',
      isReady,
      isShuttingDown,
    });
  }

  // Check Redis connectivity
  try {
    await connection.ping();
    res.json({ status: 'ready', activeJobs });
  } catch (error) {
    res.status(503).json({
      status: 'redis_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Startup probe - has the worker started?
app.get('/health/startup', (req, res) => {
  if (isReady) {
    res.json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});

// Metrics endpoint for custom metrics
app.get('/metrics', async (req, res) => {
  try {
    const queue = worker.queue;
    const counts = await queue?.getJobCounts();

    res.json({
      queue: config.queue.name,
      activeJobs,
      concurrency: config.queue.concurrency,
      counts,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

app.listen(config.server.port, () => {
  console.log(`Health server running on port ${config.server.port}`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  isReady = false;

  console.log(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new jobs immediately
  await worker.pause();
  console.log('Worker paused');

  // Wait for active jobs to complete with timeout
  const startTime = Date.now();
  while (activeJobs > 0 && Date.now() - startTime < config.shutdown.timeout) {
    console.log(`Waiting for ${activeJobs} active jobs to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (activeJobs > 0) {
    console.warn(`Forcing shutdown with ${activeJobs} jobs still active`);
  }

  // Close worker and connection
  await worker.close();
  await connection.quit();

  console.log('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log(`Starting worker for queue: ${config.queue.name}`);
```

## Dockerfile for Kubernetes

Create a production-ready Dockerfile:

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --production

FROM node:20-alpine

ENV NODE_ENV=production

RUN addgroup -g 1001 -S worker && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G worker worker

WORKDIR /app

COPY --from=builder --chown=worker:worker /app/node_modules ./node_modules
COPY --from=builder --chown=worker:worker /app/dist ./dist
COPY --from=builder --chown=worker:worker /app/package.json ./

USER worker

EXPOSE 8080

CMD ["node", "dist/worker.js"]
```

## Kubernetes Deployment

Create a Deployment for your workers:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bullmq-worker
  labels:
    app: bullmq-worker
    component: worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bullmq-worker
  template:
    metadata:
      labels:
        app: bullmq-worker
        component: worker
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: worker
          image: your-registry/bullmq-worker:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 8080
              name: health
          env:
            - name: NODE_ENV
              value: "production"
            - name: REDIS_HOST
              valueFrom:
                configMapKeyRef:
                  name: bullmq-config
                  key: redis-host
            - name: REDIS_PORT
              valueFrom:
                configMapKeyRef:
                  name: bullmq-config
                  key: redis-port
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: bullmq-secrets
                  key: redis-password
            - name: QUEUE_NAME
              valueFrom:
                configMapKeyRef:
                  name: bullmq-config
                  key: queue-name
            - name: WORKER_CONCURRENCY
              value: "5"
            - name: SHUTDOWN_TIMEOUT
              value: "45000"
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health/live
              port: health
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: health
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /health/startup
              port: health
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 30
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: bullmq-worker
                topologyKey: kubernetes.io/hostname
```

## ConfigMap and Secrets

Create configuration and secrets:

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bullmq-config
data:
  redis-host: "redis-master.redis.svc.cluster.local"
  redis-port: "6379"
  queue-name: "default"
---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bullmq-secrets
type: Opaque
stringData:
  redis-password: "your-redis-password"
```

## Horizontal Pod Autoscaler

Set up autoscaling based on CPU or custom metrics:

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bullmq-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bullmq-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
    # Scale based on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    # Scale based on memory utilization
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
        - type: Pods
          value: 1
          periodSeconds: 60
      selectPolicy: Min
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

## Custom Metrics Autoscaling with KEDA

For queue-depth-based autoscaling, use KEDA:

```yaml
# k8s/keda-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: bullmq-worker-scaledobject
spec:
  scaleTargetRef:
    name: bullmq-worker
  pollingInterval: 15
  cooldownPeriod: 300
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
    - type: redis
      metadata:
        address: redis-master.redis.svc.cluster.local:6379
        listName: "bull:default:wait"
        listLength: "10"
        activationListLength: "1"
      authenticationRef:
        name: redis-auth
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: redis-auth
spec:
  secretTargetRef:
    - parameter: password
      name: bullmq-secrets
      key: redis-password
```

## Pod Disruption Budget

Ensure availability during cluster operations:

```yaml
# k8s/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: bullmq-worker-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: bullmq-worker
```

## Service for Metrics

Expose metrics for Prometheus scraping:

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: bullmq-worker
  labels:
    app: bullmq-worker
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
spec:
  selector:
    app: bullmq-worker
  ports:
    - name: health
      port: 8080
      targetPort: 8080
  type: ClusterIP
```

## ServiceMonitor for Prometheus Operator

If using Prometheus Operator:

```yaml
# k8s/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bullmq-worker
  labels:
    app: bullmq-worker
spec:
  selector:
    matchLabels:
      app: bullmq-worker
  endpoints:
    - port: health
      path: /metrics
      interval: 30s
```

## Multiple Queue Workers

Deploy workers for different queues:

```yaml
# k8s/deployment-multi-queue.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bullmq-worker-email
  labels:
    app: bullmq-worker
    queue: email
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bullmq-worker
      queue: email
  template:
    metadata:
      labels:
        app: bullmq-worker
        queue: email
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: worker
          image: your-registry/bullmq-worker:latest
          env:
            - name: QUEUE_NAME
              value: "email"
            - name: WORKER_CONCURRENCY
              value: "10"
          # ... rest of container spec
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bullmq-worker-notifications
  labels:
    app: bullmq-worker
    queue: notifications
spec:
  replicas: 5
  selector:
    matchLabels:
      app: bullmq-worker
      queue: notifications
  template:
    metadata:
      labels:
        app: bullmq-worker
        queue: notifications
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: worker
          image: your-registry/bullmq-worker:latest
          env:
            - name: QUEUE_NAME
              value: "notifications"
            - name: WORKER_CONCURRENCY
              value: "20"
          # ... rest of container spec
```

## Helm Chart Structure

Organize your Kubernetes manifests with Helm:

```
bullmq-worker/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml
    configmap.yaml
    secret.yaml
    hpa.yaml
    pdb.yaml
    service.yaml
    servicemonitor.yaml
```

`values.yaml`:

```yaml
replicaCount: 3

image:
  repository: your-registry/bullmq-worker
  tag: latest
  pullPolicy: Always

queue:
  name: default
  concurrency: 5

redis:
  host: redis-master.redis.svc.cluster.local
  port: 6379
  password: ""

resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 20
  targetCPUUtilization: 70

pdb:
  enabled: true
  minAvailable: 2

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
```

## Deployment Commands

Deploy your workers:

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or use Helm
helm install bullmq-worker ./bullmq-worker -f values.yaml

# Scale manually
kubectl scale deployment bullmq-worker --replicas=5

# Check rollout status
kubectl rollout status deployment/bullmq-worker

# View logs
kubectl logs -l app=bullmq-worker -f

# Check HPA status
kubectl get hpa bullmq-worker-hpa
```

## Best Practices

1. **Set terminationGracePeriodSeconds** - Give workers enough time to complete in-progress jobs.

2. **Use all three probe types** - Liveness, readiness, and startup probes ensure proper lifecycle management.

3. **Configure preStop hook** - Add a small delay to allow load balancers to drain connections.

4. **Use Pod Anti-Affinity** - Spread workers across nodes for high availability.

5. **Set resource requests and limits** - Ensure predictable scheduling and prevent resource exhaustion.

6. **Use PodDisruptionBudget** - Maintain availability during cluster maintenance.

7. **Implement queue-based autoscaling** - Use KEDA for scaling based on queue depth.

8. **Configure proper shutdown timeout** - Match terminationGracePeriodSeconds with your shutdown timeout.

9. **Use rolling updates** - Configure deployment strategy for zero-downtime updates.

10. **Monitor with Prometheus** - Export metrics and set up alerts for queue depth and processing times.

## Conclusion

Deploying BullMQ workers on Kubernetes provides a robust platform for job processing at scale. With proper configuration of health probes, graceful shutdown, autoscaling, and monitoring, you can build a resilient system that handles varying workloads while maintaining high availability. The combination of Kubernetes' orchestration capabilities and BullMQ's reliable job processing creates a powerful foundation for background job systems.
