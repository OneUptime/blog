# How to Use Health Checks for Service Discovery in Istio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Health Check, Service Discovery, Kubernetes, Envoy

Description: Understand how health checks drive service discovery in Istio, from Kubernetes endpoints to Envoy's active and passive health checking mechanisms.

---

Service discovery and health checking are tightly connected in Istio. When an endpoint fails a health check, it should stop receiving traffic. The question is how quickly and reliably that happens. Istio has multiple layers of health checking, each operating independently, and understanding how they fit together helps you build more resilient services.

## The Service Discovery Chain

Traffic routing in Istio follows a chain of service discovery mechanisms:

1. **Kubernetes EndpointSlices** - the kubelet runs readiness probes. Passing pods are published through EndpointSlices (and legacy Endpoints). Failing pods are marked unready and removed from the ready serving set.

2. **Istio Service Registry** - istiod watches Kubernetes services and endpoints and maintains its own service registry. When endpoints change, istiod pushes updates to Envoy proxies via xDS.

3. **Envoy Load Balancing** - each Envoy sidecar has a list of healthy endpoints. It routes traffic based on this list and the configured load balancing algorithm.

4. **Envoy Outlier Detection** - Envoy can independently detect unhealthy endpoints by tracking error rates and eject them from the load balancing pool, even before Kubernetes removes them from the ready endpoint set.

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

When this probe fails 3 times in a row, Kubernetes marks the pod unready and removes it from the ready endpoints for the Service. This eventually propagates to Istio and Envoy.

The latency of this path is:
- Up to about 15 seconds for probe failure detection after the first failed probe (5s * 3)
- Additional time for Kubernetes to update EndpointSlices
- Additional time for istiod to detect and push the xDS update
- Total: often seconds to tens of seconds from failure to traffic cutoff, depending on timing and cluster load

That can be a lot of time. During that window, traffic can keep going to the failing pod.

## Layer 2: Envoy Outlier Detection

Outlier detection is faster because it operates locally in each Envoy proxy. Configure it through a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
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

After 3 consecutive 5xx errors, the endpoint gets ejected. Envoy handles consecutive 5xx ejection inline; the `interval` controls periodic outlier detection sweeps and recovery checks, not the moment when consecutive 5xx failures are counted. The detection latency is:
- However long it takes for 3 requests to fail
- Any delay caused by `maxEjectionPercent` or load balancer panic behavior when too few healthy endpoints remain

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
  selector:
    matchLabels:
      app: backend-service
  template:
    metadata:
      labels:
        app: backend-service
    spec:
      containers:
        - name: backend-service
          image: ghcr.io/example/backend-service:1.0
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            periodSeconds: 5
            failureThreshold: 3
---
apiVersion: networking.istio.io/v1
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

If your cluster spans multiple zones or regions, health checking interacts with locality-aware load balancing:

```yaml
apiVersion: networking.istio.io/v1
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
          - from: us-east-1
            to: us-west-2
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

When all endpoints in the local locality are ejected by outlier detection, Istio can fail over to another locality. The `failover` policy constrains cross-region failover; zone and sub-zone failover are supported by default. This requires outlier detection to be configured; locality failover without outlier detection cannot detect unhealthy endpoints.

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

With headless Services, clients that bypass the sidecar might cache DNS results, which can cause stale endpoints. For mesh traffic that goes through Envoy, Istio mitigates this because Envoy uses the xDS-provided endpoint list rather than relying only on application DNS caching.

## ServiceEntry Health Checks

For external services registered via ServiceEntry, you can still use outlier detection:

```yaml
apiVersion: networking.istio.io/v1
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
apiVersion: networking.istio.io/v1
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

This applies outlier detection to external API calls. If the external service returns 5 consecutive errors, Envoy can eject that endpoint for 60 seconds. If there are no healthy alternatives, Envoy may still send traffic during panic or fail-open behavior.

## Monitoring Health Check Impact on Service Discovery

Track how health checks affect your service mesh:

```bash
# Check endpoint health in Envoy

istioctl proxy-config endpoints <pod-name> | grep backend-service

# See outlier detection ejections
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep outlier_detection

# Watch Kubernetes EndpointSlices
kubectl get endpointslices -l kubernetes.io/service-name=backend-service -w
```

In Prometheus:

```promql
# Track ejection rate
sum(rate(envoy_cluster_outlier_detection_ejections_total[5m])) by (cluster_name)

# Track active ejections
envoy_cluster_outlier_detection_ejections_active{cluster_name=~".*backend-service.*"}
```

The interplay between Kubernetes readiness probes and Envoy outlier detection gives you a robust two-layer health checking system. Readiness probes are the safety net that catches all types of failures, while outlier detection provides fast reaction to traffic-level errors. Using both together gives your service mesh the best combination of reliability and speed.
