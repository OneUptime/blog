# How to Configure Jumbo Frames for Ceph Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Networking, Jumbo Frame, Performance, MTU

Description: Configure jumbo frames (MTU 9000) on Ceph cluster networks to reduce CPU overhead from packet processing and improve throughput for high-bandwidth replication and recovery traffic.

---

## Benefits of Jumbo Frames for Ceph

Standard Ethernet MTU (1500 bytes) results in approximately 83,000 packets per second for each 1 Gbps of Ceph replication traffic. Jumbo frames with MTU 9000 reduce packet count by ~6x, significantly lowering CPU interrupts, NIC driver overhead, and per-packet processing costs.

Expected benefits:
- CPU utilization for network processing reduced by 40-60%
- Latency reduction for bulk data transfers
- Higher sustainable throughput on 10GbE+ networks

## Prerequisites

Jumbo frames require support at every hop:
- All physical NIC ports on Ceph nodes
- All switches and switch ports in the path
- All bonded interfaces (if using NIC bonding)

**Critical**: If a single switch port is set to 1500 MTU, packets will be silently dropped or fragmented.

## Verifying Switch Support

Before configuring nodes, verify switches support jumbo frames:

```bash
# Test end-to-end jumbo frame capability (run from node to node)
# 8972 = 9000 - 28 (IP header 20 + ICMP header 8)
ping -M do -s 8972 -c 5 <target-osd-ip>

# If this succeeds, the path supports jumbo frames
# If it fails with "Message too long", a switch or NIC is not configured
```

## Configuring Jumbo Frames on Linux

### NetworkManager (RHEL/Rocky/AlmaLinux/Ubuntu 20.04+)

```bash
# Configure for cluster network interface (eth1)
nmcli connection modify "Wired connection 2" 802-3-ethernet.mtu 9000
nmcli connection up "Wired connection 2"

# Verify
ip link show eth1 | grep mtu
nmcli device show eth1 | grep MTU
```

### systemd-networkd

```ini
# /etc/systemd/network/20-cluster.network
[Match]
Name=eth1
MACAddress=xx:xx:xx:xx:xx:xx

[Network]
Address=192.168.10.1/24
Gateway=192.168.10.254

[Link]
MTUBytes=9000
```

```bash
systemctl restart systemd-networkd
ip link show eth1
```

### Legacy /etc/sysconfig/network-scripts

```bash
# /etc/sysconfig/network-scripts/ifcfg-eth1
DEVICE=eth1
BOOTPROTO=none
IPADDR=192.168.10.1
PREFIX=24
MTU=9000
ONBOOT=yes
```

```bash
nmcli connection reload
nmcli connection up eth1
```

## Configuring for Bonded Interfaces

If using NIC bonding for redundancy, set MTU on the bond:

```bash
# Set MTU on bond interface
nmcli connection modify "bond0" 802-3-ethernet.mtu 9000

# Both member interfaces must also be set to 9000
nmcli connection modify "bond0-slave-eth1" 802-3-ethernet.mtu 9000
nmcli connection modify "bond0-slave-eth2" 802-3-ethernet.mtu 9000

# Reload all connections
nmcli connection reload
ip link show bond0
ip link show eth1
ip link show eth2
```

## Applying via Kubernetes DaemonSet (Rook)

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ceph-jumbo-frames
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: ceph-jumbo-frames
  template:
    metadata:
      labels:
        app: ceph-jumbo-frames
    spec:
      nodeSelector:
        ceph-node: "true"
      hostNetwork: true
      initContainers:
      - name: set-mtu
        image: alpine:3.18
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          # Only set jumbo frames on cluster network interface
          ip link set eth1 mtu 9000
          echo "Jumbo frames configured: $(ip link show eth1 | grep mtu)"
      containers:
      - name: pause
        image: gcr.io/google_containers/pause:3.1
```

## Validating Jumbo Frame Configuration

Comprehensive validation across all OSD nodes:

```bash
#!/bin/bash
EXPECTED_MTU=9000
CLUSTER_IF="eth1"

echo "=== Jumbo Frame Validation ==="
for node in osd-node1 osd-node2 osd-node3; do
  ACTUAL_MTU=$(ssh "$node" "ip link show $CLUSTER_IF | grep -oP 'mtu \K[0-9]+'")
  if [ "$ACTUAL_MTU" = "$EXPECTED_MTU" ]; then
    echo "OK: $node $CLUSTER_IF MTU=$ACTUAL_MTU"
  else
    echo "FAIL: $node $CLUSTER_IF MTU=$ACTUAL_MTU (expected $EXPECTED_MTU)"
  fi
done

echo ""
echo "=== End-to-End Jumbo Frame Test ==="
for dst in 192.168.10.1 192.168.10.2 192.168.10.3; do
  if ping -M do -s 8972 -c 3 -W 2 $dst &>/dev/null; then
    echo "OK: Jumbo frames working to $dst"
  else
    echo "FAIL: Jumbo frames broken to $dst"
  fi
done
```

## Measuring Performance Improvement

Run iperf3 before and after enabling jumbo frames:

```bash
# Before: standard MTU
iperf3 -c 192.168.10.2 -P 4 -t 30 --logfile /tmp/before-jumbo.txt

# After setting jumbo frames
iperf3 -c 192.168.10.2 -P 4 -t 30 --logfile /tmp/after-jumbo.txt

# Compare CPU usage during iperf
mpstat -P ALL 1 30 | grep -v "^$" | tail -20
```

## Summary

Jumbo frames (MTU 9000) significantly reduce CPU overhead for Ceph inter-OSD replication by reducing the packet count for bulk data transfers by roughly 6x compared to standard 1500 MTU. Configure jumbo frames only on the cluster network to avoid compatibility issues with clients that may not support large MTUs. Always validate end-to-end jumbo frame support with `ping -M do -s 8972` before rolling out cluster-wide, as a single misconfigured switch port will silently drop oversized packets.
