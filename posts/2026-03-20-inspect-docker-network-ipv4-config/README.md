# How to Inspect Docker Network IPv4 Configuration with docker network inspect

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Docker network inspect, Diagnostic

Description: Use docker network inspect to view complete IPv4 configuration for Docker networks including subnet, gateway, connected containers, and IPAM details.

## Introduction

`docker network inspect` provides the authoritative view of a Docker network's configuration - IPAM settings, connected containers with their IP addresses, driver options, and scope. It is the first tool to reach for when debugging container networking.

## Basic Inspection

```bash
# Inspect the default bridge network

docker network inspect bridge

# Inspect a custom network
docker network inspect my-app-network
```

## Reading the Key Fields

The JSON output is an array; a single network entry looks like this:

```json
[
  {
    "Name": "my-app-network",
    "Id": "abc123...",
    "Driver": "bridge",
    "Scope": "local",
    "IPAM": {
      "Driver": "default",
      "Config": [
        {
          "Subnet": "192.168.100.0/24",
          "Gateway": "192.168.100.1",
          "IPRange": "192.168.100.128/25"
        }
      ]
    },
    "Containers": {
      "def456...": {
        "Name": "web-server",
        "IPv4Address": "192.168.100.130/24",
        "MacAddress": "02:42:c0:a8:64:82"
      }
    }
  }
]
```

## Extracting Specific Fields with --format

```bash
# Get only the subnet
docker network inspect my-app-network --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'

# Get the gateway
docker network inspect my-app-network --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'

# List all containers and their IPs
docker network inspect my-app-network \
  --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
```

## Inspecting All Networks at Once

```bash
# Loop through all networks and show their subnets
docker network ls --format '{{.Name}}' | while read net; do
    subnet=$(docker network inspect "$net" --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null)
    echo "$net: ${subnet:-N/A}"
done
```

## Checking Bridge Interface Name

```bash
# Find the host interface name for a Docker bridge network
docker network inspect my-app-network \
  --format '{{index .Options "com.docker.network.bridge.name"}}'
# Output: br-abc123def456 (the host-side bridge interface)
```

Then on a Linux host:

```bash
ip addr show br-abc123def456
```

## Finding Which Network a Container Is On

```bash
# Inspect the container to see its network attachments
docker inspect web-server \
  --format '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}}: {{$cfg.IPAddress}}{{"\n"}}{{end}}'
```

## Checking for Connected Containers Count

```bash
# Count containers connected to a network
docker network inspect my-app-network \
  --format '{{len .Containers}} containers connected'
```

## Conclusion

`docker network inspect` with `--format` templates is the most efficient way to extract specific IPv4 configuration without parsing full JSON. Use it to confirm subnets, verify container IP assignments, and find the host bridge interface for further low-level inspection.
