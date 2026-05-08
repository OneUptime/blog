# How to Mount a Volume as Read-Only in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Read-Only, Security

Description: Learn how to mount volumes as read-only in Podman to protect host data from container modifications.

---

> Mounting volumes as read-only prevents containers from modifying host data, adding an important layer of security to your container deployments.

Read-only volume mounts are a security best practice for configuration files, secrets, and any data that containers should consume but never change. Podman supports the `ro` flag on both bind mounts and named volumes.

---

## Mounting a Bind Mount as Read-Only

Use the `:ro` suffix to make a bind mount read-only inside the container:

```bash
# Mount a configuration directory as read-only

podman run -d --name webserver \
  -v /home/user/nginx-config:/etc/nginx/conf.d:ro \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Verify the container cannot write to the mount
podman exec webserver touch /etc/nginx/conf.d/testfile
# Output: touch: cannot touch '/etc/nginx/conf.d/testfile': Read-only file system
```

## Mounting a Named Volume as Read-Only

```bash
# Create and populate a named volume
podman volume create config-data
podman run --rm \
  -v config-data:/data \
  docker.io/library/alpine:latest \
  sh -c "echo 'key=value' > /data/app.conf"

# Mount the named volume as read-only
podman run -d --name app \
  -v config-data:/app/config:ro \
  docker.io/library/node:20 tail -f /dev/null

# Confirm read-only access
podman exec app cat /app/config/app.conf
# Output: key=value

podman exec app rm /app/config/app.conf
# Output: rm: cannot remove '/app/config/app.conf': Read-only file system
```

## Using the --mount Flag for Read-Only

The `--mount` flag provides a more explicit syntax:

```bash
# Bind mount with --mount and readonly option
podman run -d --name app \
  --mount type=bind,source=/home/user/config,target=/app/config,readonly=true \
  docker.io/library/alpine:latest tail -f /dev/null

# Named volume with --mount and readonly option
podman run -d --name app2 \
  --mount type=volume,source=config-data,target=/app/config,readonly=true \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Combining Read-Only with SELinux Options

```bash
# Read-only with shared SELinux label
podman run -d --name secure-app \
  -v /home/user/shared-config:/config:ro,z \
  docker.io/library/nginx:latest

# Read-only with private SELinux label
podman run -d --name private-app \
  -v /home/user/private-config:/config:ro,Z \
  docker.io/library/nginx:latest
```

## Mixed Read-Only and Read-Write Mounts

A common pattern is to mount configuration as read-only while keeping data directories writable:

```bash
# Config is read-only, data directory is read-write
podman run -d --name myapp \
  -v /home/user/config:/app/config:ro \
  -v /home/user/data:/app/data \
  -v /home/user/logs:/app/logs \
  docker.io/library/node:20

# Verify mount modes
podman inspect myapp --format '{{ range .Mounts }}{{ .Destination }} {{ .RW }}{{ printf "\n" }}{{ end }}'
```

## Read-Only Root Filesystem with Writable Volumes

For maximum security, combine a read-only root filesystem with specific writable mounts:

```bash
# Read-only root filesystem with writable tmpfs for temp data
podman run -d --name locked-app \
  --read-only \
  --tmpfs /tmp:rw,size=100m \
  -v app-data:/app/data \
  -v /home/user/config:/app/config:ro \
  docker.io/library/node:20
```

## Summary

Mounting volumes as read-only in Podman is straightforward using the `:ro` suffix or the `readonly=true` option with `--mount`. Use read-only mounts for configuration files, secrets, and any data the container should not modify. Combine read-only mounts with writable volumes and a read-only root filesystem for a strong security posture.
