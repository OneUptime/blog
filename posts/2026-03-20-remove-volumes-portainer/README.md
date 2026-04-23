# How to Remove Volumes in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Cleanup, Storage

Description: Delete Docker volumes in Portainer safely, including handling volumes with attached containers.

---

Docker volumes provide persistent storage for containers. In Portainer, the Volumes section lets you list, add, browse, and remove Docker volumes, including local, NFS, and CIFS-backed volumes. Bind mounts are configured in container settings rather than in the Volumes page.

The `docker volume create` examples below use the `local` driver with mount options, which Docker documents for Linux hosts and Docker Desktop.

## Navigate to Volumes in Portainer

Go to **Volumes** in the left sidebar to see all volumes on the connected environment. To remove a volume, tick its checkbox and click **Remove**. Portainer cannot remove volumes attached to a container, so remove the container first and then delete the volume.

## Create Named Volumes

```bash
# Create a simple named volume

docker volume create myapp-data

# Create with custom driver options
docker volume create \
  --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=100m \
  myapp-tmpfs
```

## Create NFS Volume

```bash
# Create an NFS-backed volume
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw,vers=4 \
  --opt device=:/exports/mydata \
  nfs-volume

# Use in a container
docker run -d \
  -v nfs-volume:/data \
  --name myapp \
  myapp:latest
```

## Create CIFS/SMB Volume

```bash
# Create a CIFS/SMB volume (Windows share)
docker volume create \
  --driver local \
  --opt type=cifs \
  --opt o=addr=192.168.1.200,username=user,password=pass,domain=CORP \
  --opt device=//server/share \
  cifs-volume
```

## Bind Mounts in Docker Run

```bash
# Bind mount a host directory
docker run -d \
  -v /host/path:/container/path \
  --name myapp \
  myapp:latest

# Read-only bind mount
docker run -d \
  -v /host/config:/app/config:ro \
  myapp:latest
```

## Back Up a Volume

```bash
# Backup volume data to a tar archive
docker run --rm \
  -v myapp-data:/source \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/myapp-data-backup-$(date +%Y%m%d).tar.gz -C /source .
```

## Clean Up Unused Volumes

```bash
# List volumes not used by any container
docker volume ls -f dangling=true

# Remove unused anonymous volumes (with confirmation prompt)
docker volume prune

# Remove all unused named and anonymous volumes
docker volume prune --all

# Check volume disk usage
docker system df -v
```

---

*Protect your volume data with automated backups monitored by [OneUptime](https://oneuptime.com).*
