# How to Run a Container That Replaces an Existing One in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Deployment, Replace

Description: Learn how to use Podman's --replace flag to seamlessly swap out a running container with a new one using the same name.

---

> The --replace flag lets you deploy updated containers without the manual stop-remove-run cycle, simplifying updates and redeployments.

When you need to update a running container with a new image or changed configuration, you typically have to stop the old container, remove it, and then start a new one. The `--replace` flag automates this by telling Podman to stop and remove any existing container with the same name before starting the new one. This is invaluable for deployment scripts and rapid iteration.

---

## The Problem: Name Conflicts

Without `--replace`, reusing a container name fails:

```bash
# Start a container with a name

podman run -d --name myapp alpine sleep infinity

# Trying to start another container with the same name fails
podman run -d --name myapp alpine sleep infinity 2>&1
# Error: container name "myapp" is already in use

# Manual cleanup required
podman stop myapp && podman rm myapp
```

## Using the --replace Flag

The `--replace` flag handles this automatically:

```bash
# Start the first version
podman run -d --name myapp alpine sh -c "echo 'version 1'; sleep infinity"

# Replace with a new version - no manual stop/rm needed
podman run -d --replace --name myapp alpine sh -c "echo 'version 2'; sleep infinity"

# The old container was stopped and removed; only the new one exists
podman logs myapp
podman ps --filter name=myapp

podman stop myapp && podman rm myapp
```

## Replacing with a New Image Version

```bash
# Deploy nginx 1.25
podman run -d --replace --name web -p 8080:80 nginx:1.25

# Update to nginx 1.26 - just replace
podman run -d --replace --name web -p 8080:80 nginx:1.26

# Verify the new version
podman exec web nginx -v

podman stop web && podman rm web
```

## Replacing with Changed Configuration

```bash
# Initial configuration
podman run -d --replace --name api \
  --memory 256m \
  --cpus 1 \
  -e APP_MODE=development \
  -p 3000:3000 \
  alpine sleep infinity

# Update configuration without manual cleanup
podman run -d --replace --name api \
  --memory 512m \
  --cpus 2 \
  -e APP_MODE=production \
  -p 3000:3000 \
  alpine sleep infinity

# Verify the new configuration
podman inspect api --format '
  Memory: {{.HostConfig.Memory}}
  CPUs: {{.HostConfig.NanoCpus}}
'

podman stop api && podman rm api
```

## Replace in Deployment Scripts

```bash
# Deployment script pattern
deploy_service() {
  local name=$1
  local image=$2
  local port=$3

  echo "Deploying $name with image $image..."

  podman run -d --replace \
    --name "$name" \
    --memory 512m \
    --cpus 2 \
    --restart on-failure:5 \
    -p "$port:80" \
    "$image"

  echo "$name deployed successfully"
}

# Deploy or redeploy services
deploy_service "web" "nginx:latest" "8080"
deploy_service "web" "nginx:latest" "8080"  # Redeploy uses the same command

podman stop web && podman rm web
```

## Replace with Volume Persistence

Named volumes survive the replacement:

```bash
# First deployment with data
podman run -d --replace --name db \
  -v dbdata:/var/lib/data:Z \
  -e POSTGRES_PASSWORD=secret \
  alpine sh -c "echo 'important data' > /var/lib/data/state.txt; sleep infinity"

sleep 2

# Replace the container - volume data persists
podman run -d --replace --name db \
  -v dbdata:/var/lib/data:Z \
  -e POSTGRES_PASSWORD=newsecret \
  alpine sh -c "cat /var/lib/data/state.txt; sleep infinity"

# Data from the first container is still there
podman logs db

podman stop db && podman rm db
podman volume rm dbdata
```

## Replace When No Existing Container

The `--replace` flag works even if no container with that name exists:

```bash
# First run - no existing container, works fine
podman run -d --replace --name fresh alpine sleep infinity

# Second run - replaces the existing one
podman run -d --replace --name fresh alpine sleep infinity

podman stop fresh && podman rm fresh
```

This makes `--replace` safe to use unconditionally in scripts.

## Replace vs Stop-Remove-Run

```bash
# Manual approach (error-prone)
podman stop myservice 2>/dev/null
podman rm myservice 2>/dev/null
podman run -d --name myservice alpine sleep infinity

# Replace approach (cleaner)
podman run -d --replace --name myservice alpine sleep infinity

# Both achieve the same result, but --replace is:
# - A single command
# - Idempotent (safe to run multiple times)
# - Cleaner in scripts

podman stop myservice && podman rm myservice
```

## Replace in a Rolling Update Pattern

```bash
# Blue-green style deployment using replace
# Deploy "blue" version
podman run -d --replace --name app-blue -p 8081:80 nginx:latest

# Deploy "green" version
podman run -d --replace --name app-green -p 8082:80 nginx:latest

# Switch traffic to green by replacing the proxy config
podman run -d --replace --name proxy \
  -p 8080:80 \
  --add-host app:host-gateway \
  nginx:latest

# When ready, replace blue with the next version
podman run -d --replace --name app-blue -p 8081:80 nginx:latest

podman stop app-blue app-green proxy 2>/dev/null
podman rm app-blue app-green proxy 2>/dev/null
```

## Considerations When Using Replace

```bash
# 1. There is a brief gap between the old container stopping and new one starting
# For zero-downtime, use a load balancer with multiple replicas

# 2. Port bindings are released when the old container stops
# The new container can immediately bind to the same port

# 3. Network connections to the old container are dropped
# Clients need to reconnect

# 4. The old container's logs are lost (container is removed)
# Use external logging if you need log history
podman run -d --replace --name logged-app \
  --log-driver journald \
  alpine sleep infinity

podman stop logged-app && podman rm logged-app
```

## Summary

The `--replace` flag in Podman simplifies container updates and redeployments:

- Use `--replace` with `--name` to replace containers in a single command
- The old container is stopped and removed before the new one starts
- Named volumes persist across replacements
- Works even if no existing container with that name exists (idempotent)
- Ideal for deployment scripts and configuration changes
- Brief downtime occurs during the swap; use load balancers for zero-downtime

Make `--replace` part of your standard deployment workflow to eliminate manual stop-remove-run cycles.
