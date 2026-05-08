# How to Configure Container Readiness Notifications with systemd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, Readiness, Health Check

Description: Learn how to configure Podman container readiness notifications with systemd so dependent services start only after containers are fully ready.

---

> Ensure dependent services wait for actual container readiness by combining health checks with systemd's notify service type in Quadlet configurations.

A container's process starting is not the same as the application being ready. Databases need to initialize, web servers need to load configuration, and APIs need to establish connections. Readiness notifications solve this timing problem.

---

## The Problem with Default Startup

Without readiness notification, systemd considers a service active as soon as the process starts:

```text
[Timeline without readiness]
0s: Container process starts -> systemd marks as "active"
5s: Application still initializing
10s: Dependent service starts -> fails because dependency not ready
15s: Application finally ready
```

## Health Check Based Readiness

The recommended approach for most applications:

```ini
# ~/.config/containers/systemd/database.container

[Unit]
Description=PostgreSQL with readiness notification

[Container]
Image=docker.io/library/postgres:16
ContainerName=database
Network=appnet
Volume=pgdata:/var/lib/postgresql/data
Environment=POSTGRES_PASSWORD=secret

# Health check determines when the database is ready
HealthCmd=pg_isready -U postgres || exit 1
HealthInterval=3s
HealthTimeout=5s
HealthRetries=5
HealthStartPeriod=30s

# Signal readiness when the health check passes
Notify=healthy

[Service]
Type=notify
Restart=on-failure
TimeoutStartSec=120

[Install]
WantedBy=default.target
```

## Dependent Service Configuration

Configure the dependent service to wait for the database:

Use the same user-defined Podman network for both containers so the web app can resolve the `database` container name.

```ini
# ~/.config/containers/systemd/webapp.container
[Unit]
Description=Web application
# Only start after database is ready (health check passed)
After=database.service
Requires=database.service

[Container]
Image=docker.io/myorg/webapp:latest
Network=appnet
Environment=DATABASE_URL=postgresql://postgres:secret@database:5432/postgres
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Startup Timeline with Readiness

```text
[Timeline with readiness]
0s: Database container starts -> systemd marks as "activating"
3s: Health check runs -> fails (still starting)
6s: Health check runs -> fails
9s: Health check runs -> passes
9s: systemd marks database as "active"
9s: Web app service starts -> database is ready
```

## Readiness for Common Applications

### Redis

```ini
HealthCmd=redis-cli ping | grep -q PONG || exit 1
HealthInterval=3s
HealthStartPeriod=10s
Notify=healthy
```

### MySQL

```ini
HealthCmd=mysqladmin ping -h localhost -u root || exit 1
HealthInterval=5s
HealthStartPeriod=30s
Notify=healthy
```

### Custom HTTP Application

```ini
HealthCmd=curl -f http://localhost:8080/ready || exit 1
HealthInterval=5s
HealthStartPeriod=60s
Notify=healthy
```

## Monitoring Readiness

```bash
# Start the database and watch it become ready
systemctl --user start database.service

# While it is initializing, status shows "activating"
systemctl --user status database.service

# Once the health check passes, status shows "active (running)"
systemctl --user status database.service

# View the timeline in the journal
journalctl --user -u database.service --since "2 minutes ago"
```

## Summary

Container readiness notifications prevent dependent services from starting before their dependencies are actually ready. Combine health checks with `Notify=healthy` and `Type=notify` in Quadlet files, and use `After=` and `Requires=` in dependent services. This ensures your multi-container application starts in the correct order with each service genuinely ready before the next begins.
