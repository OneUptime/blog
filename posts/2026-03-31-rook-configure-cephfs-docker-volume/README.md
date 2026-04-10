# How to Configure CephFS as Docker Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Docker, Shared Storage, Volume

Description: Mount CephFS as a Docker volume to share persistent filesystem storage across multiple containers and hosts, enabling stateful applications with shared data access.

---

CephFS is a POSIX-compliant distributed filesystem built on Ceph. Using it as a Docker volume enables multiple containers, potentially on different hosts, to read and write to the same filesystem simultaneously - unlike RBD block storage which is exclusive to one host at a time.

## Prerequisites

- A running Rook CephFS filesystem (`CephFilesystem` resource)
- `ceph-fuse` or the kernel CephFS client installed on Docker hosts
- CephX credentials with MDS and OSD access

## Create a CephFilesystem in Rook

Deploy a CephFS filesystem if not already present:

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
  - replicated:
      size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
```

```bash
kubectl apply -f filesystem.yaml
```

## Mount CephFS on Docker Hosts

Get the monitor addresses:

```bash
kubectl -n rook-ceph get svc -l app=rook-ceph-mon \
  -o jsonpath='{range .items[*]}{.spec.clusterIP}{":6789,"}{end}'
```

Retrieve the client key:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-key client.admin
```

Mount using the kernel client:

```bash
mkdir -p /mnt/cephfs

mount -t ceph \
  192.168.1.10:6789,192.168.1.11:6789:/docker-volumes \
  /mnt/cephfs \
  -o name=admin,secret=AQBxxxxxxxxxx==,_netdev
```

Or mount using ceph-fuse (userspace, no kernel module required):

```bash
ceph-fuse /mnt/cephfs \
  -m 192.168.1.10:6789 \
  --client_mountpoint=/docker-volumes
```

## Add to /etc/fstab for Persistence

```bash
echo "192.168.1.10:6789,192.168.1.11:6789:/ /mnt/cephfs ceph name=admin,secretfile=/etc/ceph/admin.secret,_netdev,noatime 0 0" >> /etc/fstab
```

## Run Docker Containers with CephFS

Create subdirectories per application:

```bash
mkdir -p /mnt/cephfs/app1
mkdir -p /mnt/cephfs/app2
```

Run containers with bind mounts:

```bash
# Container on host1
docker run -d \
  --name writer \
  --volume /mnt/cephfs/app1:/data \
  myapp:latest write-mode

# Container on host2 - same data!
docker run -d \
  --name reader \
  --volume /mnt/cephfs/app1:/data:ro \
  myapp:latest read-mode
```

## Create a Local Docker Volume Wrapper

Register CephFS mounts as Docker local volumes for better integration:

```bash
docker volume create \
  --driver local \
  --opt type=ceph \
  --opt device=192.168.1.10:6789:/ \
  --opt o="name=admin,secretfile=/etc/ceph/admin.secret" \
  cephfs-volume
```

## Summary

CephFS as a Docker volume enables shared, persistent storage across multiple containers and hosts without the exclusive access limitations of block storage. Using the kernel CephFS client provides the best performance, while ceph-fuse works without kernel modules. Bind-mounting CephFS directories into Docker containers is the simplest integration path for non-orchestrated Docker deployments.
