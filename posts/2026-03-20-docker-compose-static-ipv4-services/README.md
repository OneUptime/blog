# How to Use Docker Compose to Assign Static IPv4 Addresses to Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, IPv4, Static IP, Container, Networking

Description: Assign static IPv4 addresses to specific Docker Compose services using the ipv4_address option within the service networks configuration.

## Introduction

Assigning static IPs to Docker Compose services is useful when other systems reference container IPs directly, when configuring host-based firewall rules against specific container addresses, or when testing with fixed addressing.

## Docker Compose File with Static IPv4

```yaml
# docker-compose.yml

services:
  nginx:
    image: nginx:alpine
    networks:
      app-net:
        ipv4_address: 192.168.50.10

  postgres:
    image: postgres:15-alpine
    networks:
      app-net:
        ipv4_address: 192.168.50.20
    environment:
      POSTGRES_PASSWORD: secret

  redis:
    image: redis:7-alpine
    networks:
      app-net:
        ipv4_address: 192.168.50.30

networks:
  app-net:
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.50.0/24
          gateway: 192.168.50.1
```

## Starting and Verifying

```bash
docker compose up -d

# Verify each service's IP from the Docker host
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$(docker compose ps -q nginx)"     # Should show 192.168.50.10
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$(docker compose ps -q postgres)"  # Should show 192.168.50.20
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$(docker compose ps -q redis)"     # Should show 192.168.50.30
```

## Connecting Services to Multiple Networks with Different Static IPs

```yaml
services:
  app:
    image: my-app:latest
    networks:
      frontend:
        ipv4_address: 172.20.0.10
      backend:
        ipv4_address: 172.21.0.10

networks:
  frontend:
    ipam:
      config:
        - subnet: 172.20.0.0/24
  backend:
    ipam:
      config:
        - subnet: 172.21.0.0/24
```

## Static IP Must Be Within Subnet Range

The specified `ipv4_address` must:
- Fall within the `subnet` defined in the network IPAM config
- Not be the gateway address
- Not be the network or broadcast address
- Not conflict with another service's IP on the same network

## Referencing Services by Name Instead

Static IPs are often unnecessary - Docker Compose creates DNS entries for each service name on the same network:

```yaml
services:
  app:
    environment:
      DB_HOST: postgres    # Resolves to postgres container's IP automatically
      CACHE_HOST: redis
```

Use `ipv4_address` only when external systems need a fixed IP or when service-name DNS resolution on a shared Docker network is not possible.

## Conclusion

Use `ipv4_address` under the service's network attachment to assign static IPs in Docker Compose. Always define a matching `subnet` in the network IPAM block. Prefer name-based resolution for service-to-service communication on a shared Compose network and reserve static IPs for cases where a fixed address is genuinely required.
