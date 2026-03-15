# How to Diagnose Cross-Host Pod Networking Failures with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, BGP, Cross-Host, Pod Communication, Troubleshooting

Description: A systematic guide to diagnosing cross-host pod networking failures in Kubernetes clusters using Calico with BGP routing.

---

## Introduction

Cross-host pod networking failures in Calico occur when pods on one node cannot communicate with pods on another node. This is one of the most impactful networking issues in a Kubernetes cluster because it breaks service-to-service communication across the cluster.

Calico uses BGP to distribute pod routes between nodes. When cross-host communication fails, the root cause typically involves BGP peering problems, incorrect route propagation, IP-in-IP or VXLAN tunnel failures, firewall rules blocking inter-node traffic, or misconfigured IP pools. Each of these requires different diagnostic tools and techniques.

This guide covers the systematic diagnostic process from symptom identification through root cause isolation for cross-host pod networking failures in Calico.

## Prerequisites

- Kubernetes cluster (v1.24+) with Calico v3.25+
- `kubectl` and `calicoctl` CLI tools
- SSH access to cluster nodes
- `tcpdump` and basic networking tools on nodes
- Understanding of BGP routing basics

## Confirming the Failure Pattern

First, confirm that the issue is specifically cross-host and not a general networking failure.

```bash
# Find pods on different nodes
kubectl get pods -o wide --all-namespaces | head -20

# Test pod-to-pod on the same node (should work)
kubectl exec <pod-on-node-A> -- ping -c 3 <pod-ip-on-same-node-A>

# Test pod-to-pod across nodes (expected to fail)
kubectl exec <pod-on-node-A> -- ping -c 3 <pod-ip-on-node-B>

# Test from multiple node pairs to determine if all cross-host is broken
# or just specific node pairs
```

## Checking BGP Peering Status

Calico relies on BGP to exchange pod routes between nodes.

```bash
# Check BGP peering status on each node
sudo calicoctl node status

# Expected output shows established peers:
# IPv4 BGP status
# +--------------+-------------------+-------+----------+-------+
# | PEER ADDRESS | PEER TYPE         | STATE | SINCE    | INFO  |
# +--------------+-------------------+-------+----------+-------+
# | 10.0.1.2     | node-to-node mesh | up    | 12:00:00 | Established |
# +--------------+-------------------+-------+----------+-------+

# Check BGP configuration
calicoctl get bgpConfiguration default -o yaml

# List all BGP peers
calicoctl get bgpPeer -o wide
```

## Inspecting Route Tables

```bash
# Check routes on the source node
ip route | grep bird
# Or for Calico routes specifically
ip route | grep cali
ip route | grep <destination-pod-cidr>

# Check if routes exist for the remote node's pod CIDR
ip route get <remote-pod-ip>

# Verify BIRD routing daemon logs
kubectl logs -n calico-system -l k8s-app=calico-node -c bird --tail=50
```

## Checking IP-in-IP or VXLAN Tunnels

```bash
# Determine the encapsulation mode
calicoctl get ippool -o wide

# If IP-in-IP, check the tunl0 interface
ip link show tunl0
ip addr show tunl0

# If VXLAN, check the vxlan.calico interface
ip link show vxlan.calico
ip addr show vxlan.calico

# Verify tunnel interface is UP
ip -d link show tunl0 2>/dev/null || ip -d link show vxlan.calico 2>/dev/null
```

## Examining Calico Node Health

```bash
# Check calico-node pod status across all nodes
kubectl get pods -n calico-system -l k8s-app=calico-node -o wide

# Look for errors in calico-node logs
kubectl logs -n calico-system <calico-node-pod> -c calico-node --tail=50

# Check Felix status
kubectl exec -n calico-system <calico-node-pod> -c calico-node -- \
  calico-node -felix-live

# Verify BIRD is running
kubectl exec -n calico-system <calico-node-pod> -c calico-node -- \
  calico-node -bird-live
```

## Network-Level Diagnostics

```bash
# Check if the underlying node network allows required protocols
# IP-in-IP uses protocol 4
sudo tcpdump -i eth0 proto 4 -nn -c 10

# VXLAN uses UDP port 4789
sudo tcpdump -i eth0 udp port 4789 -nn -c 10

# Check for firewall rules blocking inter-node traffic
sudo iptables -L -n | grep -i drop
sudo iptables -L -n | grep -i reject

# Verify MTU settings are consistent
ip link show eth0 | grep mtu
ip link show tunl0 | grep mtu 2>/dev/null
ip link show vxlan.calico | grep mtu 2>/dev/null
```

## Checking IP Pool Configuration

```bash
# List IP pools and their configuration
calicoctl get ippool -o yaml

# Verify CIDR does not overlap with node network
echo "Node network:"
ip addr show eth0 | grep inet
echo "Pod CIDR:"
calicoctl get ippool -o custom-columns=CIDR

# Check if natOutgoing is set correctly
calicoctl get ippool -o wide
```

## Calico Network Policy Analysis

```bash
# Check for policies that might block inter-node traffic
calicoctl get globalnetworkpolicy -o yaml

# Look for deny-all egress policies
calicoctl get networkpolicy --all-namespaces -o yaml | grep -B5 "action: Deny"

# Check if host endpoint policies are blocking
calicoctl get hostendpoint -o yaml
```

## Verification

After identifying the root cause, verify with targeted tests:

```bash
# Cross-host ping test
kubectl exec <pod-on-node-A> -- ping -c 5 <pod-ip-on-node-B>

# Cross-host TCP connectivity test
kubectl run server --image=nicolaka/netshoot -- bash -c "nc -l 8080"
kubectl run client --image=nicolaka/netshoot --rm -it -- bash -c "echo test | nc <server-pod-ip> 8080"

# Verify from multiple node pairs
for pod in $(kubectl get pods -o name | head -5); do
  echo "$pod -> <target-pod-ip>:"
  kubectl exec $pod -- ping -c 1 -W 2 <target-pod-ip> 2>&1 | tail -1
done
```

## Troubleshooting

- **BGP not established**: Check that TCP port 179 is open between nodes. Cloud security groups often block this.
- **Routes missing for specific nodes**: The BIRD daemon on that node may be crashed. Check calico-node pod logs.
- **IP-in-IP packets dropped**: Cloud providers may block IP protocol 4. Switch to VXLAN encapsulation.
- **VXLAN packets dropped**: Ensure UDP port 4789 is allowed between nodes in security groups.
- **MTU mismatches**: IP-in-IP adds 20 bytes overhead, VXLAN adds 50 bytes. Set pod MTU accordingly.
- **Partial failures**: If only some node pairs fail, check for asymmetric routing or inconsistent security group rules.

## Conclusion

Diagnosing cross-host pod networking failures in Calico requires examining BGP peering status, route propagation, tunnel interfaces, firewall rules, and IP pool configuration. The diagnostic process should start by confirming the failure is cross-host specific, then work through each networking layer systematically. BGP peering issues and cloud firewall rules blocking encapsulation protocols are the most common root causes.
