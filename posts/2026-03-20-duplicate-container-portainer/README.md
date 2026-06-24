# How to Duplicate a Container in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Duplicate, Clone, Container

Description: Create a copy of an existing container in Portainer with the same configuration for testing or scaling.

---

Portainer provides a web-based interface for common container lifecycle operations, including duplicating an existing container configuration. This is useful when you want another container with the same base settings but a different name or non-conflicting host bindings.

## Via the Portainer UI

Navigate to **Containers** in the left sidebar, select the container you want to duplicate, then click **Duplicate/Edit**.

### Container List Actions

From the container list:
- Select the container you want to duplicate
- Click **Duplicate/Edit**

### Single Container Actions

On the duplicate screen:
- Enter a new container name
- Review or adjust the copied configuration
- Change any conflicting host bindings such as published ports if the original container is still running
- Click **Deploy the container**

## Via the API

```bash
PORTAINER_URL="https://localhost:9443"
API_KEY="your_portainer_access_token"
ENDPOINT_ID=1
CONTAINER_ID="your_existing_container_id"

# Inspect the existing container so you can copy the image and runtime settings you need
curl -s "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/json" \
  -H "X-API-Key: ${API_KEY}" \
  --insecure | python3 -m json.tool

# Create a second container with a new name and equivalent settings
NEW_CONTAINER_ID=$(curl -s -X POST "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/create?name=my-container-copy" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "Image": "myimage:latest",
    "Env": ["APP_ENV=production"],
    "ExposedPorts": { "80/tcp": {} },
    "HostConfig": {
      "PortBindings": { "80/tcp": [{ "HostPort": "8081" }] },
      "RestartPolicy": { "Name": "unless-stopped" }
    }
  }' \
  --insecure | python3 -c "import sys, json; print(json.load(sys.stdin)['Id'])")

# Start the duplicate
curl -X POST "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${NEW_CONTAINER_ID}/start" \
  -H "X-API-Key: ${API_KEY}" \
  --insecure
```

## Duplicate a Container

```bash
# Inspect the existing container so you can copy the image and runtime settings you need
docker inspect --type=container my-container | python3 -m json.tool

# Recreate the container with a new name and any non-conflicting host bindings
docker container create \
  --name my-container-copy \
  --restart unless-stopped \
  -p 8081:80 \
  -e APP_ENV=production \
  myimage:latest

# Start the duplicate
docker container start my-container-copy
```

---

*Set up health checks and restart monitoring for your containers with [OneUptime](https://oneuptime.com).*
