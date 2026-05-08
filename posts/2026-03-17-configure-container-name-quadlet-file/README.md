# How to Configure Container Name in a Quadlet File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Naming

Description: Learn how to configure and customize container names in Quadlet unit files for predictable naming and service discovery.

---

> Configuring container names in Quadlet files gives you predictable, human-readable names for scripting, monitoring, and inter-container communication.

By default, Quadlet generates container names based on the unit file name with a `systemd-` prefix. You can override this to use custom names that match your naming conventions, making it easier to reference containers in scripts, monitoring tools, and DNS lookups.

---

## Default Naming Behavior

```ini
# ~/.config/containers/systemd/webapp.container

[Container]
Image=docker.io/library/nginx:alpine
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Default name is derived from the file name
systemctl --user daemon-reload
systemctl --user start webapp
podman ps --format "{{.Names}}"
# Output: systemd-webapp
```

## Setting a Custom Container Name

```ini
# ~/.config/containers/systemd/webapp.container
[Container]
Image=docker.io/library/nginx:alpine
ContainerName=my-webserver
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user start webapp

podman ps --format "{{.Names}}"
# Output: my-webserver
```

## Naming for DNS Resolution

When containers are on the same DNS-enabled network, they can reach each other by container name.

```ini
# ~/.config/containers/systemd/app-net.network
[Network]
Subnet=10.90.0.0/24

# ~/.config/containers/systemd/frontend.container
[Container]
Image=docker.io/library/python:3.12-slim
ContainerName=frontend
Network=app-net.network
PublishPort=8080:8080
Exec=python -m http.server 8080

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/backend.container
[Container]
Image=docker.io/library/python:3.12-slim
ContainerName=backend
Network=app-net.network
Exec=python -m http.server 5000

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Start both services
systemctl --user daemon-reload
systemctl --user start frontend backend

# Frontend can reach backend by name
podman exec frontend python -c 'import urllib.request; print(urllib.request.urlopen("http://backend:5000").status)'
# Output: 200
```

## Naming Conventions

```ini
# Use descriptive names that match your project
ContainerName=myapp-web
ContainerName=myapp-api
ContainerName=myapp-db
ContainerName=myapp-redis

# Or use environment-based names
ContainerName=staging-web
ContainerName=production-db
```

## Naming for Monitoring

```ini
# ~/.config/containers/systemd/monitored-app.container
[Container]
Image=docker.io/library/nginx:alpine
ContainerName=nginx-production
PublishPort=8080:80
Label=prometheus.scrape=true
Label=prometheus.port=80

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Monitoring tools can reference the container by its name
podman inspect nginx-production --format '{{.State.Status}}'
```

## Hostname Configuration

```ini
# Set the hostname inside the container
# ~/.config/containers/systemd/api.container
[Container]
Image=docker.io/library/python:3.12-slim
ContainerName=api-server
HostName=api.local
Exec=python -m http.server 5000

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Verify the hostname inside the container
podman exec api-server hostname
# Output: api.local
```

## Avoiding Name Conflicts

```bash
# Check if a container name is already in use
podman ps -a --format "{{.Names}}" | grep my-webserver

# Remove a stale container with the same name
podman rm my-webserver

# Then start the Quadlet service
systemctl --user start webapp
```

## Using Names in Scripts

```bash
#!/bin/bash
# health-check.sh - check container health by name
CONTAINER="my-webserver"

STATUS=$(podman inspect "$CONTAINER" --format '{{.State.Status}}')
if [ "$STATUS" = "running" ]; then
  echo "$CONTAINER is healthy"
else
  echo "$CONTAINER is $STATUS - restarting..."
  systemctl --user restart webapp
fi
```

## Summary

Set `ContainerName` in Quadlet `.container` files to override the default `systemd-` prefixed name. Custom names make containers easier to reference in scripts, monitoring, and DNS resolution. Use consistent naming conventions across your services for predictable inter-container communication.
