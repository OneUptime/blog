# How to Use NAS Storage with Docker Compose: NFS, SMB, and Local Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, Storage, NFS, DevOps, Self-Hosting

Description: A practical guide to connecting your NAS (Synology, QNAP, TrueNAS, or any NFS/SMB server) to Docker Compose stacks. Learn how to mount network shares as volumes, configure permissions, and avoid common pitfalls.

---

You have a NAS with terabytes of storage, RAID protection, and automatic backups. Your Docker containers keep losing data when you recreate them. The solution is obvious: mount your NAS storage directly into your containers. Docker Compose makes this surprisingly easy once you understand the volume driver options.

This guide covers mounting **NFS**, **SMB/CIFS**, and **local NAS shares** in Docker Compose, along with production tips for permissions, performance, and reliability.

## Quick Protocol Comparison

| Protocol | Best For | Strengths | Watch-outs |
| --- | --- | --- | --- |
| **NFS** | Linux hosts, shared access across containers | Simple setup, low overhead, native Docker support | No built-in encryption, UID/GID mapping can be tricky |
| **SMB/CIFS** | Windows hosts, mixed environments, AD integration | Works everywhere, credential-based auth | Higher overhead, requires `cifs-utils` on host |
| **Local mount + bind** | Maximum performance, simple setups | No network latency, works offline | Requires NAS mounted on host first |

## Prerequisites

Before starting:

- Your NAS is reachable from your Docker host (same network or routed)
- You have created a share/export on your NAS
- Your Docker host has the required client packages

### Installing Required Packages

For NFS on Debian/Ubuntu:

The NFS client package allows your Docker host to mount NFS shares. This is a one-time setup required before Docker can create NFS volumes.

```bash
# Update package list and install NFS client utilities
# nfs-common includes mount.nfs required for NFS volume mounts
sudo apt-get update && sudo apt-get install -y nfs-common
```

For NFS on RHEL/Rocky/AlmaLinux:

```bash
# Install NFS utilities for Red Hat-based distributions
# Includes rpcbind and other NFS dependencies
sudo dnf install -y nfs-utils
```

For SMB/CIFS:

CIFS utilities are required when connecting to Windows shares or NAS devices configured for SMB protocol.

```bash
# Debian/Ubuntu - install CIFS mount utilities
sudo apt-get install -y cifs-utils

# RHEL/Rocky - same package, different package manager
sudo dnf install -y cifs-utils
```

## Method 1: NFS Volumes (Recommended for Linux)

Docker has built-in support for NFS volumes. No plugins required.

### Step 1: Create an NFS Export on Your NAS

On Synology DSM:
1. **Control Panel → Shared Folder** → Create folder (e.g., `docker-data`)
2. **Control Panel → File Services → NFS** → Enable NFS
3. Edit the shared folder → **NFS Permissions** → Add rule:
   - Hostname/IP: Your Docker host IP or `*`
   - Privilege: Read/Write
   - Squash: Map all users to admin

On TrueNAS:
1. **Sharing → Unix Shares (NFS)** → Add share
2. Set path and authorized networks

### Step 2: Use NFS in Docker Compose

This Docker Compose configuration demonstrates how to declare an NFS volume using the built-in local driver with NFS options. The volume is mounted into the container just like any other Docker volume.

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    image: nginx:alpine
    volumes:
      # Mount the NFS volume to serve static files
      - nfs-data:/usr/share/nginx/html
    ports:
      - "8080:80"

# Volume definitions - NFS configuration lives here
volumes:
  nfs-data:
    # Use the local driver with NFS-specific options
    driver: local
    driver_opts:
      # Specify NFS as the filesystem type
      type: nfs
      # Mount options: NAS IP, NFS version, and behavior flags
      # soft = return errors on timeout, nolock = disable file locking
      o: addr=192.168.1.100,nfsvers=4.1,soft,nolock
      # NFS export path on your NAS (note the leading colon)
      device: ":/volume1/docker-data"
