# How to Configure Weighted Canary Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Canary Traffic, Weighted Routing, Deployments

Description: Step-by-step guide to configuring weighted traffic splitting in Istio for canary deployments with practical examples of progressive weight adjustment.

---

Weighted traffic splitting is the core mechanism behind canary deployments in Istio. You deploy a new version alongside the existing one, send a small percentage of traffic to it, and gradually increase that percentage as confidence grows. Istio's VirtualService makes this straightforward because it handles the traffic distribution at the Envoy proxy level, which means no changes to your application code or load balancer configuration.

This guide covers the nuts and bolts of setting up and managing weighted canary traffic in Istio.

## Prerequisites

Before configuring weighted routing, you need:
- An Istio mesh with sidecar injection enabled
- Two versions of your application deployed
- A Service that selects both versions
- A DestinationRule that defines subsets for each version

## Deploying Two Versions

Deploy the stable version and the canary version as separate Deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-v1
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
      version: v1
  template:
    metadata:
      labels:
        app: web-app
        version: v1
    spec:
      containers:
      - name: app
        image: web-app:1.0.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-v2
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-app
      version: v2
  template:
    metadata:
      labels:
        app: web-app
        version: v2
    spec:
      containers:
      - name: app
        image: web-app:2.0.0
        ports:
        - containerPort: 8080
```

Notice the canary (v2) starts with just 1 replica. You don't need many replicas when it's only handling a small percentage of traffic.

The Service selects both versions:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: production
spec:
  ports:
  - port: 80
    name: http
    targetPort: 8080
  selector:
    app: web-app
```

## Creating the DestinationRule

Define subsets that correspond to each version:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: web-app
  namespace: production
spec:
  host: web-app.production.svc.cluster.local
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Setting Initial Weights

Start with a small percentage going to the canary:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: web-app
  namespace: production
spec:
  hosts:
  - web-app.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: web-app.production.svc.cluster.local
        subset: v1
      weight: 95
    - destination:
        host: web-app.production.svc.cluster.local
        subset: v2
      weight: 5
```

The weights must add up to 100. With this configuration, 5% of requests go to v2 and 95% go to v1.

Apply it:

```bash
kubectl apply -f virtualservice.yaml
```

Verify the routing:

```bash
istioctl proxy-config routes deploy/web-app-v1 -n production --name "80" -o json
```

## Verifying Traffic Distribution

Generate some test traffic and check the distribution:

```bash
# Generate 1000 requests
for i in $(seq 1 1000); do
  curl -s -o /dev/null -w "%{http_code}" http://web-app.production/api/version
done
```

Check the metrics in Prometheus:

```promql
# Request count by version over the last 5 minutes
sum(increase(istio_requests_total{
  destination_service="web-app.production.svc.cluster.local"
}[5m])) by (destination_version)
```

You should see approximately 50 requests to v2 and 950 to v1 (with some variance due to random distribution).

## Progressive Weight Adjustment

Increase the canary weight in stages. Here's a typical progression:

**Stage 1: 5% (initial)**
```bash
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: web-app
  namespace: production
spec:
  hosts:
  - web-app.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: web-app.production.svc.cluster.local
        subset: v1
      weight: 95
    - destination:
        host: web-app.production.svc.cluster.local
        subset: v2
      weight: 5
EOF
```

**Stage 2: 25%**
```bash
kubectl patch virtualservice web-app -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 75},
  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 25}
]'
```

**Stage 3: 50%**
```bash
kubectl patch virtualservice web-app -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 50},
  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 50}
]'
```

**Stage 4: 100% (full promotion)**
```bash
kubectl patch virtualservice web-app -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 0},
  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 100}
]'
```

## Scaling Replicas with Traffic Weight

As you increase the canary's traffic weight, you need to scale up its replicas to handle the load:

```bash
# At 5%: 1 replica is usually fine
kubectl scale deployment web-app-v2 -n production --replicas=1

# At 25%: scale up proportionally
kubectl scale deployment web-app-v2 -n production --replicas=1

# At 50%: match the stable replica count
kubectl scale deployment web-app-v2 -n production --replicas=2

# At 100%: full replica count
kubectl scale deployment web-app-v2 -n production --replicas=3
```

The exact replica count depends on your pod's capacity. If each pod handles 1000 RPS and your service gets 4000 RPS total, at 25% canary weight you need at least 1 canary pod (1000 RPS) but probably 2 for safety.

## Rollback by Adjusting Weights

If the canary shows problems at any stage, roll back by setting its weight to 0:

```bash
kubectl patch virtualservice web-app -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
]'
```

This takes effect within seconds. All traffic immediately goes back to the stable version.

## Weighted Routing Through the Gateway

For external traffic through an Istio ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: web-gateway
  namespace: production
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - web-app.example.com
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: web-app-external
  namespace: production
spec:
  hosts:
  - web-app.example.com
  gateways:
  - web-gateway
  http:
  - route:
    - destination:
        host: web-app.production.svc.cluster.local
        subset: v1
      weight: 90
    - destination:
        host: web-app.production.svc.cluster.local
        subset: v2
      weight: 10
```

## Monitoring During Weighted Canary

Set up dashboards to compare versions side by side:

```promql
# Success rate by version
sum(rate(istio_requests_total{
  destination_service="web-app.production.svc.cluster.local",
  response_code!~"5.*"
}[5m])) by (destination_version)
/
sum(rate(istio_requests_total{
  destination_service="web-app.production.svc.cluster.local"
}[5m])) by (destination_version)

# P99 latency by version
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service="web-app.production.svc.cluster.local"
  }[5m])) by (le, destination_version)
)
```

## After Full Promotion

Once v2 is handling 100% of traffic and you're confident it's stable:

1. Update the v1 deployment to the new image (so the "stable" label maps to the new version)
2. Delete the v2 deployment
3. Simplify the VirtualService

```bash
# Update v1 deployment to the new version
kubectl set image deployment/web-app-v1 app=web-app:2.0.0 -n production

# Clean up v2
kubectl delete deployment web-app-v2 -n production

# Reset VirtualService to single destination
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: web-app
  namespace: production
spec:
  hosts:
  - web-app.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: web-app.production.svc.cluster.local
        subset: v1
      weight: 100
EOF
```

Weighted canary traffic in Istio is a controlled, observable way to roll out changes. Each weight adjustment is a single kubectl command, rollback is instant, and Istio's metrics tell you exactly how each version is performing at every stage.
