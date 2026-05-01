# How to Configure fixed-cidr-v6 in Docker daemon.json

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Fixed-cidr-v6, CIDR, Daemon, Networking

Description: Configure the fixed-cidr-v6 option in Docker's daemon.json to assign a specific IPv6 subnet to the default bridge network, understand CIDR sizing requirements, and verify address allocation.

## Introduction

The `fixed-cidr-v6` option in Docker's `daemon.json` specifies the IPv6 CIDR block assigned to the default bridge (`docker0`) network. Docker allocates IPv6 addresses to containers from this range. For typical bridge networking, use a `/64` prefix. Using a ULA prefix (`fd00::/8`) is recommended for private container networking. This setting applies only to the default bridge; custom networks can have their own subnets.

## Choose the Right CIDR Size

```bash
# Recommended: /64 for the default Docker bridge

# Fixed subnet for docker0 bridge:
# /64 is the standard IPv6 subnet size for SLAAC-compatible networks

# daemon.json
# "fixed-cidr-v6": "fd00:dead:beef::/64"

# From a /48 parent, assign each host its own /64
# Host 1: fd00:dead:beef:1::/64
# Host 2: fd00:dead:beef:2::/64

# Docker assigns individual IPv6 addresses from the subnet
```

## Configure fixed-cidr-v6

```json
// /etc/docker/daemon.json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef::/64",
  "ip6tables": true
}
```

```bash
sudo systemctl restart docker

# Verify the subnet is assigned to docker0
docker network inspect bridge

# Sample output excerpt:
# "EnableIPv6": true,
# "IPAM": {
#   "Config": [
#     {"Subnet": "fd00:dead:beef::/64", "Gateway": "fd00:dead:beef::1"}
#   ]
# }
```

## Check Container IPv6 Address Allocation

```bash
# Run a container and inspect its IPv6
docker run -d --name test-ipv6 nginx

# Get container IPv6 address and gateway
docker inspect --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}/{{.GlobalIPv6PrefixLen}} via {{.IPv6Gateway}}{{end}}' test-ipv6
# Output: fd00:dead:beef::242:ac12:2/64 via fd00:dead:beef::1

# Clean up
docker rm -f test-ipv6
```

## Using Multiple Hosts with Different /64 Subnets

```bash
# For multi-host Docker setups, give each host a unique /64
# from the same /48 parent:

# Host 1: fd00:dead:beef:1::/64
# Host 2: fd00:dead:beef:2::/64
# Host 3: fd00:dead:beef:3::/64

# Host 1 daemon.json:
# "fixed-cidr-v6": "fd00:dead:beef:1::/64"

# Host 2 daemon.json:
# "fixed-cidr-v6": "fd00:dead:beef:2::/64"

# This avoids IP conflicts when containers on different hosts communicate,
# provided routing exists between those subnets
```

## Conclusion

The `fixed-cidr-v6` option in `daemon.json` sets the IPv6 subnet for the default Docker bridge network. Use a ULA prefix under `fd00::/8` with a `/64` prefix. For multi-host environments, assign unique `/64` subnets to each Docker host from a shared `/48` parent prefix. After changing `fixed-cidr-v6`, restart Docker and verify with `docker network inspect bridge`. Containers automatically receive addresses from the configured range.
