# How to Configure Docker Networking for Containers with Overlapping IPv4 Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Overlapping Subnets, Network Isolation

Description: Manage Docker containers with overlapping IPv4 subnets by using separate bridge networks for isolation, understanding routing behavior, and preventing cross-network communication between...

## Introduction

On Linux hosts, subnet conflicts around Docker usually happen when a Docker network overlaps with an existing host, LAN, or VPN route. While Docker isolates bridge networks so containers on different bridges cannot communicate directly, Docker Engine creates non-overlapping local bridge subnets by default. This guide explains how to safely manage this scenario.

## Why Overlapping Subnets Are Problematic

When you create Docker bridge networks, Docker Engine creates non-overlapping local subnets and rejects overlapping ones. On Linux hosts, the remaining risk is choosing a Docker subnet that overlaps with an external route already present on the host, such as a LAN or VPN.

```bash
# Docker won't create two bridge networks with the same subnet

docker network create --subnet 172.20.0.0/24 network-a
docker network create --subnet 172.20.0.0/24 network-b  # fails because the subnet overlaps

# Also check whether the host already has a route for that subnet
ip route show | grep "172.20.0.0/24"
```

## Prevention: Use Non-Overlapping Subnets

The best fix is using distinct subnets:

```bash
docker network create --subnet 172.20.0.0/24 network-a
docker network create --subnet 172.21.0.0/24 network-b
```

## Handling Legacy or External Overlapping Networks

When you must connect to an external network that overlaps with a Docker network:

```bash
# Recreate the Docker network to use a different, safe range
docker network rm network-a
docker network create --subnet 10.200.0.0/24 network-a

# Verify no overlap with external network
ip route show
```

## Isolation Limits for Same-Subnet Bridge Networks

For advanced multi-tenant use cases, note that Docker's standard bridge driver does not support two local bridge networks with the same IPv4 subnet on a single daemon:

```bash
# One bridge network with this subnet is allowed
docker network create \
  --subnet 192.168.100.0/24 \
  tenant-a-network

# A second bridge network with the same subnet is rejected
docker network create \
  --subnet 192.168.100.0/24 \
  tenant-b-network
```

User-defined bridge networks are isolated from one another, but Docker does not allow identical bridge subnets on the same Docker Engine host.

## Checking for Subnet Conflicts

```bash
#!/bin/bash
# List all Docker network subnets so you can verify there are no overlaps
docker network ls --format '{{.Name}}' | while read -r net; do
    subnet=$(docker network inspect "$net" \
      --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null)
    [ -n "$subnet" ] && echo "$net: $subnet"
done | sort
```

## Using Different Address Pools Per Environment

```json
{
  "default-address-pools": [
    {"base": "10.200.0.0/16", "size": 24}
  ]
}
```

This prevents Docker from automatically picking subnets that conflict with your VPN or LAN.

## Conclusion

Prevent Docker subnet conflicts by using distinct subnets or `default-address-pools` in `daemon.json` to control Docker's allocation range. Docker bridge networks are isolated from one another, but identical bridge subnets are not supported on a single Docker Engine host.
