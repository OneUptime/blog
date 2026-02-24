# How to Handle Deployment Strategies with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Deployment Strategies, Canary, Blue-Green, Kubernetes

Description: A practical comparison of canary, blue-green, and rolling deployment strategies using Istio traffic management in Kubernetes.

---

Istio gives you fine-grained control over how traffic flows between service versions, which opens up deployment strategies that plain Kubernetes can't handle on its own. With standard Kubernetes rolling updates, you're limited to pod-by-pod replacement. With Istio, you can route exact percentages of traffic, match on headers, and make instant switches between versions.

The three main strategies you'll use with Istio are canary deployments, blue-green deployments, and traffic mirroring. Each has different trade-offs in terms of risk, resource usage, and complexity.

## Strategy 1: Canary Deployment

Canary deployments gradually shift traffic from the old version to the new version. If problems show up, only a small percentage of users are affected.

Start by having both versions deployed:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v1
  namespace: default
spec:
  replicas: 3
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
      - name: my-app
        image: my-registry/my-app:v1
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v2
  namespace: default
spec:
  replicas: 1
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
      - name: my-app
        image: my-registry/my-app:v2
        ports:
        - containerPort: 8080
```

Set up the Istio resources:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
  namespace: default
spec:
  host: my-app
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
  namespace: default
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
```

Gradually increase the canary weight as you gain confidence:

```bash
# Shift to 20%
kubectl patch virtualservice my-app-vsvc -n default --type=json \
  -p='[{"op":"replace","path":"/spec/http/0/route/0/weight","value":80},{"op":"replace","path":"/spec/http/0/route/1/weight","value":20}]'

# Shift to 50%
kubectl patch virtualservice my-app-vsvc -n default --type=json \
  -p='[{"op":"replace","path":"/spec/http/0/route/0/weight","value":50},{"op":"replace","path":"/spec/http/0/route/1/weight","value":50}]'

# Full rollout
kubectl patch virtualservice my-app-vsvc -n default --type=json \
  -p='[{"op":"replace","path":"/spec/http/0/route/0/weight","value":0},{"op":"replace","path":"/spec/http/0/route/1/weight","value":100}]'
```

**When to use canary:** When you want to minimize blast radius and can tolerate running both versions simultaneously. Good for backend services where a small percentage of errors is acceptable during the rollout window.

## Strategy 2: Blue-Green Deployment

Blue-green gives you two identical environments. Traffic goes entirely to one (blue) while you prepare and test the other (green). When ready, you switch all traffic at once.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: blue
      weight: 100
    - destination:
        host: my-app
        subset: green
      weight: 0
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
  namespace: default
spec:
  host: my-app
  subsets:
  - name: blue
    labels:
      version: blue
  - name: green
    labels:
      version: green
```

Deploy the new version to the green subset, test it through a separate preview route:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-preview
  namespace: default
spec:
  hosts:
  - my-app-preview.example.com
  http:
  - route:
    - destination:
        host: my-app
        subset: green
```

When ready, switch traffic:

```bash
kubectl patch virtualservice my-app-vsvc -n default --type=json \
  -p='[{"op":"replace","path":"/spec/http/0/route/0/weight","value":0},{"op":"replace","path":"/spec/http/0/route/1/weight","value":100}]'
```

To roll back, switch back:

```bash
kubectl patch virtualservice my-app-vsvc -n default --type=json \
  -p='[{"op":"replace","path":"/spec/http/0/route/0/weight","value":100},{"op":"replace","path":"/spec/http/0/route/1/weight","value":0}]'
```

**When to use blue-green:** When you need instant rollback capability and can afford to run double the resources. Good for critical user-facing services where you can't tolerate any errors reaching users.

## Strategy 3: Traffic Mirroring (Shadow Deployment)

Traffic mirroring sends a copy of live traffic to the new version without affecting real users. The mirrored requests are fire-and-forget: responses from the mirror are discarded.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
    mirror:
      host: my-app
      subset: v2
    mirrorPercentage:
      value: 100
```

This routes all real traffic to v1 and mirrors 100% of it to v2. You can reduce the mirror percentage for high-traffic services:

```yaml
    mirrorPercentage:
      value: 10
```

Check the v2 logs and metrics to see how it handles real-world traffic patterns without any user impact.

**When to use mirroring:** Before any production release. It lets you validate behavior with real traffic patterns, catch bugs, and compare performance without any risk to users.

## Strategy 4: Header-Based Routing (Dark Launch)

Route specific users to the new version based on a header or cookie:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: my-app
        subset: v2
  - route:
    - destination:
        host: my-app
        subset: v1
```

Internal testers add the `x-canary: true` header to reach the new version. Everyone else gets the stable version.

**When to use header routing:** For testing new features with internal users before any public rollout. Great for QA and dogfooding.

## Combining Strategies

You can chain strategies together for a belt-and-suspenders approach:

1. **Mirror** traffic to the new version first
2. **Dark launch** to internal testers using headers
3. **Canary** rollout starting at 5% to real users
4. **Full rollout** once canary metrics look good

Here's a VirtualService that does header routing and canary simultaneously:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: my-app
        subset: v2
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

Internal testers always get v2 through the header match (first rule). Everyone else gets 90/10 canary split (second rule).

## Monitoring During Deployment

Regardless of which strategy you use, monitor these Istio metrics during rollout:

```bash
# Error rate comparison between versions
# v1 error rate
istioctl dashboard prometheus
# Query: sum(rate(istio_requests_total{destination_workload="my-app-v1",response_code=~"5.*"}[5m])) / sum(rate(istio_requests_total{destination_workload="my-app-v1"}[5m]))

# v2 error rate
# Query: sum(rate(istio_requests_total{destination_workload="my-app-v2",response_code=~"5.*"}[5m])) / sum(rate(istio_requests_total{destination_workload="my-app-v2"}[5m]))
```

If the new version's error rate or latency is significantly worse than the old version, roll back immediately.

Each strategy has its place. For most teams, canary deployments with Istio give the best balance of safety and simplicity. Blue-green is great when you need zero-risk switching. Traffic mirroring is perfect for pre-production validation. Mix and match based on how critical the service is and how much risk you're comfortable with.
