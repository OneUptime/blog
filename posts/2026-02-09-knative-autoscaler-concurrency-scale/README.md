# How to Configure Knative Serving Autoscaler with Custom Concurrency and Scale Bounds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Knative, Autoscaling

Description: Fine-tune Knative Serving autoscaler with custom concurrency targets, scale bounds, and metrics for optimal serverless application performance and cost efficiency.

---

Knative Serving's autoscaler automatically adjusts the number of pods serving your application based on incoming request load. Understanding how to configure concurrency targets, scale bounds, and scaling metrics helps optimize performance and costs. This guide covers advanced autoscaling configuration for production serverless workloads on Kubernetes.

## Understanding Knative Autoscaling

Knative uses two autoscaling metrics: concurrency and requests-per-second (RPS). Concurrency measures the number of simultaneous requests a pod handles. RPS measures the rate of incoming requests. The autoscaler continuously monitors these metrics and adjusts replica counts to maintain targets.

The autoscaler operates in two modes. Knative Pod Autoscaler (KPA) scales based on request metrics and supports scale-to-zero. Horizontal Pod Autoscaler (HPA) uses CPU and memory metrics but doesn't support scale-to-zero. Most serverless workloads use KPA for its scale-to-zero capability.

## Configuring Basic Autoscaling

Start with a simple service and add autoscaling configuration:

```yaml
# basic-autoscaling.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello
  namespace: default
spec:
  template:
    metadata:
      annotations:
        # Use Knative Pod Autoscaler
        autoscaling.knative.dev/class: "kpa.autoscaling.knative.dev"

        # Target concurrency per pod
        autoscaling.knative.dev/target: "10"

        # Minimum pods (0 for scale-to-zero)
        autoscaling.knative.dev/min-scale: "1"

        # Maximum pods
        autoscaling.knative.dev/max-scale: "10"

    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

Deploy and test:

```bash
kubectl apply -f basic-autoscaling.yaml

# Generate load to trigger scaling
hey -z 60s -c 50 $(kubectl get ksvc hello -o jsonpath='{.status.url}')

# Watch scaling
watch kubectl get pods -l serving.knative.dev/service=hello
```

## Configuring Concurrency-Based Scaling

Fine-tune concurrency settings:

```yaml
# concurrency-scaling.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api-service
  namespace: default
spec:
  template:
    metadata:
      annotations:
        # Target concurrent requests per pod
        autoscaling.knative.dev/target: "100"

        # Target utilization percentage (0.7 = 70%)
        autoscaling.knative.dev/target-utilization-percentage: "70"

        # Hard limit of concurrent requests per pod
        # Requests beyond this are queued or rejected
        autoscaling.knative.dev/container-concurrency: "150"

    spec:
      # Soft limit - recommended concurrent requests
      containerConcurrency: 100

      containers:
      - image: your-registry/api-service:latest
        ports:
        - containerPort: 8080
```

The relationship between these settings:

- `target` - Desired average concurrent requests per pod
- `target-utilization-percentage` - Scale when utilization exceeds this percentage
- `containerConcurrency` (soft limit) - Recommendation, can be exceeded temporarily
- `container-concurrency` (hard limit) - Absolute maximum, enforced by Knative

## Configuring RPS-Based Scaling

Use RPS metric for scaling:

```yaml
# rps-scaling.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: web-service
  namespace: default
spec:
  template:
    metadata:
      annotations:
        # Use RPS metric instead of concurrency
        autoscaling.knative.dev/metric: "rps"

        # Target requests per second per pod
        autoscaling.knative.dev/target: "100"

        # Scale up/down behavior
        autoscaling.knative.dev/scale-up-rate: "2.0"
        autoscaling.knative.dev/scale-down-rate: "2.0"

        # Minimum scale (prevent cold starts)
        autoscaling.knative.dev/min-scale: "2"
        autoscaling.knative.dev/max-scale: "20"

    spec:
      containers:
      - image: your-registry/web-service:latest
```

## Configuring Scale-to-Zero

Control scale-to-zero behavior:

```yaml
# scale-to-zero.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: occasional-service
  namespace: default
