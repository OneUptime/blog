# How to Diagnose Calico Pods Cannot Reach External Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, External Services

Description: Diagnose why pods in a Calico cluster cannot reach external services by checking NAT configuration, network policies, and routing tables.

---

## Introduction

When pods cannot reach external services, the problem could be at multiple layers: network policy blocking egress, NAT not being applied so external services see a non-routable pod IP, routing tables missing a default gateway, or DNS resolution failures. Each layer requires different diagnostic commands.

Calico's role in external connectivity is primarily through IP pools (which control NAT behavior), global network policies (which can block egress), and Felix's iptables programming for NAT rules.

## Prerequisites

- Kubernetes cluster with Calico installed
- `kubectl` access with exec permissions
- `calicoctl` CLI configured

## Step 1: Verify Basic Pod Connectivity

Start by confirming which types of external connectivity are broken.

```bash
# Create a test pod for connectivity testing
kubectl run connectivity-test --image=nicolaka/netshoot --restart=Never -- sleep 3600

# Test DNS resolution (required before HTTP tests)
kubectl exec connectivity-test -- nslookup kubernetes.default.svc.cluster.local
kubectl exec connectivity-test -- nslookup google.com

# Test ICMP to a well-known external IP
kubectl exec connectivity-test -- ping -c 3 8.8.8.8

# Test TCP to an external service
kubectl exec connectivity-test -- curl -v --connect-timeout 5 https://google.com
```

## Step 2: Check NAT Configuration in Calico IP Pools

Calico IP pools control whether pod traffic to external destinations is NATed to the node IP.

```bash
# Check all IP pools and their NAT settings
calicoctl get ippools -o wide

# Key fields to check:
# natOutgoing: true  -> pod IPs are SNATed to node IP for external traffic
# natOutgoing: false -> pod IPs reach the network directly (requires routable pod IPs)

# If natOutgoing is false and pod IPs are not routable externally, external access will fail
calicoctl get ippool default-ipv4-ippool -o yaml | grep natOutgoing
```

## Step 3: Check Global Network Policies for Egress Blocks

A default-deny GlobalNetworkPolicy that blocks all egress will prevent pods from reaching external services.

```bash
# Check for any global policies that might block egress
calicoctl get globalnetworkpolicies -o yaml | \
  grep -A 10 "egress:"

# Look for policies with egress action: Deny or no egress rules (implicit deny)
# Also check namespace-scoped NetworkPolicies
kubectl get networkpolicies --all-namespaces

# Use calicoctl to see the full policy evaluation order
calicoctl get globalnetworkpolicies -o wide
```

## Step 4: Verify iptables NAT Rules Are Applied

Check that Felix has programmed the masquerade rules for outbound traffic.

```bash
# Find calico-node on the test pod's node
POD_NODE=$(kubectl get pod connectivity-test -o jsonpath='{.spec.nodeName}')
CALICO_POD=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=${POD_NODE} -o name | head -1)

# Check NAT masquerade rules are in iptables
kubectl exec -n calico-system "${CALICO_POD}" -- \
  iptables -t nat -L POSTROUTING -n | grep -i "cali\|masq"

# Verify the pod IP is being NATed on egress
kubectl exec -n calico-system "${CALICO_POD}" -- \
  iptables -t nat -L cali-nat-outgoing -n 2>/dev/null | head -10
```

## Step 5: Check Routing Table on the Node

Verify the node has a default route that allows traffic to reach external destinations.

```bash
# Check routing table on the affected node
kubectl exec -n calico-system "${CALICO_POD}" -- \
  ip route show | grep default

# Verify traffic from pod IP would take the default route
POD_IP=$(kubectl get pod connectivity-test -o jsonpath='{.status.podIP}')
kubectl exec -n calico-system "${CALICO_POD}" -- \
  ip route get 8.8.8.8
```

## Best Practices

- Always set `natOutgoing: true` on IP pools unless your network has routable pod IP space
- Test external connectivity from a new pod after any network policy changes
- Monitor DNS resolution success rate as an early indicator of external connectivity issues
- Check for default-deny GlobalNetworkPolicies that may not include egress Allow rules

## Conclusion

Diagnosing external service connectivity failures from Calico pods requires checking IP pool NAT configuration, network policies for egress blocks, iptables masquerade rules programmed by Felix, and node routing tables. The most common causes are `natOutgoing: false` on the IP pool or a GlobalNetworkPolicy with no egress rules (causing implicit deny).
