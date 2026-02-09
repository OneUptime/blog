# How to Set Up Docker Compose with Custom DNS Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker Compose, DNS, Networking, DevOps, Docker, Configuration

Description: Configure Docker Compose services to use custom DNS servers for internal resolution, split DNS, and private registries.

---

By default, Docker containers inherit DNS settings from the Docker daemon, which typically forwards to the host's DNS configuration. This works fine in most cases, but there are situations where you need custom DNS: resolving internal company domains, using Pi-hole or AdGuard for filtering, pointing to a service discovery system like Consul, or working in air-gapped environments with private DNS servers.

Docker Compose makes it straightforward to configure per-service DNS settings. This guide covers all the practical scenarios.

## Basic Custom DNS Configuration

The `dns` key in a service definition sets the DNS servers for that container:

```yaml
# docker-compose.yml - basic custom DNS setup
version: "3.8"

services:
  app:
    image: myapp:latest
    dns:
      - 10.0.0.53        # Primary: internal DNS server
      - 8.8.8.8          # Fallback: Google public DNS
    ports:
      - "3000:3000"
```

You can verify the DNS configuration inside the container:

```bash
# Check the DNS configuration applied to the container
docker compose exec app cat /etc/resolv.conf
```

The output should show your custom nameservers:

```
nameserver 10.0.0.53
nameserver 8.8.8.8
```

## Custom DNS Search Domains

The `dns_search` key sets the search domains. These get appended to unqualified hostnames:

```yaml
version: "3.8"

services:
  app:
    image: myapp:latest
    dns:
      - 10.0.0.53
    dns_search:
      - service.internal
      - mycompany.local
```

With this configuration, when the container tries to resolve `api`, it will query for:
1. `api.service.internal`
2. `api.mycompany.local`
3. `api` (as-is)

This is useful in corporate environments where short hostnames resolve through internal DNS zones.

## Custom DNS Options

Fine-tune DNS resolver behavior with the `dns_opt` key:

```yaml
version: "3.8"

services:
  app:
    image: myapp:latest
    dns:
      - 10.0.0.53
      - 10.0.0.54
    dns_opt:
      - timeout:2          # DNS query timeout in seconds
      - attempts:3          # Number of retry attempts
      - rotate             # Round-robin between nameservers
      - ndots:3            # Dots needed before absolute lookup
```

The `rotate` option distributes DNS queries across your nameservers instead of always hitting the primary first. This provides basic load balancing for DNS resolution. The `ndots:3` option means that hostnames with fewer than 3 dots will be tried with search domains first.

## Running a Local DNS Server with Docker Compose

You can run your own DNS server as part of the compose stack. Here is an example using CoreDNS:

```yaml
# docker-compose.yml - with embedded CoreDNS
version: "3.8"

services:
  dns:
    image: coredns/coredns:latest
    volumes:
      - ./dns/Corefile:/root/Corefile:ro
      - ./dns/zones:/root/zones:ro
    command: ["-conf", "/root/Corefile"]
    ports:
      - "53:53/udp"
      - "53:53/tcp"
    networks:
      app_net:
        ipv4_address: 172.25.0.53

  app:
    image: myapp:latest
    dns:
      - 172.25.0.53
    depends_on:
      - dns
    networks:
      - app_net

  api:
    image: myapi:latest
    dns:
      - 172.25.0.53
    depends_on:
      - dns
    networks:
      - app_net

networks:
  app_net:
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

Create the CoreDNS configuration:

```
# dns/Corefile - CoreDNS configuration
.:53 {
    # Serve custom zone for internal services
    file /root/zones/internal.zone internal.local

    # Forward everything else to public DNS
    forward . 8.8.8.8 8.8.4.4

    # Cache DNS responses for 30 seconds
    cache 30

    # Log all queries for debugging
    log

    # Report errors
    errors
}
```

And a zone file for your internal domains:

```
; dns/zones/internal.zone - internal DNS records
$ORIGIN internal.local.
@       IN SOA  ns.internal.local. admin.internal.local. (
                2026020801 ; Serial
                3600       ; Refresh
                600        ; Retry
                86400      ; Expire
                60 )       ; Minimum TTL

        IN NS   ns.internal.local.

ns      IN A    172.25.0.53
api     IN A    172.25.0.10
db      IN A    172.25.0.20
cache   IN A    172.25.0.30
```

## DNS with Pi-hole for Ad Blocking

Run Pi-hole as your DNS server to filter ads and trackers from containers:

```yaml
version: "3.8"

