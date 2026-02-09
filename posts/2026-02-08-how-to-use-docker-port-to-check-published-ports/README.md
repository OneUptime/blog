# How to Use Docker Port to Check Published Ports

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker port, networking, port mapping, containers, debugging, port binding

Description: A complete guide to using docker port for inspecting container port mappings and troubleshooting connectivity.

---

Port mapping issues are one of the most common problems when working with Docker. You publish a port, but the service is not reachable. Or you have a dozen containers running and cannot remember which host ports map to which container ports. The `docker port` command gives you a quick, focused view of exactly which ports a container has published and where they are bound.

This guide covers the `docker port` command in detail, including how to use it for debugging, automation, and monitoring.

## Basic Usage

The simplest form shows all port mappings for a container:

```bash
# Show all published port mappings for a container
docker port my-container
```

Output:

```
80/tcp -> 0.0.0.0:8080
80/tcp -> [::]:8080
443/tcp -> 0.0.0.0:8443
443/tcp -> [::]:8443
```

This tells you that container port 80/tcp is mapped to host port 8080 on all IPv4 and IPv6 interfaces, and container port 443/tcp is mapped to host port 8443.

## Querying a Specific Port

Check the mapping for a single container port:

```bash
# Check where container port 80 is mapped on the host
docker port my-container 80
```

Output:

```
0.0.0.0:8080
[::]:8080
```

Specify the protocol explicitly:

```bash
# Check TCP port mapping specifically
docker port my-container 80/tcp

# Check UDP port mapping
docker port my-container 53/udp
```

This is useful when a container exposes both TCP and UDP on the same port number, which is common for DNS servers.

## Understanding Port Binding Addresses

The address before the colon indicates where the port is bound:

- `0.0.0.0:8080` means the port is accessible from any IPv4 interface (all network-connected machines can reach it)
- `127.0.0.1:8080` means the port is only accessible from the host itself (localhost only)
- `[::]:8080` is the IPv6 equivalent of binding to all interfaces
- `10.0.1.5:8080` means the port is bound to a specific network interface

Compare these two container starts:

```bash
# Binds to all interfaces - accessible from the network
docker run -d --name web-public -p 8080:80 nginx

# Binds to localhost only - accessible only from the host
docker run -d --name web-private -p 127.0.0.1:8081:80 nginx
```

Check the difference:

```bash
# Public binding - shows 0.0.0.0
docker port web-public 80
# Output: 0.0.0.0:8080

# Private binding - shows 127.0.0.1
docker port web-private 80
# Output: 127.0.0.1:8081
```

## Docker Port vs Docker PS

Both `docker ps` and `docker port` show port information, but they serve different purposes.

`docker ps` gives a summary across all containers:

```bash
# Port info is embedded in the PORTS column
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Output:

```
NAMES          PORTS
web            0.0.0.0:8080->80/tcp, 0.0.0.0:8443->443/tcp
redis          6379/tcp
postgres       0.0.0.0:5432->5432/tcp
```

`docker port` gives detailed mapping for a specific container. It is cleaner for scripting because the output is simple and predictable.

```bash
# docker port output is cleaner for parsing
docker port web 80
# Output: 0.0.0.0:8080
```

## Using Docker Port in Scripts

The clean output format makes `docker port` great for automation.

Extract just the host port number:

```bash
# Get the host port mapped to container port 80
HOST_PORT=$(docker port my-container 80 | head -1 | cut -d: -f2)
echo "Service is available on port $HOST_PORT"
```

Wait for a port mapping to be available, then use it:

```bash
#!/bin/bash
# wait-and-connect.sh - Start a container and connect when its port is ready
CONTAINER_NAME="api-server"

# Start the container
docker run -d --name "$CONTAINER_NAME" -p 8080:3000 my-api:latest

# Wait for the port mapping to be available
until docker port "$CONTAINER_NAME" 3000 > /dev/null 2>&1; do
  echo "Waiting for port mapping..."
  sleep 1
done

# Get the mapped port
API_URL="http://localhost:$(docker port "$CONTAINER_NAME" 3000 | head -1 | cut -d: -f2)"
echo "API is available at $API_URL"

# Run health check
curl -sf "$API_URL/health" && echo "Service is healthy"
```

## Checking Dynamic Port Mappings

When you use `-P` (capital P) instead of `-p`, Docker assigns random host ports. `docker port` is essential for finding out what ports were assigned.

```bash
# Publish all exposed ports with random host port assignments
docker run -d --name dynamic-ports -P nginx

