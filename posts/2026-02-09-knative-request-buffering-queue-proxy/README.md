# How to Implement Request Buffering and Queue Proxy Tuning in Knative Serving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Performance, Serverless, Queue-Proxy

Description: Optimize Knative Serving performance by tuning queue proxy settings, implementing request buffering, and configuring concurrency limits for efficient serverless request handling.

---

The queue proxy is a critical component in Knative Serving that sits between the Activator and your application container. It manages request buffering, concurrency limits, and health checks while providing metrics for autoscaling decisions. Proper queue proxy configuration can dramatically improve your application's performance and resource efficiency. This guide shows you how to optimize these settings.

## Understanding the Queue Proxy Architecture

Every Knative Service pod includes a queue proxy sidecar container. This proxy intercepts all incoming requests before they reach your application. It tracks concurrent requests, buffers excess load, and reports metrics to the autoscaler.

When traffic arrives at a cold service, the Activator buffers requests while pods spin up. Once pods are ready, the queue proxy takes over buffering. This handoff ensures smooth transitions during scaling operations.

The queue proxy implements several key functions. It enforces container concurrency limits to prevent overload. It buffers requests when all available connections are busy. It performs health checks to ensure pods are ready for traffic. It collects detailed metrics about request latency and throughput.

## Configuring Container Concurrency

Container concurrency determines how many simultaneous requests a single pod can handle:

```yaml
# concurrency-config.yaml

apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api-service
spec:
  template:
    metadata:
      annotations:
        # Soft limit - autoscaler target concurrent requests per pod
        autoscaling.knative.dev/metric: "concurrency"
        autoscaling.knative.dev/target: "10"

    spec:
      # Hard limit - requests beyond this are buffered
      containerConcurrency: 10

      containers:
      - image: your-registry/api-service:latest
        resources:
          requests:
            cpu: 1000m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 1Gi
```

The difference between soft and hard limits is important:

```yaml
# soft-vs-hard-limits.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: flexible-service
spec:
  template:
    metadata:
      annotations:
        # Soft limit - autoscaler targets this value
        # Allows temporary bursts above this
        autoscaling.knative.dev/metric: "concurrency"
        autoscaling.knative.dev/target: "10"
    spec:
      containers:
      - image: your-registry/app:latest
        env:
        # Your app can handle more during bursts
        - name: MAX_CONNECTIONS
          value: "15"
---
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: strict-service
spec:
  template:
    spec:
      # Hard limit - strictly enforced
      # Requests beyond this wait in queue
      containerConcurrency: 10

      containers:
      - image: your-registry/app:latest
        env:
        # Your app can only handle exactly this many
        - name: MAX_CONNECTIONS
          value: "10"
```

## Tuning Queue Proxy Resource Allocation

The queue proxy itself needs resources. Configure them based on your traffic patterns:

```yaml
# queue-proxy-resources.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: high-traffic-service
spec:
  template:
    metadata:
      annotations:
        # Queue proxy resource limits
        queue.sidecar.serving.knative.dev/cpu-resource-limit: "200m"
        queue.sidecar.serving.knative.dev/memory-resource-limit: "128Mi"

        # Queue proxy CPU request
        queue.sidecar.serving.knative.dev/cpu-resource-request: "100m"

        # Queue proxy memory request
        queue.sidecar.serving.knative.dev/memory-resource-request: "64Mi"

        # Keep the Activator in path for burst buffering when spare capacity is low
        autoscaling.knative.dev/target-burst-capacity: "1000"

    spec:
      containerConcurrency: 50

      containers:
      - image: your-registry/high-traffic:latest
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
```

For very high throughput services:

```yaml
# high-throughput-queue.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: stream-processor
spec:
  template:
    metadata:
      annotations:
        # Allocate more resources to queue proxy
        queue.sidecar.serving.knative.dev/cpu-resource-request: "200m"
        queue.sidecar.serving.knative.dev/cpu-resource-limit: "500m"
        queue.sidecar.serving.knative.dev/memory-resource-request: "128Mi"
        queue.sidecar.serving.knative.dev/memory-resource-limit: "256Mi"

        # Larger Activator burst capacity
        autoscaling.knative.dev/target-burst-capacity: "5000"

    spec:
      containerConcurrency: 100
      timeoutSeconds: 300

      containers:
      - image: your-registry/stream-processor:latest
```

