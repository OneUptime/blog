# How to Recreate a Container with Updated Settings in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Recreate, Update, Container

Description: Recreate a running container in Portainer with new configuration settings while minimizing downtime.

---

Portainer provides a web-based interface for common container lifecycle operations. To apply updated settings to an existing container, Portainer recreates the container with the new configuration and replaces the original one.

## Via the Portainer UI

Navigate to **Containers** in the left sidebar, then select the container you want to update.

### Editing a Running Container

From the container page:
- Click **Duplicate/Edit**
- Make the required changes to the container configuration
- Click **Deploy the container**
- When prompted, click **Replace**

### Duplicating a Running Container

To create a copy instead of replacing the existing container:
- Click **Duplicate/Edit**
- Enter a new container name
- Click **Deploy the container**

## Via the API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Get the current container ID by name

CONTAINER_ID=$(curl -s "https://localhost:9443/api/endpoints/1/docker/containers/json?all=1" \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
containers = json.load(sys.stdin)
for c in containers:
    if '/my-container' in c.get('Names', []):
        print(c['Id'])
")
echo "Container ID: $CONTAINER_ID"

# Inspect the current container so you can reuse its settings in the replacement payload
curl -s "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}/json" \
  -H "Authorization: Bearer $TOKEN" --insecure | python3 -m json.tool

# Stop and remove the original container before recreating it with the same name
curl -X POST "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}/stop" \
  -H "Authorization: Bearer $TOKEN" --insecure

curl -X DELETE "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}" \
  -H "Authorization: Bearer $TOKEN" --insecure

# Create the replacement container with the updated settings
# Reuse the relevant values from the inspect output and change only the settings you want to update.
NEW_CONTAINER_ID=$(curl -s -X POST "https://localhost:9443/api/endpoints/1/docker/containers/create?name=my-container" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "Image": "myimage:latest",
    "Env": ["APP_ENV=production"],
    "HostConfig": {
      "RestartPolicy": { "Name": "unless-stopped" }
    }
  }' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")
echo "Replacement container ID: $NEW_CONTAINER_ID"

# Start the replacement container
curl -X POST "https://localhost:9443/api/endpoints/1/docker/containers/${NEW_CONTAINER_ID}/start" \
  -H "Authorization: Bearer $TOKEN" --insecure
```

## Duplicate a Container

```bash
# Inspect the existing container to capture its full configuration
docker inspect my-container | python3 -m json.tool

# Create a duplicate with a new name. Reuse the relevant flags from the original container.
docker run -d \
  --name my-container-copy \
  myimage:latest
```

---

*Set up health checks and restart monitoring for your containers with [OneUptime](https://oneuptime.com).*
