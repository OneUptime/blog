# How to Use Podman for File Sharing and Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, File Sharing, Storage, MinIO, Nextcloud, Container

Description: Learn how to deploy file sharing and storage solutions like Nextcloud, MinIO, and Samba using Podman containers for self-hosted cloud storage and collaborative file management.

---

> Podman lets you run self-hosted file sharing and object storage services in rootless containers, giving you full control over your data without relying on third-party cloud providers.

Self-hosted file sharing provides privacy, control, and cost savings compared to commercial cloud storage. Podman makes deploying these services straightforward by packaging complex applications like Nextcloud and MinIO in containers that are easy to configure and maintain.

This guide covers deploying various file sharing and storage solutions with Podman, from personal cloud storage to S3-compatible object storage.

---

## Why Podman for File Storage

File storage services need reliable persistence and security. Podman's named volumes and bind mounts ensure your files survive container updates. Rootless execution means a compromised storage container is limited to the mounted paths you expose and the permissions of the user running Podman. SELinux labeling with the `:Z` flag adds mandatory access control.

## Deploying Nextcloud

Nextcloud provides a full-featured cloud storage platform. Deploy it with MariaDB in a pod:

```bash
mkdir -p "$HOME/nextcloud-files"

podman pod create --name nextcloud -p 8080:80

podman run -d --pod nextcloud \
  --name nextcloud-db \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=nextcloud \
  -e MYSQL_USER=ncuser \
  -e MYSQL_PASSWORD=ncpass \
  -v nextcloud-db:/var/lib/mysql:Z \
  docker.io/library/mariadb:11

podman run -d --pod nextcloud \
  --name nextcloud-app \
  -e MYSQL_HOST=127.0.0.1 \
  -e MYSQL_DATABASE=nextcloud \
  -e MYSQL_USER=ncuser \
  -e MYSQL_PASSWORD=ncpass \
  -v nextcloud-data:/var/www/html:Z \
  -v "$HOME/nextcloud-files:/var/www/html/data:Z" \
  docker.io/library/nextcloud:stable-apache
```

Access Nextcloud at `http://localhost:8080` and complete the setup wizard.

## Adding Redis Cache to Nextcloud

Speed up Nextcloud with Redis for file locking and distributed caching:

```bash
podman run -d --pod nextcloud \
  --name nextcloud-redis \
  docker.io/library/redis:7-alpine

# Configure Nextcloud to use Redis

podman exec -u www-data nextcloud-app php occ config:system:set \
  redis host --value=127.0.0.1
podman exec -u www-data nextcloud-app php occ config:system:set \
  redis port --value=6379 --type=integer
podman exec -u www-data nextcloud-app php occ config:system:set \
  memcache.distributed --value='\OC\Memcache\Redis'
podman exec -u www-data nextcloud-app php occ config:system:set \
  memcache.locking --value='\OC\Memcache\Redis'
```

## Deploying MinIO (S3-Compatible Storage)

MinIO provides S3-compatible object storage that works with any application supporting the S3 API:

```bash
podman volume create minio-data

podman run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 \
  -v minio-data:/data:z \
  docker.io/minio/minio:latest \
  server /data --console-address ":9001"
```

Access the MinIO console at `http://localhost:9001`. Use the S3 API on port `9000`.

Create buckets and upload files using the MinIO client:

```bash
podman run --rm --network host \
  -e MC_HOST_local=http://minioadmin:minioadmin123@localhost:9000 \
  docker.io/minio/mc:latest \
  mb local/my-bucket

podman run --rm --network host \
  -e MC_HOST_local=http://minioadmin:minioadmin123@localhost:9000 \
  -v "$HOME/uploads:/uploads:ro,Z" \
  docker.io/minio/mc:latest \
  cp /uploads/file.txt local/my-bucket/
```

## Using MinIO with Python

