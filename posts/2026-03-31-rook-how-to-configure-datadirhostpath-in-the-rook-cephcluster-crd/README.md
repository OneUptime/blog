# How to Configure dataDirHostPath in the Rook CephCluster CRD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephCluster, CRD, Configuration

Description: Learn what dataDirHostPath does in the Rook CephCluster CRD, how to choose the right value, and what happens if it is misconfigured.

---

## What Is dataDirHostPath

`dataDirHostPath` is a required field in the Rook `CephCluster` custom resource that specifies the path on the host node where Rook and Ceph daemons store their configuration data and state files. It is mounted into Rook and Ceph daemon pods as a hostPath volume.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  dataDirHostPath: /var/lib/rook
```

## What Gets Stored There

The directory at `dataDirHostPath` contains:
- Ceph configuration files (`ceph.conf`, keyrings)
- Monitor data and keyring files
- OSD bootstrap keyrings
- Rook operator state files

```bash
# On a node running a Ceph monitor, you would see:
ls /var/lib/rook/
# rook-ceph/
# rook-ceph/mon-a/
# rook-ceph/mon-a/data/
# rook-ceph/bootstrap-osd/
# rook-ceph/client.admin.keyring
```

## Choosing the Right Path

The path must exist and be writable on every node where Rook pods run. Common choices:

```text
/var/lib/rook    - standard for most deployments (default in examples)
/data/rook       - when /var is on a small partition
/opt/rook        - organization-specific conventions
```

```yaml
# Standard deployment
spec:
  dataDirHostPath: /var/lib/rook

# When /var partition is small
spec:
  dataDirHostPath: /data/rook
```

## Ensuring the Path Exists Before Deployment

Rook will create the directory if it does not exist, but the parent directory must be writable.

```bash
# Verify the parent path is writable on all nodes
for node in $(kubectl get nodes -o name | cut -d/ -f2); do
  kubectl debug node/$node --image=busybox -- chroot /host test -w /var/lib && echo "$node: writable" || echo "$node: NOT writable"
done

# Manually create if needed (before deploying Rook)
for node in $(kubectl get nodes -o name | cut -d/ -f2); do
  kubectl debug node/$node --image=busybox -- chroot /host mkdir -p /var/lib/rook
done
```

## dataDirHostPath and Monitor Data

Monitor (mon) daemons store their database in a subdirectory of `dataDirHostPath`. By default:

```text
/var/lib/rook/rook-ceph/mon-a/data/
/var/lib/rook/rook-ceph/mon-b/data/
/var/lib/rook/rook-ceph/mon-c/data/
```

If this data is lost (node reimaged, path deleted), the monitor database must be rebuilt from quorum. Losing all monitor data simultaneously causes cluster failure.

## What Happens If dataDirHostPath Data Is Lost

```bash
# If a node is reimaged and /var/lib/rook is empty:
# The mon pod on that node will fail to start
kubectl -n rook-ceph get pods | grep mon
# rook-ceph-mon-a   0/1   CrashLoopBackOff

# The other 2 monitors maintain quorum
ceph status
# mon: 3 daemons, quorum b,c (2 of 3)

# Rook will eventually reschedule or fail over the mon
```

## Using a Persistent Volume Instead (PVC-Based Monitors)

For cloud environments or when node storage is ephemeral (nodes may be replaced), configure monitors to use PVCs instead of hostPath:

```yaml
spec:
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
    volumeClaimTemplate:
      spec:
        storageClassName: standard
        resources:
          requests:
            storage: 10Gi
```

With `volumeClaimTemplate` set, monitor data is stored in PVCs, not in `dataDirHostPath`. The `dataDirHostPath` is still used for other Rook state files.

## Changing dataDirHostPath

Changing `dataDirHostPath` on an existing cluster is not directly supported without migration. The path is embedded in the configuration of running Ceph daemons.

```bash
# Do not change dataDirHostPath on a running cluster
# It will cause monitors and OSDs to lose access to their config

# If you must change it:
# 1. Take a full backup
# 2. Scale down the cluster
# 3. Move the directory contents to the new path
# 4. Update dataDirHostPath
# 5. Restart the cluster
```

## SELinux Considerations

On systems with SELinux enforcing (RHEL, OpenShift), the hostPath directory may need the correct SELinux label:

```bash
# Apply the correct SELinux context
chcon -Rt svirt_sandbox_file_t /var/lib/rook

# Or use a MachineConfig on OpenShift to apply the context across all nodes
```

## Summary

`dataDirHostPath` specifies the host node directory where Rook stores Ceph daemon configuration files, monitor databases, and keyrings. The default value `/var/lib/rook` works for most deployments; change it when `/var` is on a small partition. For cloud environments with replaceable nodes, use PVC-based monitors via `mon.volumeClaimTemplate` to avoid data loss when nodes are replaced. Never delete or move this directory on a running cluster.
