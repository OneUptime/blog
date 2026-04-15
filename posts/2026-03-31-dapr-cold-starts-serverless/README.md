# How to Handle Cold Starts with Dapr Serverless

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Serverless, Cold Start, Performance, Kubernetes

Description: Minimize and handle Dapr sidecar cold start latency in serverless Kubernetes environments using resiliency policies, pre-warming, and optimized container configurations.

---

## Cold Starts in Dapr Serverless Deployments

When a scale-to-zero service receives its first request, the pod must start before it can respond. With Dapr, the cold start includes both the application container startup and the Dapr sidecar initialization - which involves mTLS certificate acquisition, component initialization, and service registration. This compounds the typical cold start delay.

## Typical Dapr Cold Start Timeline

```text
0ms   - Pod scheduled
200ms - Container image pulled (if not cached)
500ms - Application container starting
600ms - Dapr sidecar (daprd) starting
800ms - Dapr mTLS certificate acquired from sentry
900ms - Dapr components initialized
1000ms - Dapr sidecar ready
1100ms - Application ready to serve
```

Understanding this timeline helps you set appropriate timeouts.

## Minimizing Sidecar Startup Time

### 1. Use Minimal Base Images

```dockerfile
# Use distroless or scratch for faster startup
FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /server
ENTRYPOINT ["/server"]
```

### 2. Disable Unused Dapr Features

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: serverless-api
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "serverless-api"
        # Disable features not needed
        dapr.io/disable-builtin-k8s-secret-store: "true"
        dapr.io/enable-metrics: "false"
        dapr.io/log-level: "warn"
        # Reduce component initialization time
        dapr.io/config: "minimal-config"
```

### 3. Pre-Pull Container Images

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-prepuller
spec:
  selector:
    matchLabels:
      name: image-prepuller
  template:
    metadata:
      labels:
        name: image-prepuller
    spec:
      initContainers:
        - name: prepull-dapr
          image: docker.io/daprio/daprd:1.13.0
          command: ["sh", "-c", "echo prepulled"]
        - name: prepull-app
          image: myorg/serverless-api:latest
          command: ["sh", "-c", "echo prepulled"]
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.10
```

## Resiliency Policy for Cold Start Callers

Configure callers to retry during cold starts:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: cold-start-resiliency
spec:
  policies:
    retries:
      coldStartRetry:
        policy: exponential
        maxInterval: 15s
        maxRetries: 8
        duration: 500ms   # First retry after 500ms
        matching:
          httpStatusCodes: "503,502"
          gRPCStatusCodes: "14"

    timeouts:
      coldStartTimeout: 35s

  targets:
    apps:
      serverless-api:
        timeout: coldStartTimeout
        retry: coldStartRetry
```

## Minimum Replica Count for Critical Paths

For APIs where cold starts are unacceptable, keep at least one warm replica:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-scaledobject
spec:
  scaleTargetRef:
    name: api-deployment
  minReplicaCount: 1     # Never scale to zero for critical APIs
  maxReplicaCount: 20
  cooldownPeriod: 600    # 10 minutes before scaling to minimum
```

## Dapr Sidecar Warm-Up Probe

Use a startup probe to signal readiness only after Dapr is fully initialized:

```yaml
containers:
  - name: app
    startupProbe:
      httpGet:
        path: /v1.0/healthz/outbound
        port: 3500
        scheme: HTTP
      failureThreshold: 30
      periodSeconds: 2
      initialDelaySeconds: 5
    readinessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 0
      periodSeconds: 5
```

## Measuring Cold Start Latency

```bash
# Monitor pod startup time
kubectl get events --field-selector reason=Started \
  --sort-by='.metadata.creationTimestamp' | tail -20

# Measure request latency including cold start via Prometheus
histogram_quantile(0.99,
  rate(dapr_http_server_latency_bucket{app_id="serverless-api"}[5m])
)
```

## Summary

Handling Dapr cold starts in serverless deployments requires a multi-layered approach: minimizing sidecar startup time through lean configurations, pre-pulling container images on nodes, configuring callers with retry policies that match cold start durations, and using startup probes to prevent traffic from reaching services before Dapr is fully initialized. For critical services, maintaining a minimum of one warm replica eliminates cold starts entirely at minimal cost.
