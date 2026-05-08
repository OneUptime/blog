# How to Convert Docker Compose to Quadlet Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Docker Compose, Migration

Description: Learn how to migrate Docker Compose services to Podman Quadlet container files for native systemd integration.

---

> Migrate from Docker Compose to Quadlet for native systemd integration, replacing docker-compose.yml services with individual Quadlet unit files.

Docker Compose is popular for defining multi-container applications, but Quadlet offers native systemd integration with dependency management, logging, and restart policies. This guide shows how to translate Compose services into Quadlet files.

---

## Compose-to-Quadlet Mapping

| Compose field | Quadlet equivalent |
|--------------|-------------------|
| `image:` | `Image=` |
| `ports:` | `PublishPort=` |
| `volumes:` | `Volume=` |
| `environment:` | `Environment=` |
| `env_file:` | `EnvironmentFile=` |
| `networks:` | `Network=` |
| `depends_on:` | `[Unit] After= / Requires=` |
| `restart:` | `[Service] Restart=` |
| `healthcheck:` | `HealthCmd=` etc. |

## Example: Converting a Compose File

Original docker-compose.yml:

```yaml
services:
  web:
    image: docker.io/myorg/webapp:latest
    ports:
      - "8080:80"
    environment:
      - DATABASE_URL=postgresql://admin:secret@db:5432/myapp
    depends_on:
      - db
    networks:
      - appnet

  db:
    image: docker.io/library/postgres:16
    environment:
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - appnet

volumes:
  pgdata:

networks:
  appnet:
```

Converted Quadlet files:

```ini
# ~/.config/containers/systemd/appnet.network

[Network]
NetworkName=appnet
Driver=bridge
```

```ini
# ~/.config/containers/systemd/pgdata.volume
[Volume]
VolumeName=pgdata
```

```ini
# ~/.config/containers/systemd/db.container
[Unit]
Description=PostgreSQL database

[Container]
ContainerName=db
Image=docker.io/library/postgres:16
Environment=POSTGRES_USER=admin
Environment=POSTGRES_PASSWORD=secret
Environment=POSTGRES_DB=myapp
Volume=pgdata.volume:/var/lib/postgresql/data
Network=appnet.network

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/web.container
[Unit]
Description=Web application
After=db.service
Requires=db.service

[Container]
ContainerName=web
Image=docker.io/myorg/webapp:latest
Environment=DATABASE_URL=postgresql://admin:secret@db:5432/myapp
PublishPort=8080:80
Network=appnet.network

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Key Differences from Compose

1. **Dependencies** - Compose `depends_on` becomes `After=` and `Requires=` in the `[Unit]` section.
2. **Networks** - Each Compose network becomes a `.network` Quadlet file.
3. **Volumes** - Named volumes become `.volume` Quadlet files.
4. **Service names** - Use `ContainerName=` to set the Podman container name used for container-name DNS resolution on the network.

## Deploy the Converted Files

```bash
# Copy all files to the Quadlet directory
cp *.container *.volume *.network ~/.config/containers/systemd/

# Reload systemd
systemctl --user daemon-reload

# Start all services
systemctl --user start db.service
systemctl --user start web.service

# Or start web.service which will pull in db.service via Requires=
systemctl --user start web.service
```

## Summary

Converting Docker Compose to Quadlet involves creating separate `.container`, `.volume`, and `.network` files for each Compose service and resource. Map Compose fields to Quadlet directives, use systemd dependency directives instead of `depends_on`, and use `ContainerName` for container-name DNS resolution. The result is native systemd management with all its benefits.
