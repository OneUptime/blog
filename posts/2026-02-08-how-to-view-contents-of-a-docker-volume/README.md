# How to View Contents of a Docker Volume

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, Storage, Containers, DevOps, Docker CLI

Description: Learn multiple methods to view, browse, and inspect the contents of Docker volumes without modifying your running containers.

---

Docker volumes store data outside of containers, making it persistent across container restarts and removals. But unlike bind mounts that map to visible directories on your host, Docker-managed volumes live in Docker's internal storage area. Viewing their contents is not always obvious. This guide covers every practical method to inspect what is inside a Docker volume.

## Finding Your Volumes

First, list all volumes on your system:

```bash
# List all Docker volumes
docker volume ls
```

Output:

```
DRIVER    VOLUME NAME
local     postgres-data
local     redis-data
local     app-uploads
local     a1b2c3d4e5f6789...
```

Get details about a specific volume:

```bash
# Inspect a volume to see its mount point and other metadata
docker volume inspect postgres-data
```

Output:

```json
[
    {
        "CreatedAt": "2026-01-15T10:30:00Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/postgres-data/_data",
        "Name": "postgres-data",
        "Options": {},
        "Scope": "local"
    }
]
```

The `Mountpoint` field shows where the volume data lives on the host filesystem.

## Method 1: Using a Temporary Container

The cleanest and most portable way to view volume contents is to mount it into a temporary container:

```bash
# List files in a volume using a temporary Alpine container
docker run --rm -v postgres-data:/data alpine ls -la /data
```

Browse the volume interactively:

```bash
# Start an interactive shell to browse the volume
docker run --rm -it -v postgres-data:/data alpine sh
```

Inside the container, you can use standard commands:

```bash
# Navigate and explore the volume contents
ls -la /data
du -sh /data/*
find /data -name "*.conf" -type f
```

View a specific file:

```bash
# Read a configuration file from the volume
docker run --rm -v postgres-data:/data alpine cat /data/postgresql.conf
```

## Method 2: Accessing the Mountpoint Directly (Linux)

On Linux hosts, you can access the volume's mountpoint directly:

```bash
# View the volume contents directly from the host (requires root)
sudo ls -la /var/lib/docker/volumes/postgres-data/_data
```

Read a file:

```bash
# Read a file directly from the volume
sudo cat /var/lib/docker/volumes/postgres-data/_data/postgresql.conf
```

This does not work on Docker Desktop for macOS or Windows because Docker runs inside a virtual machine. The volume files are inside the VM, not directly on your host filesystem.

## Method 3: Using docker cp from a Stopped Container

If the volume is still attached to a stopped container, you can copy files out:

```bash
# Copy a file from a stopped container's volume
docker cp my-stopped-container:/var/lib/postgresql/data/postgresql.conf ./postgresql.conf

# Copy an entire directory
docker cp my-stopped-container:/var/lib/postgresql/data/ ./postgres-backup/
```

## Method 4: Using a File Browser Container

For a more visual experience, run a web-based file manager that mounts the volume:

```bash
# Run a web-based file browser to explore the volume
docker run -d \
  --name volume-browser \
  -p 8080:8080 \
  -v postgres-data:/srv \
  -e FB_NOAUTH=true \
  filebrowser/filebrowser
```

Open `http://localhost:8080` in your browser to explore the volume contents graphically. Remember to remove this container when done:

```bash
# Clean up the file browser container
docker rm -f volume-browser
```

## Method 5: Using docker exec on a Running Container

If a container is already using the volume, you can exec into it:

```bash
# List files in the volume from inside a running container
docker exec postgres-container ls -la /var/lib/postgresql/data

# Read a specific file
docker exec postgres-container cat /var/lib/postgresql/data/pg_hba.conf
```

Find where volumes are mounted inside a running container:

```bash
# Show all volume mounts for a container
docker inspect my-container --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

## Viewing Volume Size and Usage

Check how much space a volume uses:

```bash
# Show total size of a volume
docker run --rm -v postgres-data:/data alpine du -sh /data

# Show size breakdown by subdirectory
docker run --rm -v postgres-data:/data alpine du -sh /data/*
```

Find the largest files in a volume:

```bash
# Find the 10 largest files in the volume
docker run --rm -v postgres-data:/data alpine \
  find /data -type f -exec du -h {} + | sort -rh | head -10
```

## Searching Volume Contents

Search for files by name:

```bash
# Find all log files in a volume
docker run --rm -v app-data:/data alpine \
  find /data -name "*.log" -type f
```

Search for content inside files:

```bash
# Search for a specific string in all config files
docker run --rm -v app-data:/data alpine \
  grep -r "database" /data --include="*.conf"
```

## Comparing Volume Contents

Compare the contents of two volumes:

```bash
# Mount two volumes and compare them
docker run --rm \
  -v volume-a:/vol-a \
  -v volume-b:/vol-b \
  alpine diff -r /vol-a /vol-b
```

## Viewing Volume Contents in Docker Compose

When using Docker Compose, volumes are prefixed with the project name. Find the full volume name first:

```bash
# List volumes created by Docker Compose
docker volume ls --filter "label=com.docker.compose.project=myproject"
```

Or inspect a specific service's volumes:

```bash
# Find what volumes a Compose service uses
docker compose ps -a
docker inspect myproject-db-1 --format '{{range .Mounts}}{{.Name}} -> {{.Destination}}{{"\n"}}{{end}}'
```

Then view the contents using any of the methods above:

```bash
# View contents of a Compose-managed volume
docker run --rm -v myproject_postgres-data:/data alpine ls -la /data
```

## Exporting Volume Contents

To extract the entire volume contents to your host:

```bash
# Export a volume to a tar archive
docker run --rm -v postgres-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/volume-export.tar.gz -C /data .
```

To export specific files:

```bash
# Export only configuration files
docker run --rm -v postgres-data:/data -v $(pwd):/backup alpine \
  sh -c 'find /data -name "*.conf" | tar czf /backup/configs.tar.gz -T -'
```

## Viewing Volume Permissions and Ownership

File permissions inside volumes can cause issues. Check them:

```bash
# Show file permissions and ownership in the volume
docker run --rm -v app-data:/data alpine ls -la /data

# Show numeric UID/GID
docker run --rm -v app-data:/data alpine stat -c '%n %U(%u) %G(%g) %a' /data/*
```

## Monitoring Volume Changes

Watch for file changes in a volume in real time using inotifywait:

```bash
# Monitor a volume for file changes
docker run --rm -v app-data:/data alpine sh -c "
  apk add --no-cache inotify-tools
  inotifywait -mr /data -e create -e modify -e delete
"
```

This prints events whenever files in the volume are created, modified, or deleted. Useful for debugging applications that should be writing to the volume.

## Handling Permission Issues

If you get "Permission denied" when trying to read volume contents, run the temporary container as root:

```bash
# Access volume contents as root
docker run --rm -u root -v postgres-data:/data alpine ls -la /data
```

Or match the UID of the service that owns the files:

```bash
# Access volume as the postgres user (UID 999)
docker run --rm -u 999 -v postgres-data:/data alpine ls -la /data
```

## Summary

Docker volumes are easy to create but not always easy to inspect. The most portable method is mounting the volume into a temporary Alpine container and using standard Linux commands. On Linux hosts, you can access the mountpoint directly with root privileges. For a graphical approach, run a file browser container. Use `docker cp` when you need to pull specific files out, and `tar` when you need to export the entire volume. Whichever method you choose, always clean up temporary containers when you are done.
