# How to View Container Port Mappings with podman port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Port Mapping

Description: Learn how to view and manage container port mappings in Podman using podman port, podman inspect, and podman ps for network troubleshooting.

---

> Understanding port mappings is essential for accessing containerized services and debugging connectivity issues.

When you run containers with published ports, traffic from the host is forwarded to ports inside the container. Knowing which ports are mapped and how is critical for accessing services, setting up firewalls, and debugging connection problems. This guide covers all the ways to view port mappings in Podman.

---

## The podman port Command

The `podman port` command shows port mappings for a container:

```bash
# Start a container with port mappings

podman run -d --name web -p 8080:80 nginx:latest

# View all port mappings
podman port web
# Output: 80/tcp -> 0.0.0.0:8080
```

## Querying Specific Ports

Check if a specific container port is mapped:

```bash
# Check a specific port
podman port web 80
# Output: 0.0.0.0:8080

# Check with protocol
podman port web 80/tcp
# Output: 0.0.0.0:8080
```

## Multiple Port Mappings

Containers can have multiple ports mapped:

```bash
# Run a container with multiple port mappings
podman run -d --name multi-port -p 8080:80 -p 8443:443 -p 9090:9090 nginx:latest

# View all mappings
podman port multi-port
# Output:
# 80/tcp -> 0.0.0.0:8080
# 443/tcp -> 0.0.0.0:8443
# 9090/tcp -> 0.0.0.0:9090

# Query a specific port
podman port multi-port 443
# Output: 0.0.0.0:8443
```

## Port Mapping Variations

Different ways to specify port mappings when starting containers:

```bash
# Map to a specific host interface
podman run -d --name local-only -p 127.0.0.1:8080:80 nginx:latest
podman port local-only
# Output: 80/tcp -> 127.0.0.1:8080

# Map to a random host port
podman run -d --name random-port -p 80 nginx:latest
podman port random-port
# Output: 80/tcp -> 0.0.0.0:43210 (random port)

# Map a range of ports
podman run -d --name port-range -p 8080-8082:80-82 nginx:latest
podman port port-range

# Map UDP ports
podman run -d --name udp-app -p 5353:53/udp alpine sleep 3600
podman port udp-app
# Output: 53/udp -> 0.0.0.0:5353
```

## Using podman ps to View Ports

The `podman ps` command also shows port mappings:

```bash
# View ports in the ps output
podman ps --format "table {{.Names}}\t{{.Ports}}"

# Filter for containers with port mappings
podman ps --format '{{.Names}}: {{.Ports}}' | grep -v ": $"
```

## Using podman inspect for Port Details

Get detailed port information with inspect:

```bash
# Get port bindings from host config
podman inspect web --format '{{json .HostConfig.PortBindings}}' | python3 -m json.tool

# Get ports from network settings
podman inspect web --format '{{json .NetworkSettings.Ports}}' | python3 -m json.tool

# Get exposed ports from the container config
podman inspect web --format '{{json .Config.ExposedPorts}}'
```

## Checking Port Accessibility

Verify that mapped ports are actually accessible:

```bash
# Test the mapped port from the host
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080

# Check if the port is listening
(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep 8080

# Test from another machine (if bound to 0.0.0.0)
# curl http://<host-ip>:8080
```

## Building a Port Map Overview

Generate a complete port mapping table:

```bash
# List all containers with their port mappings
echo "Container Port Mappings"
echo "======================="
podman ps --format '{{.Names}}' | while read name; do
    ports=$(podman port "$name" 2>/dev/null)
    if [ -n "$ports" ]; then
        echo "$name:"
        echo "$ports" | sed 's/^/  /'
    fi
done
```

## Troubleshooting Port Issues

```bash
# Check if a port is already in use on the host
(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep ":8080" || echo "Port 8080 is free"

# Check if the container is actually listening on the mapped port (requires ss in the container)
podman exec web ss -tlnp 2>/dev/null | grep ":80"

# Verify port mapping exists
podman port web 80 2>/dev/null || echo "Port 80 is not mapped"

# Check for port conflicts
podman ps --format '{{.Ports}}' | grep "8080" && echo "Port 8080 is in use by a container"
```

## Cleanup

```bash
podman stop web multi-port local-only random-port port-range udp-app 2>/dev/null
podman rm web multi-port local-only random-port port-range udp-app 2>/dev/null
```

## Summary

Use `podman port` for a quick view of container port mappings, `podman ps` for a list overview, and `podman inspect` for detailed JSON data. Port mappings support TCP and UDP, specific interfaces, random ports, and port ranges. Always verify accessibility with tools like `curl` or `ss` when troubleshooting connectivity.
