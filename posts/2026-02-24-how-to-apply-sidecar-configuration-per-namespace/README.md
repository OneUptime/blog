# How to Apply Sidecar Configuration per Namespace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Namespace, Kubernetes, Service Mesh, Multi-Tenancy

Description: Apply Istio Sidecar configurations at the namespace level for per-team isolation, resource optimization, and security boundaries in multi-namespace clusters.

---

In multi-team Kubernetes clusters, each team typically owns one or more namespaces. These teams have different requirements: the payments team needs access to external payment gateways, the analytics team needs to reach data warehouses, and the frontend team just needs to talk to the API layer. Applying Sidecar configurations per namespace scopes the proxy configuration for each team to the services they need. For true traffic enforcement, combine this with Istio authorization policies, egress gateways, Kubernetes NetworkPolicy, or other network controls.

Namespace-level Sidecar configuration is the sweet spot between the global mesh default (too broad) and per-workload Sidecar (too granular for most use cases). It provides meaningful configuration scoping and performance improvements with manageable operational complexity.

## How Namespace-Level Sidecars Work

When you create a Sidecar resource without a `workloadSelector` in a namespace, it becomes the default for all workloads in that namespace. Any workload that does not have its own specific Sidecar uses this namespace default.

The precedence order is:
1. Workload-specific Sidecar (has `workloadSelector`)
2. Namespace default Sidecar (no `workloadSelector`, in the same namespace)
3. Root namespace Sidecar (no `workloadSelector`, in the MeshConfig root namespace, often `istio-system`)
4. Istio built-in defaults (full mesh visibility)

## Creating a Namespace Default Sidecar

Here is a namespace default that limits all workloads in the `frontend` namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "backend/api-gateway.backend.svc.cluster.local"
```

Every sidecar proxy in the `frontend` namespace now gets outbound configuration for:
- Services in the frontend namespace
- Services in istio-system (needed for Istio functionality)
- The api-gateway service in the backend namespace

Other services are not included in the generated sidecar configuration. This applies to all current and future workloads in the namespace. If the mesh or sidecar outbound policy is `ALLOW_ANY`, traffic to unknown destinations can still be passed through as unmatched traffic.

## Per-Namespace Configuration for Multiple Teams

Here is a practical setup for a company with four teams, each owning a namespace:

```yaml
# Frontend team - can reach API layer

apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "api/*"
---
# API team - can reach backend services and some external APIs
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: api
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "backend/*"
        - "*/api.stripe.com"
        - "*/api.sendgrid.com"
---
# Backend team - can reach databases and message queues
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: backend
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "*/mydb.rds.amazonaws.com"
        - "*/redis.cache.amazonaws.com"
        - "*/sqs.us-east-1.amazonaws.com"
---
# Analytics team - can reach data warehouse
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: analytics
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "*/bigquery.googleapis.com"
        - "*/storage.googleapis.com"
```

Each team gets proxy configuration only for what they need. The frontend sidecars do not receive configuration for the database. The analytics sidecars do not receive configuration for the payment API. Treat this as configuration scoping; use policy enforcement if these boundaries must be security controls.

For external hosts such as `api.stripe.com`, `api.sendgrid.com`, and `bigquery.googleapis.com`, create matching ServiceEntry resources so those hosts exist in Istio's service registry.

## Overriding Namespace Defaults for Specific Workloads

Some workloads in a namespace need broader or narrower access than the namespace default. Use `workloadSelector` to override:

```yaml
# Namespace default - basic access
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: backend
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
---
# Override for the payment processor - needs Stripe
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: payment-processor
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: payment-processor
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "*/api.stripe.com"
---
# Override for the notification service - needs SendGrid
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: notification-service
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: notification-service
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "*/api.sendgrid.com"
```

The payment processor and notification service have their own Sidecars. All other workloads in the backend namespace use the default that only receives configuration for internal services.

## Setting a Mesh-Wide Default

Create a Sidecar in the Istio root namespace (usually `istio-system`) to set the default for the entire mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: istio-system
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

This makes every namespace in the mesh default to receiving sidecar configuration only for its own services plus istio-system. Namespaces that need broader configuration create their own Sidecar to override.

This is a powerful starting point. New namespaces automatically get the scoped default. Teams must explicitly request broader sidecar configuration by creating their own Sidecar.

## Combining with Outbound Traffic Policy

You can set different outbound policies per namespace:

```yaml
# Strict namespace - REGISTRY_ONLY
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: payments
spec:
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "*/api.stripe.com"
---
# Development namespace - ALLOW_ANY for flexibility
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: dev
spec:
  outboundTrafficPolicy:
    mode: ALLOW_ANY
  egress:
    - hosts:
        - "*/*"
