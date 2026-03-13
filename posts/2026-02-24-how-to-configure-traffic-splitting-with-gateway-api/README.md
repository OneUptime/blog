# How to Configure Traffic Splitting with Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Traffic Splitting, Kubernetes, Deployments

Description: Learn how to configure traffic splitting with the Kubernetes Gateway API and Istio for blue-green deployments, A/B testing, percentage-based rollouts, and traffic mirroring alternatives.

---

Traffic splitting distributes incoming requests across multiple backend services based on weights. It's the foundation for deployment strategies like canary releases, blue-green deployments, and A/B testing. The Kubernetes Gateway API makes traffic splitting a first-class feature through the `weight` field on backend references.

## How Traffic Splitting Works

In the Gateway API, an HTTPRoute rule can reference multiple backends, each with a weight. Envoy distributes requests across these backends proportionally to their weights. A backend with weight 80 receives roughly 80% of requests, while a backend with weight 20 receives roughly 20%.

The distribution is per-request, not per-connection. Each individual HTTP request is independently assigned to a backend based on the weights.

## Basic Traffic Split

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: traffic-split
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: app-v1
      port: 80
      weight: 80
    - name: app-v2
      port: 80
      weight: 20
```

80% of traffic goes to app-v1 and 20% goes to app-v2. The weights don't need to add up to 100 - they're relative. Weight 4 and weight 1 would give the same 80/20 split.

## Blue-Green Deployment

In a blue-green deployment, you have two identical environments and switch traffic between them. Start with all traffic on blue:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: blue-green
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: app-blue
      port: 80
      weight: 100
    - name: app-green
      port: 80
      weight: 0
```

When you're ready to switch, flip the weights:

```yaml
rules:
- backendRefs:
  - name: app-blue
    port: 80
    weight: 0
  - name: app-green
    port: 80
    weight: 100
```

Apply the change:

```bash
kubectl apply -f blue-green-route.yaml
```

The switch happens almost instantly as Envoy picks up the new route configuration. If something goes wrong, flip the weights back.

Keeping the weight-0 backend in the route makes it trivial to switch back without editing the YAML structure - just change the numbers.

## Multi-Version Split

Split traffic across three or more versions:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: multi-version-split
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: app-v1
      port: 80
      weight: 70
    - name: app-v2
      port: 80
      weight: 20
    - name: app-v3
      port: 80
      weight: 10
```

70% to v1, 20% to v2, 10% to v3. This is useful when you're running multiple experiments simultaneously.

## A/B Testing with Traffic Splits

Combine traffic splitting with header-based routing for controlled A/B tests:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ab-test
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  # Explicitly assigned users go to their variant
  - matches:
    - headers:
      - name: x-ab-group
        value: A
    backendRefs:
    - name: variant-a
      port: 80
  - matches:
    - headers:
      - name: x-ab-group
        value: B
    backendRefs:
    - name: variant-b
      port: 80
  # Unassigned users are split 50/50
  - backendRefs:
    - name: variant-a
      port: 80
      weight: 50
    - name: variant-b
      port: 80
      weight: 50
```

Users with a pre-assigned group header always go to their variant. New users without the header are randomly split 50/50.

## Per-Path Traffic Splitting

Split traffic differently for different URL paths:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: per-path-split
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  # API endpoints: aggressive canary
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-stable
      port: 80
      weight: 70
    - name: api-canary
      port: 80
      weight: 30
  # Frontend: conservative canary
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend-stable
      port: 80
      weight: 95
    - name: frontend-canary
      port: 80
      weight: 5
```

API endpoints get a more aggressive 70/30 split (maybe your API has better monitoring), while the frontend gets a conservative 95/5 split.

## Setting Up the Backend Services

Each backend in the traffic split needs its own Kubernetes Service pointing to the right pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-v1
  namespace: production
spec:
  selector:
    app: my-app
    version: v1
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: app-v2
  namespace: production
spec:
  selector:
    app: my-app
    version: v2
  ports:
  - port: 80
    targetPort: 8080
```

Make sure your Deployments have matching labels:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v1
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: my-app
      version: v1
  template:
    metadata:
      labels:
        app: my-app
        version: v1
    spec:
      containers:
      - name: app
        image: my-app:v1.0.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v2
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
      version: v2
  template:
    metadata:
      labels:
        app: my-app
        version: v2
```

Scale the deployments appropriately. If version v2 is getting 20% of traffic, it doesn't need as many replicas as v1.

## Gradual Weight Changes

A typical progressive rollout changes weights in steps. Here's a script to automate this:

```bash
#!/bin/bash

# Progressive rollout: 5% -> 25% -> 50% -> 75% -> 100%
STEPS=(5 25 50 75 100)

for WEIGHT in "${STEPS[@]}"; do
  STABLE_WEIGHT=$((100 - WEIGHT))

  cat <<EOF | kubectl apply -f -
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: traffic-split
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: app-stable
      port: 80
      weight: ${STABLE_WEIGHT}
    - name: app-canary
      port: 80
      weight: ${WEIGHT}
EOF

  echo "Canary at ${WEIGHT}%. Waiting 5 minutes to observe..."
  sleep 300

  # Add your metric checks here
  # If metrics are bad, break and rollback
done
```

## Verifying Traffic Distribution

Check that the split is working as expected:

```bash
# Send 100 requests and count responses from each version
for i in $(seq 1 100); do
  curl -s http://app.example.com/version 2>/dev/null
done | sort | uniq -c
```

Check Envoy's route configuration:

```bash
istioctl proxy-config route deploy/web-gateway-istio -n production -o json
```

Look for the `weightedClusters` section to see the configured weights.

Monitor the actual traffic distribution through Istio metrics:

```bash
# Total requests per destination
kubectl exec -it deploy/web-gateway-istio -c istio-proxy -n production -- \
  curl -s localhost:15000/stats | grep upstream_rq_completed
```

## Traffic Splitting for gRPC

Traffic splitting also works with GRPCRoute:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: grpc-split
  namespace: production
spec:
  parentRefs:
  - name: grpc-gateway
  rules:
  - backendRefs:
    - name: grpc-service-stable
      port: 50051
      weight: 90
    - name: grpc-service-canary
      port: 50051
      weight: 10
```

## Traffic Splitting for TCP

For raw TCP traffic, TCPRoute also supports weights:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: tcp-split
  namespace: production
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: db-port
  rules:
  - backendRefs:
    - name: db-primary
      port: 5432
      weight: 100
    - name: db-new-primary
      port: 5432
      weight: 0
```

Note that TCP splitting works at the connection level, not per-request. Once a connection is established, all data goes to the same backend.

## Sticky Sessions Consideration

The Gateway API's weight-based splitting is stateless - each request is independently routed. This means a single user might hit different versions on consecutive requests. If your application requires session stickiness (e.g., during a canary), you'll need to handle that at the application level with cookies or session IDs, or use header-based routing to pin specific users.

Traffic splitting is one of the simplest yet most powerful features in the Gateway API. It enables sophisticated deployment strategies with just a few lines of YAML. Combined with Istio's observability, you can confidently roll out changes knowing you can adjust the split at any time.
