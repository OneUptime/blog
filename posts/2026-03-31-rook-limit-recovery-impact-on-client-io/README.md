# How to Limit Recovery Impact on Client IO in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Performance, Client IO, Storage

Description: Learn how to limit Ceph recovery impact on client I/O using throttling parameters, sleep timers, and bandwidth caps to maintain application performance during healing.

---

## The Recovery vs. Client I/O Trade-off

Ceph recovery is resource-intensive. Without throttling, an OSD failure can trigger aggressive recovery that saturates disk I/O and network bandwidth, causing client latency to spike dramatically.

The goal is to keep the cluster healing while ensuring applications remain responsive.

## Key Throttling Parameters

### osd_recovery_sleep

Adds a delay (in seconds) between recovery operations, giving the OSD time to serve client I/O between recovery steps:

```bash
ceph config set osd osd_recovery_sleep 0.1
```

Variants by OSD type:
- `osd_recovery_sleep_hdd` - for spinning disks (higher recommended)
- `osd_recovery_sleep_ssd` - for SSDs (lower)
- `osd_recovery_sleep_hybrid` - for mixed configurations

```bash
ceph config set osd osd_recovery_sleep_hdd 0.5
ceph config set osd osd_recovery_sleep_ssd 0.05
```

### osd_recovery_max_active

Limits the number of concurrent recovery operations per OSD:

```bash
ceph config set osd osd_recovery_max_active 1
```

Lower values reduce I/O pressure but slow recovery time.

### osd_max_backfills

Limits backfill operations to prevent them from overwhelming OSDs:

```bash
ceph config set osd osd_max_backfills 1
```

## Recovery Chunk Size Throttling

Limit the size of data chunks pushed during recovery:

```bash
ceph config set osd osd_recovery_max_chunk 8388608
```

This caps each recovery chunk to 8 MB (the default), reducing burst I/O from large recovery operations.

## Practical Throttling Configuration

For production clusters with active client workloads, use these conservative settings:

```bash
ceph config set osd osd_recovery_op_priority 3
ceph config set osd osd_recovery_max_active 2
ceph config set osd osd_recovery_sleep_hdd 0.5
ceph config set osd osd_max_backfills 1
```

Verify settings are active:

```bash
ceph config dump | grep recovery
```

## Rook CephCluster Configuration

Apply throttling settings in the CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    "osd.*":
      osd_recovery_sleep_hdd: "0.5"
      osd_recovery_sleep_ssd: "0.05"
      osd_recovery_max_active: "2"
      osd_max_backfills: "1"
```

## Monitoring Client Latency During Recovery

Use the Ceph toolbox to track client latency alongside recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

Watch for latency spikes with:

```bash
watch -n 2 "ceph osd perf | sort -k3 -n -r | head -10"
```

If latency exceeds acceptable thresholds, reduce `osd_recovery_max_active` further or increase `osd_recovery_sleep`.

## Summary

Limiting Ceph recovery impact on client I/O requires tuning `osd_recovery_sleep`, `osd_recovery_max_active`, and `osd_max_backfills` to throttle background healing. Conservative defaults protect application latency while still making progress toward a healthy cluster. In Rook, these settings can be applied via the CephCluster CRD or at runtime through the toolbox.
