# How to Configure Multi-Cluster Authorization Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Multi-Cluster, Security, RBAC

Description: How to write and apply Istio authorization policies that work correctly across cluster boundaries in a multi-cluster service mesh.

---

Authorization policies in Istio control which workloads can talk to which other workloads. In a single cluster, this is relatively simple - you write policies based on namespaces, service accounts, and other identity attributes. But in a multi-cluster mesh, you need to think about how identities work across cluster boundaries, where to apply policies, and how to handle cluster-specific rules.

This post covers the practical aspects of writing authorization policies that work in multi-cluster Istio deployments.

## How Identities Work Across Clusters

Istio identifies workloads using SPIFFE IDs, which are embedded in the mTLS certificate's SAN field. The format is:

```
spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

In a multi-cluster mesh with a shared trust domain (`cluster.local` by default), a workload in cluster1 with service account `reviews` in namespace `bookinfo` has the identity:

```
spiffe://cluster.local/ns/bookinfo/sa/reviews
```

A workload in cluster2 with the same service account and namespace has the exact same identity. Istio does not include the cluster name in the SPIFFE ID. This means authorization policies based on service account identity work the same way regardless of which cluster the request comes from.

## Basic Cross-Cluster Authorization

A simple policy that allows traffic from the `frontend` service account in the `web` namespace, regardless of which cluster it runs in:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: bookinfo
spec:
  selector:
    matchLabels:
      app: reviews
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/web/sa/frontend"
```

This policy works identically whether the `frontend` workload is in cluster1, cluster2, or both. The principal check only looks at the SPIFFE ID in the mTLS certificate.

## Deny-All Baseline

In a multi-cluster mesh, start with a deny-all policy and explicitly allow what should be allowed:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: bookinfo
spec:
  {}
```

An empty spec means "match all requests" with no rules, which results in denying everything. Apply this to all clusters:

```bash
kubectl apply -f deny-all.yaml -n bookinfo --context="${CTX_CLUSTER1}"
kubectl apply -f deny-all.yaml -n bookinfo --context="${CTX_CLUSTER2}"
```

Then add explicit ALLOW policies for the traffic you want.

## Namespace-Based Authorization

Allow all traffic from a specific namespace across the entire mesh:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-web-namespace
  namespace: bookinfo
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - "web"
```

This allows any workload in the `web` namespace, in any cluster, to access workloads in the `bookinfo` namespace.

## Cluster-Specific Authorization

Sometimes you want to allow traffic only from a specific cluster. Since the SPIFFE ID does not include the cluster name, you cannot directly filter by cluster. But there are workarounds:

### Approach 1: Use Custom Headers

Configure your application or a VirtualService to add a cluster identifier header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: EnvoyFilter
metadata:
  name: add-cluster-header
  namespace: istio-system
spec:
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_OUTBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inlineCode: |
            function envoy_on_request(request_handle)
              request_handle:headers():add("x-source-cluster", "cluster1")
            end
```

Then use the header in authorization policies:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-from-cluster1-only
  namespace: bookinfo
spec:
  action: ALLOW
  rules:
  - when:
    - key: request.headers[x-source-cluster]
      values:
      - "cluster1"
```

### Approach 2: Use Different Service Accounts Per Cluster

Give workloads different service accounts in each cluster:

```yaml
# In cluster1
apiVersion: v1
kind: ServiceAccount
metadata:
  name: frontend-cluster1
  namespace: web
```

```yaml
# In cluster2
apiVersion: v1
kind: ServiceAccount
metadata:
  name: frontend-cluster2
  namespace: web
```

Then write policies targeting specific service accounts:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-cluster1-only
  namespace: bookinfo
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/web/sa/frontend-cluster1"
```

## Applying Policies Consistently Across Clusters

Authorization policies need to be applied to every cluster where the target workload runs. If `reviews` runs in both cluster1 and cluster2, the authorization policy must be applied in both clusters.

Use GitOps for consistency:

```bash
# Directory structure
istio-config/
  authorization/
    bookinfo/
      deny-all.yaml
      allow-frontend.yaml
      allow-productpage.yaml
```

Deploy to all clusters with Argo CD or Flux:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: istio-authz
spec:
  generators:
  - clusters: {}
  template:
    spec:
      source:
        repoURL: https://github.com/org/istio-config
        path: authorization
      destination:
        server: '{{server}}'
```

## Authorization with Different Trust Domains

If your clusters use different trust domains (not recommended but sometimes necessary), configure trust domain aliases:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: cluster1.example.com
    trustDomainAliases:
    - cluster2.example.com
```

Then reference the appropriate trust domain in policies:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-cross-trust-domain
  namespace: bookinfo
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster1.example.com/ns/web/sa/frontend"
        - "cluster2.example.com/ns/web/sa/frontend"
```

## Debugging Authorization Policies

If cross-cluster requests are being denied, check:

1. **What identity is the caller presenting?**

```bash
kubectl logs -n bookinfo -c istio-proxy deployment/reviews --context="${CTX_CLUSTER2}" | grep "rbac"
```

2. **Verify the principal in the access log:**

Enable access logging and look at the source principal:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

```bash
kubectl logs -n bookinfo -c istio-proxy deployment/reviews --context="${CTX_CLUSTER2}" | grep "denied"
```

3. **Check policy evaluation:**

```bash
istioctl x authz check deployment/reviews -n bookinfo --context="${CTX_CLUSTER2}"
```

This shows which policies apply to the workload and what they would do for a given request.

## Summary

Authorization policies in multi-cluster Istio work based on SPIFFE identities, which are consistent across clusters when using a shared trust domain. Start with deny-all, then explicitly allow required traffic paths using service accounts and namespaces. For cluster-specific authorization, use different service accounts per cluster or custom headers. Apply policies consistently across all clusters using GitOps tooling. The key thing to remember is that Istio identities do not include cluster information by default, so policies based on service accounts and namespaces naturally span the entire mesh.
