# How to Assign Static IPv6 Addresses to Docker Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Static IP, Container Networking, Fixed Address

Description: Assign fixed IPv6 addresses to Docker containers using --ip6 flag and Docker Compose ipv6_address option, ensuring predictable addressing for services requiring stable IPv6 identifiers.

## Introduction

Docker allows assigning static IPv6 addresses to containers when they connect to user-defined networks with IPv6 enabled. Static IPv6 assignment is useful for services that need stable addresses - such as databases, DNS servers, or internal services referenced by IPv6 address. The address must be within the network's configured IPv6 subnet range.

## Assign Static IPv6 with docker run

```bash
# First, create a network with IPv6 subnet

docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 172.20.0.0/24 \
    --subnet fd12:3456:789a::/64 \
    --gateway 172.20.0.1 \
    --gateway fd12:3456:789a::1 \
    static-net

# Assign static IPv6 to a container
docker run -d \
    --name web \
    --network static-net \
    --ip6 fd12:3456:789a::10 \
    nginx:latest

# Assign both static IPv4 and IPv6
docker run -d \
    --name db \
    --network static-net \
    --ip 172.20.0.20 \
    --ip6 fd12:3456:789a::20 \
    postgres:15

# Verify addresses
docker inspect web --format '{{(index .NetworkSettings.Networks "static-net").GlobalIPv6Address}}'
# Output: fd12:3456:789a::10

docker inspect db --format '{{(index .NetworkSettings.Networks "static-net").GlobalIPv6Address}}'
# Output: fd12:3456:789a::20
```

## Static IPv6 in Docker Compose

```yaml
# compose.yaml

networks:
  appnet:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.20.0.0/24
          gateway: 172.20.0.1
        - subnet: fd12:3456:789a::/64
          gateway: fd12:3456:789a::1

services:
  nginx:
    image: nginx:latest
    networks:
      appnet:
        ipv4_address: 172.20.0.10
        ipv6_address: fd12:3456:789a::10
    ports:
      - "80:80"

  redis:
    image: redis:7
    networks:
      appnet:
        ipv4_address: 172.20.0.20
        ipv6_address: fd12:3456:789a::20

  app:
    image: myapp:latest
    networks:
      - appnet
    environment:
      - REDIS_HOST=fd12:3456:789a::20
      - NGINX_HOST=fd12:3456:789a::10
```

## Test Static IPv6 Connectivity

```bash
# Start services
docker compose up -d

# Verify static addresses
docker inspect "$(docker compose ps -q nginx)" --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'
# Output: fd12:3456:789a::10

docker inspect "$(docker compose ps -q redis)" --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'
# Output: fd12:3456:789a::20

# Connect to Redis using static IPv6
docker compose exec redis redis-cli -h fd12:3456:789a::20 ping
# Output: PONG
```

## Limitations and Considerations

```bash
# Static IPv6 assignment with --ip6 requires a user-defined network
# The examples above use a user-defined bridge network

# Verify the example network uses the bridge driver
docker network inspect static-net | grep '"Driver"'
# Should show: "Driver": "bridge"

# The --ip6 address must be within the subnet
# This will FAIL because the address is outside the subnet:
docker run --rm \
    --network static-net \
    --ip6 fd12:3456:789b::99 \
    alpine echo "test"

# Reserve the configured gateway address
# If you want Docker's dynamic allocation separated from manual addresses,
# configure an IPAM allocation range with --ip-range or ipam.config[].ip_range
# Example: fd12:3456:789a::1 = gateway
#          fd12:3456:789a::10 and ::20 = manually assigned
```

## Conclusion

Assign static IPv6 addresses to Docker containers with `--ip6 <address>` in `docker run` or `ipv6_address` in Docker Compose network config. The address must be within the network's configured IPv6 subnet and the network must be a user-defined network (not the default bridge). Plan static assignments carefully, and if you want Docker's dynamic allocation kept in a separate pool, configure an IPAM allocation range. Static IPv6 addresses are useful for services referenced by address in configuration files or environment variables.