spec:
  template:
    metadata:
      annotations:
        # Enable scale-to-zero
        autoscaling.knative.dev/min-scale: "0"

        # Time window with no traffic before scaling to zero
        autoscaling.knative.dev/scale-to-zero-pod-retention-period: "5m"

        # Target for scaling decisions
        autoscaling.knative.dev/target: "10"

    spec:
      # Reduce cold start time
      containers:
      - image: your-registry/fast-starting-app:latest
        ports:
        - containerPort: 8080

        # Quick readiness check
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 1
          periodSeconds: 1
```

Global scale-to-zero configuration:

```yaml
# config-autoscaler.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-autoscaler
  namespace: knative-serving
data:
  # Scale to zero after 30 seconds of no traffic
  scale-to-zero-grace-period: "30s"

  # Keep pod running for at least this long after last request
  scale-to-zero-pod-retention-period: "5m"

  # Stable window for making scaling decisions
  stable-window: "60s"

  # Panic window for rapid scale-up
  panic-window-percentage: "10.0"

  # Enable scale-to-zero
  enable-scale-to-zero: "true"
```

## Configuring Burst Capacity

Handle traffic spikes:

```yaml
# burst-capacity.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: bursty-service
  namespace: default
spec:
  template:
    metadata:
      annotations:
        # Normal scaling target
        autoscaling.knative.dev/target: "100"

        # Minimum always-on pods for burst handling
        autoscaling.knative.dev/min-scale: "3"

        # Maximum pods during bursts
        autoscaling.knative.dev/max-scale: "50"

        # Initial scale for new revisions
        autoscaling.knative.dev/initial-scale: "5"

        # Aggressive scale-up during panic mode
        autoscaling.knative.dev/panic-window-percentage: "10.0"
        autoscaling.knative.dev/panic-threshold-percentage: "200.0"

    spec:
      # Allow high concurrency during bursts
      containerConcurrency: 200

      containers:
      - image: your-registry/bursty-service:latest
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
```

## Configuring Custom Metrics

Use custom metrics for scaling:

```yaml
# custom-metric-scaling.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: queue-processor
  namespace: default
spec:
  template:
    metadata:
      annotations:
        # Use custom metric
        autoscaling.knative.dev/class: "hpa.autoscaling.knative.dev"
        autoscaling.knative.dev/metric: "cpu"

        # Target CPU utilization
        autoscaling.knative.dev/target: "70"

        # Scale bounds
        autoscaling.knative.dev/min-scale: "2"
        autoscaling.knative.dev/max-scale: "10"

    spec:
      containers:
      - image: your-registry/queue-processor:latest
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

## Implementing Progressive Rollout with Autoscaling

Combine traffic splitting with autoscaling:

```yaml
# progressive-rollout.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api
  namespace: default
spec:
  traffic:
  # Current version - 80% traffic
  - revisionName: api-v1
    percent: 80
    tag: stable

  # New version - 20% traffic
  - revisionName: api-v2
    percent: 20
    tag: canary

  template:
    metadata:
      name: api-v2
      annotations:
        # Conservative scaling for canary
        autoscaling.knative.dev/min-scale: "1"
        autoscaling.knative.dev/max-scale: "3"
        autoscaling.knative.dev/target: "50"

    spec:
      containers:
      - image: your-registry/api:v2
```

## Monitoring Autoscaling Behavior

Track autoscaling metrics:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: knative-serving-metrics
  namespace: knative-serving
spec:
  selector:
    matchLabels:
      app: autoscaler
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics to monitor:

- `autoscaler_desired_pods` - Target replica count
- `autoscaler_actual_pods` - Current replica count
- `autoscaler_panic_mode` - Whether in panic mode
- `revision_app_request_count` - Request rate
- `revision_app_request_latencies` - Request latency

Create alerts for autoscaling issues:

