# How to Configure Docker Default Address Pool for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Address Pool, daemon.json, Network Subnets

Description: Configure Docker's default address pool to automatically allocate IPv6 subnets when creating new networks, preventing subnet conflicts and ensuring predictable IPv6 addressing across Docker hosts.

## Introduction

On Linux hosts, the `default-address-pools` setting in Docker's `daemon.json` defines the CIDR ranges from which Docker automatically allocates subnets when you create a network without specifying them. For IPv6, Docker allocates from an IPv6 pool when you create an IPv6-enabled network without specifying an IPv6 subnet. Each new network gets a `/size` subnet carved from the pool's base range. Configuring this helps avoid conflicting default ranges and allows predictable subnet allocation across multiple Docker hosts.

## Configure Default Address Pool

Edit `/etc/docker/daemon.json`:

```json
{
  "default-address-pools": [
    {
      "base": "172.30.0.0/16",
      "size": 24
    },
    {
      "base": "fd12:3456:789a::/48",
      "size": 64
    }
  ]
}
```

```bash
# Apply the configuration

sudo systemctl restart docker

# Verify the pool is configured
docker info | grep -A10 "Default Address Pools"
```

## How Docker Allocates from the Pool

```bash
# Create IPv6-enabled networks WITHOUT specifying subnets
# Docker automatically carves /64 from fd12:3456:789a::/48

docker network create --ipv6 net1
docker network create --ipv6 net2
docker network create --ipv6 net3

# Docker also allocates IPv4 by default; filter to show the IPv6 subnet
docker network inspect net1 --format "{{range .IPAM.Config}}{{println .Subnet}}{{end}}" | grep ':'
# Example output:
# fd12:3456:789a::/64

docker network inspect net2 --format "{{range .IPAM.Config}}{{println .Subnet}}{{end}}" | grep ':'
# Example output:
# fd12:3456:789a:1::/64

docker network inspect net3 --format "{{range .IPAM.Config}}{{println .Subnet}}{{end}}" | grep ':'
# Example output:
# fd12:3456:789a:2::/64

# Clean up
docker network rm net1 net2 net3
```

## Multi-Host Configuration

Host A (`/etc/docker/daemon.json`):

```json
{
  "default-address-pools": [
    {"base": "172.30.0.0/16", "size": 24},
    {"base": "fd12:3456:7800::/48", "size": 64}
  ]
}
```

Host B (`/etc/docker/daemon.json`):

```json
{
  "default-address-pools": [
    {"base": "172.31.0.0/16", "size": 24},
    {"base": "fd12:3456:7900::/48", "size": 64}
  ]
}
```

```bash
# With this setup, Host A and Host B allocate /64 subnets from different IPv6 pools
# This avoids overlapping IPv6 subnets across hosts
# Bridge networks are still local to each Docker host; use an overlay network for a single network that spans hosts
```

## Verify Pool Exhaustion

```bash
# Docker will fail to allocate a new subnet if the pool is exhausted
# Check how many networks exist
docker network ls -q | wc -l

# Count available subnets in pool
# /48 base with /64 size = 2^16 = 65536 subnets per pool

# View all network subnets
docker network ls -q | xargs -I{} docker network inspect {} \
    --format "{{.Name}}: {{range .IPAM.Config}}{{.Subnet}} {{end}}" 2>/dev/null | \
    grep -v "^$"
```

## Conclusion

Configure `default-address-pools` in `daemon.json` with IPv4 and IPv6 CIDR ranges to control automatic subnet allocation. A `/48` base with `/64` size creates 65,536 unique IPv6 subnets for Docker networks. Assign different IPv6 pool ranges to different Docker hosts to prevent cross-host subnet overlap. After configuration, new IPv6-enabled networks created without explicit subnets automatically receive IPv6 ranges from the pool. Restart Docker after any `daemon.json` changes.
