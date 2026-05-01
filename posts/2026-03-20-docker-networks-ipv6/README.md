# How to Create Docker Networks with IPv6 Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Network, Subnets, Bridge, Custom Networks

Description: Create Docker bridge networks with custom IPv6 CIDR ranges, assign specific IPv6 subnets to networks, and connect containers to IPv6-enabled Docker networks.

## Introduction

Docker custom networks can be created with IPv6 support by specifying `--ipv6` using `docker network create`. You can provide an IPv6 CIDR range with `--subnet`, or let Docker automatically choose a ULA subnet. Containers connected to IPv6 networks automatically receive IPv6 addresses from the configured subnet range.

## Create IPv6-Enabled Custom Network

```bash
# Create a dual-stack network with IPv4 and IPv6 subnets

docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 172.20.0.0/16 \
    --subnet fd00:dead:beef:1::/64 \
    --gateway 172.20.0.1 \
    --gateway fd00:dead:beef:1::1 \
    mynet-dual

# Verify network was created with IPv6
docker network inspect mynet-dual | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('EnableIPv6:', data[0]['EnableIPv6'])
for cfg in data[0]['IPAM']['Config']:
    print('Subnet:', cfg['Subnet'])
"

# Create IPv6-only network
docker network create \
    --driver bridge \
    --ipv6 \
    --ipv4=false \
    --subnet fd00:dead:beef:2::/64 \
    --gateway fd00:dead:beef:2::1 \
    --opt com.docker.network.bridge.name=br-ipv6only \
    mynet-ipv6only
```

## Connect Containers to IPv6 Networks

```bash
# Run container on IPv6 network
docker run -d \
    --name web \
    --network mynet-dual \
    nginx

# Check container IPv6 address
docker inspect web | python3 -c "
import json, sys
data = json.load(sys.stdin)
net = data[0]['NetworkSettings']['Networks']['mynet-dual']
print('IPv4:', net['IPAddress'])
print('IPv6:', net['GlobalIPv6Address'])
"

# Connect existing container to IPv6 network
docker network connect mynet-dual existing-container

# Run container with specific IPv6 address
docker run -d \
    --name db \
    --network mynet-dual \
    --ip6 fd00:dead:beef:1::10 \
    postgres:15
```

## Create Network with Labels and Options

```bash
# Production web network with IPv6
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 10.10.0.0/24 \
    --subnet fd00:10:10::/64 \
    --gateway 10.10.0.1 \
    --gateway fd00:10:10::1 \
    --label env=production \
    --label team=web \
    --opt com.docker.network.bridge.enable_ip_masquerade=true \
    --opt com.docker.network.bridge.enable_icc=true \
    prod-web-net

# Database network (isolated)
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 10.20.0.0/24 \
    --subnet fd00:10:20::/64 \
    --internal \
    --label env=production \
    --label team=db \
    prod-db-net

# --internal: no default route to other networks (useful for database isolation)
```

## List and Manage IPv6 Networks

```bash
# List all networks showing IPv6 status
docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.IPv6}}\t{{.ID}}"

# Inspect all custom networks for IPv6
for net in $(docker network ls --filter type=custom -q); do
    NAME=$(docker network inspect "$net" --format "{{.Name}}")
    IPV6=$(docker network inspect "$net" --format "{{.EnableIPv6}}")
    SUBNET=$(docker network inspect "$net" --format "{{range .IPAM.Config}}{{.Subnet}} {{end}}")
    echo "Network: $NAME | IPv6: $IPV6 | Subnets: $SUBNET"
done

# Remove unused networks
docker network prune
```

## Conclusion

Create IPv6-enabled Docker networks with `docker network create --ipv6`, optionally adding `--subnet <ipv6-cidr>` when you want a specific IPv6 range. Custom networks can use an explicit IPv6 subnet or an automatically allocated ULA subnet, while the default bridge is configured through daemon IPv6 settings such as `fixed-cidr-v6`. Use `--internal` to create isolated networks without a default route to other networks (useful for backend services). Assign specific IPv6 addresses to containers with `--ip6` flag. Inspect networks with `docker network inspect` to verify `EnableIPv6: true` and view the assigned IPv6 subnet.
