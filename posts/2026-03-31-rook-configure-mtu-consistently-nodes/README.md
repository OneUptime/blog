# How to Configure MTU Consistently Across Ceph Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Networking, MTU, Configuration, Operation

Description: Configure consistent MTU settings across all Ceph nodes to prevent packet fragmentation, TCP resets, and silent performance degradation from MTU mismatches in storage traffic.

---

## Why MTU Consistency Matters for Ceph

MTU (Maximum Transmission Unit) mismatches between Ceph nodes cause packet fragmentation or silent drops, resulting in mysterious performance degradation, increased CPU overhead, and intermittent connection resets. Since Ceph uses large messages for replication and recovery, even a single misconfigured node can degrade the entire cluster's performance.

## Verifying Current MTU Settings

Check MTU on all OSD nodes:

```bash
# Check MTU on the node running this command
ip link show | grep mtu

# SSH to all nodes and check
for node in osd-node1 osd-node2 osd-node3 mon-node1; do
  echo "$node: $(ssh $node ip link show eth0 | grep -o 'mtu [0-9]*')"
done
```

Check MTU at the switch/network level:

```bash
# Send a packet of known size to test path MTU
ping -M do -s 8972 <remote-ip>  # For 9000 MTU jumbo frames
# If this fails, the path does not support 9000-byte frames
```

## Standard MTU (1500) Configuration

For environments that cannot use jumbo frames:

```bash
# Set 1500 MTU on the public network interface
ip link set eth0 mtu 1500

# Set 1500 MTU on the cluster network interface
ip link set eth1 mtu 1500
```

Make persistent via NetworkManager:

```bash
# RHEL/Rocky/AlmaLinux with NetworkManager
nmcli connection modify "eth0" 802-3-ethernet.mtu 1500
nmcli connection modify "eth1" 802-3-ethernet.mtu 1500
nmcli connection up "eth0"
nmcli connection up "eth1"
```

## Jumbo Frame MTU (9000) Configuration

For high-performance Ceph clusters with jumbo-frame capable switches:

```bash
# Set jumbo frames on the cluster network (never on public unless all clients support it)
ip link set eth1 mtu 9000

# Verify the change
ip link show eth1 | grep mtu
```

Persist via nmcli:

```bash
nmcli connection modify "cluster-net" 802-3-ethernet.mtu 9000
nmcli connection up "cluster-net"
```

Or via systemd-networkd:

```ini
# /etc/systemd/network/10-cluster.network
[Match]
Name=eth1

[Network]
Address=192.168.10.1/24

[Link]
MTUBytes=9000
```

```bash
systemctl restart systemd-networkd
```

## Detecting MTU Mismatches

Test for MTU issues between specific nodes:

```bash
# Test 8972 bytes (9000 - 28 for IP/ICMP headers)
ping -M do -s 8972 -c 10 192.168.10.2
# Success = jumbo frames working on this path

# Test standard MTU
ping -M do -s 1472 -c 10 192.168.10.2
# Success = standard frames working

# If 8972 fails but 1472 works, there's a jumbo frame issue
```

Check for fragmentation in OSD network traffic:

```bash
# Watch for fragmented packets
netstat -s | grep -i fragment
ip -s link show eth1 | grep -i drop
```

## Applying MTU Changes via Kubernetes DaemonSet

For Rook Kubernetes environments, apply MTU settings using a privileged DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ceph-mtu-config
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: ceph-mtu-config
  template:
    metadata:
      labels:
        app: ceph-mtu-config
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
          apk add --no-cache iproute2
          ip link set eth0 mtu 1500
          ip link set eth1 mtu 9000
          echo "MTU configured"
      containers:
      - name: pause
        image: gcr.io/google_containers/pause:3.1
      tolerations:
      - operator: Exists
```

## Validating Consistency Across Cluster

Script to check MTU on all nodes simultaneously:

```bash
#!/bin/bash
EXPECTED_MTU=9000
NODES=(osd-node1 osd-node2 osd-node3 mon-node1 mon-node2)
INTERFACE="eth1"

echo "Checking MTU on all nodes..."
ISSUES=0
for node in "${NODES[@]}"; do
  MTU=$(ssh "$node" "ip link show $INTERFACE 2>/dev/null | grep -o 'mtu [0-9]*' | awk '{print \$2}'")
  if [ "$MTU" = "$EXPECTED_MTU" ]; then
    echo "OK: $node $INTERFACE MTU=$MTU"
  else
    echo "MISMATCH: $node $INTERFACE MTU=$MTU (expected $EXPECTED_MTU)"
    ISSUES=$((ISSUES + 1))
  fi
done

[ $ISSUES -eq 0 ] && echo "All nodes have consistent MTU" || echo "Found $ISSUES MTU mismatches"
```

## Summary

MTU consistency across all Ceph nodes is essential for reliable cluster operation. Mismatched MTUs cause fragmentation that silently degrades throughput and increases CPU overhead. The cluster network (OSD-to-OSD) is the best candidate for jumbo frames (MTU 9000) since it handles bulk replication traffic and is typically fully controlled by the storage team. Always verify end-to-end jumbo frame support at the switch level before deploying 9000 MTU across Ceph nodes.
