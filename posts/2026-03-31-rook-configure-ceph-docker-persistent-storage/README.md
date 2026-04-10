# How to Configure Ceph with Docker for Persistent Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Docker, Persistent Storage, RBD, Block Storage

Description: Use Ceph RBD block storage and CephFS as persistent storage backends for Docker containers, mounting Ceph volumes directly into Docker workloads.

---

Docker containers are ephemeral by default, but many workloads require persistent storage. Ceph provides both block storage (RBD) and shared filesystem (CephFS) that can be mounted directly into Docker containers running alongside a Rook-managed cluster.

## Prerequisites

- A running Rook-Ceph cluster
- The `ceph-common` package installed on Docker host nodes
- A CephX key with appropriate pool permissions

## Mount a Ceph RBD Image in Docker

Create a Ceph RBD pool and image:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create docker-rbd 32

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init docker-rbd

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create --size 10240 docker-rbd/myvolume
```

Map the RBD image to a block device on the Docker host:

```bash
# Get the monitor addresses
MON_ADDRS=$(kubectl -n rook-ceph get svc rook-ceph-mon-a -o jsonpath='{.spec.clusterIP}')

# Get the client key
CLIENT_KEY=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get-key client.admin)

# Map the RBD image
rbd map docker-rbd/myvolume \
  -m $MON_ADDRS \
  --id admin \
  --keyfile <(echo "$CLIENT_KEY")

# Format and mount
mkfs.ext4 /dev/rbd0
mount /dev/rbd0 /mnt/ceph-volume
```

Run a Docker container with the mounted volume:

```bash
docker run -d \
  --name myapp \
  --mount type=bind,source=/mnt/ceph-volume,target=/data \
  nginx:alpine
```

## Use a Docker Volume for CephFS

Mount CephFS directly as a Docker volume:

```bash
# Install ceph-fuse on the Docker host
apt-get install -y ceph-fuse

# Get credentials
kubectl -n rook-ceph get secret rook-ceph-admin-keyring \
  -o jsonpath='{.data.keyring}' | base64 -d > /etc/ceph/keyring

# Mount CephFS
ceph-fuse /mnt/cephfs \
  --conf /etc/ceph/ceph.conf \
  --name client.admin
```

Run Docker with CephFS mount:

```bash
docker run -d \
  --name shared-app \
  --mount type=bind,source=/mnt/cephfs/myapp,target=/data \
  myapp:latest
```

## Automate RBD Mapping with a Helper Script

Use a helper script to automate RBD device mapping before `docker run`:

```bash
#!/bin/bash
IMAGE_NAME=$1
POOL=${2:-docker-rbd}

rbd map $POOL/$IMAGE_NAME --id admin --keyfile <(echo "$CLIENT_KEY")
DEVICE=$(rbd device list | grep $IMAGE_NAME | awk '{print $5}')
echo $DEVICE
```

## Verify Persistent Data

Stop and restart the container to confirm data persists:

```bash
docker stop myapp
docker rm myapp

docker run -d \
  --name myapp-v2 \
  --mount type=bind,source=/mnt/ceph-volume,target=/data \
  nginx:alpine

docker exec myapp-v2 ls /data
```

## Summary

Docker containers can use Ceph RBD images as persistent block storage by mapping RBD devices to the host and bind-mounting them into containers. CephFS provides a shared filesystem that multiple containers across different hosts can mount simultaneously. While Kubernetes with Rook is the preferred approach for container-native storage, direct Docker integration works for non-orchestrated environments.
