# How to Debug DNS Resolution Issues in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Debugging, Networking, DNS

Description: Learn how to diagnose and resolve DNS resolution failures inside Podman containers, including custom DNS configuration, network isolation issues, and inter-container name resolution.

---

> DNS failures inside containers are often caused by missing network configuration, not actual DNS server problems.

When a container cannot resolve hostnames, it can manifest as connection timeouts, failed API calls, or cryptic error messages. This guide walks through systematic DNS debugging in Podman containers.

---

## Verify DNS Is the Actual Problem

Before diving into DNS debugging, confirm that the issue is actually DNS-related.

```bash
# Test DNS resolution inside the container

podman exec my-container nslookup google.com

# If nslookup is not available, try getent
podman exec my-container getent hosts google.com

# Compare with a direct IP connection to rule out other network issues
podman exec my-container ping -c 3 8.8.8.8

# If ping works but DNS does not, the problem is DNS-specific
```

## Check Container DNS Configuration

Podman containers have their own `/etc/resolv.conf` which controls DNS resolution.

```bash
# View the container's DNS configuration
podman exec my-container cat /etc/resolv.conf

# Check what DNS servers Podman is configured to use
podman run --rm alpine cat /etc/resolv.conf

# Compare with the host DNS configuration
cat /etc/resolv.conf
```

If the container's `resolv.conf` is empty or has incorrect nameservers, DNS will fail.

## Set Custom DNS Servers

Override the DNS servers for a container when the defaults are not working.

```bash
# Use Google's public DNS
podman run --dns 8.8.8.8 --dns 8.8.4.4 my-image:latest

# Use Cloudflare DNS
podman run --dns 1.1.1.1 --dns 1.0.0.1 my-image:latest

# Set a custom DNS search domain
podman run --dns 8.8.8.8 --dns-search example.com my-image:latest

# Set multiple DNS options
podman run \
  --dns 8.8.8.8 \
  --dns 8.8.4.4 \
  --dns-search example.com \
  --dns-option ndots:5 \
  my-image:latest
```

## Debug Inter-Container DNS Resolution

Containers on the same Podman network can resolve each other by name.

```bash
# Create a custom network
podman network create my-network

# Start containers on the same network
podman run -d --name web --network my-network nginx:latest
podman run -d --name app --network my-network my-app:latest

# Test name resolution between containers
podman exec app nslookup web

# If using the default bridge network, name resolution will NOT work
# Containers must be on a custom network for DNS-based discovery

# Check what network a container is on
podman inspect --format '{{json .NetworkSettings.Networks}}' my-container | python3 -m json.tool
```

## Debug Podman Network DNS

Podman uses Aardvark DNS with the Netavark network backend. Older CNI-based setups may use the `dnsname` plugin, which runs dnsmasq for container name resolution.

```bash
# Check which network backend Podman is using
podman info --format '{{.Host.NetworkBackend}}'

# List all Podman networks
podman network ls

# Inspect a network's DNS configuration
podman network inspect my-network

# Check whether DNS is enabled on the network
podman network inspect -f '{{.DNSEnabled}}' my-network

# Check if the Aardvark DNS process is running
ps aux | grep aardvark-dns

# View Aardvark DNS logs (if available)
# Location varies by system
find /run -name "aardvark-dns*" -type f 2>/dev/null
```

## Debug DNS in Rootless Mode

Rootless Podman handles networking differently, using slirp4netns or pasta, which can affect DNS.

```bash
# Check which network mode rootless Podman is using
podman info --format '{{.Host.NetworkBackend}}'

# Test DNS with slirp4netns explicitly
podman run --network slirp4netns:enable_ipv6=false --dns 8.8.8.8 alpine nslookup google.com

# Test DNS with pasta backend
podman run --network pasta --dns 8.8.8.8 alpine nslookup google.com
```

## Debug DNS with nsswitch

Some minimal container images lack proper `nsswitch.conf`, causing DNS lookups to fail even when `resolv.conf` is correct.

```bash
# Check if nsswitch.conf exists and has DNS configured
podman exec my-container cat /etc/nsswitch.conf

# It should contain a line like:
# hosts: files dns

# If missing, create it
podman exec my-container sh -c 'echo "hosts: files dns" > /etc/nsswitch.conf'

# Or mount it from the host
podman run -v /etc/nsswitch.conf:/etc/nsswitch.conf:ro my-image:latest
```

## Use a Debug Container for DNS Testing

When your application container lacks DNS tools, use a debug container on the same network.

```bash
# Start a debug container with DNS utilities
podman run -it --rm \
  --network my-network \
  --name dns-debug \
  alpine sh

# Inside the debug container, install and use DNS tools
apk add --no-cache bind-tools
dig web.dns.podman
dig @8.8.8.8 google.com
nslookup my-service
```

## Fix DNS in Podman Compose

Apply DNS settings in your compose file for reproducible configurations.

```yaml
# podman-compose.yml
services:
  app:
    image: my-image:latest
    dns:
      - 8.8.8.8
      - 8.8.4.4
    dns_search:
      - example.com
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

## Summary

DNS issues in Podman containers usually stem from incorrect `resolv.conf` configuration, missing custom networks for inter-container resolution, or rootless networking quirks. Setting explicit DNS servers with `--dns`, using custom networks for container-to-container communication, and verifying `nsswitch.conf` configuration resolves the vast majority of DNS problems.
