# How to Configure Percentage-Based Traffic Mirroring in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Traffic Mirroring, Shadowing, Kubernetes

Description: How to use mirrorPercentage in Istio to control what fraction of production traffic gets mirrored to a test service for safe, resource-efficient testing.

---

Mirroring 100% of production traffic sounds great in theory, but it is not always practical. If your production service handles 10,000 requests per second, your mirror service needs to handle 10,000 RPS too. That is expensive. Percentage-based mirroring lets you send just a fraction of traffic to the mirror - enough to test with real patterns without needing full production capacity.

## The mirrorPercentage Field

Istio's VirtualService supports a `mirrorPercentage` field that controls what percentage of requests get copied to the mirror destination:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: default
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
      mirror:
        host: my-service
        subset: v2
      mirrorPercentage:
        value: 25.0
```

This mirrors 25% of traffic to v2. The other 75% of requests only go to v1 as usual.

The `value` field accepts a floating-point number from 0.0 to 100.0. You can go as granular as you need: 0.1% is valid if you have very high traffic and only want a small sample.

## Setting Up the Prerequisites

Before configuring mirroring, you need:

### Deployments

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v1
  namespace: default
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
      version: v1
  template:
    metadata:
      labels:
        app: api
        version: v1
    spec:
      containers:
        - name: api
          image: api:1.0.0
          ports:
            - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v2
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
      version: v2
  template:
    metadata:
      labels:
        app: api
        version: v2
    spec:
      containers:
        - name: api
          image: api:2.0.0
          ports:
            - containerPort: 8080
```

### DestinationRule with Subsets

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api
  namespace: default
spec:
  host: api
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## Choosing the Right Percentage

The right percentage depends on three factors: your traffic volume, the capacity of your mirror service, and how much data you need for testing.

### Low Traffic (under 100 RPS): Mirror 100%

```yaml
mirrorPercentage:
  value: 100.0
```

At low traffic volumes, there is no reason not to mirror everything. The mirror service gets a manageable load and you have complete coverage.

### Medium Traffic (100-1000 RPS): Mirror 10-50%

```yaml
mirrorPercentage:
  value: 25.0
```

At 500 RPS with 25% mirroring, the mirror service sees about 125 RPS. That is enough to test with a representative sample without needing a large mirror deployment.

### High Traffic (1000+ RPS): Mirror 1-10%

```yaml
mirrorPercentage:
  value: 5.0
```

At 5000 RPS with 5% mirroring, the mirror sees about 250 RPS. Still a significant sample size for testing, but much more manageable in terms of resources.

### Very High Traffic (10000+ RPS): Mirror 0.1-1%

```yaml
mirrorPercentage:
  value: 0.5
```

At 50,000 RPS with 0.5% mirroring, the mirror sees about 250 RPS. The sample is statistically significant while keeping mirror costs minimal.

## Gradual Mirroring Ramp-Up

When testing a new version, start with a low percentage and increase it as confidence grows:

### Phase 1: Smoke Test (1%)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
  namespace: default
spec:
  hosts:
    - api
  http:
    - route:
        - destination:
            host: api
            subset: v1
      mirror:
        host: api
        subset: v2
      mirrorPercentage:
        value: 1.0
```

Check that the mirror service starts up, processes requests, and does not immediately crash.

### Phase 2: Validation (10%)

```yaml
mirrorPercentage:
  value: 10.0
```

Enough traffic to test edge cases. Monitor error rates and latency.

### Phase 3: Load Test (50%)

```yaml
mirrorPercentage:
  value: 50.0
```

Verify the mirror handles production-level load per replica. Scale the mirror deployment if needed.

### Phase 4: Full Mirror (100%)

```yaml
mirrorPercentage:
  value: 100.0
```

Complete confidence - all traffic is tested against the new version.

## Calculating Mirror Service Capacity

Here is the math for sizing your mirror deployment:

```
mirror_rps = production_rps * (mirrorPercentage / 100)
mirror_replicas = ceiling(mirror_rps / rps_per_replica)
```

Example:
- Production: 2000 RPS across 5 replicas (400 RPS per replica)
- Mirror percentage: 20%
- Mirror RPS: 2000 * 0.20 = 400 RPS
- Mirror replicas needed: ceiling(400 / 400) = 1 replica

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v2
spec:
  replicas: 1  # Sized for 20% of production traffic
```

