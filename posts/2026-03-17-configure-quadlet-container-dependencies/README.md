# How to Configure Quadlet Container Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Dependencies

Description: Learn how to configure service dependencies between Quadlet containers so services start and stop in the correct order.

---

> Use systemd dependency directives in Quadlet files to control the startup and shutdown order of your container services.

When running multi-container applications, services often depend on each other. A web application needs its database running before it can start. Quadlet uses standard systemd dependency directives to control this ordering.

---

## Understanding Dependency Directives

| Directive | Behavior |
|-----------|----------|
| `After=` | Order this service after the listed services when both are started |
| `Before=` | Order this service before the listed services when both are started |
| `Requires=` | Start the listed services too; fail if a required service cannot start |
| `Wants=` | Start the listed services too, but continue if they fail |
| `BindsTo=` | Stronger than Requires; stops this service if the dependency stops |

## Basic Dependency Configuration

```ini
# ~/.config/containers/systemd/database.container

[Unit]
Description=PostgreSQL database

[Container]
Image=docker.io/library/postgres:16
ContainerName=database
Network=appnet.network
Environment=POSTGRES_PASSWORD=secret
HealthCmd=pg_isready || exit 1
HealthInterval=10s
Notify=healthy

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/webapp.container
[Unit]
Description=Web application
# Start after the database service
After=database.service
# Fail if the database service cannot start
Requires=database.service

[Container]
Image=docker.io/myorg/webapp:latest
Network=appnet.network
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Soft Dependencies with Wants

Use `Wants=` when a dependency is optional:

```ini
[Unit]
Description=Web application
After=database.service cache.service
Requires=database.service
# Cache is nice to have but not required
Wants=cache.service
```

## Strong Dependencies with BindsTo

Use `BindsTo=` when the service must stop if its dependency stops:

```ini
[Unit]
Description=Application tightly coupled to database
After=database.service
BindsTo=database.service
```

If the database service stops, the application service stops too.

## Three-Tier Dependency Chain

```ini
# database.container - no dependencies
[Unit]
Description=Database

# api.container - depends on database
[Unit]
Description=API server
After=database.service
Requires=database.service

# frontend.container - depends on API
[Unit]
Description=Frontend
After=api.service
Requires=api.service
```

## Starting and Stopping with Dependencies

```bash
# Starting frontend pulls in the entire chain
systemctl --user start frontend.service

# Verify all services are running
systemctl --user status database.service api.service frontend.service

# Stopping database stops dependent services (with BindsTo)
systemctl --user stop database.service
```

## Viewing the Dependency Tree

```bash
# Show dependencies of a service
systemctl --user list-dependencies webapp.service

# Show reverse dependencies
systemctl --user list-dependencies --reverse database.service
```

## Summary

Quadlet container dependencies are managed through standard systemd directives in the `[Unit]` section. Use `After=` for ordering, `Requires=` for hard dependencies, `Wants=` for soft dependencies, and `BindsTo=` for tightly coupled services. Starting a service with dependencies automatically starts its required services in the correct order.
