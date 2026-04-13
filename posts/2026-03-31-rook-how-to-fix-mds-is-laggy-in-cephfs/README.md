# How to Fix 'mds is laggy' in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Troubleshooting

Description: Resolve MDS laggy warnings in CephFS by tuning metadata server memory, identifying slow I/O, and adjusting cache configuration.

---

## What "mds is laggy" Means

In CephFS, the Metadata Server (MDS) handles all filesystem metadata operations - directory lookups, file creation, attribute updates, etc. When the MDS is "laggy," it means the MDS daemon is not responding to the MON's beacon messages within the configured timeout. This can cause:

- CephFS mounts to hang or return errors
- Client sessions to be evicted
- Temporary unavailability of the filesystem

## Step 1 - Check MDS Health Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status
```

Output showing a laggy MDS:

```text
myfs - 1 clients
========
RANK  STATE      MDS           ACTIVITY  DNS  INOS  PINS
 0    active(laggy) myfs-a(mds.0)  Reqs:   0  16    16    1
```

Get detailed health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail | grep mds
```

Example:

```text
HEALTH_WARN mds.myfs-a(mds.0): laggy or crashed, replaced by mds.myfs-b(mds.1)
```

## Step 2 - Check MDS Pod Status and Resources

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mds
kubectl -n rook-ceph top pods -l app=rook-ceph-mds
```

A laggy MDS often has very high CPU or memory usage. Check resource limits:

```bash
kubectl -n rook-ceph get pod <mds-pod> -o jsonpath='{.spec.containers[0].resources}'
```

## Step 3 - Check MDS Memory Usage

MDS is memory-intensive. The MDS cache holds inodes and directory entries in RAM. If the cache fills up and spills to disk repeatedly, the MDS becomes slow.

Check MDS cache status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mds.myfs-a cache status
```

Output:

```text
{
    "memtotal": 2147483648,
    "memused": 2100000000,
    "cache_size": 104857600
}
```

If `memused` is close to `memtotal`, the MDS is running out of memory.

## Step 4 - Increase MDS Memory Limit

Increase the MDS cache size and memory limit. Update the `CephFilesystem` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      limits:
        memory: "8Gi"
      requests:
        memory: "4Gi"
```

Apply:

```bash
kubectl apply -f filesystem.yaml
```

Then set the MDS cache memory limit (persistently) via the Ceph config:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set mds mds_cache_memory_limit 6442450944
```

Or inject dynamically (takes effect immediately but resets on restart):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mds.myfs-a injectargs '--mds_cache_memory_limit=6442450944'
```

## Step 5 - Check for Client Overload

Too many clients performing metadata-heavy operations (many small file creates, directory scans) can overwhelm the MDS:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mds.myfs-a dump_ops_in_flight
```

Look for long-running operations and identify the clients causing them:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mds.myfs-a session ls
```

If a specific client is sending excessive requests, evict it temporarily:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mds.myfs-a client evict id=<client-id>
```

## Step 6 - Check the Metadata Pool Health

MDS operations write to the metadata pool. If the metadata pool has slow I/O:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool stats <metadata-pool-name>
```

High read/write latency in the metadata pool directly causes MDS lag.

## Step 7 - Enable Standby MDS

Ensure you have a standby MDS ready to take over:

```yaml
spec:
  metadataServer:
    activeCount: 1
    activeStandby: true
```

With `activeStandby: true`, Rook deploys a standby MDS daemon that can quickly take over the active rank if the active MDS fails or becomes unresponsive. Note that a standby MDS does not have the metadata cache pre-loaded - it will rebuild its cache after taking over, but failover is still faster because the daemon is already running.

## Step 8 - Restart the Laggy MDS

If the MDS is stuck, restart the pod:

```bash
kubectl -n rook-ceph delete pod <mds-laggy-pod>
```

Rook will recreate it. The standby (if configured) will take over during the restart.

Monitor MDS recovery:

```bash
watch "kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status"
```

## Summary

MDS laggy warnings in CephFS are most commonly caused by insufficient memory for the MDS cache, excessive metadata operations from clients, or slow I/O in the metadata pool. Fix them by increasing MDS memory limits and cache sizes, evicting problematic clients, and ensuring the metadata pool has fast storage (ideally SSDs). Deploying an active standby MDS ensures rapid failover when the active MDS encounters issues.
