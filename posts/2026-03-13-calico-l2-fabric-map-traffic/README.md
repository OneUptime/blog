# How to Map L2 Interconnect Fabric with Calico to Real Kubernetes Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, L2, Networking, VXLAN, IP-in-IP, Traffic Flows, Packet Analysis

Description: A packet-level walkthrough of how Calico's VXLAN and IP-in-IP overlays handle real Kubernetes cross-node traffic, with observable artifacts at each encapsulation stage.

---

## Introduction

Understanding how L2 overlay encapsulation works at the packet level helps you debug cross-node connectivity issues and explain the networking behavior to your team. The observable artifacts — VXLAN interfaces, FDB entries, `tcpdump` captures — connect the conceptual model to reality.

This post traces the complete packet journey for cross-node pod-to-pod traffic in both VXLAN and IP-in-IP modes, showing what you can observe at each stage.

## Prerequisites

- A Calico cluster using VXLAN or IP-in-IP
- Node-level access for `tcpdump`, `ip`, and `bridge` commands
- Understanding of basic IP packet structure

## VXLAN Mode: Complete Packet Journey

```mermaid
sequenceDiagram
    participant PodA as Pod A (10.0.1.4, Node 1)
    participant Calico1 as Calico/Felix (Node 1)
    participant VXLAN1 as vxlan.calico (Node 1)
    participant Network as Underlay Network
    participant VXLAN2 as vxlan.calico (Node 2)
    participant Calico2 as Calico/Felix (Node 2)
    participant PodB as Pod B (10.0.2.5, Node 2)

    PodA->>Calico1: IP packet: src=10.0.1.4, dst=10.0.2.5
    Calico1->>Calico1: Policy check: allow
    Calico1->>Calico1: Route lookup: 10.0.2.0/26 via vxlan.calico
    Calico1->>VXLAN1: Forward to VXLAN interface
    VXLAN1->>VXLAN1: FDB lookup: 10.0.2.5 MAC → Node2-IP (172.16.2.1)
    VXLAN1->>Network: UDP packet: src=172.16.1.1:random, dst=172.16.2.1:4789\nVXLAN header (VNI)\nInner IP: src=10.0.1.4, dst=10.0.2.5
    Network->>VXLAN2: UDP packet received
    VXLAN2->>VXLAN2: Decapsulate: remove UDP + VXLAN headers
    VXLAN2->>Calico2: Inner IP packet: src=10.0.1.4, dst=10.0.2.5
    Calico2->>Calico2: Policy check: allow (ingress policy for Pod B)
    Calico2->>PodB: Deliver packet
```

**What you can observe at each stage**:

```bash
# Stage 1: Route table on Node 1 (programmed by Felix)
ip route show 10.0.2.0/26
# Expected: 10.0.2.0/26 dev vxlan.calico src 10.0.1.1 onlink

# Stage 2: VXLAN FDB entry for the remote pod's node
bridge fdb show dev vxlan.calico | grep <Node2-MAC>
# Expected: <MAC> dst 172.16.2.1 self permanent

# Stage 3: Capture encapsulated traffic on the underlay NIC
sudo tcpdump -i eth0 -n udp port 4789 -c 5
# Expected: UDP packets with outer Node IPs as src/dst

# Stage 4: Capture on VXLAN interface (after decapsulation on Node 2)
sudo tcpdump -i vxlan.calico -n -c 5
# Expected: Packets with pod IPs (inner packet after decap)
```

## IP-in-IP Mode: Packet Journey

IP-in-IP is simpler — no UDP header, just one IP header wrapping another:

```mermaid
graph LR
    PodA[Pod A\n10.0.1.4] --> Policy1[Policy check]
    Policy1 --> Route[Route: 10.0.2.0/26\nvia tunl0 dev]
    Route --> tunl0[tunl0 interface]
    tunl0 --> Encap[Encapsulated:\nOuter: 172.16.1.1→172.16.2.1\nProto: 4 IP-in-IP\nInner: 10.0.1.4→10.0.2.5]
    Encap --> Network[Underlay Network]
    Network --> Decap[Decapsulate on Node 2]
    Decap --> Policy2[Policy check]
    Policy2 --> PodB[Pod B\n10.0.2.5]
```

**Observing IP-in-IP**:
```bash
# Check tunnel interface
ip link show tunl0
ip addr show tunl0

# Capture IP-in-IP traffic (protocol 4)
sudo tcpdump -i eth0 -n proto 4 -c 5
# Expected: Packets with outer node IPs and protocol 4 (not TCP/UDP)
```

## CrossSubnet Mode: Mixed Encapsulation

In CrossSubnet mode, same-subnet traffic uses direct routing and cross-subnet traffic uses encapsulation. Observe the difference:

```bash
# Same-subnet pod-to-pod: no encapsulation on vxlan.calico
POD_SAME_NODE_IP=<pod-on-same-node>
sudo tcpdump -i vxlan.calico -n -c 5 &
kubectl exec test-pod -- wget -qO- http://$POD_SAME_NODE_IP
# No VXLAN packets captured

# Cross-subnet pod-to-pod: encapsulated on vxlan.calico
POD_CROSS_AZ_IP=<pod-on-different-subnet-node>
kubectl exec test-pod -- wget -qO- http://$POD_CROSS_AZ_IP
# VXLAN packets captured
```

## Debugging with Layer-by-Layer tcpdump

The most effective debugging technique for overlay issues is capturing at multiple layers simultaneously:

```bash
# Terminal 1: Capture on pod veth (inner traffic)
sudo tcpdump -i cali<pod-iface> -n

# Terminal 2: Capture on VXLAN interface (inner packets after decap)
sudo tcpdump -i vxlan.calico -n

# Terminal 3: Capture on physical NIC (outer encapsulated packets)
sudo tcpdump -i eth0 -n udp port 4789

# Generate traffic
kubectl exec pod-a -- ping <pod-b-ip>
```

By comparing what appears at each layer, you can identify exactly where the packet path breaks.

## Best Practices

- Capture at the physical NIC level (`tcpdump -i eth0 udp port 4789`) to confirm encapsulated packets are being sent and received
- Use the FDB entry count as a health metric — it should equal the number of other nodes in the cluster
- When cross-node connectivity fails, always start with the physical NIC capture to confirm the underlay is working before investigating the overlay

## Conclusion

L2 overlay traffic in Calico follows a deterministic encapsulation path: Felix programs routes and FDB entries, packets traverse the VXLAN or IP-in-IP interface for encapsulation, the underlay network routes the outer packet, and the destination node decapsulates and delivers. Each stage has observable artifacts that enable systematic debugging when connectivity fails.
