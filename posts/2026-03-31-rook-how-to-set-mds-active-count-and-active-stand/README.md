# How to Set MDS Active Count and Active Standby in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Kubernetes, Storage

Description: Learn how to configure MDS active count and active standby settings in Rook CephFS for high availability and improved filesystem performance.

---

## Overview

The Metadata Server (MDS) is a critical component of CephFS that manages filesystem metadata. Rook allows you to configure the number of active MDS daemons and standby daemons through the CephFilesystem CRD. Tuning these values ensures your filesystem can handle high metadata workloads and recover quickly from daemon failures.

## Understanding MDS Active Count

The `activeCount` field controls how many MDS daemons are active simultaneously. By default, CephFS uses a single active MDS, but you can scale this up for workloads with many clients performing metadata-intensive operations.

Each active MDS owns a portion of the directory tree, distributing metadata load across daemons. Increasing activeCount improves throughput but requires more memory across the cluster.

## Configuring Active Count and Active Standby

Edit your CephFilesystem manifest to set the MDS configuration:

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
    - name: replicated
      replicated:
        size: 3
  preserveFilesystemOnDelete: true
  metadataServer:
    activeCount: 2
    activeStandby: true
    resources:
      limits:
        memory: "4Gi"
      requests:
        memory: "4Gi"
        cpu: "500m"
    priorityClassName: system-cluster-critical
```

Key fields:
- `activeCount` - number of simultaneously active MDS daemons (default: 1)
- `activeStandby` - when true, standby daemons replay the journal for faster failover

## Verifying MDS Status

After applying the manifest, verify the MDS daemons are running:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mds stat
```

Expected output showing two active and two standby daemons:

```text
myfs:2 {0=myfs-a=up:active,1=myfs-b=up:active} 2 up:standby-replay
```

Check the MDS map for detailed information:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs dump
```

## Tuning Standby Count

When `activeStandby` is enabled, Rook automatically provisions one standby-replay daemon per active MDS, resulting in a total of `activeCount * 2` MDS pods. There is no separate field in the CephFilesystem CRD to independently control the number of standby daemons.

If you need additional standby daemons beyond the default, you can set the Ceph configuration option directly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set mds mds_standby_count_wanted 2
```

To check how many standby daemons are available:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status
```

## Scaling Active Count at Runtime

You can update the activeCount without downtime by editing the CephFilesystem resource:

```bash
kubectl -n rook-ceph edit cephfilesystem myfs
```

Change `activeCount` to the desired value and save. Rook's operator will reconcile the change and start or stop MDS daemons accordingly.

Monitor the transition:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mds -w
```

## Resource Considerations

Each active MDS daemon caches metadata in memory. Size memory requests based on the number of files and directories managed:

```yaml
metadataServer:
  activeCount: 2
  resources:
    limits:
      memory: "8Gi"
    requests:
      memory: "4Gi"
      cpu: "1000m"
```

For large filesystems with millions of inodes, consider 4-8 GiB per MDS daemon.

## Summary

Configuring MDS active count and active standby in Rook involves setting `activeCount` and `activeStandby` in the CephFilesystem CRD's `metadataServer` section. Increasing activeCount distributes metadata load across multiple daemons, while enabling activeStandby ensures warm standbys are ready for immediate failover. Monitor MDS status with `ceph mds stat` and tune memory resources based on your filesystem size.
