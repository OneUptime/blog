# How to Validate L2 Interconnect Fabric with Calico in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, L2, Networking, VXLAN, IP-in-IP, Lab, Validation, Testing

Description: Step-by-step validation tests for Calico's L2 overlay fabric (VXLAN and IP-in-IP) in a lab cluster, confirming encapsulation behavior and cross-node connectivity.

---

## Introduction

Validating L2 overlay fabric means confirming that encapsulation is working correctly: packets are being encapsulated with the right outer headers, VXLAN FDB entries are programmed, and the MTU is set correctly for the encapsulation mode. Connectivity tests alone are not sufficient — you can have connectivity with incorrect MTU settings that only fail for large packets.

This guide provides a complete validation suite for VXLAN and IP-in-IP modes in a lab cluster.

## Prerequisites

- A Calico lab cluster with VXLAN or IP-in-IP mode configured
- At least two worker nodes for cross-node tests
- `tcpdump` and `ip` commands available on nodes
- `kubectl` configured

## Validation 1: Verify Overlay Mode Configuration

```bash
# Check configured overlay mode
calicoctl get ippool default-ipv4-ippool -o yaml

# Expected for VXLAN:
# spec:
#   vxlanMode: Always  # or CrossSubnet

# Expected for IP-in-IP:
# spec:
#   ipipMode: Always  # or CrossSubnet
```

## Validation 2: Verify Overlay Interface Exists

For VXLAN mode:
```bash
# On any worker node:
ip link show vxlan.calico
# Expected: interface exists with state UP

ip addr show vxlan.calico
# Expected: Has an IP address assigned
```

For IP-in-IP mode:
```bash
ip link show tunl0
# Expected: IP-in-IP tunnel interface exists
ip addr show tunl0
```

## Validation 3: Verify VXLAN FDB Entries (VXLAN mode)

Felix programs the VXLAN Forwarding Database with MAC-to-NodeIP mappings:

```bash
# On a worker node
bridge fdb show dev vxlan.calico
# Expected: One or more entries like:
# 66:c6:47:b9:04:6a dst 172.16.2.1 self permanent
# Each entry maps a remote node's pod CIDR MAC to the node's IP
```

The number of entries should equal the number of other nodes in the cluster minus any that are in the same /26 CIDR block.

## Validation 4: Observe Encapsulation with tcpdump

Generate cross-node traffic and capture the encapsulated packets:

```bash
# On Node 1, start capturing on the overlay interface
sudo tcpdump -i vxlan.calico -n -w /tmp/vxlan-capture.pcap &

# Deploy pods on different nodes and generate traffic
kubectl run pod-node1 --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"worker-1"}}' -- sleep 3600
kubectl run pod-node2 --image=nginx \
  --overrides='{"spec":{"nodeName":"worker-2"}}'

POD2_IP=$(kubectl get pod pod-node2 -o jsonpath='{.status.podIP}')
kubectl exec pod-node1 -- wget -qO- http://$POD2_IP

# Stop capture and analyze
sudo kill %1
sudo tcpdump -r /tmp/vxlan-capture.pcap -n | head -10
```

Expected output shows double IP headers:
- Outer: Node1-IP → Node2-IP (UDP port 4789 for VXLAN)
- Inner: Pod1-IP → Pod2-IP

## Validation 5: MTU Verification

Test that the MTU is correctly set for the overlay mode:

```bash
# Check the MTU configured on pod interfaces
kubectl exec pod-node1 -- ip link show eth0
# Expected: mtu value = node_mtu - encap_overhead
# VXLAN: node_mtu - 50 (e.g., 1450 for 1500 node MTU)
# IP-in-IP: node_mtu - 20 (e.g., 1480 for 1500 node MTU)

# Test with a large packet to confirm no fragmentation
kubectl exec pod-node1 -- ping -c 3 -M do -s 1400 $POD2_IP
# Expected: ping succeeds (packet size + headers < MTU)

# Test with a packet that would exceed MTU if misconfigured
kubectl exec pod-node1 -- ping -c 3 -M do -s 1450 $POD2_IP
# Expected for VXLAN: may fail if MTU not correctly reduced
```

## Validation 6: CrossSubnet Mode Behavior

If using CrossSubnet mode, verify that same-subnet traffic is not encapsulated:

```bash
# Pods on same node/subnet should communicate without VXLAN
# Deploy two pods on Node 1
kubectl run pod-a --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"worker-1"}}' -- sleep 3600
kubectl run pod-b --image=nginx \
  --overrides='{"spec":{"nodeName":"worker-1"}}'

# Capture on vxlan.calico interface while generating same-node traffic
sudo tcpdump -i vxlan.calico -n -c 5 &
kubectl exec pod-a -- wget -qO- http://$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
# Expected: No VXLAN traffic captured (same-subnet, native routing)
```

## Validation Checklist

| Check | Expected Result |
|---|---|
| Overlay mode in IPPool | Matches intended mode |
| Overlay interface exists | vxlan.calico or tunl0 up |
| VXLAN FDB entries | One per remote node |
| tcpdump shows double headers | Outer node IPs, inner pod IPs |
| MTU correctly reduced | pod MTU = node MTU - overhead |
| CrossSubnet same-node no encap | No VXLAN on same-node traffic |

## Best Practices

- Run MTU validation after any node image update that might change the base MTU
- Keep `tcpdump` captures of normal encapsulated traffic as a reference for troubleshooting
- Monitor VXLAN FDB entry count via Prometheus — a missing entry means a node's pods are unreachable

## Conclusion

L2 overlay validation requires checking not just connectivity but the encapsulation mechanism itself: overlay interface existence, FDB programming, encapsulation observed in tcpdump, and correct MTU configuration. These checks catch encapsulation misconfigurations that connectivity tests miss, such as incorrect MTU that only fails for large packets.
