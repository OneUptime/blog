# How to Understand OSD Autonomy (Heartbeats, Peering, Load Distribution)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Heartbeat, Peering, Storage

Description: Learn how Ceph OSDs operate autonomously using heartbeat gossip, peer-to-peer peering, and self-directed load distribution without central coordination.

---

## OSD Autonomy in Ceph

Unlike traditional storage systems where a central controller directs every operation, Ceph OSDs operate autonomously. Each OSD independently monitors its peers, participates in PG peering negotiations, and distributes workloads without routing all decisions through monitors. Monitors track high-level cluster state but do not manage individual I/O operations.

This autonomy is what makes Ceph scale to thousands of OSDs.

## Heartbeat Mechanism

Every OSD maintains heartbeat connections to all other OSDs that share placement groups with it. Heartbeats serve two purposes:

1. **Detecting failures**: If an OSD stops responding to heartbeats, peers report it to monitors as `down`.
2. **Peer status monitoring**: Heartbeats carry status information and confirm network connectivity between OSDs that share placement groups.

```bash
kubectl exec -it rook-ceph-tools -n rook-ceph -- bash

# View OSD heartbeat status
ceph osd stat

# See which OSDs an OSD is heartbeating with
ceph osd dump | grep hb_front_addr
```

### Heartbeat Configuration

```bash
# Time before reporting a peer OSD as down (default 20s)
ceph config get osd osd_heartbeat_grace

# Heartbeat interval (default 6s)
ceph config get osd osd_heartbeat_interval
```

## OSD Peering

Peering is the process by which the primary OSD and replicas for a placement group negotiate and agree on the authoritative log of recent operations. Peering happens when:

- A new PG is created
- An OSD rejoins after being marked down
- The acting set changes

```bash
# View PGs currently in peering state
ceph pg ls peering

# Get detailed peering info for a PG
ceph pg 2.1e query | python3 -m json.tool | grep -A 20 peer_info
```

### Peering Log

During peering, the primary OSD collects operation logs from all replicas to determine which writes are complete and which need to be replayed or rolled back. This ensures strong consistency after failures.

```bash
# Watch peering events in real time
ceph -w | grep peering
```

## Load Distribution

Ceph OSDs self-direct I/O distribution through several mechanisms:

### CRUSH-Based Distribution

CRUSH distributes PGs across OSDs according to device weights. OSDs with larger disks receive proportionally more PGs.

```bash
# Check PG distribution across OSDs
ceph osd df tree
```

### Backfill Throttling

When a new OSD joins or recovers, it receives object copies from peers. OSDs autonomously throttle backfill to avoid overwhelming the new OSD or impacting live I/O.

```bash
# View current backfill operations
ceph pg ls backfilling | head -10

# Adjust backfill throttle
ceph config set osd osd_max_backfills 2
ceph config set osd osd_recovery_max_active 3
```

### Primary Affinity

You can reduce load on a specific OSD by setting its primary affinity lower, causing CRUSH to prefer other OSDs as primary for PGs:

```bash
# Reduce primary affinity for an OSD
ceph osd primary-affinity osd.5 0.5

# Restore full primary affinity
ceph osd primary-affinity osd.5 1.0
```

## Diagnosing Slow OSDs

When an OSD is slow, its peers detect it through missed heartbeat responses and log slow operation warnings:

```bash
# Check for slow OSD operations
ceph osd perf

# View slow ops on a specific OSD
ceph daemon osd.5 dump_ops_in_flight
```

## Summary

Ceph OSD autonomy - through heartbeat gossip, self-negotiated peering, and distributed load management - enables the cluster to detect failures, recover from them, and distribute workloads without requiring central orchestration for every decision. Understanding heartbeat timing, peering mechanics, and backfill throttling helps Rook-Ceph operators diagnose slow recovery events, identify performance bottlenecks, and tune cluster behavior for production workloads.