```

### NFS Mount Options Explained

| Option | Purpose |
| --- | --- |
| `addr=` | NAS IP address |
| `nfsvers=4.1` | NFS version (use 4.1 or 4.2 for best compatibility) |
| `soft` | Return errors on timeout instead of hanging (use `hard` for databases) |
| `nolock` | Disable file locking (faster, but don't use for databases) |
| `rw` | Read-write mount (default) |
| `noatime` | Don't update access times (better performance) |

### Production-Ready NFS Example

This comprehensive example shows a multi-service stack with different NFS mount strategies for each workload type. Databases use hard mounts for data integrity, while ephemeral data uses soft mounts for better failure handling.

```yaml
version: "3.8"

services:
  # PostgreSQL database - critical data, needs reliable storage
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secretpassword
    volumes:
      # Database files stored on NAS for persistence and backup
      - postgres-data:/var/lib/postgresql/data

  # Redis cache - ephemeral data, can tolerate some loss
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

  # Application container - uses shared upload storage
  app:
    image: myapp:latest
    volumes:
      # User uploads - shared between app instances for horizontal scaling
      - app-uploads:/app/uploads
      # Application logs - centralized on NAS for easy access
      - app-logs:/app/logs
    depends_on:
      - postgres
      - redis

volumes:
  # Database volume: use 'hard' mount for data integrity
  # 'hard' = retry indefinitely on failure (prevents data corruption)
  # 'intr' = allow interrupt to prevent hung processes
  postgres-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,nfsvers=4.1,hard,intr
      device: ":/volume1/docker/postgres"

  # Cache volume: 'soft' mount is fine since data is ephemeral
  # 'soft' = return error on timeout (container can handle gracefully)
  # 'nolock' = disable NFS locking for better performance
  redis-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,nfsvers=4.1,soft,nolock
      device: ":/volume1/docker/redis"

  # Upload volume: balanced settings for reliability + performance
  # 'hard' = ensure uploads don't get corrupted
  # 'noatime' = don't update access times (reduces write operations)
  app-uploads:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,nfsvers=4.1,hard,noatime
      device: ":/volume1/docker/uploads"

  # Logs volume: soft mount since logs are append-only
  # Some log loss is acceptable vs. hanging the application
  app-logs:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,nfsvers=4.1,soft,noatime
      device: ":/volume1/docker/logs"
```

## Method 2: SMB/CIFS Volumes

For Windows environments or when your NAS only offers SMB shares.

### Basic SMB Volume

```yaml
version: "3.8"

services:
  app:
    image: nginx:alpine
    volumes:
      - smb-data:/usr/share/nginx/html

volumes:
  smb-data:
    driver: local
    driver_opts:
      type: cifs
      o: addr=192.168.1.100,username=myuser,password=mypassword,file_mode=0777,dir_mode=0777
      device: "//192.168.1.100/docker-data"
```

### SMB with Credentials File (More Secure)

Storing passwords in `docker-compose.yml` is a bad idea. Use a credentials file instead:

```bash
# Create credentials file on Docker host
sudo nano /etc/docker-smb-credentials
```

```
username=myuser
password=mypassword
domain=WORKGROUP
```

```bash
sudo chmod 600 /etc/docker-smb-credentials
```

```yaml
version: "3.8"

services:
  app:
    image: nginx:alpine
    volumes:
      - smb-data:/usr/share/nginx/html

volumes:
  smb-data:
    driver: local
    driver_opts:
      type: cifs
      o: addr=192.168.1.100,credentials=/etc/docker-smb-credentials,uid=1000,gid=1000,file_mode=0644,dir_mode=0755
      device: "//192.168.1.100/docker-data"
```

### SMB Mount Options

| Option | Purpose |
| --- | --- |
| `credentials=` | Path to credentials file |
| `uid=` / `gid=` | Map files to specific user/group ID |
| `file_mode=` / `dir_mode=` | Set permissions for files/directories |
| `vers=3.0` | SMB protocol version (try 2.1 or 3.0) |
| `seal` | Enable encryption (SMB 3.0+) |

## Method 3: Bind Mounts (NAS Mounted on Host)

Sometimes the simplest approach is mounting the NAS share on your Docker host first, then using bind mounts in Docker Compose.

### Step 1: Mount NAS on Host

Add to `/etc/fstab`:

```bash
# NFS
192.168.1.100:/volume1/docker-data /mnt/nas-docker nfs4 defaults,_netdev 0 0

