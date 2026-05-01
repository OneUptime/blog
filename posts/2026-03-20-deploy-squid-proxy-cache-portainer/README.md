# How to Deploy Squid Proxy Cache via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Proxy Cache, Portainer, Docker, Internet Cache, Forward Proxy, Bandwidth

Description: Deploy Squid as a forward proxy and caching server via Portainer to reduce internet bandwidth consumption and provide content filtering for your containerized workloads.

---

Squid is a widely-used proxy caching server that reduces internet bandwidth usage by caching frequently requested content. For containerized environments, running Squid via Portainer provides a shared proxy for all containers to reduce external bandwidth and enforce access policies.

## Deploy Squid via Portainer Stack

```yaml
# squid-stack.yml

services:
  squid:
    image: ubuntu/squid:6.6-24.04_edge
    volumes:
      - /opt/squid/squid.conf:/etc/squid/squid.conf:ro
      - squid-cache:/var/spool/squid
      - squid-logs:/var/log/squid
    ports:
      - "3128:3128"    # HTTP proxy port
    restart: unless-stopped

volumes:
  squid-cache:
  squid-logs:
```

## Squid Configuration

Create `/opt/squid/squid.conf`:

```conf
# squid.conf - basic proxy cache configuration

# Network Access Control
acl localnet src 172.16.0.0/12   # Docker networks
acl localnet src 10.0.0.0/8      # Private networks
acl SSL_ports port 443 8443
acl Safe_ports port 80 443 8080 8443

# Restrict cache manager access and unsafe destination ports
http_access allow manager localhost
http_access deny manager
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports

# Allow local networks through the proxy
http_access allow localhost
http_access allow localnet
http_access deny all

# Cache storage
cache_dir ufs /var/spool/squid 10000 16 256   # 10GB cache

# Cache size settings
maximum_object_size 100 MB
minimum_object_size 0 KB

# DNS settings
dns_nameservers 8.8.8.8 1.1.1.1

# Logging
access_log /var/log/squid/access.log squid
cache_log /var/log/squid/cache.log

# Memory cache size
cache_mem 512 MB

# Port
http_port 3128
```

## Configure Containers to Use Squid

Set the proxy environment variables in your application containers:

```yaml
services:
  webapp:
    image: myapp:1.2.3
    environment:
      - HTTP_PROXY=http://squid:3128
      - HTTPS_PROXY=http://squid:3128
      - NO_PROXY=localhost,127.0.0.1,.internal.example.com
```

Or configure the Docker daemon to use a proxy for image pulls and other daemon-originated traffic:

```ini
# /etc/systemd/system/docker.service.d/http-proxy.conf
[Service]
Environment="HTTP_PROXY=http://squid-host:3128"
Environment="HTTPS_PROXY=http://squid-host:3128"
```

Reload systemd and restart Docker after creating the drop-in file.

## Registry Pulls at Edge Sites

Use a registry mirror for actual Docker Hub pull-through caching. If you also want Docker daemon traffic to egress through Squid, configure both in `daemon.json`:

```json
{
  "registry-mirrors": ["https://mirror.company.example"],
  "proxies": {
    "http-proxy": "http://squid-host:3128",
    "https-proxy": "http://squid-host:3128",
    "no-proxy": "localhost,127.0.0.1,internal.registry.example.com"
  }
}
```

Restart Docker after editing `daemon.json`.

## Monitor Cache Usage

```bash
# Check recent HIT/MISS entries from Portainer console
grep -E 'TCP_(HIT|MISS|MEM_HIT)' /var/log/squid/access.log | tail -n 20

# View access log
tail -f /var/log/squid/access.log
```

## SSL Bump for HTTPS Caching

For inspecting and potentially caching HTTPS content (requires a Squid build with OpenSSL/`ssl_bump` support, certificate database initialization, and client trust of the Squid CA):

```conf
# SSL configuration (advanced - requires client trust of Squid CA cert)
http_port 3129 ssl-bump tls-cert=/etc/squid/squid.pem generate-host-certificates=on dynamic_cert_mem_cache_size=4MB
ssl_bump server-first all
sslcrtd_program /usr/lib/squid/security_file_certgen -s /var/lib/squid/ssl_db -M 4MB
```

## Summary

Squid deployed via Portainer provides bandwidth savings and access control for containerized workloads. It's particularly valuable at edge sites with limited internet bandwidth for repetitive HTTP downloads; for container image pull-through caching, pair it with a registry mirror and optionally route Docker daemon traffic through Squid.
