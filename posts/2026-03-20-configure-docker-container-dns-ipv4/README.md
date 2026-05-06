# How to Configure Docker Container DNS Settings for IPv4 Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, DNS, IPv4, Container, Configuration

Description: Configure custom DNS servers, search domains, and DNS options for Docker containers using --dns flags and daemon.json to control how containers resolve IPv4 hostnames.

## Introduction

By default, Docker containers use the host's DNS settings. Containers on the default `bridge` network receive a copy of the host's `/etc/resolv.conf`, while containers on user-defined networks use Docker's embedded DNS server (`127.0.0.11`), which forwards queries to the host's configured resolvers. Customizing DNS per container or daemon-wide is essential in corporate environments with internal DNS servers or split-horizon DNS.

## Setting DNS for a Single Container

```bash
# Run a container with custom DNS servers

docker run -d \
  --name my-app \
  --dns 192.168.1.10 \
  --dns 192.168.1.11 \
  --dns-search corp.example.com \
  --dns-option ndots:5 \
  nginx:alpine

# Verify from inside the container
docker exec my-app cat /etc/resolv.conf
```

Relevant `/etc/resolv.conf` entries in the container:

```text
nameserver 192.168.1.10
nameserver 192.168.1.11
search corp.example.com
options ndots:5
```

## Setting Default DNS in daemon.json

To apply DNS settings to all containers:

```bash
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "dns": ["192.168.1.10", "8.8.8.8"],
  "dns-search": ["corp.example.com", "internal"],
  "dns-opts": ["ndots:5", "timeout:2"]
}
EOF

sudo systemctl restart docker
```

## Docker Compose DNS Configuration

```yaml
# docker-compose.yml
services:
  web:
    image: nginx:alpine
    dns:
      - 192.168.1.10
      - 8.8.8.8
    dns_search:
      - corp.example.com
    dns_opt:
      - ndots:5
      - timeout:2
```

## Testing DNS Resolution Inside a Container

```bash
# Test resolution from inside a container
docker exec my-app nslookup internal-server.corp.example.com

# Or verify IPv4 answers only
docker exec my-app getent ahostsv4 internal-server.corp.example.com

# Test with a specific server
docker exec my-app nslookup internal-server.corp.example.com 192.168.1.10
```

## Docker's Embedded DNS

By default, Docker containers on user-defined networks use Docker's internal DNS at `127.0.0.11`. This resolves container names within the same network:

```bash
# Docker's embedded DNS server
docker exec my-app cat /etc/resolv.conf
# nameserver 127.0.0.11

# Resolves other containers by name on the same user-defined network
docker exec my-app ping db-service
```

When you set `--dns` for a container on a user-defined network, Docker's embedded DNS still listens on `127.0.0.11` inside the container and forwards external lookups to the configured upstream DNS servers, so container name resolution still works.

## Troubleshooting DNS in Containers

```bash
# Check if the DNS server is reachable from the container
docker exec my-app nc -uvz 192.168.1.10 53

# Check iptables rules for DNS
sudo iptables -L DOCKER-USER -n -v | grep 53

# Check the container's resolv.conf
docker exec my-app cat /etc/resolv.conf
```

## Conclusion

Use `--dns` flags in `docker run`, the `dns:` key in Docker Compose, or `daemon.json` to configure DNS at different scopes. Docker's embedded DNS (`127.0.0.11`) handles container-to-container name resolution on user-defined networks and coexists with custom DNS servers.
