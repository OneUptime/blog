# How to Create NFS Volumes in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, NFS, Storage

Description: Learn how to create and mount NFS (Network File System) volumes in Portainer to share storage across multiple Docker hosts.

## Introduction

NFS volumes allow Docker containers to access remote file storage over a network share. This is essential in multi-host environments where containers on different hosts need to share data - such as shared media storage, configuration files, or persistent data in distributed deployments. Portainer supports NFS volumes through Docker's local volume driver with NFS options.

## Prerequisites

- Portainer installed with a connected Docker environment
- An NFS server accessible from the Docker host
- NFS client tools installed on the Docker host
- Network access between Docker host and NFS server

## Step 1: Prepare the NFS Server

On the NFS server:

```bash
# Install NFS server (Ubuntu/Debian):

sudo apt-get install -y nfs-kernel-server

# Create the export directory:
sudo mkdir -p /exports/docker-data
sudo chown nobody:nogroup /exports/docker-data
sudo chmod 777 /exports/docker-data   # Adjust permissions as needed

# Configure NFS exports:
sudo nano /etc/exports
# Add:
/exports/docker-data  192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)

# Apply the exports:
sudo exportfs -ra
sudo systemctl restart nfs-kernel-server

# Verify exports:
showmount -e localhost
```

## Step 2: Install NFS Client on Docker Host

```bash
# Ubuntu/Debian:
sudo apt-get install -y nfs-common

# CentOS/RHEL:
sudo dnf install -y nfs-utils

# Test NFS connectivity:
showmount -e nfs-server.example.com
# /exports/docker-data 192.168.1.0/24

# Manual test mount:
sudo mkdir -p /mnt/test
sudo mount -t nfs nfs-server.example.com:/exports/docker-data /mnt/test
ls /mnt/test
sudo umount /mnt/test
```

## Step 3: Create NFS Volume via Portainer

1. Navigate to **Volumes** in Portainer.
2. Click **Add volume**.
3. Configure:

```text
Name:            nfs-shared-data
Driver:          local
Use NFS volume:  On
```

4. Under **NFS Settings**, add:

```text
Address:      nfs-server.example.com
NFS Version:  4
Mount point:  /exports/docker-data
Options:      rw
```

5. Click **Create the volume**.

## Step 4: NFS Volume via Docker CLI

```bash
# Create NFS volume:
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.10,rw,nfsvers=4,hard,timeo=600 \
  --opt device=:/exports/docker-data \
  nfs-shared-data

# Verify the volume:
docker volume inspect nfs-shared-data
```

## Step 5: NFS Volumes in Docker Compose

```yaml
# docker-compose.yml with NFS volumes
services:
  web:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      # Mount NFS volume for shared web content
      - nfs_web_content:/usr/share/nginx/html:ro
    ports:
      - "80:80"

  app:
    image: myorg/myapp:latest
    restart: unless-stopped
    volumes:
      # Mount NFS volume for shared uploads
      - nfs_uploads:/app/uploads

volumes:
  nfs_web_content:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=nfs-server.internal,rw,nfsvers=4,timeo=300,retrans=3"
      device: ":/exports/web-content"

  nfs_uploads:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=nfs-server.internal,rw,nfsvers=4,hard,timeo=600"
      device: ":/exports/uploads"
```

## Step 6: NFS Options Explained

Common NFS mount options:

```text
addr=<ip>     IP or hostname of NFS server
nfsvers=4     Use NFS version 4 (recommended)
rw            Read/write access
ro            Read-only access
hard          Retry requests indefinitely on failure
soft          Return an error after timeout/retries (riskier)
timeo=600     Timeout in tenths of a second (60s = 600)
retrans=3     Retransmissions before further recovery action
bg            Retry the mount in the background if the server is unavailable
```

For more resilient client behavior:
```text
o: "addr=nfs-server,rw,nfsvers=4,hard,timeo=600,retrans=5"
```

## Step 7: NFS v3 (For Older Systems)

```yaml
volumes:
  nfs_data_v3:
    driver: local
    driver_opts:
      type: nfs
      # NFS version 3 options:
      o: "addr=nfs-server.internal,rw,nfsvers=3,soft,timeo=300"
      device: ":/exports/data"
```

## Step 8: Multi-Host NFS Deployment

NFS volumes are most powerful for multi-host setups:

```yaml
# Deploy to multiple Docker hosts, all sharing the same NFS storage
# Each host mounts the same NFS export

# On host 1: docker-compose.yml
volumes:
  shared_uploads:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=192.168.1.10,rw,nfsvers=4"
      device: ":/exports/uploads"

# On host 2: same configuration
# Both hosts access the same files
```

## Troubleshooting NFS Volumes

```bash
# Test NFS mount manually first:
sudo mkdir -p /mnt/test
sudo mount -t nfs4 nfs-server:/exports/data /mnt/test

# Common errors:
# "mount.nfs: access denied"
# → Check NFS exports configuration (/etc/exports)
# → Verify the Docker host IP is in the allowed range

# "mount.nfs: Connection timed out"
# → Check firewall (NFSv4 typically uses port 2049; showmount and NFSv3 may also require rpcbind/mountd ports)
# → Verify NFS server is running: systemctl status nfs-kernel-server

# "Permission denied" writing to NFS:
# → Check NFS server export options (no_root_squash vs root_squash)
# → Check directory permissions on NFS server

# Open the common NFSv4 port in the firewall:
sudo ufw allow from 192.168.1.0/24 to any port 2049
# If you use showmount or NFSv3, also allow the rpcbind/mountd ports configured on your server.
```

## Performance Considerations

```yaml
# High-performance NFS options for large file workloads:
volumes:
  high_perf_nfs:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=nfs-server,rw,nfsvers=4,async,rsize=1048576,wsize=1048576"
      device: ":/exports/data"
```

```text
rsize=1048576  → Read block size (1MB)
wsize=1048576  → Write block size (1MB)
async          → Async writes (faster but less safe)
```

## Conclusion

NFS volumes in Portainer provide shared storage across multiple Docker hosts - essential for distributed applications, media servers, and multi-host deployments. The key steps are ensuring NFS server configuration, installing NFS client tools on Docker hosts, and creating volumes with the correct NFS mount options. Always test NFS connectivity manually before configuring Docker volumes to isolate any connectivity or permissions issues.
