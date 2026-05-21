# How to Use Ambient Mode with Kubernetes NetworkPolicy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, NetworkPolicy, Kubernetes, Security

Description: How Istio ambient mode interacts with Kubernetes NetworkPolicy and strategies for using both together for defense-in-depth security.

---

Kubernetes NetworkPolicy and Istio AuthorizationPolicy are two different security mechanisms that operate at different layers. NetworkPolicy works at L3/L4 in the cluster's CNI plugin, while Istio's policies work through ztunnel and waypoint proxies. When you run Istio ambient mode, both are active and both affect traffic flow.

Understanding how they interact prevents surprises and lets you build a defense-in-depth strategy where both mechanisms complement each other.

## How NetworkPolicy Works (Quick Recap)

Kubernetes NetworkPolicy controls traffic at the IP and port level. The CNI plugin (Calico, Cilium, Azure CNI, etc.) enforces these policies by programming iptables rules, eBPF programs, or firewall rules on each node.

A simple NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend
  namespace: bookinfo
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 8080
          protocol: TCP
```

This allows only pods labeled `app: frontend` to connect to pods labeled `app: backend` on port 8080.

## How Ambient Mode Changes the Picture

In ambient mode, traffic from enrolled pods goes through ztunnel before reaching the destination. The important NetworkPolicy change is that secured mesh traffic reaches the destination pod as HBONE on port 15008, and is then proxied back to the original destination port.

### The Port 15008 Problem

Without ambient mode:
```text
frontend (10.0.1.5) -> backend (10.0.1.6)
NetworkPolicy sees: destination port = 8080
```

With ambient mode:
```text
frontend (10.0.1.5) -> ztunnel -> [HBONE] -> backend (10.0.1.6:15008) -> backend app port 8080
```

NetworkPolicy is enforced outside the pod, before ambient redirects the HBONE traffic back to the original application port. If an existing ingress NetworkPolicy allows only port 8080, it can block ambient traffic until you also allow port 15008.

### Same-Node Traffic

When source and destination are on the same node, traffic still traverses ztunnel. NetworkPolicy still applies to traffic reaching the pod, so port restrictions need to account for HBONE on port 15008.

### Cross-Node Traffic

For cross-node traffic, the HBONE tunnel means the destination NetworkPolicy enforcement point must allow the secured overlay traffic on port 15008 before the destination pod can receive and redirect it to the original application port.

## Strategy 1: Use NetworkPolicy for Broad Controls, Istio for Fine-Grained

Let NetworkPolicy handle coarse-grained isolation (namespace-level) and use Istio AuthorizationPolicy for fine-grained identity-based controls:

```yaml
# NetworkPolicy: namespace-level isolation

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: namespace-isolation
  namespace: bookinfo
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: bookinfo
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
      # Allow traffic from the same namespace and ambient HBONE traffic
      ports:
        - port: 15008
          protocol: TCP
        - port: 8080
          protocol: TCP
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: bookinfo
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
      ports:
        - port: 15008
          protocol: TCP
        - port: 8080
          protocol: TCP
    - to:  # Allow DNS
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
```

```yaml
# Istio AuthorizationPolicy: identity-based control
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-access
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/frontend"
```

NetworkPolicy handles the "what namespaces can talk to what" question. Istio handles "what specific service identities are allowed."

## Strategy 2: Allow HBONE in NetworkPolicy

If you want to keep pod-level NetworkPolicies, you need to allow HBONE traffic to enrolled workloads:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ambient-hbone
  namespace: bookinfo
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector: {}
      ports:
        - port: 15008
          protocol: TCP
```

This allows ambient's secure overlay traffic to reach pods in the namespace. The fine-grained access control is then handled by Istio's AuthorizationPolicy.

## Strategy 3: Port-Based NetworkPolicy

