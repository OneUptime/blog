# How to Configure Podman with IPv6 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, IPv6, Container Networking, CNI, Rootless, Linux

Description: A guide to configuring Podman container networking with IPv6 support, including custom networks, dual-stack configuration, and rootless IPv6 containers.

Podman uses Netavark for container networking, which supports IPv6 natively. Both root and rootless Podman can use IPv6 networks with appropriate configuration.

## Enabling IPv6 in Podman

Podman's default network configuration may not include IPv6. Enable it per-network:

```bash
# Check default network configuration

podman network inspect podman

# Check if IPv6 is enabled on the default bridge
podman network inspect podman --format '{{.IPv6Enabled}}'
```

## Creating an IPv6-Enabled Network

```bash
# Create a dual-stack network
podman network create \
  --driver bridge \
  --subnet 10.88.0.0/16 \
  --gateway 10.88.0.1 \
  --ipv6 \
  --subnet fd52:2a5a:747e:3acd::/64 \
  --gateway fd52:2a5a:747e:3acd::1 \
  ipv6-network

# IPv6-only network
podman network create \
  --ipv6 \
  --subnet fd52:2a5a:747e:3ace::/64 \
  --gateway fd52:2a5a:747e:3ace::1 \
  ipv6-only

# List networks
podman network ls

# Inspect IPv6 network
podman network inspect ipv6-network
```

## Running Containers with IPv6

```bash
# Run a container on the IPv6 network
podman run -d \
  --name web \
  --network ipv6-network \
  --ip6 fd52:2a5a:747e:3acd::20 \
  -p 80:80 \
  nginx:alpine

# Check container's IPv6 address
podman inspect web --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'

# Or using exec
podman exec web ip -6 addr show

# Test IPv6 connectivity to container
curl -6 http://[fd52:2a5a:747e:3acd::20]/
```

## Pods with IPv6

```bash
# Create a pod with IPv6 networking
podman pod create \
  --name my-pod \
  --network ipv6-network \
  -p 8080:80

# Run containers in the pod
podman run -d \
  --pod my-pod \
  --name pod-web \
  nginx:alpine

podman run -d \
  --pod my-pod \
  --name pod-app \
  my-app:latest

# Check pod network configuration
podman pod inspect my-pod | python3 -m json.tool | grep -A 10 "Networks"
```

## Podman Compose with IPv6

```yaml
# compose.yaml (works with podman compose via an external compose provider)

networks:
  ipv6:
    enable_ipv6: true
    driver: bridge
    ipam:
      config:
        - subnet: 10.30.0.0/24
        - subnet: fd52:2a5a:747e:3ad0::/64

services:
  web:
    image: nginx:alpine
    networks:
      - ipv6
    ports:
      - "80:80"

  app:
    image: my-app:latest
    networks:
      - ipv6
```

```bash
# Deploy with podman compose
podman compose up -d

# Verify the web service has an IPv6 address
podman compose exec web ip -6 addr show
```

## Rootless Podman with IPv6

Rootless Podman requires a user-mode networking tool. Current Podman releases use `pasta` (provided by `passt`) by default:

```bash
# Using pasta (default on current rootless Podman releases)
# Install pasta if it is not already available
sudo apt-get install passt

# Run rootless container with pasta networking
podman run --network pasta --name rootless-web nginx:alpine

# Or configure pasta as default in containers.conf
mkdir -p ~/.config/containers
cat >> ~/.config/containers/containers.conf << 'EOF'
[network]
default_rootless_network_cmd = "pasta"
EOF

# Verify rootless container has IPv6
podman exec rootless-web ip -6 addr show
```

## Configuring the Default Network for IPv6

```bash
# Recreate the default bridge with IPv6 enabled
# Stop and remove containers attached to the default network first.
sudo podman network rm podman

sudo podman network create \
  --driver bridge \
  --subnet 10.88.0.0/16 \
  --gateway 10.88.0.1 \
  --ipv6 \
  --subnet fd52:2a5a:747e:3acf::/64 \
  --gateway fd52:2a5a:747e:3acf::1 \
  podman

# Verify the default network
sudo podman network inspect podman
```

## Verifying IPv6 Container Networking

```bash
# List all container IPv6 addresses
podman ps -q | xargs -I{} podman inspect {} --format '{{.Name}}: {{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'

# Test inter-container IPv6 communication
podman run -d --name app --network ipv6-network alpine tail -f /dev/null
podman exec web ping -6 -c 3 app

# Check IPv6 routing from container
podman exec web ip -6 route show
```

Podman's Netavark-based networking with explicit IPv6 subnet configuration provides reliable dual-stack container networking, with pasta improving rootless IPv6 support.
