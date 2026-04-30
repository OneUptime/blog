# How to Fix 'Unable to Retrieve Image Details' After Docker Update

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Docker Images, API, Compatibility, Docker Update

Description: Learn how to fix 'Unable to Retrieve Image Details' errors in Portainer that appear after Docker Engine updates due to API version changes or metadata format differences.

---

The "Unable to Retrieve Image Details" error typically appears after upgrading Docker Engine. It occurs when Portainer uses a Docker API call that returned data in one format in the old Docker version but changed fields or structure in the new version.

## Step 1: Check Docker and Portainer Version Compatibility

```bash
# Check the Docker daemon API version

docker version --format '{{.Server.APIVersion}}'

# Check Docker's minimum supported API version
docker version --format '{{.Server.MinAPIVersion}}'

# Check which Portainer image tag is running
docker inspect --format '{{.Config.Image}}' portainer
```

Then compare your Docker version and Portainer release against Portainer's compatibility matrix.

## Step 2: Check the Specific Error in Portainer Logs

```bash
# Find the exact error message with context
docker logs portainer 2>&1 | grep -Ei -B 2 -A 5 "image details|image inspect|unable to retrieve"
```

## Step 3: Test the Image Inspect API Directly

```bash
# Test Docker image inspection directly
docker image inspect <image-name>:<tag>

# If this fails for an image that exists locally, the issue is outside Portainer
# If this succeeds but Portainer fails, the problem is likely Portainer/Docker compatibility
```

## Step 4: Update Portainer to Match Docker Version

Portainer and Docker have separate release cycles. If your Docker version is newer than what your Portainer release supports, update Portainer to a supported release:

```bash
# Pull the current Portainer LTS image
docker pull portainer/portainer-ce:lts

# Stop and remove the current Portainer container
docker stop portainer
docker rm portainer

# Redeploy Portainer
docker run -d \
  --name=portainer \
  --restart=always \
  -p 8000:8000 -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

If you still need legacy HTTP access on port 9000, add `-p 9000:9000` to the `docker run` command.

## Step 5: Refresh Portainer's View of the Environment

Portainer may still be showing stale environment data until the next snapshot interval:

```bash
# Restart Portainer so it reconnects to Docker immediately
docker restart portainer
```

## Step 6: Check the Affected Image Locally

If one specific image still fails to load after the Portainer update, inspect it locally and re-pull it if necessary:

```bash
# Check Docker storage and list images with full IDs
docker system df
docker image ls --no-trunc
docker image inspect <image-name>:<tag>

# After stopping any containers that use the image, remove and re-pull it
docker image rm <image-name>:<tag>
docker pull <image-name>:<tag>
```