```yaml
# autoscaling-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: knative-autoscaling-alerts
  namespace: knative-serving
spec:
  groups:
  - name: autoscaling
    interval: 30s
    rules:
    - alert: AutoscalerAtMaxScale
      expr: autoscaler_actual_pods >= autoscaler_max_pods
      for: 5m
      annotations:
        summary: "Service at maximum scale"
        description: "{{ $labels.service }} has been at max scale for 5 minutes"

    - alert: FrequentScaling
      expr: rate(autoscaler_desired_pods[5m]) > 0.5
      for: 10m
      annotations:
        summary: "Frequent scaling activity"
        description: "{{ $labels.service }} is scaling frequently"

    - alert: PanicModeActive
      expr: autoscaler_panic_mode == 1
      for: 5m
      annotations:
        summary: "Autoscaler in panic mode"
        description: "{{ $labels.service }} autoscaler is in panic mode"
```

## Tuning for Different Workload Patterns

Configure for CPU-intensive workloads:

```yaml
# cpu-intensive.yaml
spec:
  template:
    metadata:
      annotations:
        # Lower concurrency for CPU-heavy tasks
        autoscaling.knative.dev/target: "5"
        autoscaling.knative.dev/container-concurrency: "10"
        autoscaling.knative.dev/min-scale: "2"
        autoscaling.knative.dev/max-scale: "20"
```

Configure for I/O-intensive workloads:

```yaml
# io-intensive.yaml
spec:
  template:
    metadata:
      annotations:
        # Higher concurrency for I/O-bound tasks
        autoscaling.knative.dev/target: "200"
        autoscaling.knative.dev/container-concurrency: "500"
        autoscaling.knative.dev/min-scale: "1"
        autoscaling.knative.dev/max-scale: "10"
```

Configure for long-running requests:

```yaml
# long-running.yaml
spec:
  template:
    metadata:
      annotations:
        # Low concurrency for long requests
        autoscaling.knative.dev/target: "1"
        autoscaling.knative.dev/container-concurrency: "1"
        autoscaling.knative.dev/min-scale: "3"
        autoscaling.knative.dev/max-scale: "10"

        # Longer stable window
        autoscaling.knative.dev/window: "120s"
    spec:
      timeoutSeconds: 600  # 10-minute timeout
```

## Testing Autoscaling Configuration

Create a load test:

```bash
#!/bin/bash
# load-test.sh

SERVICE_URL=$(kubectl get ksvc api-service -o jsonpath='{.status.url}')

echo "Starting load test..."
echo "Service URL: $SERVICE_URL"

# Gradual ramp-up
for concurrency in 10 50 100 200 500; do
  echo "Testing with concurrency: $concurrency"

  hey -z 60s -c $concurrency $SERVICE_URL

  # Watch scaling
  kubectl get pods -l serving.knative.dev/service=api-service

  # Cool down
  sleep 30
done

echo "Load test complete"
```

Monitor during testing:

```bash
# Watch pod count
watch -n 2 'kubectl get pods -l serving.knative.dev/service=api-service | grep Running | wc -l'

# Watch autoscaler metrics
kubectl port-forward -n knative-serving svc/autoscaler 9090:9090 &
curl http://localhost:9090/metrics | grep autoscaler_desired_pods
```

## Best Practices

Follow these guidelines:

1. **Start with defaults** - Tune based on observed behavior
2. **Match concurrency to workload** - CPU-intensive needs lower values
3. **Set appropriate minimums** - Balance cold starts vs. cost
4. **Configure reasonable maximums** - Prevent resource exhaustion
5. **Use RPS for predictable loads** - Concurrency for variable request times
6. **Test scaling thoroughly** - Validate before production
7. **Monitor continuously** - Adjust based on real metrics
8. **Consider cold start time** - Affects scale-to-zero viability
9. **Use initial-scale for deployments** - Prevent immediate overload

## Conclusion

Knative Serving's autoscaler provides powerful capabilities for optimizing serverless workloads. By properly configuring concurrency targets, scale bounds, and scaling behavior, you balance performance, cost, and reliability. Use concurrency-based scaling for most workloads, RPS-based scaling for consistent request patterns, and tune scale-to-zero settings based on cold start characteristics. Monitor autoscaling metrics continuously, test configurations under realistic load, and adjust parameters based on observed behavior to achieve optimal results for your specific workload patterns.