# SMB
//192.168.1.100/docker-data /mnt/nas-docker cifs credentials=/etc/smb-credentials,uid=1000,gid=1000,_netdev 0 0
```

Mount it:

```bash
sudo mkdir -p /mnt/nas-docker
sudo mount -a
```

### Step 2: Use Bind Mounts in Docker Compose

```yaml
version: "3.8"

services:
  app:
    image: nginx:alpine
    volumes:
      - /mnt/nas-docker/nginx-html:/usr/share/nginx/html
      - /mnt/nas-docker/nginx-conf:/etc/nginx/conf.d:ro
    ports:
      - "8080:80"

  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secretpassword
    volumes:
      - /mnt/nas-docker/postgres:/var/lib/postgresql/data
```

**Pros:**
- Simple to understand
- Works with any file system the host can mount
- Better debugging (you can browse files directly on host)

**Cons:**
- Extra setup step on host
- If mount fails, containers fail too
- Not portable across hosts

## Handling Permissions

Permission issues are the #1 problem when using NAS storage with Docker. Here's how to solve them.

### Understanding the Problem

Docker containers often run as specific users (e.g., `postgres` runs as UID 999, `nginx` as UID 101). Your NAS might squash all writes to a different UID. Result: permission denied.

### Solution 1: Match Container UID to NAS UID

Find out what UID your container uses:

```bash
docker run --rm postgres:16 id
# uid=999(postgres) gid=999(postgres) groups=999(postgres)
```

Configure your NAS to allow that UID, or use NFS squashing to map all access to a UID that the container can use.

### Solution 2: Run Container as Specific User

```yaml
services:
  app:
    image: myapp
    user: "1000:1000"  # Match your NAS UID/GID
    volumes:
      - nfs-data:/app/data
```

### Solution 3: Use an Init Container to Fix Permissions

```yaml
services:
  # Init container to set permissions
  init-permissions:
    image: busybox
    user: root
    command: ["sh", "-c", "chown -R 1000:1000 /data && chmod -R 755 /data"]
    volumes:
      - app-data:/data

  app:
    image: myapp
    user: "1000:1000"
    volumes:
      - app-data:/app/data
    depends_on:
      init-permissions:
        condition: service_completed_successfully
```

### Solution 4: NAS-Side Squashing

On Synology NFS settings, set "Squash" to "Map all users to admin" - this makes all access appear as the admin user, bypassing permission issues.

## Multi-Service Example with Shared Storage

A realistic example: a web app with a database, Redis cache, and shared file uploads.

```yaml
version: "3.8"

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  app:
    image: mycompany/webapp:latest
    labels:
      - "traefik.http.routers.app.rule=Host(`app.local`)"
    environment:
      DATABASE_URL: postgres://postgres:secret@postgres:5432/app
      REDIS_URL: redis://redis:6379
      UPLOAD_PATH: /uploads
    volumes:
      - uploads:/uploads
    depends_on:
      - postgres
      - redis

  worker:
    image: mycompany/webapp:latest
    command: ["./worker"]
    environment:
      DATABASE_URL: postgres://postgres:secret@postgres:5432/app
      REDIS_URL: redis://redis:6379
      UPLOAD_PATH: /uploads
    volumes:
      - uploads:/uploads  # Shared with app service
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  backup:
    image: offen/docker-volume-backup:v2
    environment:
      BACKUP_CRON_EXPRESSION: "0 2 * * *"
      BACKUP_FILENAME: "backup-%Y-%m-%dT%H-%M-%S.tar.gz"
    volumes:
      - postgres-data:/backup/postgres:ro
      - uploads:/backup/uploads:ro
      - backups:/archive

volumes:
  # Database on NAS with hard mount
  postgres-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,nfsvers=4.1,hard,intr
      device: ":/volume1/docker/myapp/postgres"

  # Redis on NAS with soft mount
  redis-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,nfsvers=4.1,soft,nolock
      device: ":/volume1/docker/myapp/redis"

  # Uploads shared between app and worker
  uploads:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,nfsvers=4.1,hard,noatime
      device: ":/volume1/docker/myapp/uploads"

  # Backups stored on NAS
  backups:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,nfsvers=4.1,soft
      device: ":/volume1/docker/myapp/backups"
