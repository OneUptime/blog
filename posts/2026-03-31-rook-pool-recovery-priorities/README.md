# How to Set Recovery and Operation Priorities for Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Recovery, Performance

Description: Configure recovery priority and operation priority settings for Ceph pools in Rook to control how resources are allocated during cluster recovery.

---

When Ceph recovers degraded data after an OSD failure or rebalancing event, it uses shared I/O resources. You can control the priority of recovery and client operations per pool to ensure critical workloads get preference over less important ones.

## Recovery vs Client I/O

Ceph constantly balances two competing workloads:
- **Client I/O**: Requests from applications (reads and writes)
- **Recovery I/O**: Replication and rebalancing to restore full replica counts

By default, recovery uses moderate resources. You can adjust this balance globally or per pool.

## Pool-Level Recovery Priority

The `recovery_priority` setting allows pools to compete for recovery resources. Higher values mean faster recovery for that pool:

```bash
# Set high recovery priority (range: -10 to 10, default: 0)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set critical-pool recovery_priority 5

# Set lower priority for less critical pools
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set archive-pool recovery_priority -5

# Verify
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool get critical-pool recovery_priority
```

## Pool-Level Operation Priority

The `recovery_op_priority` controls the IOPS priority given to recovery operations relative to client I/O:

```bash
# Set recovery op priority (0-63, default: 0 means inherit from global osd_recovery_op_priority)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool recovery_op_priority 10
```

Higher values give recovery operations more access to OSD resources, speeding recovery at the cost of client I/O.

## Global Recovery Throttling

For cluster-wide recovery rate limits, use OSD config settings:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  # Max recovery operations per OSD (default: 0, auto-selects 3 for HDD, 10 for SSD)
  ceph config set osd osd_recovery_max_active 3

  # Recovery operation priority (1-63, default: 3)
  ceph config set osd osd_recovery_op_priority 3

  # Delay before starting recovery (seconds, default: 0)
  ceph config set osd osd_recovery_delay_start 0
"
```

## Throttle Recovery to Protect Client Latency

During critical business hours, you may want to slow recovery to protect client I/O:

```bash
# Reduce recovery rate during business hours
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph config set osd osd_recovery_max_active 1
  ceph config set osd osd_max_backfills 1
"
```

Restore normal recovery after hours:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph config set osd osd_recovery_max_active 3
  ceph config set osd osd_max_backfills 2
"
```

## Configure via Rook ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    osd_recovery_max_active = 2
    osd_max_backfills = 1
    osd_recovery_op_priority = 3
```

## Monitor Recovery Progress

```bash
# Check current recovery rate
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph status | grep -A5 recovery

# Check per-pool recovery stats
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool stats
```

Sample output:

```text
pool replicapool id 1
  recovery io 128 MiB/s, 32 objects/s
  client io 20 MiB/s rd, 5 MiB/s wr
```

## Summary

Ceph recovery and operation priorities allow you to control which pools recover fastest and how aggressively recovery competes with client I/O. Use `recovery_priority` to favor critical pools during OSD failures, and use global OSD config to limit recovery rates during peak client load periods. Configure persistent settings through Rook's `rook-config-override` ConfigMap.
