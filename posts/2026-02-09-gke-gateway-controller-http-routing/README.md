# How to Use GKE Gateway Controller for Advanced HTTP Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GCP, GKE, Gateway API, Networking

Description: Learn how to configure GKE Gateway Controller with the Kubernetes Gateway API for advanced HTTP routing, traffic splitting, header-based routing, and multi-cluster ingress.

---

The GKE Gateway Controller implements the Kubernetes Gateway API, providing more powerful and flexible HTTP routing than traditional Ingress resources. It supports advanced traffic management features like weighted traffic splitting, header-based routing, URL rewrites, and multi-cluster load balancing through Google Cloud Load Balancer integration.

## Understanding Gateway API vs Ingress

The traditional Ingress API has limitations. It lacks support for traffic splitting, header-based routing, and delegation of route management. The Gateway API addresses these shortcomings with a more expressive and extensible resource model.

Gateway API separates infrastructure configuration (Gateway) from routing configuration (HTTPRoute). This separation allows platform teams to manage load balancer infrastructure while application teams configure their own routes without requiring cluster-wide permissions.

The hierarchy looks like this: GatewayClass defines the load balancer implementation, Gateway represents a specific load balancer instance, and HTTPRoute defines routing rules that attach to Gateways.

## Enabling Gateway Controller in GKE

GKE clusters version 1.24 and later support the Gateway API. Enable the Gateway API Standard channel if it is not already active:

```bash
# Enable Gateway API on existing cluster

gcloud container clusters update production-cluster \
  --gateway-api=standard \
  --region=us-central1

# Verify Gateway API is enabled
gcloud container clusters describe production-cluster \
  --region=us-central1 \
  --format="value(networkConfig.gatewayApiConfig.channel)"
```

For new clusters, enable during creation:

```bash
# Create cluster with Gateway API
gcloud container clusters create production-cluster \
  --gateway-api=standard \
  --region=us-central1 \
  --num-nodes=3 \
  --machine-type=n1-standard-4
```

The standard channel installs the Gateway API CRDs. For internal-only load balancers, use an internal GatewayClass such as gke-l7-rilb.

## Creating a Basic Gateway

Start with a simple Gateway that provisions a Google Cloud Load Balancer:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external-http
  namespace: default
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
```

Apply this configuration:

```bash
kubectl apply -f gateway.yaml

# Check Gateway status
kubectl get gateway external-http

# Get load balancer IP
kubectl get gateway external-http -o jsonpath='{.status.addresses[0].value}'
```

The Gateway provisions a global external HTTP(S) load balancer. GKE creates the necessary backend services, URL maps, and forwarding rules automatically.

## Configuring HTTPRoute for Path-Based Routing

HTTPRoute resources define how traffic routes to backend services. Here's a basic example with path-based routing:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-routes
  namespace: default
spec:
  parentRefs:
  - name: external-http
    namespace: default
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v1
    backendRefs:
    - name: api-v1-service
      port: 8080
  - matches:
    - path:
        type: PathPrefix
        value: /v2
    backendRefs:
    - name: api-v2-service
      port: 8080
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: api-default-service
      port: 8080
```

This configuration routes /v1 requests to api-v1-service, /v2 to api-v2-service, and everything else to api-default-service.

Apply and verify:

```bash
kubectl apply -f httproute.yaml

# Check route status
kubectl get httproute api-routes

# Describe for detailed status
kubectl describe httproute api-routes
```

## Implementing Weighted Traffic Splitting

Traffic splitting enables canary deployments and gradual rollouts. Split traffic between service versions by assigning weights:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-rollout
  namespace: production
spec:
  parentRefs:
  - name: external-http
    namespace: default
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: app-v2
      port: 8080
      weight: 10
    - name: app-v1
      port: 8080
      weight: 90
```

This configuration sends 10% of traffic to app-v2 and 90% to app-v1. Gradually increase the weight to app-v2 as confidence grows:

```bash
# Update weights for 50/50 split
kubectl patch httproute canary-rollout -n production --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/backendRefs/0/weight", "value": 50},
       {"op": "replace", "path": "/spec/rules/0/backendRefs/1/weight", "value": 50}]'
```

Monitor application metrics during the rollout. If issues arise, immediately shift traffic back:

```bash
# Rollback to v1
kubectl patch httproute canary-rollout -n production --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/backendRefs/0/weight", "value": 0},
       {"op": "replace", "path": "/spec/rules/0/backendRefs/1/weight", "value": 100}]'
