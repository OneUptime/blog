# How to Configure Labels in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Labels, Metadata

Description: Learn how to add metadata labels to Podman containers using the Label directive in Quadlet container files.

---

> Organize and identify your containers by adding metadata labels in Quadlet container files using the Label directive.

Labels are key-value pairs that attach metadata to containers. They are useful for organizing containers, enabling auto-update policies, filtering with `podman ps`, and integrating with monitoring tools. Quadlet provides the `Label` directive for setting labels declaratively.

---

## Adding Labels to a Container

Use the `Label` directive in the `[Container]` section:

```ini
# ~/.config/containers/systemd/webapp.container

[Unit]
Description=Web application with labels

[Container]
Image=docker.io/myorg/webapp:latest
ContainerName=webapp
PublishPort=8080:80

# Add metadata labels
Label=app=webapp
Label=environment=production
Label=team=platform
Label=version=1.2.0

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Auto-Update Label

The `io.containers.autoupdate` label enables Podman auto-update:

```ini
[Container]
Image=docker.io/myorg/webapp:latest
# Enable registry-based auto-update
Label=io.containers.autoupdate=registry
```

## Annotation Labels

Use `Annotation` for OCI annotations:

```ini
[Container]
Image=docker.io/myorg/webapp:latest
Annotation=com.example.description="Main web application"
Annotation=com.example.maintainer="platform-team@example.com"
```

## Filtering Containers by Label

```bash
# Reload and start
systemctl --user daemon-reload
systemctl --user start webapp.service

# List containers with a specific label
podman ps --filter label=app=webapp

# List containers by team
podman ps --filter label=team=platform

# Get a specific label value
podman inspect webapp --format '{{index .Config.Labels "environment"}}'

# List all labels
podman inspect webapp --format '{{json .Config.Labels}}' | python3 -m json.tool
```

## Labels for Monitoring Integration

Labels help monitoring tools discover and categorize containers:

```ini
[Container]
Image=docker.io/myorg/api:latest
# Prometheus scraping labels
Label=prometheus.io/scrape=true
Label=prometheus.io/port=9090
Label=prometheus.io/path=/metrics
```

## Summary

Labels in Quadlet container files add metadata to your containers for organization, filtering, auto-update configuration, and monitoring integration. Use the `Label` directive for container labels and `Annotation` for OCI annotations. Labels are searchable with `podman ps --filter` and inspectable with `podman inspect`.
