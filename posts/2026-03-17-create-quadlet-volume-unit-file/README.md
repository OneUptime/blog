# How to Create a Quadlet Volume Unit File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Volumes, Storage

Description: Learn how to create a Quadlet .volume unit file to manage Podman volumes as systemd resources for persistent container storage.

---

> Quadlet volume unit files let you declaratively manage Podman volumes alongside your container services in systemd.

Quadlet `.volume` files define named Podman volumes that can be referenced by container unit files. This ensures volumes are created automatically when needed and managed through the same systemd lifecycle as your containers.

---

## Basic Volume Unit File

```ini
# ~/.config/containers/systemd/pgdata.volume

[Volume]
# A basic named volume with default settings
```

That is the minimal volume file. Quadlet creates a Podman named volume when a container references it. By default, `pgdata.volume` creates a volume named `systemd-pgdata`; use `VolumeName=` to set a custom volume name.

## Volume with Labels

```ini
# ~/.config/containers/systemd/appdata.volume
[Volume]
Label=app=myproject
Label=environment=production
```

## Volume with Driver Options

```ini
# ~/.config/containers/systemd/nfs-data.volume
[Volume]
Driver=local
Type=nfs
Device=:/exports/data
Options=addr=nfs-server.example.com,rw
```

## Referencing Volumes in Containers

```ini
# ~/.config/containers/systemd/pgdata.volume
[Volume]
VolumeName=pgdata
Label=service=postgres

# ~/.config/containers/systemd/postgres.container
[Container]
Image=docker.io/library/postgres:16-alpine
Environment=POSTGRES_PASSWORD=secret
# Reference the volume by its Quadlet unit file name
Volume=pgdata.volume:/var/lib/postgresql/data
PublishPort=5432:5432

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Reload systemd
systemctl --user daemon-reload

# Start the postgres service - volume is created automatically
systemctl --user start postgres

# Verify the volume exists
podman volume ls
# Output: pgdata
```

## Multiple Volumes for a Service

```ini
# ~/.config/containers/systemd/uploads.volume
[Volume]
Label=type=uploads

# ~/.config/containers/systemd/logs.volume
[Volume]
Label=type=logs

# ~/.config/containers/systemd/webapp.container
[Container]
Image=docker.io/library/nginx:alpine
Volume=uploads.volume:/app/uploads
Volume=logs.volume:/var/log/app
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Shared Volume Between Containers

```ini
# ~/.config/containers/systemd/shared-data.volume
[Volume]
Label=shared=true

# ~/.config/containers/systemd/writer.container
[Container]
Image=docker.io/library/busybox:latest
Volume=shared-data.volume:/data
Exec=sh -c "while true; do date >> /data/log.txt; sleep 5; done"

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/reader.container
[Container]
Image=docker.io/library/busybox:latest
Volume=shared-data.volume:/data:ro
Exec=tail -f /data/log.txt

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Managing Volumes

```bash
# List Quadlet-managed volumes
podman volume ls

# Inspect a volume
podman volume inspect pgdata

# Volume persists after stopping the container
systemctl --user stop postgres
podman volume ls
# pgdata still exists
```

## Cleaning Up

```bash
# Stop the service
systemctl --user stop postgres

# The volume persists - remove it manually if needed
podman volume rm pgdata
```

## Summary

Quadlet `.volume` files declare named Podman volumes that integrate with systemd service management. Reference volumes in `.container` files using `Volume=name.volume:/path`, and Quadlet ensures volumes are created when containers start. Volumes persist independently of container lifecycle.
