# How to Migrate Docker Networks to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker, Migration, Networking, CNI, Netavark

Description: Learn how to migrate your Docker network configurations to Podman, including bridge networks, custom subnets, and container-to-container communication.

---

> Podman supports the same network commands as Docker, but uses Netavark (or CNI) as its network backend instead of Docker's built-in networking, requiring a mindful migration approach.

Docker and Podman both create and manage container networks, but they use different backends. Docker has its own networking stack, while Podman uses Netavark (default since Podman 4.0) or CNI plugins. Despite the different implementations, the command-line interface is nearly identical. This guide covers how to inventory your Docker networks, recreate them in Podman, and handle the differences between the two systems.

---

## Understanding Networking Differences

Before migrating, understand the key differences between Docker and Podman networking.

```bash
# Check which network backend Podman uses

podman info | grep networkBackend
# Output: networkBackend: netavark (or cni)

# Docker network types and their Podman equivalents:
# Docker bridge    -> Podman bridge (default)
# Docker host      -> Podman host
# Docker none      -> Podman none
# Docker overlay   -> No built-in equivalent (use Kubernetes or another multi-host networking solution)
# Docker macvlan   -> Podman macvlan
# Docker ipvlan    -> Podman ipvlan
```

## Inventorying Docker Networks

List and document all your Docker networks before migrating.

```bash
# List all Docker networks
docker network ls

# Get detailed information about each custom network
docker network ls --format '{{.Name}}' | while read NET; do
  echo "=== Network: ${NET} ==="
  docker network inspect "$NET" | jq '.[0] | {
    Name: .Name,
    Driver: .Driver,
    Subnet: .IPAM.Config[0].Subnet,
    Gateway: .IPAM.Config[0].Gateway,
    Internal: .Internal,
    Labels: .Labels,
    Containers: (.Containers | keys)
  }'
done

# Export network configurations for reference
docker network ls -q | while read NET_ID; do
  docker network inspect "$NET_ID" >> /tmp/docker-networks.json
done
```

## Recreating Bridge Networks

Bridge networks are the most common type and map directly to Podman.

```bash
# Docker bridge network with custom subnet
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  myapp-network

# Equivalent Podman command (identical syntax)
podman network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  myapp-network

# Verify the network was created
podman network inspect myapp-network | jq '.[0].subnets'
```

## Recreating Networks with Labels and Options

Preserve network labels and configuration options during migration.

```bash
# Docker network with labels and options
docker network create \
  --driver bridge \
  --subnet 10.5.0.0/24 \
  --gateway 10.5.0.1 \
  --label environment=production \
  --label team=backend \
  --opt com.docker.network.bridge.name=br-prod \
  production-net

# Podman equivalent
podman network create \
  --driver bridge \
  --subnet 10.5.0.0/24 \
  --gateway 10.5.0.1 \
  --label environment=production \
  --label team=backend \
  --opt com.docker.network.bridge.name=br-prod \
  production-net

# Note: Podman also supports com.docker.network.bridge.name for bridge networks
# You can also use --interface-name=br-prod with Netavark
```

## Batch Network Migration Script

Automate the migration of all custom Docker networks.