# Find out which ports were assigned
docker port dynamic-ports
```

Output:

```
80/tcp -> 0.0.0.0:32768
80/tcp -> [::]:32768
```

Docker assigned host port 32768 to container port 80. You would not know this without `docker port` or `docker ps`.

This pattern is common in testing environments where you start many containers and do not want port conflicts:

```bash
# Start multiple instances with dynamic ports
for i in 1 2 3 4 5; do
  docker run -d --name "web-$i" -P nginx
done

# List all assigned ports
for i in 1 2 3 4 5; do
  PORT=$(docker port "web-$i" 80 | head -1 | cut -d: -f2)
  echo "web-$i -> http://localhost:$PORT"
done
```

## Troubleshooting Port Issues

### Port Shows as Mapped but Service is Not Reachable

The port mapping exists, but curl times out or connection is refused.

```bash
# Step 1: Verify the mapping exists
docker port my-container 80

# Step 2: Check if the process inside the container is actually listening
docker exec my-container ss -tlnp

# Step 3: Check if the process is listening on the right address
# A common mistake is the app binding to 127.0.0.1 inside the container
# instead of 0.0.0.0
docker exec my-container ss -tlnp | grep 80
```

If the application inside the container binds to `127.0.0.1`, it only accepts connections from within the container. It must bind to `0.0.0.0` for Docker port mapping to work.

### Port Conflict Errors

If Docker fails to start a container because the port is already in use:

```bash
# Find what is using a specific host port
sudo lsof -i :8080
# or
sudo ss -tlnp | grep 8080
```

Then either stop the conflicting process or choose a different host port:

```bash
# Use a different host port to avoid the conflict
docker run -d --name web -p 9090:80 nginx
```

### Exposed vs Published Ports

`EXPOSE` in a Dockerfile documents which ports the container uses, but it does not publish them. Only `-p` or `-P` publishes ports.

```bash
# This container exposes port 80 but does not publish it
docker run -d --name no-publish nginx

# docker port shows nothing because no ports are published
docker port no-publish
# (no output)

# The port is still listed in docker inspect under ExposedPorts
docker inspect no-publish --format '{{.Config.ExposedPorts}}'
# Output: map[80/tcp:{}]
```

## Inspecting Port Mappings with Docker Inspect

For more detailed port information, use `docker inspect`:

```bash
# Get detailed port binding information in JSON format
docker inspect my-container --format '{{json .NetworkSettings.Ports}}' | python3 -m json.tool
```

Output:

```json
{
    "80/tcp": [
        {
            "HostIp": "0.0.0.0",
            "HostPort": "8080"
        },
        {
            "HostIp": "::",
            "HostPort": "8080"
        }
    ]
}
```

This gives you structured data that is easier to parse programmatically than the `docker port` text output.

## Port Ranges

Docker supports mapping ranges of ports:

```bash
# Map a range of 10 ports from the container to the host
docker run -d --name multi-port -p 8000-8009:8000-8009 my-app
```

Check all mappings in the range:

```bash
# View all port mappings including the range
docker port multi-port
```

Output:

```
8000/tcp -> 0.0.0.0:8000
8001/tcp -> 0.0.0.0:8001
8002/tcp -> 0.0.0.0:8002
...
8009/tcp -> 0.0.0.0:8009
```

## Docker Compose Port Checking

In a Docker Compose environment, combine `docker compose ps` with `docker port`:

```bash
# List ports for all services in the Compose project
docker compose ps --format "table {{.Service}}\t{{.Ports}}"
```

Check a specific service's ports:

```bash
# Get the container name for a Compose service, then check its ports
docker port $(docker compose ps -q web) 80
```

Or use a one-liner:

```bash
# Check port 3000 of the api service in Compose
docker compose port api 3000
```

The `docker compose port` subcommand is purpose-built for this. It takes the service name directly without needing to look up the container name.

## Summary

`docker port` provides a clean, scriptable way to check how container ports map to host ports. Use it to verify port bindings after starting containers, find dynamically assigned ports, and debug connectivity issues. Remember that port mappings only exist when you use `-p` or `-P`; `EXPOSE` alone does not create them. For scripting, combine `docker port` with `cut` or `awk` to extract just the host port number. When troubleshooting unreachable services, check that the application inside the container binds to `0.0.0.0` rather than `127.0.0.1`.