For cross-node traffic, make the application allowlist include the HBONE port as well as any direct plaintext traffic you intentionally allow:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-mesh-traffic
  namespace: bookinfo
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: bookinfo
      ports:
        - port: 15008
          protocol: TCP
        - port: 8080
          protocol: TCP
    - from:
        - ipBlock:
            cidr: 169.254.7.127/32
        - ipBlock:
            cidr: fd16:9254:7127:1337:ffff:ffff:ffff:ffff/128
```

This allows HBONE traffic (port 15008) and direct traffic (port 8080) from the same namespace, plus the link-local addresses Istio ambient uses for kubelet health probes.

## What Must Be Allowed in NetworkPolicy

For ambient mode to work, your NetworkPolicies must allow:

1. **HBONE to workload pods on port 15008**: secured ambient traffic reaches destination pods on this port
2. **Workload egress to destination pods on port 15008**: istio-cni redirects outbound traffic to ztunnel, which sends it using HBONE
3. **Application ports for intentional plaintext or non-mesh traffic**: existing direct traffic still needs explicit allows if the pod is isolated
4. **ztunnel to istiod on port 15012**: Configuration and certificate updates
5. **Workload pods to waypoint proxies** (if deployed): Traffic flows through waypoints
6. **Ambient health probe link-local addresses**: allow `169.254.7.127/32` and, on IPv6 or dual-stack clusters, `fd16:9254:7127:1337:ffff:ffff:ffff:ffff/128`

Here is a comprehensive NetworkPolicy for the `istio-system` namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ztunnel-required
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      app: ztunnel
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - ports:
        - port: 15008
          protocol: TCP
        - port: 15020
          protocol: TCP
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - port: 15008
          protocol: TCP
        - port: 15012
          protocol: TCP
```

## Testing the Interaction

After configuring both NetworkPolicy and Istio policies, test all communication paths:

```bash
# Test within namespace
kubectl exec deploy/frontend -n bookinfo -- curl -s http://backend:8080/health

# Test cross-namespace
kubectl exec deploy/client -n other-ns -- curl -s http://backend.bookinfo:8080/health

# Test denied path
kubectl exec deploy/unauthorized -n blocked-ns -- curl -s http://backend.bookinfo:8080/health --max-time 5
```

Check for denials at both layers:

```bash
# Istio denials
kubectl logs -l app=ztunnel -n istio-system --tail=30 | grep RBAC

# NetworkPolicy denials (depends on CNI - Calico example)
kubectl logs -l k8s-app=calico-node -n kube-system --tail=30 | grep -i deny
```

## CNI-Specific Considerations

### Calico

Calico's NetworkPolicy enforcement interacts well with Istio's CNI plugin. Both use iptables chains. Make sure Calico's iptables rules do not interfere with Istio's redirect rules:

```bash
# Check iptables on a node
kubectl debug node/node-1 -it --image=nicolaka/netshoot -- iptables -t nat -L -n | head -50
```

### Cilium

Cilium uses eBPF for NetworkPolicy enforcement, which can be more efficient. When running with Istio ambient mode, some eBPF programs may need to be aware of ztunnel's traffic patterns:

```bash
# Check Cilium's view of traffic
CILIUM_POD=$(kubectl -n kube-system get pod -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}')
kubectl -n kube-system exec -ti "$CILIUM_POD" -- cilium-dbg monitor --type drop
```

### AWS VPC CNI

The VPC CNI supports NetworkPolicy through the Network Policy Agent. It enforces Kubernetes NetworkPolicy for pods on their primary interface, with some EKS-specific considerations such as standard versus strict startup behavior and unsupported Fargate or Windows nodes.

## Recommendations

1. Start with namespace-level NetworkPolicy for isolation
2. Add Istio AuthorizationPolicy for identity-based controls
3. Always allow ambient HBONE traffic in NetworkPolicy
4. Do not try to replicate Istio policies in NetworkPolicy (or vice versa)
5. Use NetworkPolicy as a safety net, Istio as the primary access control

The combination of both gives you true defense in depth. NetworkPolicy stops traffic at the network level (even if Istio is misconfigured), and Istio provides identity-based controls (even if NetworkPolicy is too permissive). Together, they cover more failure modes than either one alone.
