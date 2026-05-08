# How to Configure Container Service Dependencies with systemd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, Dependencies, Service Management

Description: Learn how to configure systemd dependencies between Podman container services for proper startup ordering and failure handling.

---

> Use systemd dependency directives to ensure your Podman container services start, stop, and fail in the correct order for reliable multi-container deployments.

Multi-container applications need services to start in a specific order. A web application needs its database running first. An API gateway needs backend services available. Systemd provides several directives for expressing these relationships.

---

## Ordering Dependencies

### After and Before

Control the startup order without creating a hard requirement:

```ini
# ~/.config/containers/systemd/webapp.container

[Unit]
Description=Web application
# Start after the database service
After=database.service
# Start after the cache service
After=cache.service

[Container]
Image=docker.io/myorg/webapp:latest
Network=appnet.network
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

`After=` only controls ordering. If the database is not started, the webapp starts anyway.

## Requirement Dependencies

### Requires

Hard dependency: if the required service fails to start, this service fails too:

```ini
[Unit]
Description=Web application
After=database.service
Requires=database.service
```

### Wants

Soft dependency: try to start the dependency but do not fail if it does not start:

```ini
[Unit]
Description=Web application
After=database.service cache.service
Requires=database.service
# Cache is optional
Wants=cache.service
```

### BindsTo

Tight coupling: stop this service if the dependency stops:

```ini
[Unit]
Description=Sidecar container
After=mainapp.service
BindsTo=mainapp.service
```

## Complete Multi-Service Example

```ini
# appnet.network
[Network]
NetworkName=appnet
```

```ini
# database.container
[Unit]
Description=PostgreSQL database

[Container]
Image=docker.io/library/postgres:16
ContainerName=database
Network=appnet.network
Environment=POSTGRES_PASSWORD=secret
HealthCmd=pg_isready || exit 1
HealthInterval=5s
Notify=healthy

[Service]
Type=notify
Restart=on-failure

[Install]
WantedBy=default.target
```

```ini
# cache.container
[Unit]
Description=Redis cache

[Container]
Image=docker.io/library/redis:7
ContainerName=cache
Network=appnet.network
HealthCmd=redis-cli ping | grep -q PONG || exit 1
HealthInterval=5s
Notify=healthy

[Service]
Type=notify
Restart=on-failure

[Install]
WantedBy=default.target
```

```ini
# api.container
[Unit]
Description=API server
After=database.service cache.service
Requires=database.service
Wants=cache.service

[Container]
Image=docker.io/myorg/api:latest
ContainerName=api
Network=appnet.network
Environment=DATABASE_URL=postgresql://postgres:secret@database:5432/postgres
Environment=REDIS_URL=redis://cache:6379

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Viewing Dependencies

```bash
# Show what a service depends on
systemctl --user list-dependencies webapp.service

# Show what depends on a service
systemctl --user list-dependencies --reverse database.service

# Visualize the dependency tree
systemd-analyze --user dot database.service webapp.service | dot -Tpng -o deps.png
```

## Starting with Dependencies

```bash
# Start the API - systemd starts database and cache first
systemctl --user start api.service

# Check all services in the dependency chain
systemctl --user status database.service cache.service api.service
```

## Summary

Systemd dependency directives control the startup and shutdown order of Podman container services. Use `After=` for ordering, `Requires=` for hard dependencies, `Wants=` for soft dependencies, and `BindsTo=` for tight coupling. Combine with `Notify=healthy` on dependencies to ensure services are truly ready before dependent services start.
