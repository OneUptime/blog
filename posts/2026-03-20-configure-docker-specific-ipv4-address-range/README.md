# How to Configure Docker to Use a Specific IPv4 Address Range

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, daemon.json, Address Range, Configuration

Description: Configure Docker to allocate container IPs from a specific IPv4 address range using daemon.json default address pools and bip settings to avoid conflicts with your network infrastructure.

## Introduction

Docker on Linux creates a default bridge network automatically, typically using `172.17.0.0/16`, and allocates user-defined bridge networks from built-in default address pools that include `172.17.0.0/16` through `172.31.0.0/16` and `192.168.0.0/16` subdivisions. In environments where these overlap with VPN or corporate ranges, you need to redirect Docker to a safe, non-conflicting address range.

## Configure /etc/docker/daemon.json

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "bip": "10.200.0.1/24",
  "default-address-pools": [
    {
      "base": "10.200.0.0/16",
      "size": 24
    }
  ]
}
```

- `bip`: defines the IP and subnet for the default `docker0` bridge
- `default-address-pools`: defines the parent range and subnet size for new local bridge networks

```bash
sudo systemctl restart docker
```

## Verifying the Configuration

```bash
# Check docker0 bridge uses the new range

ip -4 addr show docker0 | grep 'inet '

# Create a test network and confirm it gets an address from the pool
docker network create test-range
docker network inspect test-range --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
# Should show a /24 from 10.200.0.0/16, for example 10.200.1.0/24

# Cleanup
docker network rm test-range
```

## Multiple Address Pools for Different Uses

```json
{
  "bip": "10.200.0.1/24",
  "default-address-pools": [
    {
      "base": "10.200.0.0/16",
      "size": 24
    },
    {
      "base": "10.201.0.0/16",
      "size": 28
    }
  ]
}
```

Docker allocates subnets from the configured pools as needed. Keep the pools non-overlapping.

## Choosing Safe Non-Conflicting Ranges

Run this script to find what ranges are in use on the host:

```bash
#!/bin/bash
echo "Currently in-use network ranges:"
ip -4 route show | awk '/^[0-9]/{print $1}'
```

Pick a private RFC 1918 range not in the output. Example choices to evaluate:
- `10.200.0.0/16`
- `10.201.0.0/16`
- `192.168.200.0/24`

## Checking for Existing Routes Before Applying

```bash
# Quick check whether the chosen prefix is already present in the route table
ip route show | grep "10.200.0.0"
# No output = no exact matching route
```

## Applying to Docker Compose Projects

Custom bridge networks defined without explicit subnets in Docker Compose will now use the configured address pools:

```yaml
networks:
  app-net:
    # No subnet specified - will use 10.200.x.0/24 from the pool
    driver: bridge
```

## Conclusion

Configure `bip` and `default-address-pools` in `/etc/docker/daemon.json` to redirect Docker to a non-conflicting IPv4 range. This is especially important before joining a VPN on a development machine or deploying to a cloud environment with existing RFC 1918 addressing.
