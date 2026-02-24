# How to Set Up A/B Testing with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, A/B Testing, Traffic Routing, Kubernetes, Experimentation

Description: Learn how to implement A/B testing using Istio's traffic routing capabilities to test different service versions against specific user segments.

---

A/B testing and canary releases might look similar on the surface - both involve routing traffic to different versions of a service. But they serve different purposes. Canary releases are about safe deployments. A/B testing is about measuring which version performs better for a specific business metric.

With A/B testing, you route specific user segments to different versions based on criteria like user ID, geographic location, device type, or any request attribute. Then you measure conversion rates, engagement, or whatever business metric you care about.

Istio's header-based and cookie-based routing makes A/B testing straightforward without any application-level routing logic.

## The Setup

Say you have a product recommendation service. Version A uses the current algorithm, and Version B uses a new ML model. You want to test which one drives more purchases.

Deploy both versions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendations-v1
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: recommendations
      version: v1
  template:
    metadata:
      labels:
        app: recommendations
        version: v1
    spec:
      containers:
      - name: recommendations
        image: myregistry/recommendations:v1
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendations-v2
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: recommendations
      version: v2
  template:
    metadata:
      labels:
        app: recommendations
        version: v2
    spec:
      containers:
      - name: recommendations
        image: myregistry/recommendations:v2
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: recommendations
  namespace: default
spec:
  selector:
    app: recommendations
  ports:
  - port: 8080
    targetPort: 8080
```

Create the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: recommendations-dr
  namespace: default
spec:
  host: recommendations
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Header-Based A/B Routing

The most common approach is to have your frontend or API gateway set a header that identifies the user's test group, and then route based on that header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: recommendations-vs
  namespace: default
spec:
  hosts:
  - recommendations
  http:
  - match:
    - headers:
        x-test-group:
          exact: "B"
    route:
    - destination:
        host: recommendations
        subset: v2
  - route:
    - destination:
        host: recommendations
        subset: v1
```

Your frontend application assigns users to groups (A or B) and sets the `x-test-group` header on requests. Users in group B get the new recommendations algorithm; everyone else gets the current one.

## Cookie-Based A/B Routing

If you can't control headers (for example, if requests come directly from browser JavaScript), use cookies:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: recommendations-vs
  namespace: default
spec:
  hosts:
  - recommendations
  http:
  - match:
    - headers:
        cookie:
          regex: ".*ab_group=B.*"
    route:
    - destination:
        host: recommendations
        subset: v2
  - route:
    - destination:
        host: recommendations
        subset: v1
```

Set the `ab_group` cookie in your frontend when a user first visits. The cookie persists across sessions, so the user always sees the same version - which is critical for valid A/B test results.

## User ID-Based Routing

For consistent routing based on user ID, have your API gateway set a header with the user ID:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: recommendations-vs
  namespace: default
spec:
  hosts:
  - recommendations
  http:
  - match:
    - headers:
        x-user-id:
          regex: ".*[0-4]$"
    route:
    - destination:
        host: recommendations
        subset: v2
  - route:
    - destination:
        host: recommendations
        subset: v1
```

This routes users whose ID ends in 0-4 to v2 (roughly 50% of users) and everyone else to v1. The routing is deterministic - the same user always hits the same version.

## Device-Based A/B Testing

Test different versions based on device type by matching the User-Agent header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: recommendations-vs
  namespace: default
spec:
  hosts:
  - recommendations
  http:
  - match:
    - headers:
        user-agent:
          regex: ".*Mobile.*"
    route:
    - destination:
        host: recommendations
        subset: v2
  - route:
    - destination:
        host: recommendations
        subset: v1
```

Mobile users get v2, desktop users get v1. This is useful when testing a version optimized for mobile performance.

## Multiple Test Variants

A/B testing isn't limited to two variants. You can test A/B/C/D by adding more match rules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: recommendations-vs
  namespace: default
spec:
  hosts:
  - recommendations
  http:
  - match:
    - headers:
        x-test-group:
          exact: "B"
    route:
    - destination:
        host: recommendations
        subset: v2
  - match:
    - headers:
        x-test-group:
          exact: "C"
    route:
    - destination:
        host: recommendations
        subset: v3
  - match:
    - headers:
        x-test-group:
          exact: "D"
    route:
    - destination:
        host: recommendations
        subset: v4
  - route:
    - destination:
        host: recommendations
        subset: v1
```

## Combining A/B Testing with Weighted Routing

You can combine header-based routing with weighted traffic splitting for more nuanced tests:

```yaml
http:
- match:
  - headers:
      x-test-group:
        exact: "B"
  route:
  - destination:
      host: recommendations
      subset: v2
    weight: 70
  - destination:
      host: recommendations
      subset: v3
    weight: 30
- route:
  - destination:
      host: recommendations
      subset: v1
```

Users in group B get split between v2 (70%) and v3 (30%). Everyone else gets v1.

## Measuring Results

Istio provides the traffic data, but you need application-level metrics to measure business outcomes. Your services should emit metrics that tie to your test goals:

```bash
# Request volume by version
istio_requests_total{destination_workload=~"recommendations-v.*"}

# Latency comparison
histogram_quantile(0.95, rate(istio_request_duration_milliseconds_bucket{destination_workload=~"recommendations-v.*"}[5m]))
```

For business metrics (conversion rates, revenue per user), you'll need to correlate the version assignment with your analytics pipeline. Include the test group in your application logs or analytics events:

```json
{
  "event": "purchase",
  "user_id": "12345",
  "test_group": "B",
  "recommendation_version": "v2",
  "amount": 49.99
}
```

## Ensuring Test Validity

A few things matter for valid A/B test results:

**Consistent assignment**: A user should always see the same version during the test. Use deterministic routing (user ID or cookie) rather than random assignment.

**Sufficient sample size**: Run the test long enough to collect statistically significant data. Don't conclude based on a few hours of traffic.

**Isolation**: Make sure the test groups are comparable. If group B has all your power users, the results will be biased.

**Single variable**: Only change one thing between versions. If v2 has a new algorithm AND a new UI, you won't know which change caused the difference.

## Ending the Test

Once you have results, either promote the winning version or roll back:

```bash
# If v2 won, update stable and remove v1
kubectl set image deployment/recommendations-v1 \
  recommendations=myregistry/recommendations:v2

# Remove the A/B routing
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: recommendations-vs
  namespace: default
spec:
  hosts:
  - recommendations
  http:
  - route:
    - destination:
        host: recommendations
        subset: v1
EOF

# Clean up the canary deployment
kubectl delete deployment recommendations-v2
```

A/B testing with Istio separates your experimentation infrastructure from your application code. Your services don't need to know they're part of a test. The routing decisions happen at the mesh level, and you can start, modify, or stop tests by updating Kubernetes resources. This makes experimentation accessible to teams that don't want to embed feature flagging frameworks in their services.
