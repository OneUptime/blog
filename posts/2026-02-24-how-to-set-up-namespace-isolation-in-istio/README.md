# How to Set Up Namespace Isolation in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Namespace Isolation, Security, Multi-Tenancy, Kubernetes

Description: How to isolate Kubernetes namespaces using Istio security policies, Sidecar resources, and authorization policies for multi-team environments.

---

Kubernetes namespaces provide a logical boundary for organizing resources, but they don't provide real network isolation by default. Any pod in any namespace can communicate with any other pod in the cluster. Istio changes this by giving you the tools to enforce strict isolation between namespaces while still allowing controlled cross-namespace communication where needed.

This is particularly important in multi-team environments where different teams share a cluster, or when you want to separate staging from production workloads that happen to run in the same cluster.

## The Default State: No Isolation

Without any Istio security policies, all services in the mesh can communicate freely across namespaces. A pod in the `staging` namespace can call services in the `production` namespace, and a pod in `team-a` can access `team-b` services. The only thing Istio adds by default is mTLS encryption between all services.

To verify this, try calling a service across namespaces:

```bash
kubectl exec -it <pod-in-staging> -n staging -- \
  curl http://api-service.production.svc.cluster.local:8080/health
```

Without isolation policies, this call succeeds.

## Step 1: Enable Strict mTLS Per Namespace

Start by ensuring all traffic in and out of each namespace uses mTLS:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: staging
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: team-a
spec:
  mtls:
    mode: STRICT
```

With strict mTLS, only services with valid Istio certificates can communicate. This blocks any traffic from pods without sidecars, adding a baseline security layer.

## Step 2: Deny All Cross-Namespace Traffic

Apply a deny-all policy to each namespace you want to isolate:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: staging
spec:
  {}
```

Now no traffic can reach any service in these namespaces. This is too restrictive by itself, but it's the foundation. Next, we selectively open up the traffic we want.

## Step 3: Allow Intra-Namespace Traffic

Let services within the same namespace communicate:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: production
spec:
  rules:
    - from:
        - source:
            namespaces:
              - production
```

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: staging
spec:
  rules:
    - from:
        - source:
            namespaces:
              - staging
```

Services within `production` can talk to each other, and services within `staging` can talk to each other. But cross-namespace traffic is still blocked.

## Step 4: Allow Health Checks

Kubernetes kubelet health checks come from outside the mesh (no sidecar), so they get blocked by the deny-all policy. Allow them:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-probes
  namespace: production
spec:
  rules:
    - to:
        - operation:
            paths:
              - /healthz
              - /readyz
              - /livez
            methods:
              - GET
```

A rule without a `from` clause matches all sources, including the kubelet.

## Step 5: Allow Ingress Gateway Traffic

The ingress gateway sits in `istio-system` and needs to reach services in your namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-ingress-gateway
  namespace: production
spec:
  selector:
    matchLabels:
      app: frontend
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account
```

This allows only the ingress gateway to reach the frontend service in production. Adjust the service account name to match your actual gateway service account.

## Step 6: Allow Controlled Cross-Namespace Traffic

Sometimes namespaces need to communicate. For example, a monitoring namespace might need to scrape metrics from production:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-monitoring-scrape
  namespace: production
spec:
  rules:
    - from:
        - source:
            namespaces:
              - monitoring
      to:
        - operation:
            ports:
              - "15020"
            methods:
              - GET
```

Port 15020 is where Istio exposes Prometheus metrics. This allows the monitoring namespace to scrape metrics but nothing else.

## Sidecar Resource for Configuration Isolation

Beyond security, you can also isolate configuration visibility using the Sidecar resource. By default, every sidecar gets configuration for every service in the mesh. For a large mesh, this wastes memory and can slow down configuration updates.

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: production-sidecar
  namespace: production
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "monitoring/*"
```

This tells sidecars in the `production` namespace to only load configuration for services in:
- `./` - the current namespace (production)
- `istio-system` - the Istio control plane
- `monitoring` - the monitoring namespace

Sidecars won't know about services in `staging`, `team-a`, or any other namespace. This reduces memory usage and speeds up configuration propagation.

For the staging namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: staging-sidecar
  namespace: staging
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

Staging only knows about its own services and the Istio system namespace.

## Combining Network Policies with Istio Policies

For defense in depth, combine Istio's L7 policies with Kubernetes NetworkPolicies at L3/L4:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: production
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: production
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
```

The egress rule for UDP port 53 allows DNS resolution. Without it, pods can't resolve service names.

This NetworkPolicy provides L3/L4 isolation even if someone bypasses the Istio sidecar (for example, by using `hostNetwork: true`).

## Testing Isolation

Verify that cross-namespace traffic is blocked:

```bash
# This should fail with a connection refused or RBAC denied error
kubectl exec -it <pod-in-staging> -n staging -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://api-service.production.svc.cluster.local:8080/api/data
```

The expected result is a `403 Forbidden` from Istio's RBAC (or a connection timeout if NetworkPolicy is also in place).

Verify that intra-namespace traffic works:

```bash
# This should succeed
kubectl exec -it <frontend-pod> -n production -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://api-service.production.svc.cluster.local:8080/api/data
```

## Automation with Labels

If you manage many namespaces, use labels to standardize your policies:

```bash
kubectl label namespace production isolation-level=strict
kubectl label namespace staging isolation-level=strict
kubectl label namespace dev isolation-level=permissive
```

Then use those labels in your NetworkPolicies:

```yaml
ingress:
  - from:
      - namespaceSelector:
          matchLabels:
            isolation-level: strict
```

Namespace isolation in Istio is about layering multiple controls: PeerAuthentication for transport security, AuthorizationPolicy for access control, Sidecar for configuration isolation, and optionally NetworkPolicy for L3/L4 enforcement. Start with deny-all and selectively open up communication paths. This gives you a clear understanding of every cross-namespace data flow in your cluster.
