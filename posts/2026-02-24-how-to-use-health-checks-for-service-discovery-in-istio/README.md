# How to Use Health Checks for Service Discovery in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Check, Service Discovery, Kubernetes, Envoy

Description: Understand how health checks drive service discovery in Istio, from Kubernetes endpoints to Envoy's active and passive health checking mechanisms.

---

Service discovery and health checking are tightly connected in Istio. When an endpoint fails a health check, it should stop receiving traffic. The question is how quickly and reliably that happens. Istio has multiple layers of health checking, each operating independently, and understanding how they fit together helps you build more resilient services.

## The Service Discovery Chain

Traffic routing in Istio follows a chain of service discovery mechanisms:

1. **Kubernetes Endpoints** - the kubelet runs readiness probes. Passing pods get added to the Endpoints resource. Failing pods get removed.

2. **Istio Service Registry** - istiod watches Kubernetes Endpoints and maintains its own service registry. When endpoints change, istiod pushes updates to all Envoy proxies via xDS.

3. **Envoy Load Balancing** - each Envoy sidecar has a list of healthy endpoints. It routes traffic based on this list and the configured load balancing algorithm.

4. **Envoy Outlier Detection** - Envoy can independently detect unhealthy endpoints by tracking error rates and eject them from the load balancing pool, even before Kubernetes removes them from Endpoints.

## Layer 1: Kubernetes Readiness Probes

The first layer is the standard Kubernetes readiness probe. This is the foundation of service discovery:

```yaml
readinessProbe:
  httpGet:
    path: /readyz
    port: 8080
  periodSeconds: 5
  failureThreshold: 3
  successThreshold: 1
```

When this probe fails 3 times in a row (15 seconds), Kubernetes removes the pod from the Endpoints resource. This eventually propagates to Istio and Envoy.

The latency of this path is:
- 15 seconds for probe failure detection (5s * 3)
- 1-5 seconds for Kubernetes Endpoints update
- 1-5 seconds for istiod to detect and push the xDS update
- Total: roughly 17-25 seconds from failure to traffic cutoff

That is a lot of time. During those 17-25 seconds, traffic keeps going to the failing pod.

## Layer 2: Envoy Outlier Detection

Outlier detection is faster because it operates locally in each Envoy proxy. Configure it through a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-service
  namespace: default
spec:
  host: backend-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Envoy checks every 5 seconds. After 3 consecutive 5xx errors, the endpoint gets ejected. The detection latency is:
- 5 seconds for the interval check
- However long it takes for 3 requests to fail

In practice, if you are sending steady traffic, outlier detection kicks in within seconds of a failure, much faster than the Kubernetes readiness probe path.

## Combining Both Layers

The recommended approach is to use both:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: backend-service
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            periodSeconds: 5
            failureThreshold: 3
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-service
  namespace: default
spec:
  host: backend-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Outlier detection catches failures quickly (within seconds). Readiness probes catch failures that do not generate 5xx errors (like a deadlocked process that stops responding to probes but does not generate errors on existing connections).

## Health-Based Load Balancing

With outlier detection enabled, Envoy's load balancing becomes health-aware. When an endpoint is ejected:

- `ROUND_ROBIN` skips the ejected endpoint
- `LEAST_REQUEST` does not consider it
- `RANDOM` excludes it from the pool

After the `baseEjectionTime` expires, the endpoint is added back and starts receiving traffic again. If it fails again, it gets ejected for a longer period (the ejection time multiplies).

## Locality-Aware Health Checking

If your cluster spans multiple zones, health checking interacts with locality-aware load balancing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-service
  namespace: default
spec:
  host: backend-service.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1a
            to: us-east-1b
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

When all endpoints in the local zone are ejected by outlier detection, Istio fails over to the next zone. This requires outlier detection to be configured; locality load balancing without outlier detection cannot detect zone-level failures.

## Custom Health Checks in Your Application

Your readiness endpoint should check everything your service needs to function:

```python
@app.route('/readyz')
def readyz():
    checks = {
        'database': check_database(),
        'cache': check_cache(),
        'disk_space': check_disk_space(),
    }

    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503

    return jsonify(checks), status_code
```

For Istio specifically, your readiness endpoint should return:
- HTTP 200 if the service can handle requests
- HTTP 503 if it cannot

The specific response body does not matter to Kubernetes or Istio, but it is useful for debugging.

## Headless Services and Service Discovery

Headless Services (ClusterIP: None) work differently with Istio. DNS returns all pod IPs directly, and Istio creates an endpoint for each pod. Health checking still works the same way:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: stateful-service
  namespace: default
spec:
  clusterIP: None
  selector:
    app: stateful-service
  ports:
    - name: http
      port: 8080
```

With headless Services, clients might cache DNS results, which can cause stale endpoints. Istio mitigates this because Envoy uses the xDS-provided endpoint list rather than DNS.

## ServiceEntry Health Checks

For external services registered via ServiceEntry, you can still use outlier detection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.external.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api
  namespace: default
spec:
  host: api.external.com
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

This applies outlier detection to external API calls. If the external service returns 5 consecutive errors, Envoy stops sending traffic to it for 60 seconds.

## Monitoring Health Check Impact on Service Discovery

Track how health checks affect your service mesh:

```bash
# Check endpoint health in Envoy
istioctl proxy-config endpoints <pod-name> | grep backend-service

# See outlier detection ejections
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep outlier_detection

# Watch Kubernetes endpoints
kubectl get endpoints backend-service -w
```

In Prometheus:

```promql
# Track ejection rate
sum(rate(envoy_cluster_outlier_detection_ejections_total[5m])) by (cluster_name)

# Track active ejections
envoy_cluster_outlier_detection_ejections_active{cluster_name=~".*backend-service.*"}
```

The interplay between Kubernetes readiness probes and Envoy outlier detection gives you a robust two-layer health checking system. Readiness probes are the safety net that catches all types of failures, while outlier detection provides fast reaction to traffic-level errors. Using both together gives your service mesh the best combination of reliability and speed.
