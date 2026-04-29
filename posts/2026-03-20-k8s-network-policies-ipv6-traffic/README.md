# How to Configure Kubernetes Network Policies for IPv6 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, NetworkPolicy, Security, Calico, Cilium

Description: A practical guide to writing Kubernetes NetworkPolicy resources that correctly control IPv6 pod traffic in dual-stack and IPv6-only clusters.

Kubernetes NetworkPolicy resources let you define pod-level firewall rules. In dual-stack clusters, policies that use `ipBlock` for external source or destination ranges should include both IPv4 and IPv6 CIDRs. Pod- and namespace-based selectors apply across both address families, as long as your CNI plugin enforces NetworkPolicy for dual-stack or IPv6 traffic.

## How NetworkPolicy Works with IPv6

Standard Kubernetes NetworkPolicy can use `ipBlock`, `podSelector`, and `namespaceSelector`. The `ipBlock` field supports both IPv4 and IPv6 CIDR notation. When your CNI plugin enforces these policies, it programs the underlying data plane for both address families, whether that is `iptables`/`ip6tables` or eBPF. Like other NetworkPolicy rules, deny behavior is defined for TCP, UDP, and SCTP traffic; protocols such as ICMPv6 can vary by network plugin.

## Step 1: Default Deny All Ingress

Apply a default-deny policy to restrict incoming ingress traffic to pods in a namespace:

```yaml
# default-deny-ingress.yaml - Deny all ingress traffic (covers both IPv4 and IPv6)

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}       # Applies to ALL pods in the namespace
  policyTypes:
    - Ingress
  # No ingress rules = deny all ingress
```

## Step 2: Allow Specific IPv6 CIDR Blocks

Allow traffic only from a specific IPv6 subnet (e.g., your internal monitoring network):

```yaml
# allow-monitoring-ipv6.yaml - Allow ingress from a specific IPv6 CIDR
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring-ipv6
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Ingress
  ingress:
    - from:
        - ipBlock:
            # Allow from the internal monitoring IPv6 subnet
            cidr: "fd00:100:64::/64"
      ports:
        - protocol: TCP
          port: 9090
```

## Step 3: Allow Pod-to-Pod Traffic Within a Namespace

```yaml
# allow-same-namespace.yaml - Allow all traffic between pods in the same namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}   # Any pod in the same namespace
```

## Step 4: Egress Policy Blocking External Traffic

```yaml
# restrict-egress.yaml - Restrict egress to pods inside the cluster
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: restricted-app
  policyTypes:
    - Egress
  egress:
    # Use selectors for in-cluster traffic; ipBlock is intended for cluster-external CIDRs.
    - to:
        - namespaceSelector: {}   # Allow egress to pods in any namespace
```

## Step 5: Dual-Stack Policy (IPv4 + IPv6)

For a dual-stack cluster, specify both CIDRs when you use `ipBlock` to cover both address families:

```yaml
# allow-dual-stack-lb.yaml - Allow traffic from dual-stack load balancer range
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-lb-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
    - Ingress
  ingress:
    - from:
        - ipBlock:
            cidr: "10.0.0.0/8"      # IPv4 load balancer range
        - ipBlock:
            cidr: "fd00:200:64::/64"    # IPv6 load balancer range
      ports:
        - protocol: TCP
          port: 80
        - protocol: TCP
          port: 443
```

## Verifying Policy Enforcement

```bash
# Test that traffic is blocked from an unauthorized pod
kubectl run test-blocked --image=busybox:1.36 --restart=Never --command -- \
  wget --timeout=5 -O- http://[<target-ipv6>]:80/

# The connection should time out or be refused
kubectl logs test-blocked
```

## CNI Plugin Considerations

- **Calico**: Fully supports IPv6 NetworkPolicy, including GlobalNetworkPolicy for cluster-wide rules
- **Cilium**: Supports IPv6 NetworkPolicy and offers richer L7 policies via CiliumNetworkPolicy
- **Flannel**: Does **not** support NetworkPolicy - you need a separate policy engine

Writing explicit NetworkPolicy rules for both IPv4 and IPv6 external CIDRs, while using pod or namespace selectors for in-cluster traffic, helps keep your security posture complete in dual-stack Kubernetes clusters.
