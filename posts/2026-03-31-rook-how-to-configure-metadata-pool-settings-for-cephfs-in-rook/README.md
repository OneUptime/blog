# How to Configure Metadata Pool Settings for CephFS in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Metadata Pool, MDS, Filesystem

Description: Learn how to configure the metadata pool settings for a CephFS filesystem in Rook, including replication, failure domains, and MDS daemon configuration.

---

## What Is the CephFS Metadata Pool?

A CephFS filesystem in Ceph consists of two types of pools:

1. **Metadata pool** - stores filesystem metadata: directory trees, file attributes, inodes, and the MDS journal. It must be highly available and low-latency because every filesystem operation requires a metadata access.
2. **Data pool(s)** - store actual file data (contents).

The metadata pool is typically much smaller than data pools but is more performance-sensitive. It should be backed by fast storage (SSD or NVMe) when possible.

## CephFilesystem CRD Structure

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
      requireSafeReplicaSize: true
    parameters:
      compression_mode: none
  dataPools:
    - name: replicated
      failureDomain: host
      replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
  preserveFilesystemOnDelete: true
```

## Metadata Pool Configuration Options

### Replication Settings

```yaml
  metadataPool:
    failureDomain: host
    replicated:
      size: 3                      # Three replicas
      requireSafeReplicaSize: true # Block writes if safety cannot be met
      replicasPerFailureDomain: 1  # One replica per host
```

### Erasure Coding for Metadata (Not Supported)

Erasure coding is not supported for the CephFS metadata pool. Ceph requires the metadata pool to be a replicated pool. Attempting to use an erasure-coded pool as a CephFS metadata pool will be rejected by Ceph. This is because:
- Metadata operations require partial overwrites, which are not supported by erasure-coded pools
- The metadata pool must support omap operations, which are only available on replicated pools

Always use replicated pools for metadata.

### Using a Specific Device Class for Metadata

For performance, pin the metadata pool to fast NVMe or SSD OSDs:

```yaml
  metadataPool:
    deviceClass: ssd
    failureDomain: host
    replicated:
      size: 3
```

This creates a CRUSH rule that places metadata pool data only on SSD-class OSDs.

## MDS Daemon Configuration

The MDS (Metadata Server) manages the metadata pool and handles filesystem namespace operations. Configure it under `metadataServer`:

```yaml
  metadataServer:
    activeCount: 1        # Number of active MDS daemons
    activeStandby: true   # Keep standby MDS warm for fast failover
    resources:
      requests:
        cpu: "1"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
    placement:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: role
                  operator: In
                  values:
                    - storage-node
```

**`activeCount`:** For most deployments, 1 is sufficient. Increase to 2+ only for very large filesystems (billions of files) to handle multi-MDS deployments.

**`activeStandby: true`:** Keeps a standby MDS warm (pre-loaded with metadata), reducing failover time from minutes to seconds.

## Metadata Pool Tuning Parameters

```yaml
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
    parameters:
      # Disable compression for metadata (metadata is usually not compressible)
      compression_mode: "none"
      # Minimum number of replicas required for I/O on a degraded pool
      min_size: "2"
```

Apply additional Ceph-level tuning via the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Tune metadata pool PG autoscaler target size
ceph osd pool set myfs-metadata target_size_ratio 0.1

# Enable PG autoscaler
ceph osd pool set myfs-metadata pg_autoscale_mode on

# Check metadata pool stats
ceph df detail | grep metadata
```

## Checking Metadata Pool Health

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Check MDS status
ceph mds stat

# Check filesystem status
ceph fs status myfs

# Verify metadata pool replicas
ceph osd pool get myfs-metadata size
ceph osd pool get myfs-metadata min_size
```

Expected MDS output:

```text
myfs:1 {0=myfs-a=up:active} 1 up:standby-replay
```

This shows one active MDS and one standby-replay MDS.

## Expanding Metadata Pool Capacity

The metadata pool is typically small (a few GB even for large filesystems), but monitor its usage:

```bash
# Check metadata pool usage
ceph df | grep filesystem

# If metadata pool is growing, check for orphaned objects
ceph fs check myfs
```

## Summary

The metadata pool in a Rook CephFilesystem deployment stores all filesystem namespace information and is accessed on every filesystem operation. Configure it with `failureDomain: host`, replicated with at least 3 replicas, and pin it to fast SSD or NVMe OSDs using `deviceClass`. Configure `activeStandby: true` for the MDS daemon to enable fast failover. Avoid erasure coding for the metadata pool and keep the MDS memory limits generous, as larger filesystems require more MDS memory for caching hot inodes.
