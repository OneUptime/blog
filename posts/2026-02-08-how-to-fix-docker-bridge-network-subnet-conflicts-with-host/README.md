# How to Fix Docker "Bridge Network Subnet Conflicts" with Host

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, networking, bridge network, subnet conflict, ip address, troubleshooting, linux

Description: Resolve Docker bridge network subnet conflicts with your host or corporate network by configuring custom address pools and network ranges.

---

Docker creates virtual networks and assigns them IP address ranges automatically. Most of the time this works without issues. But when Docker picks a subnet that overlaps with your host network, corporate LAN, or VPN, things break. Suddenly you cannot reach certain internal services. Your VPN drops. Machines on the local network become unreachable. The symptoms are confusing because the conflict is invisible until traffic starts routing to the wrong place.

Here is how to identify and fix Docker bridge network subnet conflicts.

## How Docker Assigns Subnets

By default, Docker uses the following IP ranges:

- Default bridge network: `172.17.0.0/16`
- User-defined networks: Allocated from `172.18.0.0/16`, `172.19.0.0/16`, and so on
- Docker Swarm overlay networks: `10.0.0.0/8` range

Docker picks these ranges automatically without checking if they conflict with your existing network infrastructure. If your corporate network uses `172.16.0.0/12` (which many do), conflicts are almost guaranteed.

Check what subnets Docker is currently using:

```bash
# List all Docker networks and their subnets
docker network ls
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'

# Show all Docker network subnets at once
docker network ls -q | xargs docker network inspect --format '{{.Name}}: {{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

Check your host's routing table to see if there is a conflict:

```bash
# Display the routing table
ip route

# Look for overlapping routes
ip route | grep 172.17
```

## Identifying the Conflict

The symptoms of a subnet conflict include:

- Cannot reach certain hosts on your local network
- VPN connection drops or specific VPN hosts become unreachable
- SSH connections to certain IP ranges time out
- Some internal web services stop loading

The diagnostic process starts with comparing Docker's subnets against your network:

```bash
# Check which networks Docker created
docker network inspect $(docker network ls -q) --format '{{.Name}} {{range .IPAM.Config}}{{.Subnet}}{{end}}'

# Check your host's network interfaces
ip addr show

# Compare with your VPN routes (if applicable)
ip route show | grep -E "172\.|10\.|192\.168"
```

If any Docker subnet overlaps with a route in your host's routing table, you have found the conflict.

## Fix 1: Configure the Default Bridge Network

Change the subnet of Docker's default bridge network by editing the daemon configuration:

```bash
# Edit the Docker daemon configuration
sudo nano /etc/docker/daemon.json
```

Set a custom subnet that does not conflict with your network:

```json
{
    "bip": "192.168.200.1/24"
}
```

The `bip` (bridge IP) setting controls the default bridge network's subnet. Pick an address range that your organization does not use.

Apply the changes:

```bash
# Restart Docker to apply the new bridge configuration
sudo systemctl restart docker

# Verify the new subnet
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

## Fix 2: Set Default Address Pools for All Networks

The `bip` setting only affects the default bridge network. When you create new networks with `docker network create` or through Docker Compose, Docker still picks subnets automatically. Control this globally with `default-address-pools`:

```json
{
    "bip": "192.168.200.1/24",
    "default-address-pools": [
        {
            "base": "192.168.201.0/24",
            "size": 28
        },
        {
            "base": "192.168.202.0/24",
            "size": 28
        }
    ]
}
```

This configuration tells Docker to allocate new networks from the `192.168.201.0/24` and `192.168.202.0/24` ranges, slicing them into /28 subnets (16 addresses each). Each new Docker network gets its own /28 block.

Calculate how many networks you can support:

```
A /24 range contains 256 addresses
A /28 subnet contains 16 addresses
256 / 16 = 16 networks per pool
Two pools = 32 networks total
```

Adjust the `base` and `size` values based on how many Docker networks you need.

## Fix 3: Specify Subnets for Individual Networks

When creating a network manually, you can specify the exact subnet:

```bash
# Create a network with a specific subnet
docker network create --subnet=192.168.210.0/24 --gateway=192.168.210.1 my-custom-network
```

