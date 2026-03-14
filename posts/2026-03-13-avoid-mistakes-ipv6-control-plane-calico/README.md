# Avoid Mistakes When Configuring the IPv6 Control Plane with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPv6, Control-plane, Kubernetes, Networking, BGP

Description: Learn how to correctly configure Calico's IPv6 control plane, avoiding common mistakes with BGP IPv6 peering, Felix IPv6 settings, and node IPv6 address detection that lead to connectivity failures.

---

## Introduction

Enabling IPv6 for the Kubernetes control plane with Calico involves more than just adding an IPv6 IP pool. You also need to configure the Calico node to detect its IPv6 address correctly, set up BGP peering over IPv6 if required, and configure Felix (the Calico per-node agent) with the right IPv6 settings. Mistakes in any of these areas cause IPv6 pod connectivity to fail while IPv4 continues to work - a confusing debugging scenario.

This post covers the most common control plane IPv6 mistakes and how to avoid them.

## Prerequisites

- Kubernetes cluster with dual-stack configured (IPv4 + IPv6)
- Calico CNI v3.20+ with IPv6 support
- Nodes with routable IPv6 addresses or ULA addresses
- `calicoctl` CLI configured

## Step 1: Configure Felix for IPv6

Felix must be explicitly configured to handle IPv6. Without these settings, Felix ignores IPv6 traffic for iptables/eBPF programming.

```yaml
# felixconfig-ipv6.yaml
# Configure Felix for IPv6 support
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Enable IPv6 support in Felix
  ipv6Support: true

  # Configure the IPv6 autodetection method for node IPs
  # Use CIDR-based detection pointing at your IPv6 node subnet
  ipv6AutodetectionMethod: "cidr=fd00:10::/48"

  # Enable BPF dataplane for IPv6 (if using eBPF mode)
  # bpfEnabled: true  # Uncomment if using eBPF dataplane
```

```bash
# Apply the Felix configuration
calicoctl apply -f felixconfig-ipv6.yaml

# Verify Felix accepted the IPv6 configuration
calicoctl get felixconfiguration default -o yaml | grep -i ipv6
```

## Step 2: Mistake - IPv6 Address Not Detected on Nodes

A common mistake is enabling IPv6 in Calico without verifying that each node has its IPv6 address correctly detected and registered.

```bash
# Check whether Calico nodes have IPv6 addresses registered
calicoctl get node -o wide

# Expected output (dual-stack node):
# NAME         ASN      IPV4              IPV6
# worker-01    64512    10.0.1.10/24      fd00:10::10/48
# worker-02    64512    10.0.1.11/24      fd00:10::11/48

# If IPv6 column is empty, the node IPv6 address was not detected
# Fix: update the node resource manually
calicoctl patch node worker-01 --patch \
  '{"spec":{"bgp":{"ipv6Address":"fd00:10::10/48"}}}'
```

## Step 3: Configure BGP for IPv6 Peering

If your environment uses BGP for route advertisement, configure Calico's BGP to peer over IPv6.

```yaml
# bgppeer-ipv6.yaml
# Configure BGP peering with IPv6 addresses
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: router-ipv6-peer
spec:
  # Peer with the router using its IPv6 address
  peerIP: "fd00:10::1"             # IPv6 address of the BGP peer (router)
  asNumber: 65000                  # Router AS number
  # This peer applies to all nodes
  # nodeSelector: all()            # Uncomment to restrict to specific nodes
```

```yaml
# bgpconfiguration-ipv6.yaml
# BGP configuration with IPv6 advertisement enabled
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512                  # Your cluster's AS number
  # Advertise both IPv4 and IPv6 pod CIDRs
  serviceLoadBalancerIPs:
    - cidr: "10.244.0.0/16"        # IPv4 pod CIDR
    - cidr: "fd00:10:244::/56"     # IPv6 pod CIDR
```

## Step 4: Mistake - IPv6 iptables Rules Not Created

If Felix's IPv6 support is not enabled, iptables6 rules for network policies are not created, leaving IPv6 traffic unfiltered or blocked.

```bash
# Check if IPv6 iptables rules exist on a node
kubectl debug node/worker-01 -it --image=ubuntu -- ip6tables -L FORWARD | head -20

# If the output shows no Calico rules, Felix IPv6 support is not enabled
# The default Calico chain headers include "cali-FORWARD" in the rules

# Check Felix logs for IPv6-related errors
kubectl logs -n kube-system -l k8s-app=calico-node --tail=50 | grep -i ipv6

# Verify ipv6Support is enabled in FelixConfiguration
calicoctl get felixconfiguration default -o yaml | grep ipv6Support
```

## Step 5: Test IPv6 Pod-to-Pod Connectivity

After configuring IPv6 control plane settings, validate connectivity between pods using IPv6 addresses.

```bash
# Deploy two test pods and test IPv6 connectivity between them
kubectl run pod-a --image=alpine --restart=Never -- sleep 3600
kubectl run pod-b --image=alpine --restart=Never -- sleep 3600

# Wait for pods to be running
kubectl wait --for=condition=Ready pod/pod-a pod/pod-b --timeout=60s

# Get IPv6 address of pod-b
POD_B_IPV6=$(kubectl get pod pod-b -o jsonpath='{.status.podIPs[1].ip}')
echo "Pod B IPv6: ${POD_B_IPV6}"

# Test IPv6 ping from pod-a to pod-b
kubectl exec pod-a -- ping6 -c 3 "${POD_B_IPV6}"

# Test IPv6 DNS resolution
kubectl exec pod-a -- nslookup -type=AAAA kubernetes.default.svc.cluster.local

# Clean up
kubectl delete pod pod-a pod-b
```

## Best Practices

- Always enable `ipv6Support: true` in FelixConfiguration before creating IPv6 IP pools.
- Verify IPv6 addresses are detected on all nodes with `calicoctl get node -o wide` immediately after enabling IPv6.
- Test IPv6 pod-to-pod connectivity before enabling network policies, to isolate CNI issues from policy issues.
- Configure BGP for IPv6 advertisement only after confirming IPv6 pod addressing works without BGP.
- Monitor IPv6 IPAM utilization separately from IPv4 with `calicoctl ipam show`.

## Conclusion

IPv6 control plane configuration in Calico requires coordinated changes across Felix, BGP, and IP pool settings. The most common mistakes - missing Felix IPv6 settings, undetected node IPv6 addresses, and absent iptables6 rules - all result in IPv6 pod connectivity failures that can be confusing when IPv4 continues to work. By following the correct configuration sequence and validating each component, you can reliably run dual-stack Kubernetes with Calico.
