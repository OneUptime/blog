# How to Get a Container's IP Address with podman inspect

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Container Inspection

Description: Learn how to retrieve a Podman container's IP address using podman inspect, including addresses for specific networks and troubleshooting common issues.

---

> Knowing a container's IP address is fundamental for inter-container communication, debugging, and network troubleshooting.

When containers need to communicate with each other or you need to test connectivity, finding a container's IP address is the first step. This guide shows you every way to get IP addresses from Podman containers, including containers on custom networks.

---

## The Quick Way

The simplest command to get a container's IP address:

```bash
# Start a test container

podman run -d --name my-app nginx:latest

# Get the IP address
podman inspect my-app --format '{{.NetworkSettings.IPAddress}}'
# Output: 10.88.0.5 (example)
```

## Understanding Podman Networking

Podman networking differs from Docker. In rootless mode, containers may not have a traditional IP address:

```bash
# Check if running rootless
podman info --format '{{.Host.Security.Rootless}}'

# In rootless mode, the IP might be empty
podman inspect my-app --format 'IP: "{{.NetworkSettings.IPAddress}}"'
# Output: IP: "" (empty in rootless mode with default network)
```

## Getting IP from Network-Specific Settings

For containers connected to named networks, the IP is stored differently:

```bash
# Create a custom network
podman network create my-network

# Run a container on the custom network
podman run -d --name net-app --network my-network nginx:latest

# Get the IP from the network-specific settings
podman inspect net-app --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# Get IP for a specific network by name
podman inspect net-app --format '{{(index .NetworkSettings.Networks "my-network").IPAddress}}'
```

## Getting All Network Information

When a container is connected to multiple networks, get all IPs:

```bash
# Create a second network
podman network create backend-net

# Connect the container to both networks
podman network connect backend-net net-app

# List all networks and their IPs
podman inspect net-app --format '{{range $net, $config := .NetworkSettings.Networks}}{{$net}}: {{$config.IPAddress}}{{println}}{{end}}'
```

## Alternative Methods

### Using podman exec

```bash
# Get the IP from inside the container
podman exec my-app hostname -I 2>/dev/null

# Using ip command
podman exec my-app ip addr show 2>/dev/null | grep "inet " | awk '{print $2}'

# Using /proc
podman exec my-app cat /proc/net/fib_trie 2>/dev/null | grep -A1 "LOCAL" | grep -oP '\d+\.\d+\.\d+\.\d+' | head -5
```

### Using podman inspect with JSON

```bash
# Get full network details as JSON
podman inspect net-app --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool
```

## Practical Use Cases

### Container-to-Container Communication

```bash
# Start two containers on the same network
podman run -d --name web --network my-network nginx:latest
podman run -d --name client --network my-network alpine sleep 3600

# Get the web container's IP
WEB_IP=$(podman inspect web --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "Web server IP: $WEB_IP"

# Test connectivity from the client
podman exec client wget -q -O- "http://${WEB_IP}:80" | head -5
```

### Building a Container IP Table

```bash
# List all running containers with their IPs
echo "Container IPs:"
echo "---"
podman ps --format '{{.Names}}' | while read name; do
    ip=$(podman inspect "$name" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)
    if [ -n "$ip" ]; then
        printf "%-20s %s\n" "$name" "$ip"
    else
        printf "%-20s %s\n" "$name" "(no IP / rootless)"
    fi
done
```

### Health Check Using IP

```bash
# Get IP and test HTTP connectivity
CONTAINER_IP=$(podman inspect web --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

if curl -s --max-time 2 "http://${CONTAINER_IP}:80" > /dev/null 2>&1; then
    echo "Container web ($CONTAINER_IP) is responding"
else
    echo "Container web ($CONTAINER_IP) is NOT responding"
fi
```

## Getting Additional Network Details

Beyond the IP address, you can extract other useful network information:

```bash
# Get the subnet prefix length
podman inspect net-app --format '{{range .NetworkSettings.Networks}}Prefix length: {{.IPPrefixLen}}{{end}}'

# Get the gateway
podman inspect net-app --format '{{range .NetworkSettings.Networks}}Gateway: {{.Gateway}}{{end}}'

# Get the MAC address
podman inspect net-app --format '{{range .NetworkSettings.Networks}}MAC: {{.MacAddress}}{{end}}'

# Get full network summary
podman inspect net-app --format '{{range $net, $cfg := .NetworkSettings.Networks}}Network: {{$net}}
  IP: {{$cfg.IPAddress}}/{{$cfg.IPPrefixLen}}
  Gateway: {{$cfg.Gateway}}
  MAC: {{$cfg.MacAddress}}
{{end}}'
```

## Troubleshooting Empty IP Address

```bash
# If IP is empty, check the network mode
podman inspect my-app --format '{{.HostConfig.NetworkMode}}'

# Check if running in host network mode (shares host IP)
# In host mode, there is no separate container IP

# Check if rootless
podman info --format '{{.Host.Security.Rootless}}'

# For rootless containers, use port mappings instead
podman inspect my-app --format '{{json .NetworkSettings.Ports}}'
```

## Cleanup

```bash
podman stop my-app net-app web client 2>/dev/null
podman rm my-app net-app web client 2>/dev/null
podman network rm my-network backend-net 2>/dev/null
```

## Summary

Getting a container's IP address in Podman depends on the network configuration. Use `podman inspect` with Go templates for the most reliable method. For containers on named networks, iterate over `.NetworkSettings.Networks`. Remember that rootless Podman containers may not have traditional IP addresses, in which case port mappings are the preferred way to access services.