```

The payments namespace drops unknown outbound traffic with REGISTRY_ONLY, so external destinations such as Stripe must also be defined in Istio's service registry, typically with a ServiceEntry. The dev namespace is wide open. This lets teams in development iterate quickly while production namespaces stay more constrained.

## Managing Sidecar Configurations as Code

Store Sidecar configurations alongside your namespace definitions in Git:

```text
infrastructure/
  namespaces/
    frontend/
      namespace.yaml
      sidecar-default.yaml
      serviceentries.yaml
    backend/
      namespace.yaml
      sidecar-default.yaml
      sidecar-payment-processor.yaml
      serviceentries.yaml
    analytics/
      namespace.yaml
      sidecar-default.yaml
      serviceentries.yaml
```

Use a GitOps tool like Argo CD or Flux to sync these configurations:

```yaml
# ArgoCD Application for namespace configs
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-namespace
spec:
  source:
    repoURL: https://github.com/company/infrastructure
    path: namespaces/backend
  destination:
    server: https://kubernetes.default.svc
    namespace: backend
```

## Validating Namespace Sidecar Configuration

After applying Sidecars, verify each namespace:

```bash
# Check Sidecar resources in a namespace
kubectl get sidecar -n backend

# Verify what a specific workload can see
istioctl proxy-config cluster deploy/my-app -n backend | wc -l

# Check for any configuration conflicts
istioctl analyze -n backend
```

Compare the cluster count across namespaces to make sure restrictions are working:

```bash
for ns in frontend api backend analytics; do
  count=$(istioctl proxy-config cluster deploy/main-app -n $ns 2>/dev/null | wc -l)
  echo "$ns: $count clusters"
done
```

## Monitoring Cross-Namespace Access

Track cross-namespace traffic to verify your Sidecar configurations match actual usage:

```promql
# Cross-namespace traffic
sum by (source_workload_namespace, destination_service_namespace) (
  rate(istio_requests_total[1h])
) > 0
```

This groups traffic by source and destination namespace. Inspect the rows where `source_workload_namespace` and `destination_service_namespace` differ to find cross-namespace traffic flows. If you see unexpected flows, either the Sidecar is too broad, passthrough traffic is allowed, or there is a dependency you did not account for.

## Rollout Strategy

Here is a safe approach to rolling out per-namespace Sidecars:

**Phase 1: Observe**

Deploy Sidecars with broad configuration (all namespaces visible) and monitor actual traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
    - hosts:
        - "*/*"
```

Use Prometheus and Kiali to map actual dependencies.

**Phase 2: Restrict to Used Namespaces**

Based on observed traffic, limit to actual dependencies:

```yaml
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "api/*"
```

**Phase 3: Restrict to Specific Services**

For maximum precision, limit to specific service hostnames:

```yaml
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "api/api-gateway.api.svc.cluster.local"
```

**Phase 4: Add Per-Workload Overrides**

For workloads with special requirements, add workload-specific Sidecars.

## Common Mistakes

**Not including the Istio control-plane namespace.** Most Sidecars need the Istio control-plane namespace, commonly `istio-system/*`, in the egress list. Without it, egress configuration and telemetry features can break.

**Creating multiple default Sidecars.** Only one Sidecar without `workloadSelector` is allowed per namespace. If you create a second one, behavior is undefined.

**Not accounting for DNS.** If your pods use CoreDNS for service discovery, make sure the DNS service is reachable. It usually is because it runs as a cluster-level service, but verify if you have network policies that might interfere.

**Forgetting about startup, init containers, and jobs.** Pods that run setup logic, CronJobs, and one-off Jobs can fail if they depend on services that are not included in the Sidecar configuration, or if startup traffic is redirected before the proxy is ready. Make sure these workloads can still function with the scoped visibility.

Per-namespace Sidecar configuration strikes the right balance between performance and manageability. It gives each team their own configuration scope, reduces memory overhead across the mesh, and creates clear operational boundaries between different parts of your application. Start with the mesh-wide default in istio-system and layer on namespace-specific and workload-specific overrides as your needs evolve.
