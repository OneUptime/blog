# How to Set Up Weighted Load Balancing in DestinationRule

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Weighted Load Balancing, DestinationRule, VirtualService, Canary Deployments

Description: Set up weighted load balancing in Istio to gradually shift traffic between service versions using DestinationRule and VirtualService.

---

Weighted load balancing lets you control what percentage of traffic goes to different groups of pods. This is the core mechanism behind canary deployments, blue-green releases, and gradual rollouts in Istio. You define the groups (subsets) in a DestinationRule and assign weights to them in a VirtualService.

It is worth noting upfront that the weights themselves are not configured in the DestinationRule - they live in the VirtualService. The DestinationRule defines the subsets and their traffic policies. But you need both resources working together to achieve weighted traffic splitting.

## The Basic Pattern

Step 1: Define subsets in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
spec:
  host: my-app
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Step 2: Assign weights in a VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 90
    - destination:
        host: my-app
        subset: v2
      weight: 10
```

90% of traffic goes to v1 pods, 10% goes to v2 pods. The weights must add up to 100.

## Deploying the Service Versions

You need separate deployments with matching labels:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v1
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
        image: my-app:1.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v2
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
    spec:
      containers:
      - name: app
        image: my-app:2.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

The Kubernetes Service selects all pods with `app: my-app`. Without Istio, traffic would be distributed across all 7 pods equally. With the VirtualService weight configuration, 90% goes to the 5 v1 pods and 10% goes to the 2 v2 pods.

## Gradual Rollout Strategy

A typical canary rollout progresses through multiple weight adjustments:

```bash
# Stage 1: 5% canary
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 95
    - destination:
        host: my-app
        subset: v2
      weight: 5
EOF

# Monitor for errors...

# Stage 2: 25% canary
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 75
    - destination:
        host: my-app
        subset: v2
      weight: 25
EOF

# Monitor for errors...

# Stage 3: 50/50
# Stage 4: 100% v2
```

Each stage is just a VirtualService update. The DestinationRule stays the same throughout.

## Adding Traffic Policies to Subsets

The real power comes from combining weights with different traffic policies per subset:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
spec:
  host: my-app
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      loadBalancer:
        simple: ROUND_ROBIN
      connectionPool:
        tcp:
          maxConnections: 200
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        simple: LEAST_REQUEST
      connectionPool:
        tcp:
          maxConnections: 20
      outlierDetection:
        consecutive5xxErrors: 2
        interval: 5s
        baseEjectionTime: 60s
```

The canary (v2) gets:
- Tighter connection limits (20 instead of 200)
- Stricter outlier detection (eject after 2 errors)
- Least request load balancing (adapts to variable latency)

## Three-Way Traffic Split

You can split traffic across more than two subsets:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
spec:
  host: my-app
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
  - name: v3
    labels:
      version: v3
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 70
    - destination:
        host: my-app
        subset: v2
      weight: 20
    - destination:
        host: my-app
        subset: v3
      weight: 10
```

v1 gets 70%, v2 gets 20%, v3 gets 10%. All weights must add up to 100.

## Weighted Routing with Header Overrides

A useful pattern for testing is to route based on headers for specific users, with weighted routing as the default:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
spec:
  hosts:
  - my-app
  http:
  - match:
    - headers:
        x-test-version:
          exact: v2
    route:
    - destination:
        host: my-app
        subset: v2
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 95
    - destination:
        host: my-app
        subset: v2
      weight: 5
```

Testers can force their traffic to v2 by setting the `x-test-version: v2` header. Everyone else gets the 95/5 split.

## Verifying Weight Distribution

Send a batch of requests and count which subset handles them:

```bash
kubectl run curl-test --image=curlimages/curl -it --rm -- sh -c '
for i in $(seq 1 1000); do
  curl -s http://my-app:8080/version 2>/dev/null
done | sort | uniq -c | sort -rn
'
```

With a 90/10 split over 1000 requests, you should see roughly 900 responses from v1 and 100 from v2. The actual numbers will vary somewhat due to randomness.

## Weight Accuracy at Low Volumes

Weights are probabilistic. At low request volumes, the actual distribution can deviate significantly from the configured weights. If you set 1% to canary but only get 50 requests per minute, you might see 0 or 2 canary requests instead of the expected 0.5.

For accurate weight distribution, you need a reasonable volume of traffic. The higher the volume, the closer the actual distribution matches the configured weights.

## Cleanup

```bash
kubectl delete virtualservice my-app-vs
kubectl delete destinationrule my-app-dr
kubectl delete deployment my-app-v1 my-app-v2
kubectl delete service my-app
```

Weighted load balancing is the backbone of progressive delivery in Istio. The DestinationRule defines your subsets and their individual traffic policies, and the VirtualService controls the traffic split. Gradually adjusting the weights while monitoring error rates and latency gives you a safe, controlled rollout process. Start small (1-5%), increase incrementally, and always have the ability to roll back by shifting weight back to the stable version.
