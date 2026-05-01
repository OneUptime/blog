# How to Fix 'Error 500 on Container Recreation' in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Error 500, Docker, Container Recreation, Debugging

Description: Learn how to diagnose and fix HTTP 500 errors that occur when recreating or duplicating containers in Portainer, including volume conflicts and network issues.

---

A 500 Internal Server Error during container recreation in Portainer is a server-side failure. In many cases, Portainer is surfacing an error returned by the Docker engine. The useful detail is usually in the Docker error message returned in the API response or Portainer logs.

## Step 1: Check Portainer Logs for the Actual Error

```bash
# Check the Portainer container logs for related errors

PORTAINER_CONTAINER=portainer
docker container logs "$PORTAINER_CONTAINER" 2>&1 | grep -Ei "error|500" | tail -50
```

If you need more detail, enable debug logging in Portainer Settings or recreate the Portainer container with the documented `--log-level DEBUG` flag.

## Step 2: Identify the Docker API Error

The Portainer UI shows a generic 500 but the underlying Docker error is more specific. Check the browser Network tab (F12) and look at the failing API response body.

Common underlying errors:

| Docker Error | Cause |
|---|---|
| `container name already in use` | Existing container still has the name, or a duplicate was given the same name |
| `network not found` | Referenced network was deleted or renamed |
| `volume not found` | Named volume referenced in config no longer exists |
| `port already allocated` | Another container or process is already using the port |
| `bind source path does not exist` | Host bind mount path is missing |

## Step 3: Fix "Container Name Already in Use"

```bash
# List all containers including stopped ones
CONTAINER_NAME=my-container
docker ps -a | grep "$CONTAINER_NAME"

# If you are duplicating a container, give the copy a new name in Portainer.
# If an old stopped container still owns the name, remove it:
OLD_CONTAINER_NAME=my-container
docker rm "$OLD_CONTAINER_NAME"

# Then retry creation in Portainer
```

## Step 4: Fix "Network Not Found"

```bash
# List available networks
docker network ls

# Recreate the missing network
MISSING_NETWORK_NAME=my-network
docker network create "$MISSING_NETWORK_NAME"

# Or update the container config in Portainer to use an existing network
```

If the original network used a custom driver, subnet, or other options, recreate it with the same settings instead of only reusing the name.

## Step 5: Fix Missing Bind Mount Path

```bash
# Create the missing host directory
MISSING_HOST_PATH=/path/to/missing/directory
sudo mkdir -p "$MISSING_HOST_PATH"

# Then retry container creation in Portainer
```

Make sure the directory permissions and ownership match the user your container runs as.

## Step 6: Retry the Recreate or Duplicate Action

After correcting the underlying Docker error, retry the action in Portainer. If the UI still shows a 500, check the failing API response and Portainer logs again for the next Docker error in the chain.