## Implementing Efficient Request Buffering

Configure buffering to handle traffic bursts without scaling too aggressively:

```yaml
# buffering-strategy.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: burst-handler
spec:
  template:
    metadata:
      annotations:
        # Target concurrency for autoscaling
        autoscaling.knative.dev/target: "20"

        # Percentage of target before panic mode
        autoscaling.knative.dev/target-utilization-percentage: "70"

        # Activator burst capacity before requests are throttled
        autoscaling.knative.dev/target-burst-capacity: "1000"

        # Stable window for autoscaling decisions
        autoscaling.knative.dev/window: "60s"

    spec:
      containerConcurrency: 20

      containers:
      - image: your-registry/burst-handler:latest
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
```

Build an application that works well with buffering:

```javascript
// burst-handler/server.js
const express = require('express');
const app = express();

app.use(express.json());

// Track current load
let activeRequests = 0;
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '20');

// Middleware to track concurrency
app.use((req, res, next) => {
  activeRequests++;

  res.on('finish', () => {
    activeRequests--;
  });

  // Log when approaching limits
  if (activeRequests > MAX_CONCURRENT * 0.8) {
    console.log(`High load: ${activeRequests}/${MAX_CONCURRENT} concurrent requests`);
  }

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthy = activeRequests < MAX_CONCURRENT;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'overloaded',
    activeRequests: activeRequests,
    maxConcurrent: MAX_CONCURRENT,
    utilization: (activeRequests / MAX_CONCURRENT * 100).toFixed(2) + '%'
  });
});

// Main API endpoint
app.post('/process', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || 'unknown';

  console.log(`[${requestId}] Processing request (${activeRequests} active)`);

  try {
    // Simulate processing
    await processRequest(req.body);

    const duration = Date.now() - startTime;

    res.json({
      status: 'success',
      requestId: requestId,
      processingTime: duration,
      queuedRequests: activeRequests
    });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error.message);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

async function processRequest(data) {
  // Your business logic
  await new Promise(resolve => setTimeout(resolve, 100));
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Max concurrent requests: ${MAX_CONCURRENT}`);
});
```

## Optimizing for Different Traffic Patterns

Configure services based on their traffic characteristics:

```yaml
# traffic-patterns.yaml
---
# Steady, predictable traffic
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: steady-api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/target: "50"
        autoscaling.knative.dev/window: "120s"  # Longer window
        autoscaling.knative.dev/target-burst-capacity: "500"
    spec:
      containerConcurrency: 50
      containers:
      - image: your-registry/steady-api:latest
---
# Bursty, unpredictable traffic
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: bursty-api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/target: "20"
        autoscaling.knative.dev/window: "30s"  # Shorter window
        autoscaling.knative.dev/panic-window-percentage: "20"
        autoscaling.knative.dev/target-burst-capacity: "2000"  # Larger burst capacity
    spec:
      containerConcurrency: 20
      containers:
      - image: your-registry/bursty-api:latest
---
# Long-running requests
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: batch-processor
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/target: "5"  # Low concurrency
        autoscaling.knative.dev/target-burst-capacity: "100"
    spec:
      containerConcurrency: 5
      timeoutSeconds: 600
      containers:
      - image: your-registry/batch-processor:latest