```

## Common Pitfalls and Solutions

### Pitfall 1: "mount.nfs: access denied by server"

**Cause:** NFS export doesn't allow your Docker host IP.

**Fix:** Check NAS export settings and add your Docker host's IP.

### Pitfall 2: Container can't write to volume

**Cause:** UID/GID mismatch.

**Fix:** Use `user:` directive in compose file or configure NAS squashing.

### Pitfall 3: Volume not mounting on docker-compose up

**Cause:** NAS not reachable or DNS not resolved yet at boot.

**Fix:** Add `_netdev` to fstab for bind mounts, or use a healthcheck/restart policy.

### Pitfall 4: "Host is down" after NAS reboot

**Cause:** Docker cached the mount, NFS handle is stale.

**Fix:** Restart the containers: `docker-compose down && docker-compose up -d`

### Pitfall 5: Slow write performance

**Cause:** Synchronous NFS writes.

**Fix:** Use `async` export on NAS (with UPS/battery backup) or accept the latency.

### Pitfall 6: SMB mounts fail silently

**Cause:** Wrong SMB version or missing `cifs-utils`.

**Fix:** Try adding `vers=3.0` or `vers=2.1` to mount options. Ensure `cifs-utils` is installed.

## Performance Tips

### 1. Use Dedicated Storage Network

If your NAS has multiple NICs, dedicate one to Docker storage traffic:

```yaml
volumes:
  data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=10.0.1.100,nfsvers=4.1,hard  # Storage VLAN IP
      device: ":/volume1/docker"
```

### 2. Tune NFS Options for Your Workload

For large files (media, backups):
```yaml
o: addr=192.168.1.100,nfsvers=4.1,hard,rsize=1048576,wsize=1048576
```

For many small files (web apps):
```yaml
o: addr=192.168.1.100,nfsvers=4.1,hard,noatime,nodiratime
```

### 3. Use Local Volumes for High-IOPS Workloads

For databases that need maximum performance, consider keeping them on local SSD and only using NAS for backups:

```yaml
services:
  postgres:
    volumes:
      - postgres-local:/var/lib/postgresql/data  # Fast local SSD
      - postgres-backup:/backup                   # NAS for backups

volumes:
  postgres-local:
    # Default local driver, uses host storage
    
  postgres-backup:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,nfsvers=4.1,soft
      device: ":/volume1/backups/postgres"
```

## Verifying Your Setup

After configuring, verify everything works:

```bash
# Start the stack
docker-compose up -d

# Check volume mounts
docker-compose exec app df -h
docker-compose exec app mount | grep nfs

# Test write access
docker-compose exec app touch /data/test-file
docker-compose exec app ls -la /data/

# Check from NAS side that file appears
```

## Environment Variables for Flexibility

Make your compose file portable across environments:

```yaml
version: "3.8"

services:
  app:
    image: myapp
    volumes:
      - app-data:/app/data

volumes:
  app-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=${NAS_IP:-192.168.1.100},nfsvers=4.1,hard
      device: ":${NAS_PATH:-/volume1/docker}/app-data"
```

Create a `.env` file:

```bash
NAS_IP=192.168.1.100
NAS_PATH=/volume1/docker-prod
```

## TL;DR Quick Start

For most setups:

1. **Install NFS client** on Docker host: `apt install nfs-common`
2. **Create NFS export** on your NAS
3. **Add NFS volume** to your `docker-compose.yml`:

```yaml
volumes:
  my-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=YOUR_NAS_IP,nfsvers=4.1,soft
      device: ":/path/to/share"
```

4. **Use the volume** in your service: `volumes: - my-data:/app/data`
5. **Fix permissions** by matching UIDs or using NAS squashing

Your containers now persist data to your NAS. Set up NAS snapshots and backups, and you have a reliable, centralized storage solution for your Docker environment.

---

**Related Reading:**

- [How to Use NAS Storage with Kubernetes: NFS, SMB, and iSCSI Volumes](https://oneuptime.com/blog/post/2025-12-15-how-to-use-nas-storage-with-kubernetes/view)
- [How Docker Actually Works](https://oneuptime.com/blog/post/2025-12-08-how-docker-actually-works/view)
- [One Big Server Is Probably Enough](https://oneuptime.com/blog/post/2025-12-12-one-big-server-is-enough/view)
