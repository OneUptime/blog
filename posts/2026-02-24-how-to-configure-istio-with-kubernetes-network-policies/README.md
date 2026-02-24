# How to Configure Istio with Kubernetes Network Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Network Policies, Security, Service Mesh

Description: How to use Kubernetes NetworkPolicies alongside Istio for defense-in-depth network security, with practical examples and common configuration patterns.

---

Istio and Kubernetes NetworkPolicies operate at different layers of the stack. Istio handles Layer 7 (application-level) access control through AuthorizationPolicies, while Kubernetes NetworkPolicies work at Layer 3/4 (IP and port level). Using both together gives you defense in depth. Even if one layer is misconfigured, the other still provides protection.

This guide shows you how to configure them to work together without stepping on each other.

## How They Work Together

Kubernetes NetworkPolicies are enforced by the CNI plugin (Calico, Cilium, etc.) at the kernel/eBPF level. They filter traffic based on pod labels, namespaces, and IP ranges before traffic even reaches the Istio sidecar.

Istio AuthorizationPolicies are enforced by the Envoy sidecar proxy. They can inspect HTTP headers, paths, methods, and JWT claims.

The order of evaluation is: NetworkPolicy first, then Istio AuthorizationPolicy. If a NetworkPolicy blocks traffic, it never reaches Istio.

## Default Deny with NetworkPolicy

Start with a default deny policy. This blocks all ingress traffic to pods in the namespace unless explicitly allowed:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

This is a good security baseline. Now you need to add rules to allow legitimate traffic.

## Allowing Istio Control Plane Traffic

If you have a default deny policy, you need to explicitly allow traffic from the Istio control plane (istiod) and between sidecars. Without this, Istio will not work.

Allow istiod to communicate with sidecars:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istiod
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
          kubernetes.io/metadata.name: istio-system
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: istio-system
```

## Allowing DNS Resolution

Pods need to resolve DNS names. Without this, service discovery breaks:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

## Allowing Service-to-Service Traffic

For service-to-service communication within the mesh, you need to allow traffic between namespaces or between specific pods:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: frontend
      podSelector:
        matchLabels:
          app: web
    ports:
    - port: 8080
      protocol: TCP
```

This allows pods labeled `app: web` in the `frontend` namespace to reach pods labeled `app: api-server` in the `backend` namespace on port 8080.

## Allowing Ingress Gateway Traffic

The Istio ingress gateway needs to reach your services:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-gateway
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: istio-system
      podSelector:
        matchLabels:
          istio: ingressgateway
    ports:
    - port: 8080
      protocol: TCP
```

## Layering Istio AuthorizationPolicy on Top

With NetworkPolicies handling the coarse-grained L3/L4 filtering, use Istio AuthorizationPolicies for fine-grained L7 control:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-server-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/web"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

This adds method and path restrictions on top of the NetworkPolicy's namespace and pod restrictions. Even if someone bypasses the NetworkPolicy somehow, the AuthorizationPolicy still blocks unauthorized requests.

## A Complete Example

Here is a full configuration for a three-tier application (frontend, backend, database):

```yaml
# Default deny for all namespaces
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Allow DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
---
# Allow Istio control plane
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istio
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: istio-system
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: istio-system
---
# Allow frontend -> backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-frontend
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: api
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: frontend
    ports:
    - port: 8080
---
# Allow backend -> database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-to-database
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: database
    ports:
    - port: 5432
```

## Testing the Configuration

Verify that allowed traffic flows and blocked traffic is denied:

```bash
# Should succeed: frontend -> backend
kubectl exec -n frontend deploy/web -c web -- \
  curl -s -o /dev/null -w "%{http_code}" http://api.backend:8080/health

# Should fail: frontend -> database (blocked by NetworkPolicy)
kubectl exec -n frontend deploy/web -c web -- \
  curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 \
  http://db.database:5432
```

## Troubleshooting

When traffic is blocked and you are not sure whether it is the NetworkPolicy or Istio, check in order:

1. Check NetworkPolicy first by looking at the CNI plugin logs:

```bash
# For Calico
kubectl logs -n kube-system -l k8s-app=calico-node | grep -i deny
```

2. Check if traffic reaches the sidecar:

```bash
kubectl exec -n backend deploy/api -c istio-proxy -- \
  pilot-agent request GET stats | grep "downstream_cx_total"
```

If downstream connections are zero, the NetworkPolicy is blocking traffic before it reaches Istio.

3. If traffic reaches the sidecar but gets blocked, check Istio RBAC:

```bash
kubectl exec -n backend deploy/api -c istio-proxy -- \
  pilot-agent request GET stats | grep "rbac"
```

## Wrapping Up

Using both Kubernetes NetworkPolicies and Istio AuthorizationPolicies gives you two layers of network security. NetworkPolicies handle the coarse-grained L3/L4 filtering while Istio handles the fine-grained L7 access control. The key is making sure you allow the necessary Istio control plane traffic and DNS through your NetworkPolicies, otherwise the mesh breaks. Start with default deny, explicitly allow what you need, and test everything.
