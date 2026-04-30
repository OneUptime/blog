# How to Identify and Clean Up Unused Volumes in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Cleanup, Storage

Description: Find and remove unused Docker volumes in Portainer to reclaim storage space on your Docker hosts.

---

Docker volumes provide persistent storage for containers. Portainer's Volumes section lets you view, add, remove, and, in some environments, browse Docker volumes. In Portainer, a volume marked as `unused` means Portainer cannot see any applications using it, and that label can also appear on external volumes created outside Portainer.

## Navigate to Volumes in Portainer

Go to **Volumes** in the left sidebar to see all volumes on the connected environment.

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
# List volumes not referenced by any container
docker volume ls -f dangling=true

# Remove unused anonymous volumes (with confirmation prompt)
docker volume prune

# Remove unused named and anonymous volumes
docker volume prune -a

# Check volume disk usage
docker system df -v
```

---

*Protect your volume data with automated backups monitored by [OneUptime](https://oneuptime.com).*
