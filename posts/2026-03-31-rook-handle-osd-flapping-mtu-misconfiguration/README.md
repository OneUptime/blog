# How to Handle OSD Flapping Caused by MTU Misconfiguration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Networking, MTU

Description: Learn how to diagnose and fix Ceph OSD flapping caused by MTU mismatches between nodes, which cause heartbeat failures and false down reports.

---

## What is OSD Flapping

OSD flapping is when an OSD repeatedly transitions between up and down state. This causes unnecessary data rebalancing, PG peering, and performance degradation. In Rook environments, you will see pods restarting and `HEALTH_WARN` messages about OSDs being flapping.

A common and often overlooked cause is MTU mismatch between nodes in the Ceph cluster network.

## Why MTU Causes OSD Flapping

Ceph uses large heartbeat packets to verify OSD connectivity. If any network switch or interface along the path has a smaller MTU than the packet size, the packets are silently dropped. The OSD misses heartbeats and gets marked down by monitors, then comes back when the cycle continues.

This is particularly common when:
- Jumbo frames (MTU 9000) are enabled on some nodes but not all
- Kubernetes CNI configurations set inconsistent MTU values
- Physical NICs and virtual bridges have different MTU settings

## Diagnosing MTU Issues

Check MTU on all network interfaces on OSD nodes:

```bash
ip link show | grep mtu
```

Test packet delivery at specific sizes between two nodes:

```bash
# Test from one node to another (replace IP and MTU)
ping -c 4 -M do -s 8972 10.1.0.2
```

The `-M do` flag prohibits fragmentation. If the ping fails at a large size but succeeds at a smaller size, there is an MTU mismatch.

Calculate the correct ping size: `MTU - 28` (28 bytes = IP header 20 + ICMP header 8).

## Finding the Effective MTU

Use tracepath to find the path MTU between two OSD nodes:

```bash
tracepath 10.1.0.2
```

The output includes the discovered MTU at each hop.

## Fixing MTU on OSD Nodes

Set the MTU consistently on all nodes:

```bash
# Temporary (not persistent)
ip link set eth0 mtu 9000

# Persistent via NetworkManager
nmcli connection modify "Wired connection 1" 802-3-ethernet.mtu 9000
nmcli connection up "Wired connection 1"
```

For Kubernetes environments using Rook, check the MTU on the pod network interfaces:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ip link show
```

## Configuring Ceph Heartbeat Tolerance

If you cannot fix the network MTU immediately, increase the heartbeat grace period so Ceph tolerates occasional missed heartbeats instead of marking OSDs down:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_heartbeat_interval 10

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_heartbeat_grace 40
```

## Monitoring for Flapping

Watch the cluster log for flapping patterns:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -w | grep "marked down"
```

Check OSD up/down history:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd stat
```

## Summary

OSD flapping due to MTU misconfiguration causes repeated up/down cycles and unnecessary cluster recovery operations. Diagnose with `ping -M do -s <size>` between OSD nodes to find the effective path MTU. Fix by setting a consistent MTU on all nodes and network interfaces. If network changes are not possible, increase the heartbeat grace period in Ceph to tolerate packet loss.