```python
# upload_to_minio.py
from minio import Minio
from minio.error import S3Error

client = Minio(
    "localhost:9000",
    access_key="minioadmin",
    secret_key="minioadmin123",
    secure=False
)

# Create bucket if not exists
if not client.bucket_exists("documents"):
    client.make_bucket("documents")

# Upload a file
client.fput_object(
    "documents",
    "report.pdf",
    "/path/to/report.pdf",
    content_type="application/pdf"
)

# List objects
objects = client.list_objects("documents", recursive=True)
for obj in objects:
    print(f"{obj.object_name} - {obj.size} bytes")
```

## Deploying Samba for Windows File Sharing

Share files with Windows machines using a Samba container. Because SMB clients typically use low ports, this example uses rootful Podman:

```bash
mkdir -p "$HOME/samba/shared"

sudo podman run -d \
  --name samba \
  -p 139:139 \
  -p 445:445 \
  -v "$HOME/samba/shared:/shared:Z" \
  -e USERID=$(id -u) \
  -e GROUPID=$(id -g) \
  docker.io/dperson/samba \
  -u "user;password" \
  -s "shared;/shared;yes;no;no;user" \
  -p
```

Connect from Windows using `\\server-ip\shared` or from Linux:

```bash
mount -t cifs //server-ip/shared /mnt/shared -o username=user,password=password
```

## WebDAV File Server

Deploy a simple WebDAV server for cross-platform file access:

```bash
mkdir -p "$HOME/webdav-data"

podman run -d \
  --name webdav \
  -p 8080:8080 \
  -e UID=$(id -u) \
  -e WEBDAV_USERNAME=webdav \
  -e WEBDAV_PASSWORD=change-me \
  -v "$HOME/webdav-data:/media:Z" \
  docker.io/ionelmc/webdav:latest
```

## Syncthing for Peer-to-Peer Sync

Syncthing provides decentralized file synchronization:

```bash
mkdir -p "$HOME/sync"

podman run -d \
  --name syncthing \
  -p 8384:8384 \
  -p 22000:22000/tcp \
  -p 22000:22000/udp \
  -p 21027:21027/udp \
  -v syncthing-config:/var/syncthing/config:Z \
  -v "$HOME/sync:/var/syncthing/data:Z" \
  docker.io/syncthing/syncthing:latest
```

Access the web UI at `http://localhost:8384` to configure sync folders and add devices.

## Backup Strategy for Storage Containers

Automate backups of your file storage:

```bash
#!/bin/bash
# backup-storage.sh
BACKUP_DIR="$HOME/backups/storage"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

# Backup Nextcloud data
podman exec -u www-data nextcloud-app php occ maintenance:mode --on
tar -czf "${BACKUP_DIR}/nextcloud-files-${DATE}.tar.gz" "$HOME/nextcloud-files/"
podman exec nextcloud-db mariadb-dump -u root -prootpass nextcloud > "${BACKUP_DIR}/nextcloud-db-${DATE}.sql"
podman exec -u www-data nextcloud-app php occ maintenance:mode --off

# Backup MinIO data
podman run --rm \
  -v minio-data:/data:ro,z \
  -v "${BACKUP_DIR}:/backup:Z" \
  docker.io/library/alpine:latest \
  tar -czf "/backup/minio-${DATE}.tar.gz" /data

echo "Storage backup completed"
```

## Running as systemd Services

```ini
# ~/.config/containers/systemd/minio.container
[Container]
Image=docker.io/minio/minio:latest
PublishPort=9000:9000
PublishPort=9001:9001
Environment=MINIO_ROOT_USER=minioadmin
Environment=MINIO_ROOT_PASSWORD=minioadmin123
Volume=minio-data:/data:z
Exec=server /data --console-address :9001

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Conclusion

Podman provides a secure foundation for self-hosted file sharing and storage services. Whether you need a full cloud platform like Nextcloud, S3-compatible object storage with MinIO, or simple file sharing with Samba, Podman containers keep your storage services isolated, portable, and easy to maintain. Rootless execution and SELinux integration add meaningful security for services that handle your most important data.
