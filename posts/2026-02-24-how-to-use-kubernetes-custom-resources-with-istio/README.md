# How to Use Kubernetes Custom Resources with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Custom Resource, CRD, Service Mesh

Description: A hands-on guide to understanding and working with Istio's Custom Resource Definitions including VirtualService, DestinationRule, Gateway, and more.

---

Istio extends Kubernetes by adding a set of Custom Resource Definitions (CRDs) that let you configure traffic routing, security policies, and observability. If you've used Kubernetes, you're already familiar with resources like Deployments and Services. Istio's CRDs work the same way, except they control the service mesh behavior.

## What CRDs Does Istio Install?

When you install Istio, it registers dozens of CRDs with the Kubernetes API server. You can see them all:

```bash
kubectl get crds | grep istio
```

The output will include resources like:

```text
authorizationpolicies.security.istio.io
destinationrules.networking.istio.io
envoyfilters.networking.istio.io
gateways.networking.istio.io
peerauthentications.security.istio.io
requestauthentications.security.istio.io
serviceentries.networking.istio.io
sidecars.networking.istio.io
telemetries.telemetry.istio.io
virtualservices.networking.istio.io
wasmplugins.extensions.istio.io
workloadentries.networking.istio.io
workloadgroups.networking.istio.io
```

Each CRD represents a specific aspect of mesh configuration. The most commonly used ones fall into three categories: networking, security, and telemetry.

## Networking Resources

### VirtualService

VirtualService defines how requests get routed to a service. It's the most frequently used Istio CRD.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-route
  namespace: default
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
```

This routes requests with the header `end-user: jason` to v2 of the reviews service, and everything else to v1.

### DestinationRule

DestinationRule defines policies that apply after routing has occurred. It configures things like load balancing, connection pools, and TLS settings.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-destination
  namespace: default
spec:
  host: reviews
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    loadBalancer:
      simple: ROUND_ROBIN
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### Gateway

Gateway configures a load balancer operating at the edge of the mesh, typically for ingress traffic.

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
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
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "app.example.com"
    tls:
      mode: SIMPLE
      credentialName: app-tls-secret
```

### ServiceEntry

ServiceEntry adds entries to the mesh's service registry. This is how you tell Istio about external services.

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
  - api.external-provider.com
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```

### Sidecar

The Sidecar resource controls the scope of the proxy configuration. By default, every sidecar gets configuration for every service in the mesh, which can be wasteful.

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "other-namespace/specific-service.other-namespace.svc.cluster.local"
```

This tells sidecars in `my-namespace` to only receive configuration for services in their own namespace, the istio-system namespace, and one specific service from another namespace. This reduces memory usage and configuration push time.

## Security Resources

### PeerAuthentication

Controls mutual TLS settings between services.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: my-namespace
spec:
  mtls:
    mode: STRICT
```

### AuthorizationPolicy

Defines access control rules for workloads.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

### RequestAuthentication

Validates JWT tokens on incoming requests.

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  jwtRules:
  - issuer: "https://auth.example.com/"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
```

## Telemetry Resources

### Telemetry

Controls metrics, logging, and tracing configuration.

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
  tracing:
  - providers:
    - name: zipkin
    randomSamplingPercentage: 10.0
  accessLogging:
  - providers:
    - name: envoy
```

## Working with Istio CRDs

Creating Istio resources works just like any other Kubernetes resource:

```bash
kubectl apply -f virtual-service.yaml
```

Listing resources:

```bash
kubectl get virtualservices -n my-namespace
kubectl get destinationrules -n my-namespace
kubectl get gateways -n my-namespace
```

You can use short names too:

```bash
kubectl get vs    # VirtualService
kubectl get dr    # DestinationRule
kubectl get gw    # Gateway
kubectl get se    # ServiceEntry
kubectl get pa    # PeerAuthentication
kubectl get ap    # AuthorizationPolicy
```

Getting details:

```bash
kubectl describe vs reviews-route -n default
```

## Validating Your Resources

Istio includes a validation webhook that checks resources when you apply them. If your YAML has errors, the webhook rejects it with an error message.

You can also validate offline with `istioctl`:

```bash
istioctl analyze -n my-namespace
```

This checks for common misconfigurations like VirtualServices referencing non-existent services, DestinationRules with missing subsets, and Gateways with conflicting configurations.

For a specific file:

```bash
istioctl analyze my-config.yaml
```

## Resource Scoping

Istio resources can be scoped in different ways:

- **Namespace-scoped**: Most Istio resources (VirtualService, DestinationRule, etc.) are namespace-scoped. They affect workloads in their namespace.
- **Root namespace**: Resources in the Istio root namespace (usually `istio-system`) can serve as defaults for the entire mesh.
- **Workload-specific**: Resources with a `selector` field only affect pods matching those labels.

Understanding the scoping rules prevents unexpected behavior. A PeerAuthentication in the root namespace applies mesh-wide, while one in a specific namespace applies only there.

Istio's CRDs give you a declarative, Kubernetes-native way to manage your service mesh. Once you're comfortable with the main resources like VirtualService, DestinationRule, and AuthorizationPolicy, you can manage complex traffic patterns and security policies using the same tools and workflows you already use for other Kubernetes resources.
