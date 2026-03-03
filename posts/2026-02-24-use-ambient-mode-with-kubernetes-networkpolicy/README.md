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

In ambient mode, traffic from enrolled pods goes through ztunnel before reaching the destination. This changes the source IP that NetworkPolicy sees.

### The Source IP Problem

Without ambient mode:
```text
frontend (10.0.1.5) -> backend (10.0.1.6)
NetworkPolicy sees: source IP = 10.0.1.5
```

With ambient mode:
```text
frontend (10.0.1.5) -> ztunnel (node IP) -> [HBONE] -> ztunnel (node IP) -> backend (10.0.1.6)
```

The NetworkPolicy on the destination side may see the ztunnel pod's IP (or the node IP) as the source, not the original frontend pod's IP. This breaks podSelector-based NetworkPolicies.

### Same-Node Traffic

When source and destination are on the same node, ztunnel handles the traffic locally. Depending on how the CNI and ztunnel interact, the NetworkPolicy may see the original pod IP or the ztunnel IP.

### Cross-Node Traffic

For cross-node traffic, the HBONE tunnel means the destination NetworkPolicy enforcement point sees traffic arriving from the destination node's ztunnel, not from the original source pod on another node.

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
      # Allow traffic from same namespace and istio-system (for ztunnel)
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: bookinfo
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
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

## Strategy 2: Allow ztunnel in NetworkPolicy

If you want to keep pod-level NetworkPolicies, you need to allow ztunnel traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ztunnel
  namespace: bookinfo
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
          podSelector:
            matchLabels:
              app: ztunnel
```

This allows all ztunnel pods to send traffic to any pod in the namespace. The fine-grained access control is then handled by Istio's AuthorizationPolicy.

## Strategy 3: IP Block Based NetworkPolicy

For cross-node traffic, use IP block rules that cover the node CIDR:

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
        - ipBlock:
            cidr: 10.0.0.0/8
      ports:
        - port: 15008
          protocol: TCP
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: bookinfo
```

This allows HBONE traffic (port 15008) from the cluster network and direct traffic from the same namespace.

## What Must Be Allowed in NetworkPolicy

For ambient mode to work, your NetworkPolicies must allow:

1. **ztunnel to workload pods**: ztunnel needs to send decrypted traffic to destination pods
2. **Workload pods to ztunnel**: istio-cni redirects outbound traffic to ztunnel
3. **ztunnel to ztunnel on port 15008**: HBONE tunnels between nodes
4. **ztunnel to istiod on port 15012**: Configuration and certificate updates
5. **Workload pods to waypoint proxies** (if deployed): Traffic flows through waypoints

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
    - ports:
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
kubectl exec -n kube-system -l k8s-app=cilium -- cilium monitor --type drop
```

### AWS VPC CNI

The VPC CNI supports NetworkPolicy through the Network Policy Agent. It enforces policies at the ENI level, which happens before Istio's traffic interception. This means NetworkPolicy works at the pod IP level, which is generally the behavior you want.

## Recommendations

1. Start with namespace-level NetworkPolicy for isolation
2. Add Istio AuthorizationPolicy for identity-based controls
3. Always allow ztunnel traffic in NetworkPolicy
4. Do not try to replicate Istio policies in NetworkPolicy (or vice versa)
5. Use NetworkPolicy as a safety net, Istio as the primary access control

The combination of both gives you true defense in depth. NetworkPolicy stops traffic at the network level (even if Istio is misconfigured), and Istio provides identity-based controls (even if NetworkPolicy is too permissive). Together, they cover more failure modes than either one alone.
