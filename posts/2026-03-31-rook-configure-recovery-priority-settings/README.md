# How to Configure Recovery Priority Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Priority, Configuration, Storage

Description: Learn how to configure Ceph recovery priority settings to balance data restoration speed against client I/O performance in Rook-Ceph clusters.

---

## Why Recovery Priority Matters

Ceph recovery competes with client I/O for OSD resources. If recovery priority is too high, client latency spikes. If too low, the cluster stays degraded for longer, increasing the risk of data loss from additional failures.

Ceph uses two key levers to control this balance:
- `osd_recovery_op_priority` - how recovery ops are weighted vs. client ops
- `osd_client_op_priority` - the baseline priority for client I/O

## Understanding Priority Values

Both settings use a scale of 1 (lowest) to 63 (highest). The default values are:
- `osd_recovery_op_priority` = 3
- `osd_client_op_priority` = 63

This means by default, client I/O is 21x higher priority than recovery. Increasing recovery priority speeds up healing but increases client latency.

Check current values:

```bash
ceph config get osd osd_recovery_op_priority
ceph config get osd osd_client_op_priority
```

## Setting Recovery Priority

### Increase priority during off-peak hours

```bash
ceph config set osd osd_recovery_op_priority 10
```

### Restore normal priority after recovery

```bash
ceph config set osd osd_recovery_op_priority 3
```

### Apply to running OSDs immediately

The `ceph config set` command persists the value but may not take effect on already-running OSDs until they restart. To apply immediately:

```bash
ceph tell osd.* injectargs '--osd-recovery-op-priority=10'
```

### Verify change took effect

```bash
ceph config get osd osd_recovery_op_priority
```

## Per-Pool Recovery Priority

For pools containing critical data, you can set a higher recovery priority:

```bash
ceph osd pool set <pool-name> recovery_priority 10
```

List pool recovery priorities:

```bash
ceph osd dump | grep recovery_priority
```

## Balancing Recovery and Client I/O

A common strategy is to monitor client latency and adjust dynamically:

```bash
#!/bin/bash
# Script to set high recovery priority during low-traffic windows
HOUR=$(date +%H)
if [ "$HOUR" -ge 2 ] && [ "$HOUR" -lt 6 ]; then
  ceph config set osd osd_recovery_op_priority 20
  echo "Recovery priority raised for off-peak window"
else
  ceph config set osd osd_recovery_op_priority 3
  echo "Recovery priority restored to default"
fi
```

## Rook-Ceph Configuration via CRD

Apply recovery priority settings in the Rook CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    osd:
      osd_recovery_op_priority: "10"
      osd_client_op_priority: "63"
```

For runtime adjustments without redeployment:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_op_priority 10
```

## Monitoring the Effect

Watch recovery rate and client latency together:

```bash
ceph osd pool stats
ceph osd perf
```

Use Prometheus queries (if Ceph metrics are scraped):

```text
ceph_osd_op_w_latency_sum / ceph_osd_op_w_latency_count
rate(ceph_osd_recovery_bytes[5m])
```

## Summary

Recovery priority in Ceph is controlled via `osd_recovery_op_priority` relative to `osd_client_op_priority`. Raising recovery priority speeds up cluster healing at the cost of client latency. Scheduling higher recovery priority during off-peak hours strikes the best balance between data safety and application performance.
