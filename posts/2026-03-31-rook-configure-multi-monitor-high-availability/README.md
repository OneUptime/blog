# How to Configure Multi-Monitor High Availability in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, High Availability, Quorum, Kubernetes

Description: Learn how to configure multiple Ceph monitors in Rook for high availability, including quorum requirements, anti-affinity rules, and monitor failover behavior.

---

## Overview

Ceph monitors (MONs) maintain the authoritative cluster map - tracking OSD status, CRUSH topology, and cluster configuration. For high availability, you need an odd number of monitors so that a majority (quorum) can agree on cluster state even when some monitors fail. With 3 monitors, you tolerate 1 failure; with 5, you tolerate 2. This guide covers configuring and managing multi-monitor HA in Rook.

## Monitor Quorum Basics

```text
Quorum requirement: (N/2) + 1 monitors must be healthy

3 monitors -> need 2 for quorum -> tolerate 1 failure
5 monitors -> need 3 for quorum -> tolerate 2 failures
7 monitors -> need 4 for quorum -> tolerate 3 failures
```

For most clusters, 3 monitors is sufficient. Use 5 for large or geographically distributed deployments.

## Configuring Monitor Count in Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 5                        # 5 monitors for high availability
    allowMultiplePerNode: false     # Enforce 1 mon per node
  placement:
    mon:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values: [rook-ceph-mon]
          topologyKey: kubernetes.io/hostname
```

Apply the configuration:

```bash
kubectl apply -f cluster.yaml

# Watch monitors come up
kubectl get pods -n rook-ceph -l app=rook-ceph-mon -w
```

## Verifying Monitor Quorum

```bash
# Check monitor status and quorum
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mon stat

# Detailed quorum information
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph quorum_status --format json-pretty

# List all monitors and their roles
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mon dump
```

## Monitor Resource Allocation

```yaml
spec:
  resources:
    mon:
      limits:
        cpu: "2"
        memory: "2Gi"
      requests:
        cpu: "500m"
        memory: "1Gi"
```

Monitors are lightweight but do require consistent memory. In-memory maps grow with cluster size.

## Checking Monitor Health

```bash
# Check individual monitor status
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep mon

# Get the current leader
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph quorum_status --format json-pretty | grep quorum_leader_name

# Check monitor clock skew (important for quorum)
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph time-sync-status
```

## Handling Clock Skew

Ceph raises a `MON_CLOCK_SKEW` health warning if clocks are skewed more than 0.05 seconds (the default `mon_clock_drift_allowed` threshold):

```bash
# Install chrony or ntpd on all nodes
sudo apt install chrony

# Verify time sync
chronyc tracking
timedatectl

# Configure the time server in Rook cluster
```

```yaml
spec:
  mon:
    count: 3
  # Ensure nodes have NTP configured via Kubernetes DaemonSet or cloud-init
```

## Monitor Failover Behavior

When a monitor fails:

1. Remaining monitors detect absence via heartbeat and remove the failed mon from quorum
2. Rook operator detects the failed MON pod and waits for the failover timeout (default: 10 minutes) before replacing it
3. The new monitor syncs from the remaining quorum members

```bash
# Watch Rook reschedule a failed monitor
kubectl get pods -n rook-ceph -l app=rook-ceph-mon -w

# Check if monitor is resyncing
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mon stat
```

## Adding a Monitor to an Existing Cluster

```bash
# Edit the CephCluster to increase mon count
kubectl patch cephcluster rook-ceph -n rook-ceph \
  --type merge -p '{"spec":{"mon":{"count":5}}}'

# Watch new monitors being added
kubectl get pods -n rook-ceph -l app=rook-ceph-mon -w
```

## Monitor Stretch Mode (Multi-Datacenter)

For disaster recovery across two datacenters:

```yaml
spec:
  mon:
    count: 5
    stretchCluster:
      failureDomainLabel: topology.kubernetes.io/zone
      subFailureDomain: host
      zones:
      - name: dc1
        arbiter: false
      - name: dc2
        arbiter: false
      - name: arbiter-dc
        arbiter: true
```

## Summary

Multi-monitor HA in Rook-Ceph requires configuring an odd number of monitors (3 or 5) with strict anti-affinity rules to ensure they land on separate nodes. The key operational concern is clock synchronization - NTP skew beyond 50ms triggers a `MON_CLOCK_SKEW` health warning. Monitor failover is automatic through Rook's operator, which reschedules failed MON pods and the new monitor resyncs from remaining quorum members without manual intervention.
