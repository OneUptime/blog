# How to Manage Containers via the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Container, Automation, Docker

Description: Learn how to list, start, stop, restart, and inspect Docker containers using the Portainer REST API.

## Container API Endpoints

Portainer proxies Docker API calls through its endpoints. Container operations go through:
```text
/api/endpoints/{endpointId}/docker
```
Container routes then mirror the Docker API, such as `/containers/json`, `/containers/{containerId}/json`, and `/containers/{containerId}/start`.

## Listing Containers

```bash
PORTAINER_URL="https://portainer.mycompany.com"
ACCESS_TOKEN="your_access_token"
ENDPOINT_ID=1

# List all running containers

curl -s "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" \
  -H "X-API-Key: ${ACCESS_TOKEN}" | \
  jq '[.[] | {id: .Id[0:12], name: .Names[0], image: .Image, status: .Status}]'

# List all containers including stopped ones
curl -s "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json?all=true" \
  -H "X-API-Key: ${ACCESS_TOKEN}" | \
  jq '[.[] | {id: .Id[0:12], name: .Names[0], status: .Status}]'
```

## Inspecting a Container

```bash
# Get detailed container information
CONTAINER_ID="abc123def456"

curl -s "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/json" \
  -H "X-API-Key: ${ACCESS_TOKEN}" | \
  jq '{
    name: .Name,
    image: .Config.Image,
    state: .State.Status,
    ip: .NetworkSettings.IPAddress,
    mounts: [.Mounts[].Destination]
  }'
```

## Starting and Stopping Containers

```bash
# Start a stopped container
curl -X POST \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/start" \
  -H "X-API-Key: ${ACCESS_TOKEN}"
# Returns 204 No Content on success

# Stop a running container
curl -X POST \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/stop?t=30" \
  -H "X-API-Key: ${ACCESS_TOKEN}"
# t=30: wait 30 seconds before killing

# Restart a container
curl -X POST \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/restart" \
  -H "X-API-Key: ${ACCESS_TOKEN}"
```

## Getting Container Logs

```bash
# Get last 100 lines of logs
curl -s "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/logs?stdout=true&stderr=true&tail=100" \
  -H "X-API-Key: ${ACCESS_TOKEN}"
```

## Container Stats

```bash
# Get resource usage stats (one-shot, not streaming)
curl -s "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/stats?stream=false" \
  -H "X-API-Key: ${ACCESS_TOKEN}" | \
  jq '{
    cpu_percent: (100 * (.cpu_stats.cpu_usage.total_usage - .precpu_stats.cpu_usage.total_usage) / (.cpu_stats.system_cpu_usage - .precpu_stats.system_cpu_usage) * (.cpu_stats.online_cpus // 1)),
    memory_usage_mb: (.memory_stats.usage / 1048576),
    memory_limit_mb: (.memory_stats.limit / 1048576)
  }'
```

## Bulk Operations Script

```bash
#!/bin/bash
# Restart all containers matching a name pattern

NAME_FILTER="my-app"

# Get container IDs matching the filter
CONTAINER_IDS=$(curl -s \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json?all=true" \
  -H "X-API-Key: ${ACCESS_TOKEN}" | \
  jq -r --arg filter "$NAME_FILTER" \
  '.[] | select(.Names[0] | contains($filter)) | .Id')

for ID in $CONTAINER_IDS; do
  echo "Restarting container: ${ID:0:12}"
  curl -s -X POST \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${ID}/restart" \
    -H "X-API-Key: ${ACCESS_TOKEN}"
done
```

## Creating a Container

```bash
# Create a new container
NEW_CONTAINER_ID=$(curl -s -X POST \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/create?name=my-nginx" \
  -H "X-API-Key: ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Image": "nginx:alpine",
    "ExposedPorts": {"80/tcp": {}},
    "HostConfig": {
      "PortBindings": {"80/tcp": [{"HostPort": "8080"}]},
      "RestartPolicy": {"Name": "unless-stopped"}
    }
  }' | jq -r '.Id')

# Start the new container
curl -X POST \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${NEW_CONTAINER_ID}/start" \
  -H "X-API-Key: ${ACCESS_TOKEN}"
```

## Conclusion

The Portainer container management API mirrors the Docker API, making it easy to build automation around container operations. It adds authentication on top of the raw Docker API, and Portainer Business Edition also provides activity logs for team environments.
