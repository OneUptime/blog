# How to Use Ceph RBD with Docker Volume Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Docker, Volume Plugin, Storage

Description: Use the Ceph RBD Docker volume plugin to create and manage persistent block storage volumes for Docker containers without manual RBD device mapping.

---

The Ceph RBD Docker volume plugin automates the creation, mapping, and unmapping of RBD images as Docker volumes. It eliminates the need to manually map RBD devices before running containers and integrates with the standard `docker volume` CLI.

## Install the RBD Volume Plugin

The `rbd-docker-plugin` is available as a Docker plugin:

```bash
docker plugin install ghcr.io/yp-engineering/rbd-docker-plugin \
  --alias rbd \
  --grant-all-permissions \
  --disable
```

Verify the plugin is active:

```bash
docker plugin ls | grep rbd
```

## Configure the Plugin

Create a configuration file for the plugin:

```bash
cat > /etc/ceph/ceph.conf << 'EOF'
[global]
monitors = 192.168.1.10:6789,192.168.1.11:6789,192.168.1.12:6789
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx

[client.docker-rbd]
key = AQBxxxxxxxxxxxxxxxxxxxxxxxxxx==
EOF
```

Set plugin environment variables:

```bash
docker plugin set rbd \
  CEPH_CLUSTER=ceph \
  CEPH_KEYRING=/etc/ceph/ceph.client.docker-rbd.keyring \
  CEPH_POOL=docker-volumes

docker plugin enable rbd
```

## Create Volumes with the Plugin

Create a Docker volume backed by Ceph RBD:

```bash
# Create a 10GB volume in the docker-volumes pool
docker volume create \
  --driver rbd \
  --opt size=10240 \
  --opt pool=docker-volumes \
  --opt fstype=ext4 \
  myapp-data

# List volumes
docker volume ls | grep rbd
```

## Use the Volume in a Container

Run a container with the RBD-backed volume:

```bash
docker run -d \
  --name myapp \
  --volume myapp-data:/var/lib/myapp \
  myapp:latest
```

The plugin automatically maps the RBD image when the container starts and unmaps it when the container stops.

## Manage RBD Volumes

List all RBD images created by the plugin:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd ls docker-volumes
```

Inspect a specific volume:

```bash
docker volume inspect myapp-data
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd info docker-volumes/myapp-data
```

Remove a volume:

```bash
docker volume rm myapp-data
# This also removes the RBD image
```

## Troubleshoot Plugin Issues

Check plugin logs:

```bash
journalctl -u docker -f | grep rbd

# Or check plugin process
ps aux | grep rbd
```

Check RBD device mappings on the host:

```bash
rbd device list
lsblk | grep rbd
```

## Summary

The Ceph RBD Docker volume plugin provides seamless integration between Docker volume management and Ceph block storage. It handles RBD image creation, block device mapping, filesystem formatting, and cleanup automatically. This is significantly simpler than manual RBD device management and works well for single-host or Docker Swarm deployments that need Ceph-backed persistent storage.
