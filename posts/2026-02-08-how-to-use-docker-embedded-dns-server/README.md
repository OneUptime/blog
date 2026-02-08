# How to Use Docker Embedded DNS Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, DNS, Networking, Containers, Service Discovery, DevOps

Description: Learn how Docker's embedded DNS server works and how to use it for container service discovery, custom DNS, and troubleshooting.

---

Docker includes a built-in DNS server that runs on every custom network. This DNS server is the backbone of container-to-container communication. When one container pings another by name, Docker's embedded DNS resolves that name to the correct container IP address. Understanding how this DNS server works gives you more control over service discovery and helps you debug connectivity issues faster.

## How Docker DNS Works

Docker's embedded DNS server runs at the IP address 127.0.0.11 inside every container connected to a user-defined network. When a container makes a DNS query, it goes to this embedded server first. The server resolves container names, service names, and network aliases. If it cannot resolve a name, it forwards the query to the external DNS servers configured for the container.

The flow looks like this:

```mermaid
graph TD
    A[Container makes DNS query] --> B[Docker Embedded DNS 127.0.0.11]
    B -->|Container name found| C[Return container IP]
    B -->|Name not found locally| D[Forward to external DNS]
    D --> E[External DNS Server]
    E --> F[Return external IP]
```

You can see this DNS configuration inside any container:

```bash
# Check the DNS configuration inside a container on a custom network
docker run --rm --network my-network alpine cat /etc/resolv.conf
```

Output:

```
nameserver 127.0.0.11
options ndots:0
```

The nameserver is always 127.0.0.11 on user-defined networks.

## Default Bridge vs Custom Networks

There is a critical difference between the default bridge network and user-defined networks. The default bridge network does NOT use Docker's embedded DNS server. Containers on the default bridge must use `--link` (deprecated) or IP addresses to communicate.

Demonstrate the difference:

```bash
# Start two containers on the default bridge - DNS does not work
docker run -d --name web1 nginx
docker run --rm alpine ping -c 1 web1
# This fails: ping: bad address 'web1'

# Start two containers on a custom network - DNS works
docker network create app-net
docker run -d --name web2 --network app-net nginx
docker run --rm --network app-net alpine ping -c 1 web2
# This succeeds: PING web2 (172.18.0.2): 56 data bytes
```

This is one of the biggest reasons to always use custom networks instead of the default bridge.

## Container Name Resolution

Every container on a user-defined network can be reached by its name. Docker registers the container name as a DNS A record.

```bash
# Create a network and start some containers
docker network create demo-net
docker run -d --name database --network demo-net postgres:16 -e POSTGRES_PASSWORD=secret
docker run -d --name cache --network demo-net redis:7
docker run -d --name webserver --network demo-net nginx

# From any container on the same network, resolve other containers by name
docker run --rm --network demo-net alpine nslookup database
docker run --rm --network demo-net alpine nslookup cache
docker run --rm --network demo-net alpine nslookup webserver
```

Each nslookup returns the container's IP address on that network.

## Network Aliases

In addition to the container name, you can register additional DNS names using network aliases. This is useful when multiple containers should respond to the same name.

```bash
# Start two web containers with the same alias
docker run -d --name web-v1 --network demo-net --network-alias web nginx:1.24
docker run -d --name web-v2 --network demo-net --network-alias web nginx:1.25
```

Now resolving "web" returns both container IPs:

```bash
# Resolve the shared alias - returns multiple IPs
docker run --rm --network demo-net alpine nslookup web
```

Docker's DNS performs round-robin between the IPs. Each query returns the addresses in a different order, providing basic load balancing.

## Docker Compose Service Discovery

Docker Compose automatically creates network aliases for each service name. This is why you can reference other services by their service name in compose files:

```yaml
# docker-compose.yml - services resolve each other by name
services:
  api:
    image: my-api:latest
    environment:
      # "database" resolves to the database container's IP
      DATABASE_URL: postgresql://user:pass@database:5432/mydb
      # "cache" resolves to the Redis container's IP
      REDIS_URL: redis://cache:6379

  database:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret

  cache:
    image: redis:7
```

Compose also creates aliases for `<project>_<service>` format, so both `database` and `myproject_database` resolve correctly.

## Custom DNS Servers

