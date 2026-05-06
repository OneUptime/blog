# How to Check Container Health Status in Portainer - Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Health Check, Operation, Monitoring, Debugging

Description: Monitor container health check status in Portainer, interpret health states, and diagnose health check failures for running Docker containers.

---

This guide shows you how to check a container's health status in Portainer, including both the UI approach and the equivalent command-line method.

## Using the Portainer UI

Navigate to **Containers** in the left sidebar, then select the container you want to inspect.

### Health Status Details

On the container details page, Portainer shows the container's current status. If the container defines a Docker health check, you can also open **Inspect** and click **Text** to view the raw container JSON.

Look for these fields in the inspect output:
- **State.Health.Status**: `starting`, `healthy`, or `unhealthy`
- **State.Health.Log**: Recent health check runs, including exit codes and probe output

If **State.Health** is missing, the container does not have a health check configured.

## Using the Docker CLI

For scripted or automated use cases, Docker CLI can show and filter health information directly:

```bash
# Show running containers and include health information in the STATUS column
docker ps --format "table {{.Names}}\t{{.Status}}"

# Show only unhealthy containers
docker ps --filter "health=unhealthy"

# Show only healthy containers
docker ps --filter "health=healthy"

# Show containers that are still starting
docker ps --filter "health=starting"

# Print the health status for a single container
docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no healthcheck{{end}}' my-container

# Print the full health check details, including recent probe output
docker inspect --format '{{json .State.Health}}' my-container
```

## Adding a Health Check So Status Appears

Docker only reports a health status when the container has a health check configured:

```yaml
# In your compose.yaml or docker-compose.yml
services:
  webapp:
    image: myapp:1.2.3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Replace the probe command with one your image actually includes. With a health check in place, you can verify it with:

```bash
# Check the current health state for one container
docker inspect --format '{{.State.Health.Status}}' my-container

# Find all containers without a health check
docker ps --filter "health=none"

# Find all containers currently failing their health check
docker ps --filter "health=unhealthy"
```

## Using the Portainer API

For integration with monitoring tools or dashboards, Portainer exposes Docker API endpoints under `/api/endpoints/<ENVIRONMENT_ID>/docker`:

```python
import requests

headers = {"X-API-Key": "your-api-token"}
container_id = "your-container-id"

response = requests.get(
    f"https://portainer.example.com/api/endpoints/1/docker/containers/{container_id}/json",
    headers=headers,
)
response.raise_for_status()

container = response.json()
health = container.get("State", {}).get("Health")

if health:
    print(health["Status"])
    for entry in health.get("Log", []):
        print(entry["Start"], entry["ExitCode"], entry["Output"].strip())
else:
    print("No healthcheck configured")
```

## Summary

Portainer can show a container's status in the details view, and its **Inspect** -> **Text** view exposes the same Docker health data you can query from the CLI or API. Docker health states are `starting`, `healthy`, and `unhealthy`, and they only exist when the container has a `HEALTHCHECK` configured. Use `docker inspect` or the Portainer API when you need the recent probe log for debugging.
