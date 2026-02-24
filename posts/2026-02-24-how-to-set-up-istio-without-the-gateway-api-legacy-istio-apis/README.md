# How to Set Up Istio Without the Gateway API (Legacy Istio APIs)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, VirtualService, Kubernetes, Service Mesh, Networking

Description: A practical guide to configuring Istio using the classic Istio networking APIs including Gateway, VirtualService, and DestinationRule resources.

---

Istio has been moving toward the Kubernetes Gateway API as the recommended way to handle ingress traffic. But plenty of production clusters still run the classic Istio APIs - Gateway, VirtualService, DestinationRule, and ServiceEntry. These APIs are not going away anytime soon, and they actually offer more fine-grained control in some scenarios.

If you are running Istio and prefer to stick with the battle-tested Istio networking APIs, here is how to set everything up from scratch.

## Installing Istio for Classic API Usage

Install Istio with the ingress gateway enabled:

```yaml
# istio-classic.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
  meshConfig:
    accessLogFile: /dev/stdout
```

```bash
istioctl install -f istio-classic.yaml -y
```

Or using Helm:

```bash
helm install istio-base istio/base -n istio-system --create-namespace
helm install istiod istio/istiod -n istio-system
helm install istio-ingress istio/gateway -n istio-ingress --create-namespace
```

## The Classic Istio API Resources

Here is a quick overview of the resources you will be working with:

- **Gateway** - Configures a load balancer at the edge of the mesh (ports, protocols, TLS)
- **VirtualService** - Routes traffic to specific destinations based on URI, headers, etc.
- **DestinationRule** - Configures how traffic is handled after routing (load balancing, circuit breaking, TLS)
- **ServiceEntry** - Adds external services to the mesh's service registry
- **Sidecar** - Controls the scope of sidecar proxy configuration

## Configuring a Gateway

The Gateway resource tells the ingress gateway what ports and protocols to listen on:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-ingress
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
        - "api.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: example-tls-cert
      hosts:
        - "app.example.com"
        - "api.example.com"
```

The `selector` field matches labels on the gateway pod. The `credentialName` references a Kubernetes Secret in the same namespace as the gateway.

Create the TLS secret:

```bash
kubectl create secret tls example-tls-cert \
  -n istio-ingress \
  --cert=tls.crt \
  --key=tls.key
```

## HTTP to HTTPS Redirect

Redirect all HTTP traffic to HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-ingress
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
      tls:
        httpsRedirect: true
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: example-tls-cert
      hosts:
        - "app.example.com"
```

## Routing with VirtualService

VirtualService defines how requests get routed to your services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-routes
  namespace: my-app
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-ingress/my-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-v1.my-app.svc.cluster.local
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api/v2
      route:
        - destination:
            host: api-v2.my-app.svc.cluster.local
            port:
              number: 8080
    - route:
        - destination:
            host: frontend.my-app.svc.cluster.local
            port:
              number: 80
```

### Header-Based Routing

Route based on request headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
  namespace: my-app
spec:
  hosts:
    - "api.example.com"
  gateways:
    - istio-ingress/my-gateway
  http:
    - match:
        - headers:
            x-api-version:
              exact: "beta"
      route:
        - destination:
            host: api-beta.my-app.svc.cluster.local
            port:
              number: 8080
    - route:
        - destination:
            host: api-stable.my-app.svc.cluster.local
            port:
              number: 8080
```

### Traffic Splitting (Canary Deployments)

Split traffic between two versions:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-canary
  namespace: my-app
spec:
  hosts:
    - api.my-app.svc.cluster.local
  http:
    - route:
        - destination:
            host: api.my-app.svc.cluster.local
            subset: v1
          weight: 90
        - destination:
            host: api.my-app.svc.cluster.local
            subset: v2
          weight: 10
```

## DestinationRule for Subsets and Load Balancing

DestinationRule defines subsets (versions) and traffic policies:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-destination
  namespace: my-app
spec:
  host: api.my-app.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
      trafficPolicy:
        connectionPool:
          http:
            http2MaxRequests: 100
```

## ServiceEntry for External Services

Register external services so the mesh can route to them with policies:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: my-app
spec:
  hosts:
    - api.external-service.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
```

Apply a DestinationRule for mTLS to the external service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-tls
  namespace: my-app
spec:
  host: api.external-service.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

## Mesh-Internal VirtualService

VirtualServices work for mesh-internal traffic too, not just ingress:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: internal-retry
  namespace: my-app
spec:
  hosts:
    - api.my-app.svc.cluster.local
  http:
    - route:
        - destination:
            host: api.my-app.svc.cluster.local
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure
      fault:
        delay:
          percentage:
            value: 1.0
          fixedDelay: 5s
```

## Verifying Your Configuration

Check gateway listeners:

```bash
istioctl proxy-config listener deploy/istio-ingress -n istio-ingress
```

Check routes:

```bash
istioctl proxy-config routes deploy/istio-ingress -n istio-ingress -o json
```

Analyze for errors:

```bash
istioctl analyze -n my-app
```

Test with curl:

```bash
curl -H "Host: app.example.com" http://<gateway-external-ip>/
```

## Classic APIs vs Gateway API

The classic Istio APIs give you access to features like fault injection, retries, and timeouts all in one VirtualService resource. The Gateway API spreads these across multiple resources (HTTPRoute, etc.) and some features are still being added. If you need the full set of Istio traffic management features today, the classic APIs remain the most complete option.

That said, keep an eye on the Gateway API - it is the future direction and will eventually reach feature parity.
