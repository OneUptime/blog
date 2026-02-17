# How to Use Traffic Director with GKE Gateway API for Advanced Ingress Routing on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Traffic Director, Gateway API, GKE, Ingress Routing, Google Cloud

Description: Set up Traffic Director with the GKE Gateway API for advanced ingress routing including path-based routing, header matching, and traffic splitting on GCP.

---

The Kubernetes Gateway API is the successor to the Ingress resource, and on GKE, it integrates directly with Traffic Director to give you advanced routing capabilities that Ingress never supported. While Ingress gives you basic host and path routing, the Gateway API adds header matching, query parameter routing, traffic splitting, request mirroring, URL rewrites, and more.

This guide shows you how to set up the GKE Gateway API with Traffic Director and configure advanced routing patterns.

## Why Gateway API Over Ingress

The traditional Kubernetes Ingress resource has served its purpose, but it has real limitations. Different ingress controllers interpret the same Ingress spec differently. Advanced routing requires non-standard annotations that are controller-specific. There is no standard way to do traffic splitting or header-based routing.

The Gateway API solves these problems with a richer, more expressive resource model. On GKE, the Gateway API is implemented by Traffic Director, which means you get Google's global load balancing infrastructure and Envoy-based traffic management.

## Prerequisites

You need a GKE cluster version 1.24 or later with the Gateway API enabled.

```bash
# Create a GKE cluster with Gateway API support
gcloud container clusters create gateway-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --gateway-api=standard \
  --project=my-project

# Verify Gateway API CRDs are installed
kubectl get crd | grep gateway
```

You should see resources like `gateways.gateway.networking.k8s.io`, `httproutes.gateway.networking.k8s.io`, and `gatewayclasses.gateway.networking.k8s.io`.

## Creating a Gateway

The Gateway resource defines the entry point for traffic. On GKE, you choose a GatewayClass that determines the type of load balancer.

```yaml
# gateway.yaml
# Internal gateway using Traffic Director for service mesh routing
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: internal-gateway
  namespace: production
spec:
  # GKE provides several GatewayClasses
  # gke-l7-rilb: Regional internal HTTP(S) load balancer
  # gke-l7-gxlb: Global external HTTP(S) load balancer
  # gke-l7-regional-external-managed: Regional external HTTP(S) load balancer
  gatewayClassName: gke-l7-rilb
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: Same
    - name: https
      port: 443
      protocol: HTTPS
      tls:
        mode: Terminate
        certificateRefs:
          - name: my-tls-cert
      allowedRoutes:
        namespaces:
          from: Same
```

```bash
kubectl apply -f gateway.yaml

# Check the Gateway status and get the assigned IP
kubectl get gateway internal-gateway -n production
```

## Deploying Sample Services

Deploy a few services to demonstrate routing patterns.

```yaml
# services.yaml
# Multiple services for routing demonstrations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: gcr.io/my-project/frontend:v1
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: production
spec:
  selector:
    app: frontend
  ports:
    - port: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v1
  namespace: production
spec:
  replicas: 3
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
          image: gcr.io/my-project/api:v1
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-v1
  namespace: production
spec:
  selector:
    app: api
    version: v1
  ports:
    - port: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v2
  namespace: production
spec:
  replicas: 2
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
          image: gcr.io/my-project/api:v2
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-v2
  namespace: production
spec:
  selector:
    app: api
    version: v2
  ports:
    - port: 8080
```

## Advanced Routing Patterns

### Path-Based Routing

Route different URL paths to different backend services.

```yaml
# httproute-path-routing.yaml
# Routes traffic to different backends based on URL path
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: path-based-routes
  namespace: production
spec:
  parentRefs:
    - name: internal-gateway
  hostnames:
    - "app.example.com"
  rules:
    # Frontend serves the root path and static assets
    - matches:
        - path:
            type: PathPrefix
            value: "/"
      backendRefs:
        - name: frontend
          port: 8080

    # API requests go to the API service
    - matches:
        - path:
            type: PathPrefix
            value: "/api/v1"
      backendRefs:
        - name: api-v1
          port: 8080

    # API v2 requests go to the new API version
    - matches:
        - path:
            type: PathPrefix
            value: "/api/v2"
      backendRefs:
        - name: api-v2
          port: 8080
```

