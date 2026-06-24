# How to Filter Containers by Status and Label in Portainer - Status Label

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Filtering, Labels, Operation, DevOps

Description: Learn how to filter containers by running status, labels, and names in Portainer to quickly find specific containers in environments with many running workloads.

---

This guide shows you how to find containers in Portainer and use Docker-compatible filters for exact status-, label-, and name-based matching.

## Using the Portainer UI

Navigate to **Containers** in the left sidebar. The container list view includes a search box at the top of the page, and you can open a container to inspect its labels in the details view.

### Filtering Options

In Portainer, you can use:
- **Search**: Narrow the visible container list from the search box
- **Container details**: Open a container to view its status, labels, ports, and other metadata

For exact status- and label-based filtering, use the Docker CLI or the Portainer API shown below.

## Using the Docker CLI

For scripted or automated use cases, Docker CLI provides powerful filtering:

```bash
# Filter running containers

docker ps --filter "status=running"

# Filter by label key=value
docker ps --filter "label=com.docker.compose.service=webapp"

# Filter by Compose project name
docker ps --filter "label=com.docker.compose.project=my-stack"

# Filter by image name
docker ps --filter "ancestor=nginx:1.25"

# Combine status and label filters
docker ps --filter "status=running" --filter "label=environment=production"

# Format the output to show specific fields
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Labels}}"
```

## Labeling Your Containers for Better Filtering

Apply meaningful labels to make filtering effective:

```yaml
# In your docker-compose.yml
services:
  webapp:
    image: myapp:1.2.3
    labels:
      # Standard labels for filtering
      environment: "production"
      team: "backend"
      tier: "api"
      version: "1.2.3"
      backup: "required"
```

With these labels, you can filter by:
```bash
# Find running production containers
docker ps --filter "label=environment=production"

# Find running containers owned by the backend team
docker ps --filter "label=team=backend"

# Find running containers needing backup
docker ps --filter "label=backup=required"
```

## Using the Portainer API

For integration with monitoring tools or dashboards:

```python
import json
import requests

headers = {"X-API-Key": "your-api-token"}

# Get running containers with a specific label via Portainer's Docker API proxy
response = requests.get(
    "https://portainer.example.com/api/endpoints/1/docker/containers/json",
    headers=headers,
    params={
        "all": "true",
        "filters": json.dumps({
            "status": ["running"],
            "label": ["environment=production"],
        }),
    },
)

containers = response.json()
for c in containers:
    print(c["Names"][0], c["Status"])
```

## Summary

Portainer's Containers view lets you search the list and inspect container details, while Docker's filter flags and Portainer's Docker API proxy support exact filtering by status and labels. Consistent label conventions across your stacks make it significantly easier to find, manage, and audit specific container groups. Use the Portainer API for programmatic filtering in automation and monitoring tools.
