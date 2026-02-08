# How to Fix Docker "Network Has Active Endpoints" Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, Troubleshooting, Docker Compose, Active Endpoints, DevOps

Description: Resolve the "network has active endpoints" error in Docker by identifying and disconnecting containers attached to the network.

---

You try to remove a Docker network and get hit with this:

```
Error response from daemon: error while removing network: network mynetwork id abc123 has active endpoints
```

Docker refuses to delete a network while containers are still connected to it. This is a safety mechanism, removing a network from under a running container would break its connectivity. The fix is straightforward once you know how to find and disconnect the offending containers.

This guide covers every scenario that causes this error and the cleanest way to resolve each one.

## Why This Error Happens

Docker networks are reference-counted. When a container joins a network, Docker increments the count. When a container leaves, it decrements. The network can only be removed when the count reaches zero.

The error occurs when:

1. Running containers are attached to the network
2. Stopped containers still reference the network
3. Docker Compose services created the network and some containers are still linked
4. A container crashed or was force-killed, leaving stale endpoint references
5. Swarm services have tasks using the network

## Finding Connected Containers

The first step is identifying what is still connected.

```bash
# Inspect the network to see which containers are connected
docker network inspect mynetwork --format '{{range .Containers}}{{.Name}} ({{.IPv4Address}}){{println}}{{end}}'
```

This lists every container attached to the network, along with its IP address on that network.

For a more detailed view:

```bash
# Full network inspection showing all endpoints
docker network inspect mynetwork
```

The `Containers` section of the output shows all active endpoints, both running and stopped containers.

## Fix 1: Stop and Remove Connected Containers

The most common case: you forgot that some containers are still using the network.

```bash
# List containers attached to the network
docker network inspect mynetwork -f '{{range .Containers}}{{.Name}} {{end}}'

# Stop the containers
docker stop container1 container2

# Remove the containers
docker rm container1 container2

# Now remove the network
docker network rm mynetwork
```

If you want to remove all containers on the network in one shot:

```bash
# Stop and remove all containers connected to the network
docker network inspect mynetwork -f '{{range .Containers}}{{.Name}}{{println}}{{end}}' | \
  xargs -r docker rm -f

# Remove the network
docker network rm mynetwork
```

## Fix 2: Disconnect Containers Without Stopping Them

If you want to keep the containers running but just remove the network (and the containers also have another network for connectivity):

```bash
# Disconnect a specific container from the network
docker network disconnect mynetwork container1

# Force disconnect (useful for stale endpoints)
docker network disconnect -f mynetwork container1
```

After disconnecting all containers, the network can be removed:

```bash
# Disconnect all containers, then remove the network
for container in $(docker network inspect mynetwork -f '{{range .Containers}}{{.Name}} {{end}}'); do
  docker network disconnect -f mynetwork "$container"
done

docker network rm mynetwork
```

## Fix 3: Docker Compose Networks

Docker Compose creates networks for each project. When you run `docker compose down`, it removes the containers and the networks. But if containers from another project or manually created containers joined the Compose network, removal fails.

```bash
# Remove a Compose project's containers and networks
docker compose down

# If that fails, check for external containers on the Compose network
docker network inspect myproject_default -f '{{range .Containers}}{{.Name}} {{end}}'
```

The output might show containers not managed by that Compose project. Disconnect or remove them first:

```bash
# Disconnect the foreign container
docker network disconnect myproject_default foreign-container

# Then run compose down again
docker compose down
```

To avoid this problem, use unique network names in your Compose files:

```yaml
# docker-compose.yml - Use a named network to avoid conflicts
version: "3.8"

services:
  web:
    image: nginx
    networks:
      - app-net

networks:
  app-net:
    name: myproject-network
```

## Fix 4: Stale Endpoints After Container Crashes

Sometimes a container exits abnormally and Docker does not clean up the network endpoint properly. The network shows active endpoints for containers that no longer exist.

```bash
# Inspect the network - you might see containers listed that are not in docker ps
docker network inspect mynetwork

# Force disconnect stale endpoints
docker network disconnect -f mynetwork stale-container-name
```

If the container name in the network inspection does not match any existing container, use the endpoint ID:

```bash
# List all containers (including stopped) to cross-reference
docker ps -a --format '{{.ID}} {{.Names}}'

# If the container no longer exists, force disconnect by name
docker network disconnect -f mynetwork phantom-container
```

## Fix 5: Swarm Overlay Networks

For Docker Swarm overlay networks, the error is trickier because Swarm services manage their own endpoints.

```bash
# Check which services use the network
docker network inspect my-overlay -f '{{range .Services}}{{.}} {{end}}'

# Or inspect the service to see its networks
docker service inspect myservice --format '{{json .Spec.TaskTemplate.Networks}}' | jq .
```

Remove the services first, then the network:

```bash
# Remove the service that uses the overlay network
docker service rm myservice

# Wait a moment for the network endpoints to be cleaned up
sleep 10

# Remove the overlay network
docker network rm my-overlay
```

If you deployed services as a stack:

```bash
# Remove the entire stack (removes services, networks, and configs)
docker stack rm mystack

# Wait for cleanup
sleep 15

# Verify the network is gone
docker network ls | grep my-overlay
```

## Fix 6: The Nuclear Option - Pruning

If you just want to clean up all unused networks regardless:

```bash
# Remove all networks not used by any container
docker network prune -f
```

This only removes networks with zero active endpoints. It will not remove networks that have the "active endpoints" problem. For those, you need to disconnect containers first.

A more aggressive cleanup:

```bash
# Stop all containers, prune everything
docker stop $(docker ps -q)
docker system prune -af --volumes
```

This stops every container, removes all stopped containers, unused images, unused networks, and unused volumes. Use with caution in shared environments.

## Preventing the Problem

**Use Docker Compose consistently.** Let Compose manage network lifecycle. Run `docker compose down` to clean up, not manual `docker rm` commands that leave networks behind.

**Name your networks explicitly.** Default Compose networks use the project directory name, which can conflict across projects:

```yaml
# Give networks explicit, unique names
networks:
  backend:
    name: ${COMPOSE_PROJECT_NAME}-backend
```

**Do not share networks between Compose projects** unless you have a good reason. Cross-project networking creates dependencies that make cleanup harder.

**Use `--rm` for temporary containers.** When running one-off containers on a network, the `--rm` flag ensures they are removed when they stop:

```bash
# Container is automatically removed after it exits
docker run --rm --network mynetwork alpine ping -c 3 myservice
```

## Debugging Checklist

When you hit this error, run through these commands in order:

```bash
# 1. See what is on the network
docker network inspect mynetwork

# 2. Check all containers (running and stopped)
docker ps -a

# 3. Disconnect all endpoints
docker network inspect mynetwork -f '{{range .Containers}}{{.Name}}{{println}}{{end}}' | \
  xargs -I {} docker network disconnect -f mynetwork {}

# 4. Try removing the network
docker network rm mynetwork

# 5. If still failing, restart Docker daemon (last resort)
sudo systemctl restart docker
```

Restarting the Docker daemon clears stale endpoint references. It is a blunt fix, but it works when nothing else does.

## Conclusion

The "network has active endpoints" error is Docker protecting you from breaking container connectivity. The fix is always the same pattern: find what is connected, disconnect or remove it, then remove the network. Most of the time, a simple `docker compose down` or disconnecting a forgotten container resolves it. For stubborn cases, force disconnecting stale endpoints or restarting the Docker daemon clears the state. Keep your networks organized, use Compose for lifecycle management, and the error becomes rare.
