# How to Get a Container's MAC Address with podman inspect

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Container Inspection

Description: Learn how to retrieve a Podman container's MAC address using podman inspect for network debugging, audit trails, and infrastructure documentation.

---

> Retrieving a container's MAC address helps with network debugging, DHCP troubleshooting, and infrastructure documentation.

Every Ethernet-style container network interface has a MAC (Media Access Control) address that uniquely identifies it on the network. While you may not need it as often as an IP address, the MAC address is useful for network debugging, security audits, and tracking container communication at the data link layer. This guide shows you how to extract MAC addresses from Podman containers on bridge or user-defined networks.

---

## Quick MAC Address Retrieval

The simplest way to get a container's MAC address:

```bash
# Start a container on a named network

podman network create my-network 2>/dev/null
podman run -d --name my-app --network my-network nginx:latest

# Get the MAC address
podman inspect my-app --format '{{range .NetworkSettings.Networks}}{{.MacAddress}}{{end}}'
# Output: aa:bb:cc:dd:ee:ff (example)
```

## Getting MAC Address from Default Bridge Network

```bash
# Start a container on the default bridge network
podman run -d --name default-app --network bridge nginx:latest

# Try the general network settings first
podman inspect default-app --format '{{.NetworkSettings.MacAddress}}'

# If empty, check per-network settings
podman inspect default-app --format '{{range .NetworkSettings.Networks}}{{.MacAddress}}{{end}}'
```

## MAC Address for Specific Networks

When a container is on a specific named network:

```bash
# Get MAC for a specific network
podman inspect my-app --format '{{(index .NetworkSettings.Networks "my-network").MacAddress}}'
```

## MAC Addresses for Multi-Network Containers

Containers on multiple networks have a different MAC address for each:

```bash
# Create two networks
podman network create frontend-net 2>/dev/null
podman network create backend-net 2>/dev/null

# Run a container on one network and connect to another
podman run -d --name multi-net --network frontend-net nginx:latest
podman network connect backend-net multi-net

# Get all MAC addresses
podman inspect multi-net --format '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}}: {{$cfg.MacAddress}}{{println}}{{end}}'
# Output:
# frontend-net: 5a:94:ef:12:34:56
# backend-net: 5a:94:ef:78:90:ab
```

## Alternative Methods

### Using podman exec

Get the MAC address from inside the container:

```bash
# Using ip command
podman exec my-app ip link show 2>/dev/null | grep "link/ether" | awk '{print $2}'

# Using cat on sys filesystem
podman exec my-app cat /sys/class/net/eth0/address 2>/dev/null

# List all interfaces and their MACs
podman exec my-app /bin/sh -c 'for addr in /sys/class/net/*/address; do iface=${addr%/address}; echo "${iface##*/}: $(cat "$addr")"; done' 2>/dev/null
```

### Using JSON Output

```bash
# Get full network info as JSON
podman inspect my-app --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool
```

## Full Network Summary Including MAC

Build a complete network profile including the MAC address:

```bash
# Comprehensive network details
podman inspect my-app --format '{{range $net, $cfg := .NetworkSettings.Networks}}
Network:    {{$net}}
IP Address: {{$cfg.IPAddress}}/{{$cfg.IPPrefixLen}}
Gateway:    {{$cfg.Gateway}}
MAC:        {{$cfg.MacAddress}}
{{end}}'
```

## Building a MAC Address Table

Document all container MAC addresses:

```bash
# Create a MAC address table for all running containers
echo "Container MAC Address Table"
echo "==========================="
printf "%-20s %-20s %-20s\n" "CONTAINER" "NETWORK" "MAC"
printf "%-20s %-20s %-20s\n" "---------" "-------" "---"

podman ps --format '{{.Names}}' | while read name; do
    podman inspect "$name" --format '{{range $net, $cfg := .NetworkSettings.Networks}}'"$name"' {{$net}} {{$cfg.MacAddress}}{{println}}{{end}}' 2>/dev/null | \
    while read container network mac; do
        printf "%-20s %-20s %-20s\n" "$container" "$network" "$mac"
    done
done
```

## Practical Use Cases

### Network Debugging

```bash
# Compare expected vs actual MAC addresses
EXPECTED_MAC="aa:bb:cc:dd:ee:ff"
ACTUAL_MAC=$(podman inspect my-app --format '{{range .NetworkSettings.Networks}}{{.MacAddress}}{{end}}')

if [ "$EXPECTED_MAC" = "$ACTUAL_MAC" ]; then
    echo "MAC address matches expected value"
else
    echo "MAC address mismatch: expected $EXPECTED_MAC, got $ACTUAL_MAC"
fi
```

### Infrastructure Documentation

```bash
# Generate a network inventory
podman ps --format '{{.Names}}' | while read name; do
    echo "=== $name ==="
    podman inspect "$name" --format '{{range $net, $cfg := .NetworkSettings.Networks}}  Network: {{$net}}
  IP:      {{$cfg.IPAddress}}
  MAC:     {{$cfg.MacAddress}}
  Gateway: {{$cfg.Gateway}}{{println}}{{end}}'
done
```

## Cleanup

```bash
podman stop my-app default-app multi-net 2>/dev/null
podman rm my-app default-app multi-net 2>/dev/null
podman network rm my-network frontend-net backend-net 2>/dev/null
```

## Summary

Retrieve a Podman container's MAC address using `podman inspect` with Go templates targeting `.NetworkSettings.Networks`. For multi-network containers, iterate over all networks to get each interface's MAC address. This information is valuable for network debugging, security audits, and infrastructure documentation.
