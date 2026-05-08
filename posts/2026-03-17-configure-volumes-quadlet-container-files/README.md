# How to Configure Volumes in Quadlet Container Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Volumes, Storage

Description: Learn how to configure bind mounts and named volumes in Podman Quadlet container files for persistent data storage.

---

> Use the Volume directive in Quadlet container files to mount host directories and named volumes into your containers for persistent storage.

Containers are ephemeral by default. When a container is removed, its filesystem is gone. Quadlet provides the `Volume` directive to mount host paths and named volumes into your containers, ensuring data persists across container restarts and recreations.

---

## Bind Mounting a Host Directory

Mount a directory from the host into the container:

```ini
# ~/.config/containers/systemd/webapp.container

[Unit]
Description=Web application with bind mount

[Container]
Image=docker.io/library/nginx:latest
# Mount host directory into the container
Volume=%h/website:/usr/share/nginx/html:ro
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

The `:ro` suffix makes the mount read-only. Use `:rw` for read-write access (the default).

## Using Named Volumes

Create a Quadlet volume file and reference it in your container:

```ini
# ~/.config/containers/systemd/dbdata.volume
[Volume]
# Podman will create this named volume automatically
```

```ini
# ~/.config/containers/systemd/postgres.container
[Unit]
Description=PostgreSQL database with named volume

[Container]
Image=docker.io/library/postgres:16
Volume=dbdata.volume:/var/lib/postgresql/data
Environment=POSTGRES_PASSWORD=mysecretpassword
PublishPort=5432:5432

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Multiple Volume Mounts

Add multiple `Volume` lines for different mount points:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# Application data
Volume=appdata.volume:/app/data
# Configuration files (read-only)
Volume=%h/.config/myapp:/app/config:ro
# Log output directory
Volume=%h/logs/myapp:/app/logs:rw
```

## SELinux Volume Labels

On SELinux-enabled systems, add the appropriate label:

```ini
[Container]
Image=docker.io/library/nginx:latest
# :Z for private unshared label (single container)
Volume=%h/website:/usr/share/nginx/html:Z
# :z for shared label (multiple containers)
Volume=%h/shared-data:/data:z
```

## Tmpfs Mounts

For temporary in-memory storage, use the `Tmpfs` directive:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# Mount a tmpfs at /tmp with a 100MB size limit
Tmpfs=/tmp:size=100M
```

## Reload and Verify

```bash
# Create the host directory if needed
mkdir -p ~/website

# Reload systemd
systemctl --user daemon-reload

# Start the service
systemctl --user start webapp.service

# Verify the mount is active
podman inspect systemd-webapp --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

## Summary

Quadlet supports bind mounts, named volumes, and tmpfs mounts through the `Volume` and `Tmpfs` directives. Use named volumes with `.volume` files for managed persistent storage, bind mounts for sharing host files, and SELinux labels when running on systems with SELinux enabled.
