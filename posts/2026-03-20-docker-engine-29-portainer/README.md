# How to Fix Docker Engine 29 Compatibility Issues with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Docker Engine 29, Compatibility

Description: Resolve compatibility issues between Portainer and Docker Engine 29, including API version mismatches, deprecated features, and configuration changes.

## Introduction

Docker Engine 29.0.0 introduced breaking changes that prevented older Portainer versions from connecting to Docker Standalone environments. If you upgraded Docker and Portainer no longer loads your environment, this guide covers the supported versions, the official fix, and a few related checks that are relevant on Docker Engine 29.

## Known Issues with Docker Engine 29 and Portainer

1. Docker Standalone environments not loading after upgrading to Docker Engine 29.0.0
2. Portainer releases older than 2.33.5 LTS / 2.36.0 STS lacking the Docker 29 compatibility fix
3. Portainer Server and Agent version mismatches after an upgrade
4. Images or containers appearing to go missing after switching storage backends
5. Remote Compose deployments with `build:` steps failing for reasons separate from Docker 29 compatibility

## Step 1: Check Your Docker Engine Version

```bash
# Check Docker server version and API version

docker version

# Example output:
# Server: Docker Engine - Community
#  Engine:
#   Version:          29.0.0
#   API version:      1.52 (minimum version 1.44)
```

## Step 2: Verify Portainer Version Compatibility

Portainer publishes supported Docker versions on its requirements page and documents this specific issue in its known-issues section. Docker Engine 29.0.0 compatibility was fixed in Portainer 2.33.5 LTS / 2.36.0 STS. Newer Portainer releases list newer Docker 29.x versions as tested.

```bash
# If you use a pinned image tag, inspect the running image reference
docker inspect --format '{{.Config.Image}}' portainer

# Otherwise, use the UI: Help → About to confirm the exact Portainer version

# Docker Engine 29.0.0 support was fixed in Portainer 2.33.5 LTS / 2.36.0 STS
# If you're on an older version, update Portainer
```

## Step 3: Update Portainer to Latest

```bash
# Pull the current Portainer CE LTS image
docker pull portainer/portainer-ce:lts

# Stop and remove old container
docker stop portainer
docker rm portainer

# Restart with the updated image (data volume preserved)
docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name=portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

If you still need legacy HTTP access, add `-p 9000:9000` to the `docker run` command.

## Step 4: Update the Portainer Agent If You Use One

If you use the Portainer Agent, keep the agent version aligned with the Portainer Server version:

```bash
# Pull the current Portainer Agent LTS image
docker pull portainer/agent:lts

# Stop and remove the old agent
docker stop portainer_agent
docker rm portainer_agent

# Restart the agent with the updated image
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:lts
```

If you set `AGENT_SECRET` previously, include the same `-e AGENT_SECRET=...` value when recreating the agent.

## Step 5: Check Portainer Logs

If the environment still does not load, review Portainer's logs before changing daemon settings:

```bash
# Check Portainer logs
docker logs --tail 100 portainer

# If you're using the Portainer Agent, check it too
docker logs --tail 100 portainer_agent
```

## Step 6: Test the Docker API Directly

Docker Engine 29 raised the minimum API version, and the original Portainer compatibility problem was in how older Portainer releases handled Docker 29. Testing the socket directly helps separate a Docker problem from a Portainer problem:

```bash
# Query the Docker API directly over the local Unix socket
curl --unix-socket /var/run/docker.sock \
  http://localhost/v1.52/version
```

If this responds but Portainer still cannot load the environment, update Portainer to a fixed release.

## Step 7: Check for Storage Backend Changes

Docker Engine 29 uses the containerd image store by default on fresh installs. On upgraded hosts, Docker stays on the older storage backend unless you explicitly enable the containerd snapshotter. If you switch storage backends, existing images and containers from the other backend become hidden until you switch back.

```bash
# Check the current storage backend
docker info -f '{{ .DriverStatus }}'
```

If you intentionally want to enable the containerd image store on an upgraded host, add the documented feature flag to your existing `/etc/docker/daemon.json`:

```json
{
  "features": {
    "containerd-snapshotter": true
  }
}
```

```bash
sudo systemctl restart docker
```

## Step 8: Treat Remote Compose Build Failures Separately

If image builds fail from a remote Docker environment, treat that as a separate Portainer limitation rather than a Docker Engine 29 compatibility issue. Portainer documents this for Compose deployments that include a `build:` step. The stable workaround is:

1. Build the image outside Portainer using Docker or CI
2. Push the image to a registry or load it onto the remote host
3. Update the Compose file to reference the built image instead of `build:`

## Step 9: Only Apply Docker Daemon Settings You Actually Need

Portainer does not require a special Docker Engine 29 compatibility `daemon.json`. Only use documented daemon settings for an intentional behavior change. For example, builder garbage collection is valid but optional:

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  }
}
```

```bash
sudo systemctl restart docker
```

## Conclusion

Docker Engine 29 compatibility with Portainer is primarily a Portainer version support issue, not an IPv6 or stats-format problem. The documented fix for the Docker Engine 29.0.0 breakage is to update Portainer to 2.33.5 LTS / 2.36.0 STS or later. Separately, Docker Engine 29 changes storage behavior on fresh installs, and Portainer still has a distinct limitation around remote Compose `build:` steps.
