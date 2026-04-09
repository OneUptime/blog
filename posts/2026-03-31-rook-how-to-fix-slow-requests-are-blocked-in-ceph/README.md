# How to Fix 'slow requests are blocked' in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Troubleshooting, OSD

Description: Diagnose and resolve slow or blocked request warnings in Ceph by identifying bottlenecks in OSD I/O, network latency, and recovery operations.

---

## Understanding Slow Requests in Ceph

Ceph reports "slow requests" when OSD or MON operations take longer than a configured threshold (default: 30 seconds). Blocked requests indicate that these operations are not completing at all. This warning can indicate:

- Disk I/O saturation or hardware issues
- Network latency between OSDs
- Recovery or backfill consuming all I/O bandwidth
- OSD memory pressure causing frequent page faults
- Bugs in specific Ceph versions

## Step 1 - Check the Health Warning

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Example output:

```text
HEALTH_WARN 1 osds have slow requests
1 ops are blocked > 32768 sec on osd.2
```

## Step 2 - Identify Which OSD Has Slow Requests

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd perf
```

Output:

```text
osd  commit_latency(ms)  apply_latency(ms)
  0                   5                  8
  1                   4                  7
  2                3200               3800  <-- Very high
```

OSD 2 has extremely high latency - a clear problem.

## Step 3 - Check OSD Disk Health

SSH into the node hosting OSD 2 and check disk I/O:

```bash
iostat -x 1 10
```

Look for `await` values above 100ms or `%util` at 100%:

```text
Device   r/s    w/s    rkB/s   wkB/s  await  %util
sdb      0.5  500.0      4.0  8000.0  1200.5  100.0
```

Also check for disk errors in the kernel log:

```bash
dmesg | grep -E "sdb|error|reset|timeout" | tail -30
```

## Step 4 - Check OSD Memory Usage

OSD processes can become slow if they're under memory pressure:

```bash
kubectl -n rook-ceph top pods -l app=rook-ceph-osd
```

If OSD pods are near their memory limits, the OS starts swapping, causing dramatic latency increases. Check OSD pod memory limits:

```bash
kubectl -n rook-ceph get pod <osd-pod> -o jsonpath='{.spec.containers[0].resources}'
```

Increase OSD memory limit if needed in the `CephCluster` spec:

```yaml
spec:
  resources:
    osd:
      limits:
        memory: "4Gi"
      requests:
        memory: "2Gi"
```

## Step 5 - Check for Recovery/Backfill I/O Competition

If recovery operations are running, they can saturate disk I/O and block client requests:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status | grep -E "recovery|backfill"
```

Limit recovery I/O to free up bandwidth for client requests:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs '--osd-max-backfills=1'
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs '--osd-recovery-max-active=1'
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs '--osd-recovery-op-priority=1'
```

## Step 6 - Check Network Between OSDs

Slow requests can result from high network latency between OSD nodes:

```bash
# From a node, ping another OSD node
ping -c 100 <osd-node-ip> | tail -5
```

Expected latency should be under 1ms for LAN. Above 10ms indicates a network problem.

Check for packet loss:

```bash
mtr --report --report-cycles=100 <osd-node-ip>
```

## Step 7 - Check the OSD Log for Details

Enable debug logging temporarily on the slow OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.2 injectargs '--debug-osd=10'
```

Then check OSD pod logs:

```bash
kubectl -n rook-ceph logs <osd-2-pod> | grep -E "slow|blocked|warn" | tail -50
```

Disable debug logging after investigation:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.2 injectargs '--debug-osd=0'
```

## Step 8 - Restart the Slow OSD

If the OSD appears stuck, restart its pod:

```bash
kubectl -n rook-ceph delete pod <osd-2-pod>
```

Monitor recovery:

```bash
watch kubectl -n rook-ceph get pods -l app=rook-ceph-osd
```

## Step 9 - Check BlueStore Performance Parameters

For BlueStore OSDs, verify cache sizes are appropriate:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.2 config show | grep -E "bluestore_cache"
```

For SSDs, increase the cache beyond the default 3 GB:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.2 injectargs '--bluestore-cache-size-ssd=4294967296'
```

## Summary

Slow and blocked requests in Ceph are most often caused by disk I/O saturation, OSD memory pressure, or recovery operations competing with client I/O. Diagnose by checking OSD perf stats, disk health with `iostat`, memory usage, and recovery throughput. Tuning recovery priorities and OSD memory limits resolves the majority of slow request issues in production environments.