```bash
#!/bin/bash
# migrate-networks.sh - Migrate Docker networks to Podman

echo "Starting Docker network migration to Podman..."

# Skip default networks that Podman creates automatically
SKIP_NETS="bridge host none"

docker network ls --format '{{.Name}}' | while read NET; do
  # Skip default networks
  if echo "$SKIP_NETS" | grep -qw "$NET"; then
    echo "SKIP (default): ${NET}"
    continue
  fi

  echo "=== Migrating network: ${NET} ==="

  # Check if Podman network already exists
  if podman network exists "$NET" 2>/dev/null; then
    echo "  SKIP: Already exists in Podman."
    continue
  fi

  # Extract network configuration
  SUBNET=$(docker network inspect "$NET" | \
    jq -r '.[0].IPAM.Config[0].Subnet // empty')
  GATEWAY=$(docker network inspect "$NET" | \
    jq -r '.[0].IPAM.Config[0].Gateway // empty')
  DRIVER=$(docker network inspect "$NET" | \
    jq -r '.[0].Driver')
  INTERNAL=$(docker network inspect "$NET" | \
    jq -r '.[0].Internal')
  PARENT=$(docker network inspect "$NET" | \
    jq -r '.[0].Options.parent // empty')
  MACVLAN_MODE=$(docker network inspect "$NET" | \
    jq -r '.[0].Options.macvlan_mode // empty')

  # Podman does not provide a built-in overlay driver
  case "$DRIVER" in
    bridge|macvlan|ipvlan)
      ;;
    overlay)
      echo "  SKIP: Docker overlay networks need Kubernetes or another multi-host networking solution."
      continue
      ;;
    *)
      echo "  SKIP: Unsupported or plugin driver: ${DRIVER}"
      continue
      ;;
  esac

  # Build the Podman network create command
  CMD="podman network create --driver ${DRIVER}"

  if [ -n "$SUBNET" ]; then
    CMD="${CMD} --subnet ${SUBNET}"
  fi

  if [ -n "$GATEWAY" ]; then
    CMD="${CMD} --gateway ${GATEWAY}"
  fi

  if [ -n "$PARENT" ]; then
    CMD="${CMD} -o parent=${PARENT}"
  fi

  if [ "$DRIVER" = "macvlan" ] && [ -n "$MACVLAN_MODE" ]; then
    CMD="${CMD} -o mode=${MACVLAN_MODE}"
  fi

  if [ "$INTERNAL" = "true" ]; then
    CMD="${CMD} --internal"
  fi

  CMD="${CMD} ${NET}"

  echo "  Running: ${CMD}"
  eval "$CMD"

  if [ $? -eq 0 ]; then
    echo "  SUCCESS: ${NET}"
  else
    echo "  FAILED: ${NET}" >&2
  fi
done

echo "Network migration complete."
```

## Migrating Macvlan Networks

Macvlan networks allow containers to appear as physical devices on the network.

```bash
# Docker macvlan network
docker network create \
  --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  -o parent=eth0 \
  macvlan-net

# Podman macvlan equivalent
podman network create \
  --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  -o parent=eth0 \
  macvlan-net
```

## Connecting Containers to Networks

After recreating networks, connect your containers to them.

```bash
# Run a container on the migrated network
podman run -d \
  --name myapp \
  --network myapp-network \
  myapp:latest

# Connect an existing container to an additional network
podman network connect production-net myapp

# Verify network connectivity
podman inspect myapp | jq '.[0].NetworkSettings.Networks'

# Test connectivity between containers on the same network
podman run -d --name web --network myapp-network nginx
podman run -d --name api --network myapp-network myapi:latest

# Containers on the same network can reach each other by name
podman exec api ping -c 3 web
```

## Using Podman Pods for Multi-Container Networking

Podman pods provide an alternative to Docker networks for tightly coupled containers.

```bash
# Create a pod (all containers share the same network namespace)
podman pod create --name myapp-pod -p 8080:80

# Add containers to the pod
podman run -d --pod myapp-pod --name web nginx

# Containers in the same pod communicate via localhost
podman run --rm --pod myapp-pod curlimages/curl:latest curl -s http://localhost:80
```

## Verifying Network Migration

After migrating, verify that all networks are correctly configured.

```bash
# List all Podman networks
podman network ls

# Compare network counts
echo "Docker networks: $(docker network ls -q | wc -l)"
echo "Podman networks: $(podman network ls -q | wc -l)"

# Inspect a specific network
podman network inspect myapp-network

# Test DNS resolution between containers
podman run --rm --network myapp-network alpine \
  nslookup myapp
```

## Summary

Migrating Docker networks to Podman is straightforward because both tools use similar CLI syntax for network management. The key differences lie in the backend (Netavark vs Docker networking) and the absence of overlay networks in Podman. Recreate bridge, macvlan, and internal networks with equivalent Podman commands, preserving subnets, gateways, and labels. For tightly coupled containers that shared a network in Docker, consider using Podman pods for a simpler networking model. Script the migration for large environments and verify connectivity after the transition.
