# How to Use the --hide-label Flag to Hide Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, CLI, Configuration, Labels, UI Management

Description: Use the --hide-label flag to exclude specific containers from the Portainer UI based on Docker labels, keeping the interface clean and preventing accidental modification of critical containers.

## Introduction

The `--hide-label` flag in Portainer allows you to hide specific containers from the Portainer UI based on Docker labels. This is useful for hiding management containers (like Portainer itself, Watchtower, or monitoring agents) that users shouldn't interact with through the UI.

## When to Use --hide-label

- Hide Portainer's own management containers from users
- Hide monitoring agents (Prometheus exporters, log collectors)
- Hide Watchtower or auto-update containers
- Prevent accidental deletion/restart of critical infrastructure containers
- Clean up the UI in multi-tenant environments

## Step 1: Start Portainer with --hide-label

```bash
# Hide containers with specific labels

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --hide-label "com.portainer.hide=true"
  # Any container with label com.portainer.hide=true will be hidden
```

## Step 2: Label Containers You Want to Hide

Add the hide label when creating containers:

```bash
# Hide a container using the label
# This container will be hidden
docker run -d \
  --name watchtower \
  --label "com.portainer.hide=true" \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower

# Hide a monitoring agent
docker run -d \
  --name node-exporter \
  --label "com.portainer.hide=true" \
  --pid=host \
  --network=host \
  quay.io/prometheus/node-exporter:latest
```

## Step 3: Use in Docker Compose

```yaml
services:
  # Application container - visible in Portainer
  myapp:
    image: myapp:latest
    ports:
      - "8080:80"

  # Management container - hidden from Portainer UI
  watchtower:
    image: containrrr/watchtower:latest
    restart: unless-stopped
    labels:
      - "com.portainer.hide=true"    # Hidden in Portainer
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_SCHEDULE: "0 0 3 * * *"

  # Monitoring agent - also hidden
  prometheus-exporter:
    image: prom/node-exporter:latest
    restart: unless-stopped
    labels:
      - "com.portainer.hide=true"    # Hidden in Portainer
    network_mode: host
    pid: host
```

## Step 4: Use Custom Label Names

You can define any label key=value pair for hiding:

```bash
# Use a custom label name
docker run -d \
  -p 9000:9000 \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --hide-label "environment=infrastructure"

# Then label containers to hide:
# Hidden
docker run -d \
  --name monitoring-agent \
  --label "environment=infrastructure" \
  monitoring-image:latest

# Visible
docker run -d \
  --name myapp \
  --label "environment=production" \
  myapp:latest
```

## Step 5: Hide Multiple Labels

```bash
# You can specify multiple --hide-label flags
docker run -d \
  -p 9000:9000 \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --hide-label "com.portainer.hide=true" \
  --hide-label "category=system" \
  --hide-label "managed-by=ansible"
```

## Step 6: Add Labels to Existing Containers

You can't directly add labels to running containers, but you can add them on recreate:

```bash
# Option 1: Recreate with label
docker stop my-container
docker rm my-container
docker run -d \
  --name my-container \
  --label "com.portainer.hide=true" \
  [original run options] \
  image:tag

# Option 2: Use Docker Compose update
# Add labels to compose file, then:
docker compose up -d my-service
```

## Step 7: Verify Hidden Containers Still Run

```bash
# Hidden containers are still visible via Docker CLI
docker ps | grep watchtower  # Still shown in CLI

# Inspect the label directly on the container
docker inspect --format '{{json .Config.Labels}}' watchtower | jq

# They continue running normally and are only hidden from the Portainer UI
```

## Step 8: Use in Docker Compose for Portainer Itself

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    command:
      - --hide-label
      - com.portainer.hide=true
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

  # This container will be hidden in Portainer
  watchtower:
    image: containrrr/watchtower:latest
    restart: unless-stopped
    labels:
      - "com.portainer.hide=true"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  portainer_data:
```

## Step 9: Label Value Flexibility

The `--hide-label` flag matches on the label `key=value` pair:

```bash
# These are different labels and would need separate --hide-label flags:
--label "hide=yes"
--label "hide=true"  # NOT matched by --hide-label "hide=yes"

# To match both, use two flags:
--hide-label "hide=yes" --hide-label "hide=true"

# Or standardize on one value across all containers
```

## Conclusion

The `--hide-label` flag is a simple but powerful way to keep the Portainer UI clean by hiding infrastructure and management containers from users. Label any container you want to hide with the designated label (e.g., `com.portainer.hide=true`), and start Portainer with `--hide-label "com.portainer.hide=true"`. Hidden containers continue running normally and are accessible via the Docker CLI - they're only removed from the Portainer UI.
