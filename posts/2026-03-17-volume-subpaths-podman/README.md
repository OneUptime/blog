# How to Use Volume Subpaths in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Subpaths, Storage

Description: Learn how to mount specific subdirectories from a Podman volume into containers using subpath options.

---

> Volume subdirectory mounts let you mount a specific subdirectory from a volume rather than the entire volume, providing fine-grained control over what data containers can access.

Subdirectory mounts are useful when a single volume contains data for multiple services or when you want to expose only a portion of a volume to a container. Podman does not provide a `subpath` option for `type=volume` mounts, but you can inspect the volume's mount point and bind mount the required subdirectory with the `--mount` flag.

---

## Basic Subdirectory Mount

```bash
# Create and populate a volume with multiple directories

podman volume create shared-data
podman run --rm -v shared-data:/data docker.io/library/alpine:latest \
  sh -c "mkdir -p /data/config /data/logs /data/uploads && \
         echo 'app.conf' > /data/config/app.conf && \
         echo 'log entry' > /data/logs/app.log"

VOLUME_PATH=$(podman volume inspect --format '{{ .Mountpoint }}' shared-data)

# Mount only the config subdirectory
podman run --rm \
  --mount type=bind,source="${VOLUME_PATH}/config",target=/app/config \
  docker.io/library/alpine:latest ls /app/config
# Output: app.conf
```

## Mounting Different Subdirectories to Different Containers

```bash
# Config reader gets only the config subdirectory
podman run -d --name config-service \
  --mount type=bind,source="${VOLUME_PATH}/config",target=/config \
  docker.io/library/alpine:latest tail -f /dev/null

# Log processor gets only the logs subdirectory
podman run -d --name log-processor \
  --mount type=bind,source="${VOLUME_PATH}/logs",target=/logs \
  docker.io/library/alpine:latest tail -f /dev/null

# Upload handler gets only the uploads subdirectory
podman run -d --name upload-handler \
  --mount type=bind,source="${VOLUME_PATH}/uploads",target=/uploads \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Subdirectory with Read-Only Option

```bash
# Mount a subdirectory as read-only
podman run -d --name reader \
  --mount type=bind,source="${VOLUME_PATH}/config",target=/app/config,readonly=true \
  docker.io/library/nginx:latest

# Verify read-only access
podman exec reader touch /app/config/test
# Output: touch: cannot touch '/app/config/test': Read-only file system
```

## Subdirectory Mounts for Configuration Isolation

```bash
# Volume structure:
# myapp-vol/
#   ├── nginx/
#   │   └── nginx.conf
#   ├── app/
#   │   └── settings.json
#   └── db/
#       └── my.cnf

MYAPP_VOLUME_PATH=$(podman volume inspect --format '{{ .Mountpoint }}' myapp-vol)

# Each service gets only its relevant configuration
podman run -d --name web \
  --mount type=bind,source="${MYAPP_VOLUME_PATH}/nginx",target=/etc/nginx/conf.d \
  docker.io/library/nginx:latest

podman run -d --name api \
  --mount type=bind,source="${MYAPP_VOLUME_PATH}/app",target=/app/config \
  docker.io/library/node:20 tail -f /dev/null

podman run -d --name db \
  -e MYSQL_ROOT_PASSWORD=example \
  --mount type=bind,source="${MYAPP_VOLUME_PATH}/db",target=/etc/mysql/conf.d \
  docker.io/library/mysql:8
```

## Subdirectories with Bind Mounts

```bash
# Bind mount a subdirectory from a host directory
podman run -d --name app \
  --mount type=bind,source=/home/user/project/src,target=/app/src,bind-propagation=rprivate \
  docker.io/library/node:20 tail -f /dev/null
```

## Verifying Subdirectory Mounts

```bash
# Inspect the container mounts
podman inspect config-service --format '{{ json .Mounts }}'

# Verify only the subdirectory contents are visible
podman exec config-service ls -la /config
podman exec config-service ls /  # The parent volume dirs are not visible
```

## Summary

Volume subdirectory mounts in Podman allow you to expose specific directories from a volume into containers, providing data isolation and access control. Use `podman volume inspect` to find the volume mount point, then use `type=bind` with `--mount` to expose only the relevant portion of a shared volume to each container. Combine these mounts with `readonly=true` for additional security when containers only need to read configuration data.