```

## Monitoring Queue Proxy Performance

Track queue proxy metrics to identify bottlenecks:

```bash
# View queue proxy metrics
POD=$(kubectl get pod -l serving.knative.dev/service=api-service \
  -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward pod/$POD 9090:9090

# Query key metrics
curl http://localhost:9090/metrics | grep 'kn_serving_queue'

# Important metrics:
# - kn_serving_queue_depth
# - kn_serving_invocation_duration_seconds_bucket
# - http_server_request_duration_seconds_bucket
# - http_client_request_duration_seconds_bucket
```

Create Prometheus queries for monitoring:

```promql
# Current queue depth
kn_serving_queue_depth{
  k8s_namespace_name="default",
  kn_service_name="api-service"
}

# P95 invocation duration
histogram_quantile(0.95,
  rate(kn_serving_invocation_duration_seconds_bucket[5m])
)

# Queue proxy CPU usage
container_cpu_usage_seconds_total{
  container="queue-proxy",
  namespace="default"
}

# Percentage of time queue is full
(
  sum(kn_serving_queue_depth{kn_service_name="api-service"})
  /
  sum(kn_revision_concurrency_target{kn_service_name="api-service"})
) > 0.8
```

Set up alerts for queue issues:

```yaml
# queue-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: queue-proxy-alerts
spec:
  groups:
  - name: queue-proxy
    interval: 30s
    rules:
    - alert: HighQueueDepth
      expr: kn_serving_queue_depth > 500
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High queue depth detected"
        description: "Service {{ $labels.service }} has {{ $value }} requests queued"

    - alert: SlowInvocationLatency
      expr: |
        histogram_quantile(0.95,
          rate(kn_serving_invocation_duration_seconds_bucket[5m])
        ) > 1.0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Slow request processing"
        description: "P95 invocation duration is {{ $value }}s"
```

## Advanced Configuration Patterns

Implement sophisticated queue proxy configurations:

```yaml
# advanced-queue-config.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: optimized-service
spec:
  template:
    metadata:
      annotations:
        # Autoscaling configuration
        autoscaling.knative.dev/target: "30"
        autoscaling.knative.dev/metric: "concurrency"
        autoscaling.knative.dev/target-utilization-percentage: "70"
        autoscaling.knative.dev/window: "60s"
        autoscaling.knative.dev/panic-window-percentage: "10"
        autoscaling.knative.dev/panic-threshold-percentage: "200"
        autoscaling.knative.dev/target-burst-capacity: "1500"

        # Queue proxy tuning
        queue.sidecar.serving.knative.dev/cpu-resource-request: "150m"
        queue.sidecar.serving.knative.dev/cpu-resource-limit: "500m"
        queue.sidecar.serving.knative.dev/memory-resource-request: "96Mi"
        queue.sidecar.serving.knative.dev/memory-resource-limit: "256Mi"

    spec:
      containerConcurrency: 30
      timeoutSeconds: 180
      responseStartTimeoutSeconds: 30
      idleTimeoutSeconds: 60

      containers:
      - image: your-registry/optimized-service:latest
        ports:
        - name: http1
          containerPort: 8080
        env:
        - name: MAX_CONCURRENT
          value: "30"
        resources:
          requests:
            cpu: 600m
            memory: 384Mi
          limits:
            cpu: 1200m
            memory: 768Mi

        # Application-level health checks
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3

        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 2
          periodSeconds: 3
          timeoutSeconds: 2
          successThreshold: 1
          failureThreshold: 3
```

## Best Practices

Match concurrency to your application's capabilities. Test under load to find the optimal containerConcurrency value. Too high causes crashes, too low wastes resources.

Use target burst capacity appropriately. Larger values keep the Activator in the request path for more burst scenarios, which can smooth traffic spikes while adding another hop. The queue proxy's per-pod pending queue is derived from containerConcurrency rather than a separate Service annotation.

Monitor queue depth consistently. High sustained queue depth indicates undersized deployments. Frequent queue overflow suggests insufficient buffering or too-aggressive autoscaling.

Configure reasonable timeouts. Set timeouts that match your actual request processing time plus a buffer. Too short causes premature failures, too long delays error detection.

Allocate sufficient queue proxy resources. The queue proxy needs CPU and memory to handle high throughput. Don't starve it while overprovisioning your main container.

Test scaling behavior under load. Use load testing tools to verify your configuration handles traffic spikes gracefully without dropping requests or causing cascading failures.

## Conclusion

Queue proxy tuning is essential for optimal Knative Serving performance. By properly configuring concurrency limits, Activator burst capacity, and resource allocation, you can build serverless services that handle variable load efficiently while maintaining low latency. The queue proxy's ability to enforce concurrency and queue excess requests while the autoscaler provisions additional capacity enables smooth scaling transitions. Combined with appropriate health checks and monitoring, these configurations ensure your serverless applications deliver consistent performance under real-world traffic conditions.
