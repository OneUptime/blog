# How to Set Up Traffic Management with a Service Mesh via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Service Mesh, Traffic Management, Kubernetes, Istio

Description: Configure advanced traffic management rules including canary deployments, circuit breaking, and traffic shifting using a service mesh deployed via Portainer.

## Introduction

Traffic management is one of the most powerful features of a service mesh. It allows you to control how traffic flows between services without changing application code. With Portainer managing your service mesh deployment, you can configure canary deployments, A/B testing, circuit breaking, retries, and timeouts all through declarative Kubernetes manifests applied via Portainer.

## Prerequisites

- Portainer connected to a Kubernetes cluster
- Istio installed, with the `production` namespace enrolled in the mesh (for example, sidecar injection enabled)
- Basic understanding of Kubernetes services and deployments
- kubectl CLI access for verification

## Traffic Management Concepts

Istio provides several traffic management primitives:

- **VirtualService**: Defines routing rules for traffic to a service
- **DestinationRule**: Defines policies for traffic after routing (circuit breaking, load balancing)
- **Gateway**: Manages inbound/outbound traffic at the mesh boundary
- **ServiceEntry**: Adds external services to the mesh registry

## Step 1: Deploy Multiple Service Versions

First, deploy both versions of your application via Portainer's Kubernetes application manifest workflow:

```yaml
# app-v1-v2.yaml - Deploy via Portainer Kubernetes manifest

apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v1
  namespace: production
  labels:
    app: my-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
      version: v1
  template:
    metadata:
      labels:
        app: my-service
        version: v1
    spec:
      containers:
      - name: my-service
        image: my-registry/my-service:v1.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v2
  namespace: production
  labels:
    app: my-service
    version: v2
spec:
  replicas: 1  # Start with fewer replicas for canary
  selector:
    matchLabels:
      app: my-service
      version: v2
  template:
    metadata:
      labels:
        app: my-service
        version: v2
    spec:
      containers:
      - name: my-service
        image: my-registry/my-service:v2.0.0
        ports:
        - containerPort: 8080
---
# Single service that selects both versions
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: production
spec:
  selector:
    app: my-service  # Selects both v1 and v2
  ports:
  - port: 80
    targetPort: 8080
```

## Step 2: Configure Traffic Shifting (Canary Deployment)

Apply a VirtualService to control traffic distribution:

```yaml
# virtualservice-canary.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - name: "canary-route"
    match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: my-service
        subset: v2
  - name: "primary-route"
    route:
    # Send 90% of traffic to v1, 10% to v2
    - destination:
        host: my-service
        subset: v1
      weight: 90
    - destination:
        host: my-service
        subset: v2
      weight: 10
---
# DestinationRule defines the subsets (v1 and v2)
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: production
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
  trafficPolicy:
    # Configure load balancing
    loadBalancer:
      simple: LEAST_REQUEST
    # Connection pool settings
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 1000
        http2MaxRequests: 1000
```

Apply these via Portainer's **Applications** > **Add application** > **Create from manifest** flow. For the later examples, update this same `my-service-vs` and `my-service-dr` instead of applying separate resources for the same host.

## Step 3: Configure Circuit Breaking

Protect services from cascading failures by updating the same DestinationRule with circuit breaking:

```yaml
# circuit-breaker.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: production
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        # Maximum pending HTTP/1.1 requests
        http1MaxPendingRequests: 1000
        # Maximum active HTTP/2 requests
        http2MaxRequests: 10000
    outlierDetection:
      # Eject a host after 5 consecutive 5xx errors
      consecutive5xxErrors: 5
      # Scan every 1 second
      interval: 1s
      # Keep ejected for 30 seconds
      baseEjectionTime: 30s
      # Maximum 50% of hosts can be ejected
      maxEjectionPercent: 50
      # Disable outlier detection if fewer than 50% of hosts are healthy
      minHealthPercent: 50
```

## Step 4: Configure Retries and Timeouts

Add resilience by updating the VirtualService with retries and timeouts:

```yaml
# retries-timeouts.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - name: "canary-route"
    match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: my-service
        subset: v2
  - name: "primary-route"
    route:
    - destination:
        host: my-service
        subset: v1
      weight: 90
    - destination:
        host: my-service
        subset: v2
      weight: 10
    # Timeout for the entire request, including retries
    timeout: 10s
    # Retry configuration
    retries:
      # Retry 3 times
      attempts: 3
      # Timeout for each try
      perTryTimeout: 2s
      # Only retry on these conditions
      retryOn: gateway-error,connect-failure,retriable-4xx
```

## Step 5: Configure Traffic Mirroring

Update the VirtualService to mirror production traffic to a new version for testing without impact:

```yaml
# traffic-mirroring.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: 100
    # Mirror 50% of traffic to v2 for shadow testing
    mirror:
      host: my-service
      subset: v2
    mirrorPercentage:
      value: 50.0
```

## Step 6: A/B Testing with Header-Based Routing

Route specific users to different versions:

```yaml
# ab-testing.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: production
spec:
  hosts:
  - my-service
  http:
  # Beta users get v2
  - match:
    - headers:
        user-group:
          exact: beta
    route:
    - destination:
        host: my-service
        subset: v2
  # Premium users get v1 (stable)
  - match:
    - headers:
        user-group:
          exact: premium
    route:
    - destination:
        host: my-service
        subset: v1
  # Everyone else gets v1
  - route:
    - destination:
        host: my-service
        subset: v1
```

## Step 7: Progressive Traffic Shifting

Gradually increase traffic to v2 by updating the weights in Portainer:

```bash
# Phase 1: 90/10 split (monitor metrics)
# Phase 2: 75/25 split
# Phase 3: 50/50 split
# Phase 4: 25/75 split
# Phase 5: 0/100 - v2 fully promoted
```

Update the VirtualService weight via Portainer's application manifest editor each phase.

## Monitoring Traffic Distribution

Verify traffic distribution through Prometheus:

```bash
# Check traffic distribution
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum by (destination_version) (rate(istio_requests_total{destination_service_name="my-service",destination_service_namespace="production",reporter="destination"}[5m]))'
```

Or access the Kiali dashboard for visual traffic management:

1. Port-forward to the Kiali service: `kubectl port-forward -n istio-system svc/kiali 20001:20001`
2. Navigate to `https://localhost:20001/` and open the Graph view
3. Filter by namespace `production`

## Conclusion

Traffic management via a service mesh deployed with Portainer gives platform teams powerful tools for safe deployments and resilient architectures. By combining canary deployments, circuit breakers, retries, and traffic mirroring in Portainer-managed Kubernetes manifests, you can gradually roll out new features while protecting production stability. The declarative approach means all traffic policies can be version-controlled in Git and deployed through your existing GitOps pipeline integrated with Portainer.
