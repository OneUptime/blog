# How to Set Up NFS Shared Storage for Portainer Swarm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, NFS, Docker Swarm, Storage, Infrastructure

Description: Configure NFS-based shared storage for Docker Swarm clusters managed by Portainer to enable persistent volumes across all Swarm nodes.

## Introduction

NFS (Network File System) is a simple, widely-supported solution for shared storage in Docker Swarm deployments. When Portainer deploys services across Swarm nodes, NFS volumes ensure data persists and is accessible regardless of which node a container runs on.

## Prerequisites

- Docker Swarm cluster managed by Portainer
- A dedicated NFS server (or NAS device)
- Network connectivity between Swarm nodes and NFS server
- NFS utilities on all Swarm nodes

## Step 1: Set Up NFS Server

```bash
# Install NFS server (Ubuntu/Debian)

sudo apt-get update && sudo apt-get install -y nfs-kernel-server

# Create export directories
sudo mkdir -p /exports/{portainer,db-data,app-data,shared}
sudo chmod 777 /exports/*

# Configure exports
sudo tee /etc/exports << 'EOF'
# Allow all Swarm nodes to access exports
# Replace with your actual network range
/exports/portainer    192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)
/exports/db-data      192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)
/exports/app-data     192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)
/exports/shared       192.168.1.0/24(rw,sync,no_subtree_check)
EOF

# Apply exports and restart NFS
sudo exportfs -ra
sudo systemctl enable --now nfs-kernel-server

# Verify exports
sudo exportfs -v
showmount -e localhost
```

## Step 2: Install NFS Client on All Swarm Nodes

```bash
# Run on ALL Docker Swarm nodes
# Ubuntu/Debian
sudo apt-get install -y nfs-common

# RHEL/CentOS
sudo yum install -y nfs-utils

# Verify NFS client is working
showmount -e 192.168.1.100  # Replace with NFS server IP
```

## Step 3: Mount NFS on Swarm Nodes

```bash
# Create mount points on all nodes
sudo mkdir -p /mnt/nfs/{portainer,db-data,app-data,shared}

# Mount NFS shares
sudo mount -t nfs -o nfsvers=4 192.168.1.100:/exports/portainer /mnt/nfs/portainer
sudo mount -t nfs -o nfsvers=4 192.168.1.100:/exports/db-data /mnt/nfs/db-data
sudo mount -t nfs -o nfsvers=4 192.168.1.100:/exports/app-data /mnt/nfs/app-data
sudo mount -t nfs -o nfsvers=4 192.168.1.100:/exports/shared /mnt/nfs/shared

# Make permanent in /etc/fstab
sudo tee -a /etc/fstab << 'EOF'
192.168.1.100:/exports/portainer /mnt/nfs/portainer nfs defaults,nfsvers=4,_netdev 0 0
192.168.1.100:/exports/db-data   /mnt/nfs/db-data   nfs defaults,nfsvers=4,_netdev 0 0
192.168.1.100:/exports/app-data  /mnt/nfs/app-data  nfs defaults,nfsvers=4,_netdev 0 0
192.168.1.100:/exports/shared    /mnt/nfs/shared    nfs defaults,nfsvers=4,_netdev 0 0
EOF

sudo mount -a
```

## Step 4: Create Docker NFS Volumes

```bash
# Create Docker volumes pointing to NFS mounts
# Method 1: Using bind mounts
docker volume create \
  --driver local \
  --opt type=none \
  --opt device=/mnt/nfs/db-data \
  --opt o=bind \
  nfs-db-data

# Method 2: Direct NFS driver (without manual mount)
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,nfsvers=4,hard,timeo=600,tcp,rw \
  --opt device=:/exports/db-data \
  nfs-db-data-direct
```

## Step 5: Portainer Swarm Stack with NFS Volumes

```yaml
# swarm-app-stack.yml - deploy via Portainer
version: '3.8'

services:
  web:
    image: nginx:1.25
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
    ports:
      - "80:80"
    volumes:
      - type: bind
        source: /mnt/nfs/app-data
        target: /usr/share/nginx/html
    networks:
      - frontend

  db:
    image: postgres:15
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.db == true
    volumes:
      - nfs-db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: "${DB_PASSWORD}"
      POSTGRES_DB: myapp
    networks:
      - backend

volumes:
  nfs-db-data:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=192.168.1.100,nfsvers=4,rw,hard"
      device: ":/exports/db-data"

networks:
  frontend:
    driver: overlay
    attachable: true
  backend:
    driver: overlay
    attachable: true
```

## NFS Performance Tuning

```bash
# Optimize NFS mount options for Docker workloads
# /etc/fstab entry using NFSv4 and negotiated transfer sizes
192.168.1.100:/exports/db-data /mnt/nfs/db-data nfs \
  rw,hard,nfsvers=4,timeo=600,_netdev 0 0

# For high-performance workloads
192.168.1.100:/exports/app-data /mnt/nfs/app-data nfs \
  rw,hard,nfsvers=4,rsize=1048576,wsize=1048576,timeo=600,_netdev 0 0
```

## Monitoring NFS Mounts

```bash
# Check NFS statistics
nfsstat -c

# Monitor NFS mount points
df -h /mnt/nfs/*

# Check for stale mounts
mount | grep nfs

# Remount if stale
sudo umount -lf /mnt/nfs/app-data
sudo mount /mnt/nfs/app-data
```

## Conclusion

NFS shared storage provides a simple, reliable solution for persistent volumes in Docker Swarm clusters managed by Portainer. Services can be rescheduled on another Swarm node while still accessing the same data, but true high availability for stateful workloads still depends on the application design and the availability of the NFS backend itself. For production use, consider HA NFS solutions like GlusterFS-backed NFS or dedicated NAS appliances.
