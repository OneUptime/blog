# How to Set Up Traffic Splitting in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Traffic Splitting, Canary Deployment, Istio, Service Mesh

Description: Implement traffic splitting in Rancher for canary deployments, A/B testing, and gradual rollouts using Istio VirtualServices or SMI TrafficSplit resources.

## Introduction

Traffic splitting allows you to route a percentage of traffic to different versions of a service, enabling canary deployments, A/B testing, and blue-green deployments without taking services offline. This guide covers implementing traffic splitting on a Rancher-managed cluster using Istio, SMI-compatible meshes, and the ingress-nginx controller.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Istio or another compatible service mesh installed for Methods 1-3
- ingress-nginx installed for Method 4
- kubectl with cluster-admin access
- Two versions of a service deployed

## Method 1: Traffic Splitting with Istio

### Deploy Multiple Service Versions

```yaml
# backend-v1.yaml - Version 1 deployment

apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-v1
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
      version: v1
  template:
    metadata:
      labels:
        app: backend
        version: v1
    spec:
      containers:
        - name: backend
          image: registry.example.com/backend:v1.0
          ports:
            - containerPort: 8080
---
# backend-v2.yaml - Version 2 deployment (canary)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-v2
  namespace: production
spec:
  replicas: 1  # Start with minimal replicas for canary
  selector:
    matchLabels:
      app: backend
      version: v2
  template:
    metadata:
      labels:
        app: backend
        version: v2
    spec:
      containers:
        - name: backend
          image: registry.example.com/backend:v2.0
          ports:
            - containerPort: 8080
---
# backend-service.yaml - Stable service name used by Istio routing
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: production
spec:
  selector:
    app: backend
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

### Create a DestinationRule with Subsets

```yaml
# destination-rule.yaml - Define version subsets
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-destination
  namespace: production
spec:
  host: backend
  trafficPolicy:
    # Default load balancing
    loadBalancer:
      simple: LEAST_REQUEST
  subsets:
    # Stable version subset
    - name: v1
      labels:
        version: v1
    # Canary version subset
    - name: v2
      labels:
        version: v2
```

### Configure Traffic Split with VirtualService

```yaml
# virtual-service-canary.yaml - 90/10 traffic split
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-vs
  namespace: production
spec:
  hosts:
    - backend
  http:
    - name: canary-routing
      route:
        # 90% of traffic to stable v1
        - destination:
            host: backend
            subset: v1
          weight: 90
        # 10% of traffic to canary v2
        - destination:
            host: backend
            subset: v2
          weight: 10
```

### Gradually Increase Canary Traffic

```bash
#!/bin/bash
# progressive-canary.sh - Gradually shift traffic to v2

STAGES=(10 25 50 75 100)

for STAGE in "${STAGES[@]}"; do
  V1_WEIGHT=$((100 - STAGE))
  V2_WEIGHT=$STAGE

  echo "Setting traffic: v1=${V1_WEIGHT}%, v2=${V2_WEIGHT}%"

  kubectl patch virtualservice backend-vs -n production \
    --type='json' \
    -p="[
      {\"op\": \"replace\", \"path\": \"/spec/http/0/route/0/weight\", \"value\": $V1_WEIGHT},
      {\"op\": \"replace\", \"path\": \"/spec/http/0/route/1/weight\", \"value\": $V2_WEIGHT}
    ]"

  echo "Waiting 5 minutes before next stage..."
  sleep 300

  # Confirm the canary deployment stays healthy before proceeding
  if ! kubectl rollout status deployment/backend-v2 -n production --timeout=2m; then
    echo "Canary deployment is unhealthy, rolling back!"
    # Rollback to v1
    kubectl patch virtualservice backend-vs -n production \
      --type='json' \
      -p='[
        {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
        {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
      ]'
    exit 1
  fi
done
```

## Method 2: Header-Based Traffic Routing

Route specific users or testers to the canary version:

```yaml
# header-based-routing.yaml - Route beta users to v2
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-vs
  namespace: production
spec:
  hosts:
    - backend
  http:
    # Route requests with x-version: v2 header to canary
    - name: canary-header-routing
      match:
        - headers:
            x-version:
              exact: v2
      route:
        - destination:
            host: backend
            subset: v2
          weight: 100
    # All other traffic goes to stable v1
    - name: stable-routing
      route:
        - destination:
            host: backend
            subset: v1
          weight: 100
```

## Method 3: SMI Traffic Split (OSM, or Linkerd with the SMI extension)

For SMI-compatible controllers. If you're using Linkerd, TrafficSplit requires the Linkerd SMI extension; newer Linkerd setups prefer HTTPRoute for traffic shifting. On meshes that enforce SMI access policies, create the required traffic access resource as well (for example, a `TrafficTarget` in OSM).

```yaml
# smi-traffic-split.yaml - SMI-compliant traffic splitting
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: backend-split
  namespace: production
spec:
  # The root service (clients connect to this)
  service: backend.production.svc.cluster.local
  backends:
    # Stable version
    - service: backend-v1
      weight: 900  # 90%
    # Canary version
    - service: backend-v2
      weight: 100  # 10%
```

Ensure the versioned services exist:

```yaml
# backend-v1-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-v1
  namespace: production
spec:
  selector:
    app: backend
    version: v1
  ports:
    - port: 8080
---
# backend-v2-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-v2
  namespace: production
spec:
  selector:
    app: backend
    version: v2
  ports:
    - port: 8080
```

## Method 4: ingress-nginx Traffic Splitting

For traffic splitting at the ingress level without a service mesh, create a primary Ingress and a canary Ingress with the same host and path:

```yaml
# backend-stable-ingress.yaml - Primary ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-stable
  namespace: production
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-v1
                port:
                  number: 8080
---
# backend-canary-ingress.yaml - ingress-nginx canary ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-canary
  namespace: production
  annotations:
    # Enable canary functionality
    nginx.ingress.kubernetes.io/canary: "true"
    # Send 10% of traffic to canary
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-v2
                port:
                  number: 8080
```

## Monitoring Traffic Split

```bash
# Confirm the current weights in the VirtualService
kubectl get virtualservice backend-vs -n production -o jsonpath='{range .spec.http[0].route[*]}{.destination.subset}:{.weight}{"\n"}{end}'

# Open Kiali to inspect request and error rates per version
istioctl dashboard kiali

# Inspect which Istio resources affect the canary pod
istioctl experimental describe pod $(kubectl get pod -n production -l app=backend,version=v2 -o jsonpath='{.items[0].metadata.name}') -n production
```

## Conclusion

Traffic splitting is an essential capability for safe production deployments. Istio's VirtualService provides the most flexible and powerful traffic management with weight-based, header-based, and fault injection capabilities. For SMI-compliant meshes, the TrafficSplit resource provides a portable approach. Always implement automated rollback mechanisms triggered by health or error rate thresholds to ensure canary deployments don't negatively impact production users.
