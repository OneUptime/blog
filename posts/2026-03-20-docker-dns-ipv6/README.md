# How to Configure Docker DNS Resolution for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, DNS, AAAA Records, Resolution, Container Networking

Description: Configure DNS resolution for IPv6 in Docker containers, set IPv6-capable DNS servers, understand how Docker's embedded DNS resolves container names over IPv6, and troubleshoot DNS AAAA resolution...

## Introduction

Docker containers use an embedded DNS server (127.0.0.11) for service discovery within user-defined networks. This DNS server can return IPv6 addresses for container names when IPv6 is enabled on the network. Containers on the default `bridge` network inherit the host's DNS settings, while containers on user-defined networks send external lookups to Docker's embedded DNS server, which forwards them to the DNS servers configured on the host. Configuring reachable DNS servers, including IPv6-addressed resolvers when the host has IPv6 connectivity, allows containers to resolve external hostnames and query AAAA records.

## Configure IPv6 DNS Servers

```json
{
  "ipv6": true,
  "ip6tables": true,
  "fixed-cidr-v6": "fd00:dead:beef::/64",
  "dns": [
    "8.8.8.8",
    "2001:4860:4860::8888",
    "2001:4860:4860::8844"
  ]
}
```

```bash
sudo systemctl restart docker

# Verify DNS servers are applied

docker run --rm alpine cat /etc/resolv.conf
# nameserver 8.8.8.8
# nameserver 2001:4860:4860::8888
# nameserver 2001:4860:4860::8844
```

## Per-Container DNS Configuration

```bash
# Override DNS for a specific container
docker run --rm \
    --dns 2606:4700:4700::1111 \
    --dns 2606:4700:4700::1001 \
    alpine sh -c "apk add --no-cache bind-tools -q && dig AAAA google.com +short"

# Use multiple DNS servers (fallback order)
docker run --rm \
    --dns 2001:4860:4860::8888 \
    --dns 8.8.8.8 \
    alpine sh -c "apk add --no-cache bind-tools -q && dig AAAA example.com +short"

# Set DNS search domains
docker run --rm \
    --dns 8.8.8.8 \
    --dns-search internal.example.com \
    --dns-search example.com \
    alpine cat /etc/resolv.conf
```

## Docker Embedded DNS and IPv6 Service Discovery

```bash
# Create IPv6-enabled network with two services
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 172.20.0.0/24 \
    --subnet fd00:dead:beef:1::/64 \
    dnstest

# Start two containers
docker run -d --name server --network dnstest nginx
docker run -d --name client --network dnstest alpine tail -f /dev/null

# Test DNS resolution (Docker embedded DNS = 127.0.0.11)
docker exec client cat /etc/resolv.conf
# nameserver 127.0.0.11  <-- Docker embedded DNS

# Resolve server name to IPv6
docker exec client sh -c "apk add --no-cache bind-tools -q && nslookup -type=AAAA server"
# Should return IPv6 address (fd00:dead:beef:1::X)

# Or with dig
docker exec client sh -c "apk add --no-cache bind-tools -q && dig AAAA server +short"

# Cleanup
docker rm -f server client
docker network rm dnstest
```

## Docker Compose DNS Configuration

```yaml
# compose.yaml

networks:
  appnet:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.21.0.0/24
        - subnet: fd00:dead:beef:2::/64

services:
  web:
    image: nginx:latest
    networks:
      - appnet
    dns:
      - 2001:4860:4860::8888
      - 8.8.8.8
    dns_search:
      - internal.example.com

  api:
    image: myapi:latest
    networks:
      - appnet
    # Default DNS: inherits daemon.json DNS config
```

## Troubleshoot DNS AAAA Resolution

```bash
# Test DNS resolution for AAAA records
docker run --rm alpine sh -c "
    apk add --no-cache bind-tools -q
    echo '=== Testing AAAA resolution ==='
    dig AAAA google.com +short
    echo '=== Testing DNS server IPv6 ==='
    dig AAAA google.com @2001:4860:4860::8888 +short
    echo '=== Testing reverse IPv6 ==='
    dig -x 2001:4860:4860::8888 +short
"

# Common issue: DNS server unreachable over IPv6
# Fix: Ensure host has IPv6 connectivity
ping6 -c 3 2001:4860:4860::8888

# If IPv6 DNS server unreachable, use IPv4 DNS as fallback
docker run --rm \
    --dns 8.8.8.8 \
    alpine sh -c "apk add --no-cache bind-tools -q && dig AAAA google.com +short"
```

## Conclusion

Docker containers on user-defined networks use `127.0.0.11` as the embedded DNS resolver for container name resolution, including IPv6 when enabled. Configure external DNS servers in `daemon.json` under `"dns"` for container name resolution, and use IPv6-addressed resolvers such as `2001:4860:4860::8888` when the host has IPv6 connectivity. Per-container DNS overrides with `--dns` allow using different resolvers for specific containers. Docker Compose supports `dns` and `dns_search` under each service. Ensure the host has IPv6 connectivity before adding IPv6 DNS server addresses to `daemon.json`.
