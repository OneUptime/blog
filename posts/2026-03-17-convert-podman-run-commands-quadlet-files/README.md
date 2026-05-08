# How to Convert podman run Commands to Quadlet Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Migration, Systemd

Description: Learn how to convert existing podman run commands into Quadlet container files for systemd-managed container services.

---

> Migrate your ad-hoc podman run commands to declarative Quadlet container files for reliable, systemd-managed container services.

If you have been running containers with `podman run` commands, converting them to Quadlet files gives you systemd integration, automatic startup, restart policies, and centralized management. This guide shows how to map common `podman run` flags to Quadlet directives.

---

## Flag-to-Directive Mapping

| podman run flag | Quadlet directive |
|----------------|-------------------|
| `--name` | `ContainerName=` |
| `-p, --publish` | `PublishPort=` |
| `-v, --volume` | `Volume=` |
| `-e, --env` | `Environment=` |
| `--env-file` | `EnvironmentFile=` |
| `--network` | `Network=` |
| `--cap-add` | `AddCapability=` |
| `--cap-drop` | `DropCapability=` |
| `--read-only` | `ReadOnly=true` |
| `--label` | `Label=` |
| `--health-cmd` | `HealthCmd=` |
| `--pull` | `Pull=` |
| `--secret` | `Secret=` |
| `--userns` | `UserNS=` |
| `--tmpfs` | `Tmpfs=` |
| `--memory` | `Memory=` |

## Example: Converting a Simple Web Server

Original command:

```bash
podman run -d \
  --name nginx \
  -p 8080:80 \
  -v ~/website:/usr/share/nginx/html:ro \
  docker.io/library/nginx:latest
```

Converted Quadlet file:

```ini
# ~/.config/containers/systemd/nginx.container

[Unit]
Description=Nginx web server

[Container]
Image=docker.io/library/nginx:latest
ContainerName=nginx
PublishPort=8080:80
Volume=%h/website:/usr/share/nginx/html:ro

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Example: Converting a Database with Volumes

Original command:

```bash
podman run -d \
  --name postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  -v pgdata:/var/lib/postgresql/data \
  --health-cmd "pg_isready -U admin" \
  --health-interval 30s \
  docker.io/library/postgres:16
```

Converted Quadlet files:

```ini
# ~/.config/containers/systemd/pgdata.volume
[Volume]
VolumeName=pgdata
```

```ini
# ~/.config/containers/systemd/postgres.container
[Unit]
Description=PostgreSQL database

[Container]
Image=docker.io/library/postgres:16
ContainerName=postgres
PublishPort=5432:5432
Environment=POSTGRES_USER=admin
Environment=POSTGRES_PASSWORD=secret
Environment=POSTGRES_DB=myapp
Volume=pgdata.volume:/var/lib/postgresql/data
HealthCmd=pg_isready -U admin
HealthInterval=30s

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Example: Converting a Complex Command

Original command:

```bash
podman run -d \
  --name myapp \
  -p 3000:3000 \
  --cap-drop all \
  --cap-add net_bind_service \
  --read-only \
  --tmpfs /tmp \
  --memory 512m \
  --cpus 1.5 \
  --env-file /opt/myapp/.env \
  --label io.containers.autoupdate=registry \
  docker.io/myorg/myapp:latest
```

Converted Quadlet file:

```ini
# ~/.config/containers/systemd/myapp.container
[Unit]
Description=My application

[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
PublishPort=3000:3000
ReadOnly=true
Tmpfs=/tmp
EnvironmentFile=/opt/myapp/.env
AutoUpdate=registry
DropCapability=all
AddCapability=net_bind_service
Memory=512m
PodmanArgs=--cpus=1.5

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Deploy the Converted File

```bash
# Place the file in the Quadlet directory
cp myapp.container ~/.config/containers/systemd/

# Reload systemd
systemctl --user daemon-reload

# Stop the old container
podman stop myapp && podman rm myapp

# Start the new systemd service
systemctl --user start myapp.service
```

## Summary

Converting `podman run` commands to Quadlet files involves mapping CLI flags to Quadlet directives. Most flags have direct equivalents, and anything without a native directive can be passed through `PodmanArgs`. After converting, you get systemd integration with restart policies, dependency management, and centralized logging.
