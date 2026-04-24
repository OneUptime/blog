# How to Configure Per-Container Update Behavior with Watchtower Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Labels, Docker, Auto-Update

Description: Learn how to use Docker labels to control Watchtower's update behavior per container, allowing fine-grained control over which services get auto-updated and when.

## Introduction

Watchtower supports Docker labels that override some global settings on a per-container basis. This allows you to opt specific containers in or out of automatic updates, or switch individual containers to monitor-only mode. When managing containers through Portainer, you add these labels in the compose file or container configuration. This guide covers the Watchtower labels most relevant to per-container update behavior.

## Prerequisites

- Watchtower deployed (see the Watchtower deployment guide)
- Portainer managing Docker containers
- Understanding of Docker labels

## Step 1: Enable/Disable Updates Per Container

```yaml
# Only update containers with explicit enable label

# (Requires Watchtower flag: WATCHTOWER_LABEL_ENABLE=true)

services:
  # This container WILL be updated (opt-in mode)
  nginx:
    image: nginx:alpine
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  # This container will NOT be updated
  postgres:
    image: postgres:15
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
```

```yaml
# Watchtower configuration to require explicit opt-in
services:
  watchtower:
    image: containrrr/watchtower:latest
    environment:
      WATCHTOWER_LABEL_ENABLE: "true"    # Only update containers with enable=true label
      WATCHTOWER_POLL_INTERVAL: "86400"
```

## Step 2: Change the Image Tag the Container Uses

Watchtower updates whatever tag the container is already running. There is no per-container label to override that tag. To follow a different tag, change the image reference in your stack and redeploy the container:

```yaml
services:
  myapp:
    image: myapp:latest    # Change this from :stable to :latest, then redeploy
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

## Step 3: Use Lifecycle Hooks for Pre/Post Update Scripts

Run scripts before and after container updates:

Lifecycle hooks are disabled by default. Enable them on the Watchtower container with `WATCHTOWER_LIFECYCLE_HOOKS=true` (or `--enable-lifecycle-hooks`).

```yaml
services:
  myapp:
    image: myapp:latest
    labels:
      # Run backup before updating
      - "com.centurylinklabs.watchtower.lifecycle.pre-update=/bin/backup.sh"

      # Run health check after updating
      - "com.centurylinklabs.watchtower.lifecycle.post-update=/bin/healthcheck.sh"

      # Allow up to 2 minutes for the post-update script
      - "com.centurylinklabs.watchtower.lifecycle.post-update-timeout=2"
```

These commands run inside the container through `sh`, so the image must include the scripts and a `sh` executable.

## Step 4: Monitor-Only for Specific Containers

Some containers in your stack need notifications but not auto-updates:

```yaml
services:
  # Auto-update nginx (low risk)
  nginx:
    image: nginx:alpine
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      # No monitor-only - auto-updates enabled

  # Monitor-only for the database (high risk to auto-update)
  postgres:
    image: postgres:15-alpine
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      - "com.centurylinklabs.watchtower.monitor-only=true"    # Notify but don't update
```

## Step 5: Complete Example - Mixed Update Strategy in Portainer Stack

```yaml
# Portainer stack with granular Watchtower control
version: "3.8"

services:
  # Frontend: auto-update (stateless, easy rollback)
  frontend:
    image: mycompany/frontend:latest
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`app.example.com`)"
      - "com.centurylinklabs.watchtower.enable=true"    # Auto-update OK

  # API: auto-update but with post-update check
  api:
    image: mycompany/api:latest
    networks:
      - proxy
      - backend
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      - "com.centurylinklabs.watchtower.lifecycle.post-update=/app/healthcheck.sh"

  # Database: monitor only - manual updates
  postgres:
    image: postgres:15-alpine
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - backend
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      - "com.centurylinklabs.watchtower.monitor-only=true"    # Alert only

  # Redis cache: auto-update (ephemeral data)
  redis:
    image: redis:7-alpine
    networks:
      - backend
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  # Portainer itself: never auto-update
  portainer:
    image: portainer/portainer-ce:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=false"    # Never auto-update

networks:
  proxy:
    external: true
  backend:
    driver: bridge

volumes:
  db_data:
```

## Step 6: Relevant Watchtower Labels Reference

Lifecycle hooks require `WATCHTOWER_LIFECYCLE_HOOKS=true` or `--enable-lifecycle-hooks` on the Watchtower container.

```text
com.centurylinklabs.watchtower.enable
  true   - Include this container in updates
  false  - Exclude this container from updates
  (when WATCHTOWER_LABEL_ENABLE=true, unlabeled containers are excluded)

com.centurylinklabs.watchtower.monitor-only
  true   - Check for updates but don't apply them
  false  - Apply updates (default behavior)

com.centurylinklabs.watchtower.lifecycle.pre-check
  Shell command inside container - runs before each update cycle

com.centurylinklabs.watchtower.lifecycle.pre-update
  Shell command inside container - runs before stopping/recreating the container

com.centurylinklabs.watchtower.lifecycle.post-update
  Shell command inside container - runs after the updated container restarts

com.centurylinklabs.watchtower.lifecycle.post-check
  Shell command inside container - runs after each update cycle

com.centurylinklabs.watchtower.lifecycle.pre-update-timeout
  Override pre-update timeout in minutes (default lifecycle command timeout: 60 seconds; 0 disables it)

com.centurylinklabs.watchtower.lifecycle.post-update-timeout
  Override post-update timeout in minutes (default lifecycle command timeout: 60 seconds; 0 disables it)
```

## Step 7: Verify Label Configuration

```bash
# Confirm Watchtower is reading labels correctly
docker logs watchtower 2>&1 | grep -i "skip\|monitor\|update"

# With debug logging, see each container's label state
docker logs watchtower 2>&1 | grep -E "(Skipping|Updating|Monitoring)"

# Check labels on a specific container
docker inspect myapp | jq '.[].Config.Labels | to_entries[] | select(.key | contains("watchtower"))'
```

## Conclusion

Watchtower's label system allows per-container update behavior rather than a single global policy. Use `com.centurylinklabs.watchtower.enable=false` to protect critical services like databases and Portainer itself from auto-updates, `monitor-only=true` for containers you want update notifications for but will update manually, and lifecycle hooks for containers that need pre/post update scripts. Setting `WATCHTOWER_LABEL_ENABLE=true` in Watchtower configuration switches to an explicit opt-in model, which is safer for production environments where you want to consciously decide which services get automated updates.
