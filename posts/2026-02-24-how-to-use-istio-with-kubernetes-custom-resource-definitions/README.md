# How to Use Istio with Kubernetes Custom Resource Definitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, CRD, Custom Resources, Service Mesh

Description: Understanding Istio's Custom Resource Definitions including VirtualService, DestinationRule, Gateway, and how to work with them effectively in Kubernetes.

---

Istio extends Kubernetes with a set of Custom Resource Definitions (CRDs) that control how the service mesh behaves. If you are coming from a plain Kubernetes background, understanding these CRDs is essential because they are the primary interface for configuring traffic management, security, and observability in Istio.

This guide walks through Istio's most important CRDs, how they interact with each other, and practical patterns for managing them.

## What CRDs Does Istio Install?

When you install Istio, it registers dozens of CRDs. You can list them all:

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

Each CRD serves a specific purpose. The most commonly used ones fall into three categories: networking, security, and telemetry.

## Networking CRDs

### VirtualService

VirtualService is the most used Istio CRD. It defines how requests are routed to services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
  namespace: bookinfo
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

Key fields:
- `hosts`: The service names this VirtualService applies to
- `http`: A list of route rules evaluated in order
- `match`: Conditions for the rule (headers, URI, method, etc.)
- `route`: Where matching traffic goes

### DestinationRule

DestinationRule defines policies that apply after routing decisions have been made:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
  namespace: bookinfo
spec:
  host: reviews
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 50
```

Notice that you can define traffic policies at both the top level and per-subset. Subset-level policies override the top-level ones.

### Gateway

Gateway configures a load balancer at the edge of the mesh for incoming HTTP/TCP connections:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: my-tls-secret
    hosts:
    - "*.example.com"
```

Gateways work with VirtualServices. A VirtualService references a Gateway to handle traffic that enters through it.

### ServiceEntry

ServiceEntry adds external services to Istio's service registry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
  - api.external.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

Without a ServiceEntry, traffic to external services may be blocked (depending on your outbound traffic policy) or will not have Istio telemetry applied.

## Security CRDs

### AuthorizationPolicy

Controls access to services at the application layer:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: frontend-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: frontend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/webapp"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/*"]
```

### PeerAuthentication

Controls mutual TLS settings:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

### RequestAuthentication

Validates JWT tokens on incoming requests:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
```

## Working with CRD Versions

Istio CRDs support multiple API versions. The current recommended version is `v1` for most resources:

```bash
kubectl api-resources --api-group=networking.istio.io
```

When you see resources with multiple versions, prefer the stable `v1` version:

```yaml
# Preferred
apiVersion: networking.istio.io/v1

# Older versions (still work but may be deprecated)
apiVersion: networking.istio.io/v1beta1
apiVersion: networking.istio.io/v1alpha3
```

## Validating CRD Resources

Kubernetes performs schema validation on CRD resources. If you provide an invalid field, the API server rejects it:

```bash
kubectl apply -f bad-virtualservice.yaml
# Error: validation failure list:
# spec.http.route.destination: Invalid value: ...
```

For deeper validation, use `istioctl analyze`:

```bash
istioctl analyze my-config.yaml --use-kube=false
```

## Managing CRDs with GitOps

Store your Istio CRD resources in Git alongside your application manifests. A common directory structure:

```text
k8s/
  base/
    deployment.yaml
    service.yaml
  istio/
    virtualservice.yaml
    destinationrule.yaml
    authorization-policy.yaml
  overlays/
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
```

Use Kustomize to manage environment-specific differences:

```yaml
# k8s/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
- ../../istio
patches:
- target:
    kind: VirtualService
    name: my-service
  patch: |
    - op: replace
      path: /spec/http/0/route/0/destination/subset
      value: canary
```

## CRD Ordering and Dependencies

Some Istio CRDs depend on others. For example, a VirtualService that routes to subsets requires a DestinationRule that defines those subsets. Apply them in the right order:

```bash
# 1. Apply DestinationRules first (defines subsets)
kubectl apply -f destinationrules/

# 2. Then apply VirtualServices (references subsets)
kubectl apply -f virtualservices/

# 3. Apply security policies
kubectl apply -f authorization-policies/
```

If you apply a VirtualService before its DestinationRule, routing will not work correctly because the subsets are not defined yet.

## Watching CRD Status

Check the status of your Istio resources:

```bash
kubectl get virtualservice -A
kubectl get destinationrule -A
kubectl get authorizationpolicy -A
```

For more detail:

```bash
kubectl describe virtualservice my-service -n default
```

## Cleaning Up CRDs

If you need to uninstall Istio, remove the custom resources before removing the CRD definitions:

```bash
# Remove all Istio resources
kubectl delete virtualservice --all --all-namespaces
kubectl delete destinationrule --all --all-namespaces
kubectl delete authorizationpolicy --all --all-namespaces
kubectl delete gateway --all --all-namespaces

# Then uninstall Istio
istioctl uninstall --purge -y
```

If you remove the CRDs before removing the resources, the resources become orphaned and can cause issues.

## Wrapping Up

Istio's CRDs are the backbone of service mesh configuration. Understanding how VirtualService, DestinationRule, Gateway, and the security CRDs work together is essential for operating Istio effectively. Keep your CRD resources in version control, validate them with `istioctl analyze`, and be mindful of dependencies between resources. The more you work with these CRDs, the more natural they become.
