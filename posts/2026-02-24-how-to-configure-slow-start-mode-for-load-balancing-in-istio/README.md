# How to Configure Slow Start Mode for Load Balancing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Slow Start, Envoy, Kubernetes

Description: Configure slow start mode in Istio to gradually ramp up traffic to new pods and prevent them from being overwhelmed during startup.

---

When a new pod comes online, it's cold. Its JIT compiler hasn't warmed up, its caches are empty, and its connection pools are unprimed. If the load balancer immediately sends it the same amount of traffic as a fully warmed pod, it gets overwhelmed. Response times spike, errors increase, and sometimes the pod never recovers because it's stuck processing a backlog. Slow start mode fixes this by gradually ramping up traffic to new endpoints.

## How Slow Start Works

Slow start gives new endpoints a lower effective weight that increases linearly over a configured time window. At the start of the window, the endpoint gets minimal traffic. By the end of the window, it gets its full share. This gives the pod time to warm up its caches, compile hot paths, and establish downstream connections.

Envoy (the proxy that Istio uses) supports slow start for the `ROUND_ROBIN` and `LEAST_REQUEST` load balancing algorithms. You configure it through Istio's DestinationRule using the `warmupDurationSecs` field.

## Basic Slow Start Configuration

Here is a straightforward slow start setup:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service-dr
  namespace: default
spec:
  host: api-service
  trafficPolicy:
    loadBalancer:
      warmupDurationSecs: 60s
      simple: LEAST_REQUEST
```

With this configuration, when a new pod joins the pool, it starts receiving a small fraction of traffic. Over the next 60 seconds, the traffic share linearly increases until the pod is receiving its full share.

The `warmupDurationSecs` value should roughly match how long your application takes to warm up. For a Java service with JIT compilation, 60 to 120 seconds is common. For a lightweight Go service, 10 to 30 seconds might be enough.

## Slow Start with Round Robin

Slow start also works with the `ROUND_ROBIN` algorithm:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-service-dr
  namespace: default
spec:
  host: web-service
  trafficPolicy:
    loadBalancer:
      warmupDurationSecs: 45s
      simple: ROUND_ROBIN
```

Under the hood, Envoy adjusts the weight of the new endpoint during the warmup period. In a weighted round robin cycle, the new endpoint gets picked less frequently at the start and gradually more as the warmup progresses.

## Combining Slow Start with Connection Pooling

For the best results, combine slow start with connection pool settings that complement the ramp-up:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-service-dr
  namespace: default
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        maxRequestsPerConnection: 500
        maxRetries: 3
    loadBalancer:
      warmupDurationSecs: 90s
      simple: LEAST_REQUEST
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

The connection pool settings prevent new pods from being flooded with connections during the warmup period. The outlier detection provides a safety net: if a new pod does get overwhelmed and starts returning errors, it gets temporarily ejected rather than continuing to fail.

## Per-Subset Slow Start

Different subsets might need different warmup durations. A canary deployment with a new version might need more warmup time than the stable version:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: catalog-service-dr
  namespace: default
spec:
  host: catalog-service
  subsets:
    - name: stable
      labels:
        version: v1
      trafficPolicy:
        loadBalancer:
          warmupDurationSecs: 30s
          simple: LEAST_REQUEST
    - name: canary
      labels:
        version: v2
      trafficPolicy:
        loadBalancer:
          warmupDurationSecs: 120s
          simple: LEAST_REQUEST
```

## Application-Side Warmup

Slow start at the load balancer level is only half the solution. Your application should also do its own warmup work during startup. Here are some patterns:

**Readiness probe with startup delay**: Don't mark the pod as ready until it's done warming up.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    spec:
      containers:
        - name: api-service
          image: myregistry/api-service:v1
          ports:
            - containerPort: 8080
          startupProbe:
            httpGet:
              path: /startup
              port: 8080
            failureThreshold: 30
            periodSeconds: 2
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 5
```

The startup probe gives the application up to 60 seconds (30 failures * 2 seconds) to finish initializing. Only after the startup probe succeeds does the readiness probe take over. The slow start warmup begins when the pod becomes ready.

**Pre-warming caches**: Make your `/startup` endpoint trigger cache loading, connection pool initialization, and any other warmup tasks:

```python
# Example startup endpoint
@app.route('/startup')
def startup():
    if not app.state.warmup_complete:
        return Response(status=503)
    return Response(status=200)

# Run warmup on application start
async def warmup():
    await load_caches()
    await initialize_connection_pools()
    await compile_templates()
    app.state.warmup_complete = True
```

## Choosing the Right Warmup Duration

The ideal warmup duration depends on your application. Here is a rough guide:

| Application Type | Warmup Duration |
|---|---|
| Lightweight HTTP API (Go, Rust) | 10-20s |
| Node.js / Python API | 15-30s |
| Java with Spring Boot | 60-120s |
| Java with heavy caching | 120-300s |
| ML model serving | 60-180s |

To measure your actual warmup time, look at the P99 latency of a new pod over time after it starts receiving traffic. The warmup is "done" when its P99 stabilizes at the same level as existing pods.

```promql
# Compare new pod latency with existing pods
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="api-service.default.svc.cluster.local", pod="api-service-abc123"}[1m])) by (le))
```

## Rolling Updates with Slow Start

Slow start is especially important during rolling updates, where pods come online one at a time. Without slow start, each new pod immediately gets a full share of traffic while still cold, which can cause a cascade of latency spikes.

Configure your deployment strategy to account for the warmup time:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 10
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
    type: RollingUpdate
```

With `maxSurge: 1` and `maxUnavailable: 0`, only one new pod comes up at a time, and an old pod isn't terminated until the new one is ready. Combined with slow start, each new pod has time to warm up before the next one starts.

## Verifying Slow Start

Check that slow start is configured in the Envoy proxy:

```bash
# View the cluster config for your service
istioctl proxy-config cluster <pod-name> -o json | python3 -m json.tool | grep -A 5 "slow_start"
```

You should see the slow start configuration in the cluster's load balancing policy.

## Summary

Slow start mode in Istio prevents new pods from being overwhelmed during their warmup period. Configure it with `warmupDurationSecs` in your DestinationRule, combine it with startup probes and application-level warmup, and set the duration based on how long your application actually takes to reach steady-state performance. This is especially valuable for Java applications, services with heavy caching, or any workload where cold starts are expensive.
