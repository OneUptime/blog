# How to Set Up GlusterFS Volumes with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GlusterFS, Storage, Docker Swarm, Distributed

Description: Configure GlusterFS distributed storage for Docker Swarm clusters managed by Portainer to provide replicated, high-available persistent volumes.

## Introduction

GlusterFS is a distributed filesystem that provides replicated, scalable storage across multiple nodes. When running Docker Swarm with Portainer, GlusterFS can keep persistent data available regardless of which node a container is scheduled on, as long as the volume is mounted on each Docker host.

## Prerequisites

- 3+ Linux nodes in Docker Swarm (managed by Portainer)
- Each node with a dedicated disk for GlusterFS
- Network connectivity between all nodes
- Hostnames resolvable between nodes and clients (via DNS or `/etc/hosts`)
- Ports 24007-24008 and the configured Gluster brick port range open between nodes

## Step 1: Install GlusterFS on All Nodes

```bash
# Run on ALL Swarm nodes

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y glusterfs-server
sudo systemctl enable --now glusterd

# CentOS (using the CentOS Storage SIG repository)
sudo yum install -y centos-release-gluster
sudo yum install -y glusterfs-server
sudo systemctl enable --now glusterd

# Verify GlusterFS is running
sudo systemctl status glusterd
```

## Step 2: Configure the Storage Brick

```bash
# On each node: prepare the dedicated disk
# Assuming /dev/sdb is the dedicated storage disk

# Create a partition
sudo parted /dev/sdb mklabel gpt
sudo parted -a optimal /dev/sdb mkpart primary xfs 0% 100%

# Format with XFS (recommended for GlusterFS)
sudo mkfs.xfs -i size=512 /dev/sdb1

# Create mount point
sudo mkdir -p /data/glusterfs/brick1

# Mount and add to fstab
echo "/dev/sdb1 /data/glusterfs/brick1 xfs defaults 0 0" | sudo tee -a /etc/fstab
sudo mount -a

# Create the brick subdirectory
sudo mkdir -p /data/glusterfs/brick1/vol1
```

## Step 3: Create the GlusterFS Volume

```bash
# Run on the first node (gluster1)
# Add peers first
sudo gluster peer probe gluster2
sudo gluster peer probe gluster3

# Verify peers
sudo gluster peer status

# Create a replicated volume (3 replicas for 3 nodes)
sudo gluster volume create portainer-data \
  replica 3 \
  gluster1:/data/glusterfs/brick1/vol1 \
  gluster2:/data/glusterfs/brick1/vol1 \
  gluster3:/data/glusterfs/brick1/vol1

# Start the volume
sudo gluster volume start portainer-data

# Verify
sudo gluster volume status
sudo gluster volume info portainer-data
```

## Step 4: Mount GlusterFS on Docker Hosts

```bash
# On all Docker Swarm nodes: install GlusterFS client
# Ubuntu/Debian
sudo apt-get install -y glusterfs-client

# Create mount point
sudo mkdir -p /mnt/glusterfs

# Ensure gluster1/gluster2 are resolvable on every client via DNS or /etc/hosts

# Mount the GlusterFS volume
sudo mount -t glusterfs -o backupvolfile-server=gluster2 \
  gluster1:/portainer-data /mnt/glusterfs

# Make permanent in fstab
echo "gluster1:/portainer-data /mnt/glusterfs glusterfs defaults,_netdev,backupvolfile-server=gluster2 0 0" \
  | sudo tee -a /etc/fstab

sudo mount -a

# Create application directories used by Docker bind mounts
sudo mkdir -p /mnt/glusterfs/app-data /mnt/glusterfs/web-content /mnt/glusterfs/db-data

# Verify mount
df -h /mnt/glusterfs
```

## Step 5: Create Docker Volumes Using GlusterFS

```bash
# Create a Docker volume backed by the GlusterFS mount point
docker volume create \
  --driver local \
  --opt type=none \
  --opt device=/mnt/glusterfs/app-data \
  --opt o=bind \
  app-data
```

## Step 6: Deploy Stacks Using GlusterFS Volumes in Portainer

```yaml
# portainer-stack with GlusterFS volumes
version: '3.8'

services:
  web:
    image: nginx:latest
    deploy:
      replicas: 3
    volumes:
      - web-content:/usr/share/nginx/html
    networks:
      - frontend

  db:
    image: postgres:15
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == worker
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: secret
    networks:
      - backend

volumes:
  web-content:
    driver: local
    driver_opts:
      type: none
      device: /mnt/glusterfs/web-content
      o: bind
  db-data:
    driver: local
    driver_opts:
      type: none
      device: /mnt/glusterfs/db-data
      o: bind

networks:
  frontend:
    driver: overlay
  backend:
    driver: overlay
```

## Monitoring GlusterFS Health

```bash
# Check volume health
sudo gluster volume status portainer-data

# View volume info
sudo gluster volume info portainer-data

# Check replication status
sudo gluster volume heal portainer-data info

# Rebalance after expanding the volume with additional bricks
sudo gluster volume rebalance portainer-data start
sudo gluster volume rebalance portainer-data status
```

## Conclusion

GlusterFS provides reliable distributed storage for Docker Swarm clusters managed by Portainer. With replica volumes, data is automatically synchronized across nodes, enabling containers to migrate between nodes without data loss. This setup is useful for shared persistent data in Swarm clusters that require high availability storage.
