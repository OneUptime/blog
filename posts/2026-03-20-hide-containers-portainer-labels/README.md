# How to Hide Specific Containers from Portainer Using Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Labels, Configuration, Access Control

Description: Learn how to use Docker labels to hide specific containers from appearing in the Portainer UI for cleaner views and access management.

---

Portainer supports a label-based mechanism to exclude specific containers from appearing in its UI. This works by configuring Portainer to hide containers that match an exact label name and value. This is useful for hiding infrastructure containers (like Portainer itself, monitoring agents, or log shippers) from the main container list.

## The Hide Label

Portainer does not use a built-in hide label for containers. Instead, choose a label and configure Portainer to hide that exact name and value. For example:

```text
hide-from-portainer=true
```

For the examples below to work, Portainer must be configured to hide `hide-from-portainer=true`, either in **Settings** > **Hidden containers** or by starting Portainer with `-l hide-from-portainer=true`.

## Method 1: Docker Run with Labels

```bash
# Start a container with the hide label

# This container will not appear in Portainer's container list
docker run -d \
  --name my-agent \
  --label "hide-from-portainer=true" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  my-monitoring-agent:latest
```

## Method 2: Docker Compose Labels

```yaml
# compose.yaml

services:
  app:
    image: myapp:latest
    # This container WILL show in Portainer

  log-shipper:
    image: fluent/fluent-bit:latest
    # Hide this infrastructure container from Portainer UI
    labels:
      - "hide-from-portainer=true"
    volumes:
      - /var/log:/var/log:ro

  metrics-agent:
    image: prom/node-exporter:latest
    # Also hidden from Portainer
    labels:
      - "hide-from-portainer=true"
    network_mode: host
```

## Method 3: Configure Blacklisted Labels in Portainer Settings

In Portainer, you can define label name and value pairs whose presence causes containers to be hidden globally. This is configured server-side rather than requiring labels on every container:

```bash
# Authenticate
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Configure blacklisted labels in Portainer settings
# Any container with matching labels will be hidden
curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "BlackListedLabels": [
      {"name": "hide-from-portainer", "value": "true"},
      {"name": "infrastructure-only", "value": "true"}
    ]
  }' \
  --insecure
```

Then add the matching labels to containers you want hidden:

```bash
# Start Portainer Agent hidden from Portainer UI
docker run -d \
  --name portainer_agent \
  --label "hide-from-portainer=true" \
  -p 9001:9001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/agent:latest
```

## Hiding Portainer Itself

A common use case is hiding the Portainer container from its own interface:

```bash
# Recreate Portainer with a hide label
docker stop portainer && docker container rm portainer

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --label "hide-from-portainer=true" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  -l hide-from-portainer=true
```

---

*Build clean, user-friendly container management and monitor your infrastructure with [OneUptime](https://oneuptime.com).*
