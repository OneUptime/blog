# How to Handle Namespace Management in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Namespace, Service Mesh, Security

Description: A practical guide to managing Kubernetes namespaces in Istio including sidecar injection, isolation policies, and resource scoping for production meshes.

---

Namespaces in Kubernetes are the primary boundary for organizing workloads, and Istio respects and builds on top of that. How you manage namespaces directly affects sidecar injection, traffic policies, security rules, and resource visibility in your mesh. Getting namespace management right from the start saves you from painful refactoring later.

## Sidecar Injection at the Namespace Level

The most common way to enable Istio for a namespace is with the injection label:

```bash
kubectl label namespace my-namespace istio-injection=enabled
```

This tells the Istio sidecar injector webhook to automatically inject the Envoy proxy into every pod created in that namespace. Any new pods (or pods that are restarted) will get the sidecar.

If you are using revision-based installations (for canary upgrades), the label is different:

```bash
kubectl label namespace my-namespace istio.io/rev=1-20
```

You cannot use both labels on the same namespace. If you switch from `istio-injection=enabled` to a revision label, remove the old label first:

```bash
kubectl label namespace my-namespace istio-injection-
kubectl label namespace my-namespace istio.io/rev=1-20
```

## Excluding Namespaces from the Mesh

Some namespaces should never have sidecars. The `kube-system` namespace is an obvious one, but you might also have monitoring tools, operators, or other infrastructure that should not be in the mesh.

By default, Istio does not inject into `kube-system`, `kube-public`, `kube-node-lease`, and `istio-system`. For other namespaces, just do not add the injection label. But if you want to be explicit:

```bash
kubectl label namespace my-infra-namespace istio-injection=disabled
```

This prevents injection even if someone later enables a namespace-wide webhook configuration.

## Namespace-Scoped Sidecar Configuration

One of the most important and often overlooked features is the Sidecar resource. By default, every sidecar in the mesh is configured to reach every other service. In a large mesh, this means every Envoy proxy has routes for thousands of services, most of which it will never call.

Use the Sidecar resource at the namespace level to limit what each namespace can see:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: team-a
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "shared-services/*"
```

This configuration tells sidecars in the `team-a` namespace to only know about services in their own namespace (`./*`), the `istio-system` namespace, and a `shared-services` namespace. Everything else is invisible to them.

The benefits are significant:

- Faster proxy configuration updates (less data to push)
- Lower memory usage on each sidecar
- Reduced blast radius if a service misbehaves
- Better security through reduced attack surface

## Namespace Isolation with Authorization Policies

Namespaces are a natural boundary for security policies. You can create AuthorizationPolicy resources that enforce namespace-level access control:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
```

This empty policy denies all traffic to the `production` namespace by default. Then you can add specific allow rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-from-frontend
  namespace: production
spec:
  rules:
    - from:
        - source:
            namespaces:
              - frontend
      to:
        - operation:
            methods:
              - GET
              - POST
```

This allows traffic from the `frontend` namespace to reach services in `production`, but only for GET and POST methods.

## PeerAuthentication by Namespace

You can set mTLS requirements per namespace. This is useful when you are gradually rolling out Istio and some namespaces are fully in the mesh while others are not:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT
```

Other namespaces can use PERMISSIVE mode while you are still migrating:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: permissive-mtls
  namespace: staging
spec:
  mtls:
    mode: PERMISSIVE
```

## Namespace Naming Conventions

Establishing a namespace naming convention early helps with policy management. A pattern that works well:

```
<team>-<environment>-<purpose>
```

For example:
- `payments-prod-api`
- `payments-staging-api`
- `platform-prod-monitoring`

This makes it easy to write policies using namespace prefixes:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-team
  namespace: payments-prod-api
spec:
  rules:
    - from:
        - source:
            namespaces:
              - payments-prod-api
              - payments-prod-workers
```

## Managing Namespaces in Multicluster

In multicluster Istio, namespaces are shared across clusters by name. If you have a `backend` namespace in cluster 1 and a `backend` namespace in cluster 2, Istio treats them as the same logical namespace. Services with the same name and namespace in different clusters are merged into a single service with endpoints from both clusters.

This means you need namespace naming coordination across clusters. If different teams in different clusters accidentally use the same namespace name, their services could get merged unintentionally.

A good practice is to use cluster-specific prefixes or a central namespace registry:

```bash
# Cluster 1
kubectl create namespace us-east-backend --context="${CTX_CLUSTER1}"

# Cluster 2
kubectl create namespace us-west-backend --context="${CTX_CLUSTER2}"
```

Or if you intentionally want namespace sharing for load balancing across clusters, keep the names the same.

## Discovery Selectors for Namespace Filtering

Istio 1.10+ supports discovery selectors, which tell Istiod to only watch specific namespaces. This reduces the control plane's resource consumption:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
      - matchLabels:
          istio-discovery: enabled
```

Then label only the namespaces you want Istio to manage:

```bash
kubectl label namespace my-namespace istio-discovery=enabled
```

Namespaces without this label are invisible to Istiod. This is different from sidecar injection - even if a namespace has sidecars, if it is not matched by a discovery selector, Istiod will not process its services.

## Practical Namespace Strategy

For a production mesh, here is a practical namespace strategy:

1. Create a `shared-services` namespace for common infrastructure (databases, message queues)
2. Give each team their own namespaces with Sidecar resources limiting visibility
3. Use AuthorizationPolicy to enforce access rules between namespaces
4. Set PeerAuthentication to STRICT on all production namespaces
5. Use discovery selectors to keep Istiod focused on mesh-relevant namespaces
6. Document which namespaces are in the mesh and which are excluded

```bash
# Quick check: which namespaces are in the mesh?
kubectl get namespaces -l istio-injection=enabled
```

Namespace management is not glamorous, but it is the foundation of a well-organized service mesh. The time you invest in planning your namespace strategy pays off in clearer security boundaries, better performance, and easier troubleshooting.
