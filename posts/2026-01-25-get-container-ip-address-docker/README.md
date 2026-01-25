# How to Get Container IP Address in Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, DevOps, Troubleshooting, CLI

Description: Learn multiple ways to find the IP address of a Docker container, from simple inspect commands to scripts for automation.

---

You need the IP address of a running container to debug network issues, configure services, or connect from another container. Docker provides several ways to get this information, from simple one-liners to detailed network inspection. This guide covers all the methods and when to use each one.

## Method 1: docker inspect with Format

The fastest way to get a container's IP address is using `docker inspect` with a Go template:

```bash
# Get IP address of a container by name or ID
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' container_name

# Example output: 172.17.0.2
```

If you know the network name, you can be more specific:

```bash
# Get IP from a specific network (e.g., bridge)
docker inspect -f '{{.NetworkSettings.Networks.bridge.IPAddress}}' container_name

# For custom networks
docker inspect -f '{{.NetworkSettings.Networks.mynetwork.IPAddress}}' container_name
```

## Method 2: docker inspect Full Output

For more details, view the full network settings:

```bash
# See all network information
docker inspect container_name | grep -A 20 "NetworkSettings"

# Or use jq for JSON parsing (if installed)
docker inspect container_name | jq '.[0].NetworkSettings.Networks'
```

Example output with jq:

```json
{
  "bridge": {
    "IPAMConfig": null,
    "Links": null,
    "Aliases": null,
    "NetworkID": "abc123...",
    "EndpointID": "def456...",
    "Gateway": "172.17.0.1",
    "IPAddress": "172.17.0.2",
    "IPPrefixLen": 16,
    "IPv6Gateway": "",
    "GlobalIPv6Address": "",
    "MacAddress": "02:42:ac:11:00:02"
  }
}
```

## Method 3: From Inside the Container

If you need the IP from within the container itself:

```bash
# Using hostname command (works on most images)
docker exec container_name hostname -I

# Using ip command
docker exec container_name ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1

# Using /proc filesystem (minimal dependencies)
docker exec container_name cat /proc/net/fib_trie | grep -A 1 "LOCAL" | tail -1 | awk '{print $2}'
```

Inside your application code:

```python
# Python: Get container's own IP
import socket

def get_container_ip():
    """Get the IP address of this container."""
    hostname = socket.gethostname()
    ip_address = socket.gethostbyname(hostname)
    return ip_address

print(f"Container IP: {get_container_ip()}")
```

```javascript
// Node.js: Get container's own IP
const os = require('os');

function getContainerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '0.0.0.0';
}

console.log(`Container IP: ${getContainerIP()}`);
```

## Method 4: List All Container IPs

To see IP addresses for all running containers:

```bash
# List all containers with their IPs
docker ps -q | xargs -I {} docker inspect -f '{{.Name}} - {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' {}

# Cleaner output with formatting
docker ps --format "{{.Names}}" | while read name; do
    ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$name")
    echo "$name: $ip"
done
```

Example output:

```
/web: 172.18.0.3
/api: 172.18.0.4
/postgres: 172.18.0.2
```

### Using docker network inspect

For containers on a specific network:

```bash
# See all containers and their IPs on a network
docker network inspect bridge --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'

# With jq for better formatting
docker network inspect mynetwork | jq '.[0].Containers | to_entries[] | "\(.value.Name): \(.value.IPv4Address)"'
```

## Method 5: Docker Compose Services

For Docker Compose projects, each service gets a predictable hostname:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: nginx
    networks:
      - app-network

  api:
    build: ./api
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

```bash
# Get IP of a specific compose service
docker compose ps -q web | xargs docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# Or exec into a container and resolve the service name
docker compose exec api ping -c 1 web
```

In Compose networks, use service names instead of IPs:

```python
# Connect to 'web' service by name, not IP
import requests

response = requests.get('http://web:80/api')
```

## Shell Scripts for Common Tasks

### Get IP of Most Recent Container

```bash
#!/bin/bash
# get-last-container-ip.sh

CONTAINER_ID=$(docker ps -lq)
if [ -z "$CONTAINER_ID" ]; then
    echo "No running containers"
    exit 1
fi

IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CONTAINER_ID")
echo "$IP"
```

### Find Container by IP

```bash
#!/bin/bash
# find-container-by-ip.sh

TARGET_IP=$1

if [ -z "$TARGET_IP" ]; then
    echo "Usage: $0 <ip-address>"
    exit 1
fi

docker ps -q | while read container_id; do
    ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$container_id")
    if [ "$ip" = "$TARGET_IP" ]; then
        name=$(docker inspect -f '{{.Name}}' "$container_id")
        echo "Found: $name ($container_id)"
        exit 0
    fi
done

echo "No container found with IP $TARGET_IP"
```

### Export IPs to Environment

```bash
#!/bin/bash
# export-container-ips.sh

# Export container IPs as environment variables
# Usage: source ./export-container-ips.sh

docker ps --format "{{.Names}}" | while read name; do
    # Convert container name to valid env var (replace - with _)
    var_name=$(echo "$name" | tr '-' '_' | tr '[:lower:]' '[:upper:]')_IP
    ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$name")
    echo "export $var_name=$ip"
done
```

## Multi-Network Containers

Containers can connect to multiple networks and have different IPs on each:

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./api
    networks:
      - frontend
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
```

```bash
# Get all IPs for a multi-network container
docker inspect api --format '{{json .NetworkSettings.Networks}}' | jq

# Output shows IP for each network
# {
#   "frontend": { "IPAddress": "172.18.0.2", ... },
#   "backend": { "IPAddress": "172.19.0.2", ... }
# }
```

To get a specific network's IP:

```bash
# Get IP on frontend network
docker inspect -f '{{.NetworkSettings.Networks.frontend.IPAddress}}' api

# Get IP on backend network
docker inspect -f '{{.NetworkSettings.Networks.backend.IPAddress}}' api
```

## IPv6 Addresses

If you are using IPv6:

```bash
# Get IPv6 address
docker inspect -f '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}' container_name

# Enable IPv6 in Docker daemon config (/etc/docker/daemon.json)
# {
#   "ipv6": true,
#   "fixed-cidr-v6": "2001:db8:1::/64"
# }
```

## Troubleshooting

### Container Has No IP

```bash
# Check if container is running
docker ps -a | grep container_name

# Check container's network mode
docker inspect -f '{{.HostConfig.NetworkMode}}' container_name

# If network mode is "host", container uses host's IP
# If network mode is "none", container has no network
```

### Wrong Network Specified

```bash
# List networks the container is connected to
docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' container_name

# Example output: bridge myapp_default
# Then query the right network
docker inspect -f '{{.NetworkSettings.Networks.myapp_default.IPAddress}}' container_name
```

### IP Changes After Restart

Container IPs are dynamic and may change when containers restart. For stable addressing:

```yaml
# docker-compose.yml with static IP
version: '3.8'

services:
  database:
    image: postgres:15
    networks:
      app-network:
        ipv4_address: 172.20.0.10

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

Or better, use Docker's DNS and reference containers by name instead of IP.

## Summary

Getting a Docker container's IP address is straightforward with `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' container_name`. For containers on multiple networks, specify the network name in the template. In Docker Compose environments, prefer using service names over IP addresses since they are stable across restarts. For automation, create shell scripts that combine `docker ps` and `docker inspect` to list or search for container IPs. Remember that container IPs are ephemeral by design, so build your applications to use Docker's built-in DNS resolution rather than hardcoded addresses.