services:
  pihole:
    image: pihole/pihole:latest
    environment:
      TZ: "America/New_York"
      WEBPASSWORD: ${PIHOLE_PASSWORD:-admin}
      PIHOLE_DNS_: "8.8.8.8;8.8.4.4"
    volumes:
      - pihole_config:/etc/pihole
      - pihole_dnsmasq:/etc/dnsmasq.d
    ports:
      - "8053:80"     # Web admin interface
    networks:
      app_net:
        ipv4_address: 172.25.0.2

  # Application uses Pi-hole for DNS
  app:
    image: myapp:latest
    dns:
      - 172.25.0.2
    depends_on:
      - pihole
    networks:
      - app_net

networks:
  app_net:
    ipam:
      config:
        - subnet: 172.25.0.0/16

volumes:
  pihole_config:
  pihole_dnsmasq:
```

## Split DNS for Hybrid Environments

When you need some domains resolved by internal DNS and others by public DNS, configure split DNS using dnsmasq:

```yaml
version: "3.8"

services:
  dnsmasq:
    image: jpillora/dnsmasq
    volumes:
      - ./dnsmasq.conf:/etc/dnsmasq.conf:ro
    ports:
      - "5353:53/udp"
    networks:
      app_net:
        ipv4_address: 172.25.0.2

  app:
    image: myapp:latest
    dns:
      - 172.25.0.2
    networks:
      - app_net

networks:
  app_net:
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

The dnsmasq configuration routes queries to different upstream servers based on domain:

```
# dnsmasq.conf - split DNS routing
# Internal company domains go to internal DNS
server=/mycompany.local/10.0.0.53
server=/internal.corp/10.0.0.53
server=/10.in-addr.arpa/10.0.0.53

# Cloud provider private zones
server=/compute.internal/169.254.169.253
server=/amazonaws.com/169.254.169.253

# Everything else goes to public DNS
server=8.8.8.8
server=8.8.4.4

# Cache size
cache-size=1000

# Do not use /etc/resolv.conf
no-resolv

# Log queries for debugging (disable in production)
log-queries
```

## Consul DNS Integration

If you use Consul for service discovery, configure containers to resolve `.consul` domains:

```yaml
version: "3.8"

services:
  consul:
    image: hashicorp/consul:latest
    command: agent -server -bootstrap-expect=1 -ui -client=0.0.0.0
    ports:
      - "8500:8500"
      - "8600:8600/udp"
    networks:
      app_net:
        ipv4_address: 172.25.0.2

  # DNS forwarder that sends .consul queries to Consul
  dns:
    image: jpillora/dnsmasq
    volumes:
      - ./consul-dns.conf:/etc/dnsmasq.conf:ro
    depends_on:
      - consul
    networks:
      app_net:
        ipv4_address: 172.25.0.3

  app:
    image: myapp:latest
    dns:
      - 172.25.0.3
    dns_search:
      - service.consul
    depends_on:
      - dns
    networks:
      - app_net

networks:
  app_net:
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

```
# consul-dns.conf - forward .consul to Consul DNS
server=/consul/172.25.0.2#8600
server=8.8.8.8
no-resolv
cache-size=0
```

Now the app container can resolve Consul services by name:

```bash
# Resolve a service registered in Consul
docker compose exec app nslookup web.service.consul
```

## Debugging DNS Issues

When DNS is not working as expected, use these debugging techniques:

```bash
# Check what DNS servers a container is using
docker compose exec app cat /etc/resolv.conf

# Test DNS resolution from inside a container
docker compose exec app nslookup myservice.internal.local

# Test with dig for more detail (install if needed)
docker compose exec app sh -c "apk add bind-tools && dig @10.0.0.53 myservice.internal.local"

# Watch DNS queries in real time (if using CoreDNS or dnsmasq with logging)
docker compose logs -f dns
```

A common issue is that the custom DNS container is not ready when other containers start. Always use `depends_on` with health checks for DNS services:

```yaml
services:
  dns:
    image: coredns/coredns
    healthcheck:
      test: ["CMD", "dig", "@127.0.0.1", "health.check.local"]
      interval: 5s
      timeout: 3s
      retries: 5

  app:
    dns:
      - 172.25.0.53
    depends_on:
      dns:
        condition: service_healthy
```

## Docker Daemon-Level DNS

If every container needs the same DNS settings, configure it at the daemon level instead of per-service:

```json
{
  "dns": ["10.0.0.53", "8.8.8.8"],
  "dns-search": ["mycompany.local"],
  "dns-opts": ["timeout:2", "attempts:3"]
}
```

Save this to `/etc/docker/daemon.json` and restart Docker. All containers will inherit these DNS settings unless overridden in their compose file.

## Summary

Custom DNS in Docker Compose unlocks powerful networking patterns, from simple internal domain resolution to full service discovery with Consul. Use the `dns`, `dns_search`, and `dns_opt` keys for per-service configuration. For complex setups, embed a lightweight DNS server like CoreDNS or dnsmasq in your stack. Always test DNS resolution from inside your containers and use health checks to ensure DNS services are ready before dependent containers start.