## Monitoring Mirrored Traffic at Different Percentages

Track the actual mirror rate and compare it against the configured percentage:

```bash
# Actual request rate to production
# PromQL: sum(rate(istio_requests_total{destination_service="api.default.svc.cluster.local",destination_version="v1"}[5m]))

# Actual request rate to mirror
# PromQL: sum(rate(istio_requests_total{destination_service="api.default.svc.cluster.local",destination_version="v2"}[5m]))

# Expected ratio
# mirror_rate / production_rate should approximately equal mirrorPercentage/100
```

If the actual ratio differs significantly from the configured percentage, check for:
- Mirror service overloaded (requests getting dropped)
- Circuit breaking on the mirror service
- Envoy sidecar issues

## Combining Percentage Mirroring with Route-Based Mirroring

You can mirror different percentages for different routes:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
  namespace: default
spec:
  hosts:
    - api
  http:
    # High-traffic endpoint - mirror 5%
    - match:
        - uri:
            prefix: /api/search
      route:
        - destination:
            host: api
            subset: v1
      mirror:
        host: api
        subset: v2
      mirrorPercentage:
        value: 5.0
    # Low-traffic endpoint - mirror 100%
    - match:
        - uri:
            prefix: /api/admin
      route:
        - destination:
            host: api
            subset: v1
      mirror:
        host: api
        subset: v2
      mirrorPercentage:
        value: 100.0
    # Default - mirror 20%
    - route:
        - destination:
            host: api
            subset: v1
      mirror:
        host: api
        subset: v2
      mirrorPercentage:
        value: 20.0
```

This gives you complete coverage on low-traffic admin endpoints and a cost-effective sample on high-traffic search endpoints.

## What Happens When the Mirror Service Is Overloaded

If the mirror service cannot keep up with the mirrored traffic, Envoy handles it gracefully:

- Mirror requests are sent asynchronously (fire-and-forget)
- If the connection to the mirror fails, the mirror request is silently dropped
- Production traffic is never affected
- No retry attempts are made for failed mirror requests

This is by design. The mirror is informational, not critical. If it falls behind, you just get a lower effective mirror rate than configured.

You can add circuit breaking to the mirror service to control resource usage:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-mirror
  namespace: default
spec:
  host: api
  subsets:
    - name: v2
      labels:
        version: v2
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 20
          http:
            http1MaxPendingRequests: 10
```

This limits the mirror to 20 connections and 10 pending requests. If mirrored traffic exceeds these limits, the excess is dropped silently.

## Verifying the Percentage Is Correct

After configuring, verify with a quick test:

```bash
# Send 1000 requests
kubectl exec deploy/sleep -- sh -c \
  'for i in $(seq 1 1000); do curl -s http://api:8080/health > /dev/null; done'

# Check request counts
echo "=== Production ==="
kubectl exec deploy/api-v1 -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "rq_total"

echo "=== Mirror ==="
kubectl exec deploy/api-v2 -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "rq_total"
```

With 25% mirroring, you should see roughly 1000 requests to v1 and roughly 250 to v2. The exact numbers will vary due to sampling, but the ratio should be close.

## Automation Script for Percentage Changes

A helper script for adjusting mirror percentage:

```bash
#!/bin/bash
# set-mirror-percentage.sh <percentage>

PERCENTAGE=${1:?Usage: set-mirror-percentage.sh <percentage>}

kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
  namespace: default
spec:
  hosts:
    - api
  http:
    - route:
        - destination:
            host: api
            subset: v1
      mirror:
        host: api
        subset: v2
      mirrorPercentage:
        value: ${PERCENTAGE}
EOF

echo "Mirror percentage set to ${PERCENTAGE}%"
```

Usage:

```bash
./set-mirror-percentage.sh 10   # Mirror 10%
./set-mirror-percentage.sh 50   # Mirror 50%
./set-mirror-percentage.sh 100  # Mirror 100%
./set-mirror-percentage.sh 0    # Effectively disable mirroring
```

Percentage-based mirroring gives you control over the trade-off between testing coverage and resource cost. Start low, validate, increase. It is a methodical approach to gaining confidence in a new service version before exposing it to real user traffic.
