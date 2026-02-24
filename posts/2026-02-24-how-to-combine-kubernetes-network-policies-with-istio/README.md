# How to Combine Kubernetes Network Policies with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Network Policies, Security, Defense in Depth

Description: How to layer Kubernetes NetworkPolicy resources with Istio authorization policies for defense-in-depth network security in your cluster.

---

Kubernetes NetworkPolicy and Istio AuthorizationPolicy both control traffic between services, but they work at completely different layers. NetworkPolicy operates at Layer 3/4 (IP addresses and ports), while Istio works at Layer 7 (HTTP methods, paths, headers). Using both together gives you defense in depth, where even if one layer fails, the other still protects you.

## How Each Layer Works

Kubernetes NetworkPolicy is enforced by your CNI plugin (Calico, Cilium, Weave, etc.). It filters packets based on IP addresses, ports, and namespace/pod selectors. The filtering happens at the kernel level before traffic reaches the pod.

Istio AuthorizationPolicy is enforced by the Envoy sidecar proxy. It inspects the actual application traffic and makes decisions based on service identity (mTLS certificates), HTTP attributes, JWT claims, and more. This happens at the proxy level inside the pod's network namespace.

The two don't interfere with each other. NetworkPolicy runs first at the network layer. If the packet passes, it reaches the Envoy proxy, which then applies Istio's policies.

## Setting Up NetworkPolicy as Your Base Layer

Start with Kubernetes NetworkPolicy as your coarse-grained layer. This provides basic isolation even for pods that don't have Istio sidecars.

First, apply a default deny for all namespaces that need isolation:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

This blocks all ingress and egress traffic for every pod in the `backend` namespace. Now allow the specific traffic that should flow.

Allow DNS resolution (almost every pod needs this):

```yaml
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
    - protocol: TCP
      port: 53
```

Allow traffic from the frontend namespace to the backend:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-ingress
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: api-service
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: frontend
    ports:
    - protocol: TCP
      port: 8080
```

Allow the Istio sidecar to communicate with the control plane:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istio-control-plane
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: istio-system
    ports:
    - protocol: TCP
      port: 15012
    - protocol: TCP
      port: 15014
```

## Adding Istio Authorization as Your Fine-Grained Layer

With NetworkPolicy handling the network-level filtering, add Istio AuthorizationPolicy for application-level control.

Start with a default deny in Istio as well:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: backend
spec:
  {}
```

Then add specific allow rules that go beyond what NetworkPolicy can do:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-service-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/frontend/sa/web-app"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/products", "/api/products/*"]
  - from:
    - source:
        principals:
        - "cluster.local/ns/frontend/sa/web-app"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/orders"]
    when:
    - key: request.headers[content-type]
      values: ["application/json"]
```

See how much more specific this is? The NetworkPolicy says "frontend can reach api-service on port 8080." The Istio policy says "only the web-app service account can reach it, only for specific HTTP methods and paths, and POST requests must have the right content type."

## Why Both Layers Matter

You might wonder why you need NetworkPolicy at all when Istio provides more granular control. There are several good reasons:

**Sidecar bypass protection.** If someone manages to bypass the Istio sidecar (through a misconfigured pod, a privileged container, or a pod that doesn't have injection enabled), NetworkPolicy still blocks the traffic at the kernel level.

**Non-mesh workloads.** Not every pod in your cluster will have an Istio sidecar. System components, third-party tools, and legacy workloads might run without sidecars. NetworkPolicy protects those.

**Performance.** NetworkPolicy filtering is extremely fast because it happens in the kernel (often using eBPF with modern CNI plugins). Blocking obviously wrong traffic at Layer 3/4 means your Envoy proxies don't waste resources inspecting it.

**Compliance requirements.** Many compliance frameworks require network-level segmentation. Istio policies alone may not satisfy auditors who want to see traditional network controls.

## Handling the Overlap

There's some overlap in what NetworkPolicy and Istio can do. Here's a practical way to divide responsibilities:

Use NetworkPolicy for:
- Namespace-level isolation (which namespaces can talk to which)
- Port-level restrictions
- Blocking access to sensitive infrastructure (metadata service, etcd, etc.)
- DNS egress rules

Use Istio AuthorizationPolicy for:
- Service identity-based access control
- HTTP method and path restrictions
- JWT claim validation
- Header-based routing restrictions
- Rate limiting and quotas (through EnvoyFilter or WASM plugins)

## Practical Example: Securing a Database

Here's how both layers work together to protect a database:

NetworkPolicy limits which pods can connect on the database port:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-network-policy
  namespace: data
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: backend
      podSelector:
        matchLabels:
          db-access: "true"
    ports:
    - protocol: TCP
      port: 5432
```

Istio AuthorizationPolicy adds identity verification:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: postgres-auth-policy
  namespace: data
spec:
  selector:
    matchLabels:
      app: postgres
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/order-service"
        - "cluster.local/ns/backend/sa/inventory-service"
    to:
    - operation:
        ports: ["5432"]
```

An attacker would need to bypass both the CNI-level filtering and the mTLS identity verification to reach the database. That's a much harder problem than defeating either one alone.

## Debugging the Combined Setup

When traffic gets blocked and you're not sure which layer is responsible, check them in order:

1. Check NetworkPolicy first. If the packet never reaches the pod, you'll see connection timeouts (not HTTP errors):

```bash
kubectl exec -it deploy/test -n frontend -- curl -v --connect-timeout 5 http://api-service.backend:8080/
```

A timeout usually means NetworkPolicy is blocking. A 403 means the packet reached Envoy and Istio blocked it.

2. Check Istio next:

```bash
kubectl logs deploy/api-service -c istio-proxy -n backend | grep "403"
```

3. Use `istioctl analyze` to spot Istio misconfigurations:

```bash
istioctl analyze -n backend
```

Combining NetworkPolicy with Istio takes more setup, but it gives you a security posture that's genuinely hard to compromise. Each layer covers the weaknesses of the other, and together they provide the kind of defense in depth that security teams and auditors actually want to see.