In Docker Compose, define the subnet for each network:

```yaml
# docker-compose.yml with explicit subnet configuration
services:
  webapp:
    image: nginx:latest
    networks:
      - frontend

  api:
    image: myapi:latest
    networks:
      - frontend
      - backend

  db:
    image: postgres:15
    networks:
      - backend

networks:
  frontend:
    ipam:
      config:
        - subnet: 192.168.210.0/24
          gateway: 192.168.210.1
  backend:
    ipam:
      config:
        - subnet: 192.168.211.0/24
          gateway: 192.168.211.1
```

## Fix 4: Remove Conflicting Networks

If Docker already created networks that conflict, remove them:

```bash
# Stop all containers using the conflicting network
docker network disconnect my-network $(docker network inspect my-network -f '{{range .Containers}}{{.Name}} {{end}}')

# Remove the network
docker network rm my-network

# Or prune all unused networks
docker network prune -f
```

Then recreate the networks with non-conflicting subnets.

## Fix 5: Handle VPN Conflicts Specifically

VPN subnet conflicts are the most common scenario. Many corporate VPNs use the `172.16.0.0/12` or `10.0.0.0/8` ranges, which overlap with Docker's defaults.

A good strategy is to use the `192.168.0.0/16` range (excluding whatever your local LAN uses):

```json
{
    "bip": "192.168.128.1/24",
    "default-address-pools": [
        {
            "base": "192.168.129.0/24",
            "size": 28
        },
        {
            "base": "192.168.130.0/24",
            "size": 28
        },
        {
            "base": "192.168.131.0/24",
            "size": 28
        }
    ]
}
```

If your local LAN uses `192.168.1.0/24`, the ranges above (192.168.128-131) will not conflict.

After changing the configuration, verify there are no conflicts with your VPN:

```bash
# Connect to VPN first, then check routes
ip route show

# Verify Docker networks do not overlap with any route
docker network inspect $(docker network ls -q) --format '{{.Name}} {{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

## Fix 6: Use IPv6 to Avoid IPv4 Conflicts

If IPv4 address space is extremely constrained, consider enabling IPv6 for Docker:

```json
{
    "ipv6": true,
    "fixed-cidr-v6": "fd00:dead:beef::/48",
    "default-address-pools": [
        {
            "base": "fd00:dead:beef::/48",
            "size": 64
        }
    ]
}
```

## Preventing Future Conflicts

Document your Docker IP address allocation alongside your network infrastructure. Here is a simple planning approach:

```
Corporate network:   10.0.0.0/8, 172.16.0.0/12
Local LAN:           192.168.1.0/24
VPN:                 172.16.0.0/12
Docker bridge:       192.168.200.0/24
Docker networks:     192.168.201.0/22 (split into /28 blocks)
```

Create a validation script that checks for conflicts:

```bash
#!/bin/bash
# check-docker-network-conflicts.sh
# Compare Docker subnets against host routes to detect conflicts

echo "Docker network subnets:"
docker network ls -q | xargs docker network inspect \
  --format '{{.Name}}: {{range .IPAM.Config}}{{.Subnet}}{{end}}'

echo ""
echo "Host routes:"
ip route show

echo ""
echo "Checking for potential conflicts..."

# Extract Docker subnets
DOCKER_SUBNETS=$(docker network ls -q | xargs docker network inspect \
  --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null)

for subnet in $DOCKER_SUBNETS; do
    # Extract the network prefix
    prefix=$(echo "$subnet" | cut -d'/' -f1 | cut -d'.' -f1-2)
    if ip route | grep -q "^${prefix}"; then
        echo "WARNING: Docker subnet $subnet may conflict with host route"
    fi
done
```

## Summary

Docker bridge network subnet conflicts happen because Docker picks IP ranges without considering your existing network infrastructure. The fix is straightforward: configure `bip` for the default bridge and `default-address-pools` for all other networks in `/etc/docker/daemon.json`. Choose IP ranges that do not overlap with your LAN, VPN, or cloud networks. For teams, standardize on a Docker IP allocation scheme and document it alongside your network architecture. A few minutes of upfront configuration saves hours of debugging mysterious connectivity issues.
