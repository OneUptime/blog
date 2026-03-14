# How to Implement Health Check Pattern with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Check, Kubernetes, Envoy, Outlier Detection

Description: How to configure health checks in Istio including Kubernetes probes with sidecar interaction, outlier detection, and Envoy active health checking.

---

Health checking in a service mesh is more nuanced than in plain Kubernetes. You have to deal with the sidecar proxy intercepting probe traffic, configure Envoy-level outlier detection on top of Kubernetes readiness probes, and make sure your health check endpoints are excluded from mTLS when needed. Getting health checks right means your mesh removes unhealthy instances quickly and routes traffic only to pods that can actually serve requests.

## Kubernetes Probes with Istio Sidecars

When Istio's sidecar is injected into a pod, it intercepts all traffic, including health check probes from the kubelet. This can cause issues because the kubelet sends probes in plain HTTP, but the sidecar might be expecting mTLS.

Istio handles this automatically by rewriting probe ports. When the sidecar injector sees a liveness or readiness probe, it rewrites it to go through the pilot-agent, which handles the mTLS termination:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

After sidecar injection, Istio rewrites these probes to go through port 15020 (the pilot-agent status port). The pilot-agent forwards the probe request to your application on the original port and path.

You can verify the rewritten probes:

```bash
kubectl get pod my-app-xyz -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].args}' | python3 -m json.tool
```

## Configuring the Sidecar Health Check

The sidecar itself has a health check endpoint on port 15021:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15021/healthz/ready
```

This returns 200 when the sidecar is ready to handle traffic and 503 when it is not. Istio configures this as a readiness probe on the istio-proxy container automatically.

You can also check the sidecar's health using the merged status port:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15020/healthz/ready
```

## Application Health vs Sidecar Health

It is important to understand that there are two independent health checks happening:

1. **Application health** - Your liveness/readiness probes check if your application is healthy
2. **Sidecar health** - The istio-proxy readiness probe checks if the sidecar is ready

Both need to pass for the pod to receive traffic. If your application is healthy but the sidecar is not ready, the pod will not be in the service endpoint list.

A common startup issue: your application starts before the sidecar is ready, and the application tries to make outbound requests that fail because the sidecar is not ready yet. Fix this with:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
```

This delays the application container startup until the sidecar is ready.

## Outlier Detection (Passive Health Checking)

Kubernetes probes catch slow application startups and crashes, but they do not detect when a pod starts returning errors under load. Outlier detection fills this gap by monitoring actual traffic responses:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-health
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

**consecutive5xxErrors: 3** - Eject an endpoint after 3 consecutive 5xx responses.

**interval: 10s** - Check for outliers every 10 seconds.

**baseEjectionTime: 30s** - Minimum ejection duration. Doubles with each subsequent ejection (30s, 60s, 90s, etc.).

**maxEjectionPercent: 50** - At most 50% of endpoints can be ejected at once. This prevents removing all backends.

**minHealthPercent: 30** - Outlier detection is only active when at least 30% of endpoints are healthy. Below that threshold, all endpoints are kept in the pool regardless of errors (panic mode).

## Checking Outlier Detection Status

See which endpoints have been ejected:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/clusters | grep -E "health_flags|outlier"
```

Look for endpoints with `failed_outlier_check` in the health flags:

```text
outbound|8080||service-b.default.svc.cluster.local::10.244.1.5:8080::health_flags::/failed_outlier_check
```

You can also see the total ejection counts:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep outlier_detection
```

## Configuring Different Health Check Strategies Per Subset

Different service versions might need different health check parameters:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-health
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      outlierDetection:
        consecutive5xxErrors: 3
        interval: 5s
        baseEjectionTime: 60s
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      outlierDetection:
        consecutive5xxErrors: 10
        interval: 15s
        baseEjectionTime: 15s
```

v1 has stricter health checking (maybe it is an older version that fails more often), while v2 is more lenient (maybe it is more reliable but occasionally returns errors during deployments).

## Health Check Exclusion from mTLS

Sometimes external health checkers (like a load balancer or monitoring system) need to call your health endpoint without mTLS. You can exclude specific ports from mTLS:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: my-service-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: DISABLE
```

This enforces strict mTLS on all ports except 8081, which your health check endpoint could use.

## gRPC Health Checking

For gRPC services, use the gRPC health checking protocol:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-service
spec:
  template:
    spec:
      containers:
      - name: grpc-service
        image: grpc-service:latest
        ports:
        - containerPort: 9090
        livenessProbe:
          grpc:
            port: 9090
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          grpc:
            port: 9090
          initialDelaySeconds: 5
          periodSeconds: 10
```

Kubernetes 1.24+ supports native gRPC probes. For older versions, you can use the grpc-health-probe binary:

```yaml
livenessProbe:
  exec:
    command: ["/bin/grpc_health_probe", "-addr=:9090"]
```

## Monitoring Health Check Metrics

Track health check outcomes with Prometheus:

```promql
# Ejected endpoints
envoy_cluster_outlier_detection_ejections_active{cluster_name=~"outbound.*my-service.*"}

# Total ejections over time
rate(envoy_cluster_outlier_detection_ejections_total{cluster_name=~"outbound.*my-service.*"}[5m])

# Healthy endpoint count
envoy_cluster_membership_healthy{cluster_name=~"outbound.*my-service.*"}

# Total endpoint count (healthy + unhealthy)
envoy_cluster_membership_total{cluster_name=~"outbound.*my-service.*"}
```

Create a health dashboard showing the ratio of healthy to total endpoints:

```promql
envoy_cluster_membership_healthy / envoy_cluster_membership_total
```

Set up alerts for low health percentages:

```yaml
groups:
- name: health-check-alerts
  rules:
  - alert: LowHealthyEndpoints
    expr: |
      envoy_cluster_membership_healthy{cluster_name=~"outbound.*"}
      / envoy_cluster_membership_total{cluster_name=~"outbound.*"}
      < 0.5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Less than 50% healthy endpoints for {{ $labels.cluster_name }}"
```

## Debugging Health Check Failures

When pods are failing health checks, check multiple layers:

```bash
# Check pod events
kubectl describe pod my-app-xyz

# Check if the readiness probe is passing
kubectl get pod my-app-xyz -o jsonpath='{.status.conditions}'

# Check application logs
kubectl logs my-app-xyz -c my-app

# Check sidecar logs for connection issues
kubectl logs my-app-xyz -c istio-proxy

# Check if the health endpoint works from inside the pod
kubectl exec my-app-xyz -c my-app -- curl -s localhost:8080/healthz
```

Health checking in Istio involves coordination between Kubernetes probes (for pod-level health), Envoy outlier detection (for traffic-level health), and the sidecar's own readiness. Configure all three layers, monitor the metrics, and set up alerts to catch degradation early. The combination gives you robust detection of unhealthy instances at every level.
