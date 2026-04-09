# How to Mount Ceph Volumes in Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Docker Compose, Volume, Persistent Storage, RBD

Description: Use Ceph RBD and CephFS as persistent volumes in Docker Compose deployments, enabling multi-service stacks with durable shared storage from a Ceph cluster.

---

Docker Compose orchestrates multi-container applications defined in a YAML file. Integrating Ceph storage into Compose deployments provides durable, network-attached storage that persists across container restarts and host reboots.

## Approach 1: Bind Mount from Host (Simplest)

Pre-mount Ceph volumes on the host, then reference them as bind mounts in Compose:

```bash
# On the host - mount CephFS
ceph-fuse /mnt/ceph \
  --name client.admin \
  --conf /etc/ceph/ceph.conf

# Create subdirectories inside CephFS after mounting
mkdir -p /mnt/ceph/postgres-data /mnt/ceph/redis-data
```

Reference in `docker-compose.yml`:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    volumes:
      - /mnt/ceph/postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - /mnt/ceph/redis-data:/data
    command: redis-server --save 60 1 --loglevel warning
    restart: unless-stopped
```

## Approach 2: Local Volume Driver

Use Docker's local volume driver with NFS-style mount options:

```yaml
version: "3.9"
services:
  webapp:
    image: myapp:latest
    volumes:
      - ceph-data:/app/data

volumes:
  ceph-data:
    driver: local
    driver_opts:
      type: ceph
      device: "192.168.1.10:/"
      o: "name=admin,secretfile=/etc/ceph/admin.secret,noatime"
```

## Approach 3: Pre-Create Named Volumes

Create volumes separately and reference them in Compose:

```bash
# Create and mount an RBD image
rbd create --size 20480 rbd/webapp-data
rbd map rbd/webapp-data
mkfs.ext4 /dev/rbd0
mkdir -p /mnt/webapp-data
mount /dev/rbd0 /mnt/webapp-data

# Register as a Docker volume
docker volume create \
  --driver local \
  --opt type=none \
  --opt device=/mnt/webapp-data \
  --opt o=bind \
  webapp-data
```

Reference in Compose:

```yaml
version: "3.9"
services:
  webapp:
    image: myapp:latest
    volumes:
      - webapp-data:/data

volumes:
  webapp-data:
    external: true
```

## Full Stack Example with Ceph Storage

```yaml
version: "3.9"
services:
  app:
    image: wordpress:latest
    depends_on:
      - db
    ports:
      - "80:80"
    volumes:
      - /mnt/ceph/wordpress:/var/www/html/wp-content
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wp
      WORDPRESS_DB_PASSWORD: wp_secret

  db:
    image: mysql:8.0
    volumes:
      - /mnt/ceph/mysql:/var/lib/mysql
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wp
      MYSQL_PASSWORD: wp_secret
      MYSQL_ROOT_PASSWORD: root_secret
```

Start the stack:

```bash
docker compose up -d
docker compose ps
```

## Automate Ceph Mount at Boot

Use a systemd service to mount Ceph before Docker Compose starts:

```ini
[Unit]
Description=Mount CephFS for Docker Compose
Before=docker.service
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/ceph-fuse /mnt/ceph --name client.admin
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

## Summary

Docker Compose integrates with Ceph storage through bind mounts of pre-mounted Ceph filesystems or RBD devices. The simplest approach is mounting CephFS or an RBD image on the host at startup and referencing the mount point as a volume in the Compose file. Use systemd service ordering to ensure Ceph mounts are established before Docker Compose services start.
