# How to Set Up Active/Standby MDS for CephFS HA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, High Availability, File Storage

Description: Learn how to configure active and standby Metadata Server (MDS) daemons in Rook-Ceph to achieve high availability for CephFS file system operations.

---

## Overview

CephFS relies on Metadata Servers (MDS) to handle all file system metadata operations - directory lookups, file creation, permission checks, and inode management. An MDS failure interrupts all client I/O until a standby takes over. Configuring active-standby MDS pairs ensures fast failover (typically under 30 seconds) with no data loss. This guide covers configuring and validating MDS HA in Rook.

## MDS Roles

- **Active MDS**: serves all metadata requests for its assigned directory rank
- **Standby MDS**: cold spare that remains idle until needed for failover
- **Standby-replay MDS**: "hot standby" that replays the active journal in real time, enabling faster failover

## Configuring Active-Standby MDS in Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
  - name: data0
    replicated:
      size: 3
  metadataServer:
    activeCount: 1          # 1 active MDS (use >1 for multi-active)
    activeStandby: true     # Create standby-replay for each active
    resources:
      limits:
        cpu: "4"
        memory: "16Gi"
      requests:
        cpu: "1"
        memory: "4Gi"
    placement:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values: [rook-ceph-mds]
          topologyKey: kubernetes.io/hostname
```

```bash
kubectl apply -f filesystem.yaml
```

## Verifying MDS Status

```bash
# Check MDS daemons and their roles
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mds stat

# Output:
# myfs:1 {0=myfs-a=up:active} 1 up:standby-replay

# Detailed status
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs status myfs
```

## Understanding Standby-Replay

With `activeStandby: true`, Rook configures the standby MDS as a "standby-replay" daemon:

```bash
# Check that standby-replay is configured
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs get myfs | grep -A5 "standby"
```

Standby-replay continuously reads the active MDS journal and applies changes to its own cache. This dramatically reduces failover time compared to a cold standby.

## Configuring Multiple Active MDS

For large file systems with many clients, use multiple active MDS:

```yaml
spec:
  metadataServer:
    activeCount: 4          # 4 active MDS (for large-scale deployments)
    activeStandby: true     # 4 standbys, one for each active
```

```bash
# Each active handles a portion of the directory tree
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs status myfs
```

## Testing MDS Failover

```bash
# Identify the active MDS
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mds stat | grep "up:active"

# Force a failover
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mds fail myfs:0

# Watch the standby take over
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph -w | grep "mds"
```

Expected failover time with standby-replay: 5-30 seconds.

## Monitoring MDS Health

```bash
# Check for MDS health warnings
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep -i mds

# Check active MDS cache pressure
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph tell mds.0 perf dump mds_mem

# Get MDS cache stats
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph tell mds.0 cache status
```

## MDS Memory Tuning

The MDS cache size directly affects performance. Set it based on your file system size:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [mds]
    mds_cache_memory_limit = 17179869184  # 16GB
    mds_cache_reservation = 0.05
    mds_health_cache_threshold = 1.5
```

## Summary

Active/standby MDS configuration in Rook-Ceph uses the `activeStandby: true` setting to automatically provision standby-replay MDS daemons that continuously mirror the active MDS journal. This enables fast failover (typically under 30 seconds) when the active MDS fails. Place MDS pods with anti-affinity rules on separate nodes, allocate sufficient memory for the MDS cache, and test failover regularly using `ceph mds fail` to verify HA behavior in your specific environment.
