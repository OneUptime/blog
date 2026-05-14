# How to Validate L2 Interconnect Fabric with Calico in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, L2, Networking, VXLAN, IP-in-IP, Lab, Validation, Testing

Description: Step-by-step validation tests for Calico's L2 overlay fabric (VXLAN and IP-in-IP) in a lab cluster, confirming encapsulation behavior and cross-node connectivity.

---

## Introduction

Validating L2 overlay fabric means confirming that encapsulation is working correctly: packets are being encapsulated with the right outer headers, VXLAN FDB entries are programmed, and the MTU is set correctly for the encapsulation mode. Connectivity tests alone are not sufficient - you can have connectivity with incorrect MTU settings that only fail for large packets.

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
# Each entry maps a remote node's VXLAN tunnel MAC to the node's IP
```

The number of entries should generally match the remote nodes that need VXLAN encapsulation. In `CrossSubnet` mode, nodes in the same node subnet should not require VXLAN encapsulation for each other's workload traffic.

## Validation 4: Observe Encapsulation with tcpdump

Generate cross-node traffic and capture the encapsulated packets:

```bash
# Deploy pods on different nodes and generate traffic
kubectl run pod-node1 --image=nicolaka/netshoot \
  --overrides='{"apiVersion":"v1","spec":{"nodeName":"worker-1"}}' -- sleep 3600
kubectl run pod-node2 --image=nginx \
  --overrides='{"apiVersion":"v1","spec":{"nodeName":"worker-2"}}'

kubectl wait --for=condition=Ready pod/pod-node1 --timeout=120s
kubectl wait --for=condition=Ready pod/pod-node2 --timeout=120s

# On Node 1, capture on the underlay interface to see the outer VXLAN header
UNDERLAY_IF=eth0  # Replace with the interface that carries node-to-node traffic.
sudo tcpdump -i "$UNDERLAY_IF" -n udp port 4789 -w /tmp/vxlan-capture.pcap &

POD2_IP=$(kubectl get pod pod-node2 -o jsonpath='{.status.podIP}')
kubectl exec pod-node1 -- curl -s http://$POD2_IP

# Stop capture and analyze
sudo kill %1
sudo tcpdump -r /tmp/vxlan-capture.pcap -n -vv | head -10
```

Expected output shows double IP headers:
- Outer: Node1-IP → Node2-IP (UDP port 4789 for VXLAN)
- Inner: Pod1-IP → Pod2-IP

For IP-in-IP mode, capture on the underlay interface with `sudo tcpdump -i "$UNDERLAY_IF" -n proto 4 -w /tmp/ipip-capture.pcap` and expect an outer Node1-IP → Node2-IP IP header carrying the inner Pod1-IP → Pod2-IP packet.

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
# Pods on the same node subnet should communicate without VXLAN
# Deploy two pods on nodes that are in the same node subnet
kubectl run pod-a --image=nicolaka/netshoot \
  --overrides='{"apiVersion":"v1","spec":{"nodeName":"worker-1"}}' -- sleep 3600
kubectl run pod-b --image=nginx \
  --overrides='{"apiVersion":"v1","spec":{"nodeName":"worker-2"}}'

kubectl wait --for=condition=Ready pod/pod-a --timeout=120s
kubectl wait --for=condition=Ready pod/pod-b --timeout=120s

# Capture on the underlay interface while generating same-subnet traffic
UNDERLAY_IF=eth0  # Replace with the interface that carries node-to-node traffic.
sudo tcpdump -i "$UNDERLAY_IF" -n udp port 4789 -c 5 &
kubectl exec pod-a -- curl -s http://$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
# Expected: No VXLAN traffic captured (same-subnet, native routing)
```

## Validation Checklist

| Check | Expected Result |
|---|---|
| Overlay mode in IPPool | Matches intended mode |
| Overlay interface exists | vxlan.calico or tunl0 up |
| VXLAN FDB entries | One per remote node that needs VXLAN encapsulation |
| tcpdump shows double headers | Outer node IPs, inner pod IPs |
| MTU correctly reduced | pod MTU = node MTU - overhead |
| CrossSubnet same-subnet no encap | No VXLAN on same-subnet traffic |

## Best Practices

- Run MTU validation after any node image update that might change the base MTU
- Keep `tcpdump` captures of normal encapsulated traffic as a reference for troubleshooting
- Compare VXLAN FDB entries with the remote nodes that should use VXLAN; a missing required entry can make that node's pods unreachable

## Conclusion

L2 overlay validation requires checking not just connectivity but the encapsulation mechanism itself: overlay interface existence, FDB programming, encapsulation observed in tcpdump, and correct MTU configuration. These checks catch encapsulation misconfigurations that connectivity tests miss, such as incorrect MTU that only fails for large packets.