### Header-Based Routing with Path Matching

Combine header and path matching for more specific routing rules.

```yaml
# httproute-header-path-combo.yaml
# Combines header matching with path matching
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: combo-routes
  namespace: production
spec:
  parentRefs:
    - name: internal-gateway
  hostnames:
    - "app.example.com"
  rules:
    # Beta users hitting the API get routed to v2
    - matches:
        - path:
            type: PathPrefix
            value: "/api"
          headers:
            - name: X-Beta
              value: "true"
      backendRefs:
        - name: api-v2
          port: 8080

    # Regular API traffic goes to v1
    - matches:
        - path:
            type: PathPrefix
            value: "/api"
      backendRefs:
        - name: api-v1
          port: 8080
```

### Traffic Splitting for Canary Releases

Gradually shift traffic between service versions.

```yaml
# httproute-traffic-split.yaml
# Progressive canary deployment with traffic splitting
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-canary-route
  namespace: production
spec:
  parentRefs:
    - name: internal-gateway
  hostnames:
    - "app.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: "/api"
      backendRefs:
        - name: api-v1
          port: 8080
          weight: 90
        - name: api-v2
          port: 8080
          weight: 10
```

### URL Rewriting

Rewrite the URL path before forwarding to the backend.

```yaml
# httproute-url-rewrite.yaml
# Rewrite URL paths before sending to backends
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: url-rewrite-routes
  namespace: production
spec:
  parentRefs:
    - name: internal-gateway
  rules:
    # Rewrite /legacy/users to /api/v1/users
    - matches:
        - path:
            type: PathPrefix
            value: "/legacy"
      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: "/api/v1"
      backendRefs:
        - name: api-v1
          port: 8080
```

### Request Header Modification

Add, modify, or remove headers before the request reaches the backend.

```yaml
# httproute-header-modification.yaml
# Modify request and response headers
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-mod-routes
  namespace: production
spec:
  parentRefs:
    - name: internal-gateway
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: "/api"
      filters:
        # Add headers to the request going to the backend
        - type: RequestHeaderModifier
          requestHeaderModifier:
            add:
              - name: X-Gateway-Source
                value: "gke-gateway"
              - name: X-Forwarded-Env
                value: "production"
            remove:
              - "X-Internal-Debug"
        # Add headers to the response going back to the client
        - type: ResponseHeaderModifier
          responseHeaderModifier:
            add:
              - name: X-Served-By
                value: "traffic-director"
      backendRefs:
        - name: api-v1
          port: 8080
```

### Request Mirroring

Mirror traffic to a secondary service for testing without affecting the response.

```yaml
# httproute-mirroring.yaml
# Mirror production traffic to a shadow service for testing
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: mirror-routes
  namespace: production
spec:
  parentRefs:
    - name: internal-gateway
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: "/api"
      filters:
        # Mirror traffic to v2 for testing
        - type: RequestMirror
          requestMirror:
            backendRef:
              name: api-v2
              port: 8080
      # Primary traffic still goes to v1
      backendRefs:
        - name: api-v1
          port: 8080
```

## Monitoring Gateway Routes

Check the status of your routes and gateway.

```bash
# View gateway status including assigned IP and conditions
kubectl describe gateway internal-gateway -n production

# Check HTTPRoute status to verify routes are accepted
kubectl describe httproute path-based-routes -n production

# List all routes attached to the gateway
kubectl get httproute -n production
```

## Health Checks and Backend Policies

Configure health check behavior using GKE-specific policies.

```yaml
# healthcheck-policy.yaml
# Configure backend health check behavior
apiVersion: networking.gke.io/v1
kind: HealthCheckPolicy
metadata:
  name: api-health-check
  namespace: production
spec:
  default:
    checkIntervalSec: 10
    timeoutSec: 5
    healthyThreshold: 2
    unhealthyThreshold: 3
    config:
      type: HTTP
      httpHealthCheck:
        port: 8080
        requestPath: /health
  targetRef:
    group: ""
    kind: Service
    name: api-v1
```

The GKE Gateway API with Traffic Director gives you a powerful, Kubernetes-native way to manage advanced ingress routing. The declarative resource model makes routing rules version-controlled and auditable, while Traffic Director handles the heavy lifting of configuring load balancers and Envoy proxies behind the scenes.
