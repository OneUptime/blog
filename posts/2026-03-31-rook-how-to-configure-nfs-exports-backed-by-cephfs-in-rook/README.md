# How to Configure NFS Exports Backed by CephFS in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, CephFS, Kubernetes, Storage

Description: Configure NFS exports in Rook backed by CephFS to provide standard NFS access to CephFS filesystems for clients that cannot use the native CSI driver.

---

## Overview

Rook can deploy the NFS-Ganesha server via the `CephNFS` CRD and configure NFS exports backed by CephFS. This allows traditional NFS clients - including bare-metal hosts, VMs, and legacy applications - to access Ceph storage using the standard NFS protocol without requiring the Ceph CSI driver.

## Prerequisites

- A running `CephFilesystem` (e.g., `myfs`)
- Rook-Ceph operator deployed
- Network access between NFS clients and the Kubernetes cluster

## Step 1 - Create the CephNFS Resource

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNFS
metadata:
  name: my-nfs
  namespace: rook-ceph
spec:
  server:
    active: 1
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        memory: "512Mi"
    priorityClassName: system-cluster-critical
```

Apply it:

```bash
kubectl apply -f cephnfs.yaml
```

## Step 2 - Verify the NFS Server

Check that the NFS server pod is running:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nfs
```

```text
NAME                          READY   STATUS    RESTARTS   AGE
rook-ceph-nfs-my-nfs-a-0      2/2     Running   0          2m
```

## Step 3 - Create an NFS Export

Configure an NFS export pointing to a CephFS path:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nfs export create cephfs \
  --cluster-id my-nfs \
  --pseudo-path /exports/data \
  --fsname myfs \
  --path /data
```

This creates an export at the pseudo path `/exports/data` backed by the `/data` directory in `myfs`.

## Step 4 - List and Inspect Exports

List all exports for the NFS cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nfs export ls my-nfs
```

Inspect a specific export:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nfs export get my-nfs /exports/data
```

Output shows the export configuration:

```json
{
    "export_id": 1,
    "path": "/data",
    "cluster_id": "my-nfs",
    "pseudo": "/exports/data",
    "access_type": "RW",
    "squash": "no_root_squash",
    "security_label": true,
    "protocols": [4],
    "transports": ["TCP"],
    "fsal": {
        "name": "CEPH",
        "fs_name": "myfs"
    }
}
```

## Step 5 - Mount the NFS Export on a Client

Get the NFS service endpoint:

```bash
kubectl -n rook-ceph get svc rook-ceph-nfs-my-nfs-a
```

Mount from a Linux client:

```bash
sudo mount -t nfs4 \
  <nfs-service-ip>:/exports/data \
  /mnt/cephfs-nfs \
  -o nfsvers=4.1,proto=tcp
```

Add to `/etc/fstab` for persistent mounts:

```text
<nfs-service-ip>:/exports/data  /mnt/cephfs-nfs  nfs4  nfsvers=4.1,proto=tcp,_netdev  0 0
```

## Configure Export Access Controls

Apply client restrictions to the export:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nfs export apply my-nfs - <<'EOF'
{
  "export_id": 1,
  "path": "/data",
  "cluster_id": "my-nfs",
  "pseudo": "/exports/data",
  "access_type": "RW",
  "squash": "root_squash",
  "clients": [
    {
      "addresses": ["192.168.1.0/24"],
      "access_type": "RW",
      "squash": "no_root_squash"
    }
  ],
  "fsal": {"name": "CEPH", "fs_name": "myfs"}
}
EOF
```

## Summary

Rook NFS exports backed by CephFS provide NFS access to Ceph storage for clients that cannot use the native CSI driver. The `CephNFS` CRD deploys NFS-Ganesha, and exports are managed via `ceph nfs export` commands. Clients mount using standard NFS4 protocol, and access controls can restrict which subnets or hosts can access each export.
