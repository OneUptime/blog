# How to Hide Containers Using Labels in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Container, Labels, Filtering, Visibility, Management

Description: A guide to hiding containers from the Portainer UI using Docker labels, useful for system containers, infrastructure services, or decluttering the interface.

## Overview

Portainer can hide containers from its UI when they match a configured Docker label filter. This is useful for hiding infrastructure containers (Portainer Agent, Traefik, monitoring agents) from the Portainer view and reducing noise in the UI. This guide covers the common workflow for hiding containers using labels.

## Prerequisites

- Portainer CE or Business Edition
- Docker CLI access

## Understanding Portainer's Hide Label

Portainer does not use a built-in hide label for containers. Instead, you configure the label name and value that Portainer should hide, either in **Settings** → **Hidden containers** or by starting Portainer with the `--hide-label` (`-l`) option.

For example, if Portainer is configured to hide `hide=true`, any container with that label will be hidden from the Portainer UI.

## Method 1: Hide Containers with a Custom Label

```bash
# Example label; Portainer must be configured to hide hide=true

docker run -d \
  --name my-monitoring-agent \
  --label "hide=true" \
  --restart=always \
  grafana/agent:latest
```

## Method 2: Configure Portainer to Respect Hide Labels

In Portainer settings, you can configure which label name and value mark containers as hidden:

1. Navigate to **Settings**
2. Find **Hidden containers**
3. Enter the label filter (for example, `hide=true`)
4. Click **Add filter**

Any container with this label will be hidden from the Portainer UI.

## Method 3: Hide Portainer Infrastructure Containers

```yaml
# docker-compose.yml - hide infrastructure services from Portainer
services:
  traefik:
    image: traefik:v3.0
    labels:
      - "hide=true"          # Hidden from Portainer
      - "traefik.enable=false"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

  portainer-agent:
    image: portainer/agent:latest
    labels:
      - "hide=true"          # Hide agent from Portainer
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    restart: unless-stopped
```

## Method 4: Apply Labels to Running Containers

Docker labels cannot be changed on running containers without recreation. Use Docker Compose or recreate:

```bash
# Add label when recreating a container
docker stop my-container
docker rm my-container

docker run -d \
  --name my-container \
  --label "hide=true" \
  my-image:latest
```

## Method 5: Using Multiple Hide Conditions

```bash
# Multiple criteria for hiding
docker run -d \
  --name infrastructure-service \
  --label "hide=true" \
  --label "infrastructure=true" \
  --label "managed-by=ops-team" \
  my-infra-image:latest
```

Configure Portainer to hide whichever label filters you want to match, such as `hide=true` or `infrastructure=true`.

## Listing Hidden Containers

Hidden containers still exist and run; they're just not shown in the UI:

```bash
# See all containers including hidden ones via Docker CLI
docker ps -a

# Filter containers with the hide label
docker ps -a --filter "label=hide=true"

# Remove the hide label by recreating without it
docker run -d --name my-container my-image:latest  # No --label "hide=true"
```

## Role-Based Visibility (Portainer BE)

Portainer Business Edition offers more granular visibility controls:

```bash
# Assign users or teams to environments
# Environment-related → Environments → Manage access

# Resource ownership still applies inside each environment
# Non-admin users only see resources they own or resources marked public
```

## Use Cases

| Use Case | Approach |
|---|---|
| Hide Portainer's own agent | Label `hide=true` on agent container |
| Hide monitoring stack | Label all monitoring containers |
| Hide CI/CD runners | Label runner containers |
| Multi-team environments | Use Portainer BE RBAC |
| Compliance auditing | Use access controls, not hiding |

## Conclusion

Hiding containers with labels is a practical way to reduce noise in the Portainer UI and prevent users from accidentally modifying infrastructure services. A configured label such as `hide=true` provides a simple, declarative approach. For multi-team environments with security requirements, combine label-based hiding with Portainer BE's environment and resource access controls.
