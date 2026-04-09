# How to Create a Ceph Network Troubleshooting Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Network, Runbook, Troubleshooting, Kubernetes

Description: A network troubleshooting runbook for Rook-Ceph covering messenger flaps, public vs cluster network issues, DNS resolution, and MTU mismatches.

---

## Overview

Ceph relies heavily on network performance and reliability. Network problems manifest as OSD flapping, slow requests, monitor elections, and client disconnects. This runbook systematizes network diagnosis.

## Step 1: Check for Messenger Flaps

OSD messenger flaps indicate network instability:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail | grep flap
kubectl -n rook-ceph logs rook-ceph-osd-0-<pod> --tail=200 | grep -i "connection\|disconnect\|reset"
```

## Step 2: Verify Network Configuration

Check the Rook CephCluster network settings:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph -o jsonpath='{.spec.network}' | python3 -m json.tool
```

Confirm the public and cluster network CIDRs are correct:

```yaml
spec:
  network:
    provider: host
    addressRanges:
      public:
        - "192.168.1.0/24"
      cluster:
        - "10.0.0.0/24"
```

## Step 3: Test Connectivity Between OSD Nodes

```bash
# From one OSD pod, ping another OSD's cluster IP
kubectl -n rook-ceph exec -it rook-ceph-osd-0-<pod> -- \
  ping -c 5 <osd-1-cluster-ip>

# Test TCP connectivity on the OSD port (6800+)
kubectl -n rook-ceph exec -it rook-ceph-osd-0-<pod> -- \
  nc -zv <osd-1-ip> 6801
```

## Step 4: Check for MTU Mismatches

MTU mismatches cause silent packet drops at larger transfer sizes:

```bash
# Check MTU on the node
ip link show eth0 | grep mtu

# Test with large packet
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ping -M do -s 8972 <osd-node-ip>
```

If the ping fails but small packets succeed, reduce the MTU in the network config or fix the underlying network to support jumbo frames consistently.

## Step 5: Diagnose DNS Resolution

Monitor DNS issues can cause monitor discovery failures:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  nslookup rook-ceph-mon-a.rook-ceph.svc.cluster.local

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon dump
```

Verify all monitor endpoints resolve correctly.

## Step 6: Check CNI Plugin Compatibility

Some CNI plugins have issues with Ceph messenger v2:

```bash
# Check messenger protocol in use
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon ms_bind_msgr2

# Disable msgr2 if causing issues with your CNI
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global ms_bind_msgr2 false
```

## Step 7: Analyze Network Bandwidth

```bash
# Install and run iperf3 between two OSD-hosting nodes
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  iperf3 -c <node-ip> -P 4 -t 30

# Expected: minimum 1 Gbps per OSD host for spinning disks
# Expected: minimum 10 Gbps per OSD host for NVMe
```

## Summary

Ceph network troubleshooting covers OSD flap detection, MTU consistency, DNS resolution for monitors, CNI compatibility with Ceph's messenger protocol, and raw bandwidth verification. Ensuring proper network separation between public and cluster traffic is foundational to stable Ceph performance.