You can configure which external DNS servers Docker uses when the embedded DNS cannot resolve a name. Set this per container:

```bash
# Use Cloudflare DNS for external resolution
docker run --rm --dns 1.1.1.1 --dns 1.0.0.1 --network demo-net alpine nslookup google.com
```

Or set it globally in the Docker daemon configuration:

```json
{
  "dns": ["1.1.1.1", "8.8.8.8"]
}
```

Apply by restarting Docker:

```bash
# Restart Docker to apply new DNS settings
sudo systemctl restart docker
```

## DNS Search Domains

Docker supports DNS search domains, which let you use short hostnames that get expanded with a suffix:

```bash
# Set a DNS search domain
docker run --rm \
  --dns-search example.com \
  --network demo-net \
  alpine nslookup myhost
```

This causes a lookup for `myhost` to also try `myhost.example.com`. Useful in corporate environments where services have fully qualified domain names.

## Viewing DNS Resolution in Action

Use `dig` (from the netshoot image) for detailed DNS query information:

```bash
# Detailed DNS query for a container name
docker run --rm --network demo-net nicolaka/netshoot \
  dig database

# Query for all records associated with an alias
docker run --rm --network demo-net nicolaka/netshoot \
  dig web +search
```

The `dig` output shows the query, response, TTL, and authoritative server, which is useful for debugging.

## DNS Caching Behavior

Docker's embedded DNS server does not cache negative responses aggressively. When you start a new container, other containers can resolve it almost immediately. When a container stops, its DNS record is removed promptly.

However, application-level DNS caching can cause stale records. Java applications are notorious for caching DNS indefinitely by default. If your application caches DNS, it might hold onto the IP of a container that has been replaced.

Verify DNS TTL from the embedded server:

```bash
# Check the TTL on DNS responses from Docker's embedded DNS
docker run --rm --network demo-net nicolaka/netshoot \
  dig database | grep -A 2 "ANSWER SECTION"
```

Docker typically returns a TTL of 600 seconds (10 minutes). Applications should respect this TTL.

## Troubleshooting DNS Issues

### Container Name Does Not Resolve

```bash
# Check that both containers are on the same network
docker network inspect demo-net --format '{{range .Containers}}{{.Name}} {{end}}'

# Verify the target container is running
docker ps --filter name=database
```

### DNS Queries Are Slow

Slow DNS usually means the embedded DNS is forwarding to an unreachable external server:

```bash
# Check which external DNS servers are configured
docker run --rm --network demo-net alpine cat /etc/resolv.conf

# Test external DNS directly
docker run --rm --network demo-net alpine nslookup google.com 8.8.8.8
```

### DNS Returns Wrong IP

If a container was recreated, the old IP might be cached:

```bash
# Check the current IP of the target container
docker inspect database --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# Compare with what DNS returns
docker run --rm --network demo-net alpine nslookup database
```

If they differ, restart the querying container to clear any application-level DNS cache.

## Advanced: Running Your Own DNS Server Alongside Docker

For complex setups where you need custom DNS records, conditional forwarding, or detailed DNS logging, run a DNS server like CoreDNS or dnsmasq as a Docker container:

```yaml
# docker-compose.yml with custom DNS server
services:
  dns:
    image: coredns/coredns
    volumes:
      - ./Corefile:/Corefile
      - ./zones:/zones
    networks:
      app-net:
        ipv4_address: 172.20.0.2

  app:
    image: my-app
    dns:
      - 172.20.0.2
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

This lets your application use the custom DNS server for both internal container names and any additional records you define.

## Embedding DNS in Health Checks

You can use DNS resolution as a health check for service availability:

```yaml
services:
  app:
    image: my-app
    healthcheck:
      # Health check that verifies DNS resolution works
      test: ["CMD-SHELL", "nslookup database 127.0.0.11 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - app-net
```

## Summary

Docker's embedded DNS server at 127.0.0.11 is the foundation of container service discovery. It resolves container names and network aliases on user-defined networks, and forwards unknown names to external DNS servers. Always use custom networks instead of the default bridge to get automatic DNS resolution. Use network aliases for load balancing across multiple containers. When troubleshooting, check that containers are on the same network, verify DNS responses with `dig` or `nslookup`, and watch out for application-level DNS caching.