```

## Header-Based Routing

Route traffic based on HTTP headers for A/B testing or routing specific clients to dedicated backends:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-routing
  namespace: default
spec:
  parentRefs:
  - name: external-http
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - headers:
      - name: X-User-Type
        value: premium
    backendRefs:
    - name: premium-backend
      port: 8080
  - matches:
    - headers:
      - name: X-Api-Version
        value: beta
    backendRefs:
    - name: beta-backend
      port: 8080
  - backendRefs:
    - name: default-backend
      port: 8080
```

Requests with X-User-Type: premium go to premium-backend, those with X-Api-Version: beta to beta-backend, and everything else to default-backend.

Test header-based routing:

```bash
# Request to premium backend
curl -H "X-User-Type: premium" http://app.example.com/

# Request to beta backend
curl -H "X-Api-Version: beta" http://app.example.com/

# Request to default backend
curl http://app.example.com/
```

## URL Rewrites and Redirects

Transform request URLs before they reach backend services:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: url-transforms
  namespace: default
spec:
  parentRefs:
  - name: external-http
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1
    filters:
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /v1
    backendRefs:
    - name: api-service
      port: 8080
  - matches:
    - path:
        type: PathPrefix
        value: /old-path
    filters:
    - type: RequestRedirect
      requestRedirect:
        scheme: https
        statusCode: 301
        path:
          type: ReplaceFullPath
          replaceFullPath: /new-path
```

The first rule rewrites /api/v1 to /v1 before forwarding to the backend. The second rule redirects /old-path to /new-path with a 301 permanent redirect.

## Request Header Manipulation

Add, modify, or remove headers in requests and responses:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-manipulation
  namespace: default
spec:
  parentRefs:
  - name: external-http
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: X-Request-Source
          value: gateway
        - name: X-Forwarded-Host
          value: app.example.com
        remove:
        - X-Internal-Header
    - type: ResponseHeaderModifier
      responseHeaderModifier:
        add:
        - name: X-Cache-Control
          value: max-age=3600
        remove:
        - X-Debug-Info
    backendRefs:
    - name: app-service
      port: 8080
```

This adds headers to requests before they reach the backend and modifies response headers before returning to clients.

## Multi-Cluster Ingress with Gateway API

GKE Gateway Controller supports multi-cluster ingress, distributing traffic across clusters in different regions:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-cluster-gateway
  namespace: default
spec:
  gatewayClassName: gke-l7-global-external-managed-mc
  listeners:
  - name: http
    protocol: HTTP
    port: 80
```

Configure HTTPRoute with backends in multiple clusters:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: multi-cluster-route
  namespace: default
spec:
  parentRefs:
  - name: multi-cluster-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - group: net.gke.io
      kind: ServiceImport
      name: app-service
      port: 8080
```

ServiceImport resources represent services exported from member clusters. Multi-cluster Gateway resources are deployed in the fleet's config cluster, and GKE distributes traffic to healthy backends across the fleet.

## TLS Configuration

Enable HTTPS with automated certificate management:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: https-gateway
  namespace: default
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: app-tls-cert
    allowedRoutes:
      namespaces:
        from: All
```

Create a TLS secret or use Certificate Manager for Google-managed certificates. The Gateway controller does not support the Ingress `ManagedCertificate` resource.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: https-gateway
  namespace: default
  annotations:
    networking.gke.io/certmap: app-cert-map
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    allowedRoutes:
      namespaces:
        from: All
```

For regional Gateways, reference Certificate Manager certificates in the Gateway listener:

```yaml
listeners:
- name: https
  protocol: HTTPS
  port: 443
  tls:
    mode: Terminate
    options:
      networking.gke.io/cert-manager-certs: app-cert
```

## Monitoring and Observability

GKE Gateway Controller integrates with Cloud Monitoring. View load balancer metrics:

```bash
# View request count metrics
gcloud monitoring time-series list \
  --filter='metric.type="loadbalancing.googleapis.com/https/request_count"' \
  --format=json

# Check backend health
gcloud compute backend-services describe <backend-service-name> \
  --global \
  --format="value(backends)"
```

Configure health checks for backend services with a HealthCheckPolicy:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  ports:
  - port: 8080
    targetPort: 8080
  selector:
    app: myapp
```

Create a HealthCheckPolicy for custom health checks:

```yaml
apiVersion: networking.gke.io/v1
kind: HealthCheckPolicy
metadata:
  name: app-healthcheck
spec:
  default:
    checkIntervalSec: 10
    timeoutSec: 5
    healthyThreshold: 2
    unhealthyThreshold: 3
    config:
      type: HTTP
      httpHealthCheck:
        portSpecification: USE_FIXED_PORT
        port: 8080
        requestPath: /healthz
  targetRef:
    group: ""
    kind: Service
    name: app-service
```

Gateway API in GKE provides powerful traffic management capabilities through Google Cloud Load Balancer integration. The declarative configuration model simplifies complex routing scenarios while maintaining flexibility for advanced use cases.
