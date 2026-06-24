# How to Configure DNS Resolution in Docker macvlan Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Macvlan, DNS, Networking, IPv4, Container

Description: Configure working DNS resolution for containers in Docker macvlan networks, which bypass Docker's built-in DNS server and require explicit DNS configuration.

## Introduction

Docker's `macvlan` driver assigns containers their own MAC and IP addresses on the physical network, making them appear as separate hosts. Containers on a user-defined `macvlan` network still use Docker's embedded DNS server (`127.0.0.11`) for name resolution. In most cases, external lookups are forwarded to the host's configured resolvers, and you only need to set DNS explicitly when you want different upstream servers or search domains.

## DNS Behavior with macvlan

Docker's built-in DNS (`127.0.0.11`) is available on custom networks, including `macvlan`. `--dns` and `--dns-search` are optional overrides when you need different upstream resolvers or search domains:

```bash
# On a container attached to a custom macvlan network,
# /etc/resolv.conf points at Docker's embedded DNS server
cat /etc/resolv.conf
# nameserver 127.0.0.11
```

## Creating a macvlan Network

Create the macvlan network first:

```bash
# Create a macvlan network on the physical LAN
docker network create \
  --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --ip-range 192.168.1.128/25 \
  -o parent=eth0 \
  macvlan-net
```

## Specifying DNS at Container Run Time

```bash
# Run a container on the macvlan network
# Override DNS only if you do not want to use the host's default resolvers
docker run -d \
  --network macvlan-net \
  --ip 192.168.1.130 \
  --dns 192.168.1.1 \
  --dns 8.8.8.8 \
  --dns-search example.local \
  --name web nginx
```

## Using Docker Compose with macvlan and DNS

```yaml
# docker-compose.yml
services:
  web:
    image: nginx
    networks:
      macvlan-net:
        ipv4_address: 192.168.1.130
    dns:
      - 192.168.1.1      # Primary DNS (LAN resolver)
      - 8.8.8.8          # Fallback public DNS
    dns_search:
      - example.local

networks:
  macvlan-net:
    external: true       # Use the pre-created macvlan network
```

## Verifying DNS Resolution

```bash
# Inspect the resolver configuration inside the container
docker exec web cat /etc/resolv.conf

# Resolve a name using the container's configured DNS settings
docker exec web getent hosts google.com
```

## Using a Local DNS Resolver

If you need custom DNS records beyond Docker's built-in container-name resolution, run a lightweight DNS resolver (e.g., dnsmasq) on a reachable IP on the LAN. If you run it on the Docker host, first create a separate macvlan interface on the host and assign it an IP in the macvlan subnet, because macvlan containers cannot communicate with the host directly:

```bash
# Point containers to a reachable dnsmasq resolver IP
docker run -d \
  --network macvlan-net \
  --ip 192.168.1.131 \
  --dns 192.168.1.53 \
  --name app myapp
```

## Conclusion

macvlan networks provide excellent network isolation and performance while still using Docker's embedded DNS on custom networks. Specify `--dns` at run time or in Compose only when you need to override the host's upstream resolvers or add search domains.
