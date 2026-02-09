# How to Run Squid Proxy in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Squid, Proxy, Caching, Networking, DevOps, Security

Description: Deploy Squid forward proxy in Docker for caching, access control, and traffic filtering in your network infrastructure.

---

Squid is a caching and forwarding HTTP proxy that has been around since the mid-1990s. It sits between your clients and the internet, caching frequently accessed content and enforcing access policies. Squid is used for bandwidth savings, access control, content filtering, and providing anonymity for outbound requests.

Running Squid in Docker is useful for development environments where you need to inspect HTTP traffic, cache package downloads, or restrict internet access from containers. It is also a solid choice for production forward proxy deployments.

## Quick Start

Run Squid with default settings:

```bash
# Start Squid proxy on port 3128
docker run -d \
  --name squid \
  -p 3128:3128 \
  ubuntu/squid:latest
```

Test the proxy:

```bash
# Make a request through the Squid proxy
curl -x http://localhost:3128 http://httpbin.org/ip

# Verify the proxy is working by checking the response headers
curl -I -x http://localhost:3128 http://httpbin.org/get
```

## Docker Compose Setup

For a proper deployment with custom configuration:

```yaml
# docker-compose.yml - Squid forward proxy
version: "3.8"

services:
  squid:
    image: ubuntu/squid:latest
    ports:
      # Standard Squid proxy port
      - "3128:3128"
    volumes:
      # Mount custom configuration
      - ./squid.conf:/etc/squid/squid.conf
      # Persist cache data
      - squid_cache:/var/spool/squid
      # Persist logs
      - squid_logs:/var/log/squid
    restart: unless-stopped

volumes:
  squid_cache:
  squid_logs:
```

## Basic Configuration

Create a Squid configuration file:

```
# squid.conf - Basic forward proxy configuration

# Define the port Squid listens on
http_port 3128

# Access control lists
acl localnet src 10.0.0.0/8
acl localnet src 172.16.0.0/12
acl localnet src 192.168.0.0/16

# Allowed ports for CONNECT method (HTTPS tunneling)
acl SSL_ports port 443
acl Safe_ports port 80        # HTTP
acl Safe_ports port 443       # HTTPS
acl Safe_ports port 21        # FTP
acl Safe_ports port 1025-65535 # High ports

# Deny access to unsafe ports
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports

# Allow local network access
http_access allow localnet
http_access allow localhost

# Deny everything else
http_access deny all

# Cache settings - 1GB disk cache, 256MB memory cache
cache_mem 256 MB
maximum_object_size_in_memory 4 MB
cache_dir ufs /var/spool/squid 1000 16 256
maximum_object_size 100 MB

# Log format
access_log /var/log/squid/access.log squid

# DNS settings
dns_nameservers 8.8.8.8 8.8.4.4

# Proxy identity (hide version info)
httpd_suppress_version_string on
via off
forwarded_for delete
```

## Caching Proxy for Package Downloads

One of the best uses for Squid in Docker is caching package manager downloads. This speeds up builds dramatically when multiple containers or CI jobs download the same packages:

```
# squid.conf - Optimized for package caching
http_port 3128

acl localnet src 10.0.0.0/8
acl localnet src 172.16.0.0/12
acl localnet src 192.168.0.0/16

http_access allow localnet
http_access allow localhost
http_access deny all

# Aggressive caching for package repositories
cache_mem 512 MB
maximum_object_size_in_memory 10 MB
cache_dir ufs /var/spool/squid 5000 16 256
maximum_object_size 500 MB

# Cache APT packages for 30 days
refresh_pattern -i \.deb$ 43200 100% 43200
refresh_pattern -i \.rpm$ 43200 100% 43200

# Cache pip packages
refresh_pattern -i \.whl$ 43200 100% 43200
refresh_pattern -i \.tar\.gz$ 43200 100% 43200

# Cache npm packages
refresh_pattern -i \.tgz$ 43200 100% 43200

# Cache Docker layers
refresh_pattern -i /v2/.*/blobs/ 43200 100% 43200

# Default refresh patterns
refresh_pattern ^ftp: 1440 20% 10080
refresh_pattern ^gopher: 1440 0% 1440
refresh_pattern -i (/cgi-bin/|\?) 0 0% 0
refresh_pattern . 0 20% 4320
```

Use this proxy in your Docker builds:

```dockerfile
# Dockerfile - Use Squid proxy for cached package downloads
FROM ubuntu:22.04

# Point apt at the Squid proxy
ENV http_proxy=http://squid:3128
ENV https_proxy=http://squid:3128

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# pip will also use the proxy through environment variables
RUN pip3 install requests flask
```

## Docker Network Proxy

Configure Squid as a transparent proxy for all containers on a Docker network:

```yaml
# docker-compose.yml - Squid as a network proxy
version: "3.8"

services:
  squid:
    image: ubuntu/squid:latest
    volumes:
      - ./squid.conf:/etc/squid/squid.conf
      - squid_cache:/var/spool/squid
    networks:
      proxy-net:
        # Give Squid a fixed IP address
        ipv4_address: 172.25.0.2

  # Application container that uses the proxy
  app:
    build: ./app
    environment:
      HTTP_PROXY: http://172.25.0.2:3128
      HTTPS_PROXY: http://172.25.0.2:3128
      NO_PROXY: localhost,127.0.0.1,.internal
    networks:
      - proxy-net
    depends_on:
      - squid

  # Another container using the same proxy
  worker:
    build: ./worker
    environment:
      HTTP_PROXY: http://172.25.0.2:3128
      HTTPS_PROXY: http://172.25.0.2:3128
      NO_PROXY: localhost,127.0.0.1,.internal
    networks:
      - proxy-net
    depends_on:
      - squid

networks:
  proxy-net:
    ipam:
      config:
        - subnet: 172.25.0.0/16

volumes:
  squid_cache:
```

## Content Filtering

Block access to specific domains or content types:

```
# squid.conf - With content filtering

http_port 3128

acl localnet src 172.16.0.0/12
http_access allow localnet
http_access allow localhost

# Block specific domains
acl blocked_sites dstdomain .facebook.com .twitter.com .instagram.com
http_access deny blocked_sites

# Block by URL pattern
acl blocked_urls url_regex -i \.exe$ \.msi$ \.bat$
http_access deny blocked_urls

# Allow list approach - only allow specific domains
# acl allowed_sites dstdomain .github.com .npmjs.org .pypi.org
# http_access deny !allowed_sites

http_access deny all

cache_dir ufs /var/spool/squid 1000 16 256
```

## Authentication

Add basic authentication to Squid:

```bash
# Generate a password file with htpasswd
docker exec squid apt-get update && docker exec squid apt-get install -y apache2-utils
docker exec squid htpasswd -cb /etc/squid/passwords user1 secret123
docker exec squid htpasswd -b /etc/squid/passwords user2 another_secret
```

Update the Squid configuration:

```
# squid.conf - With basic authentication

http_port 3128

# Authentication configuration
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwords
auth_param basic realm Squid Proxy
auth_param basic credentialsttl 2 hours

# Require authentication for all users
acl authenticated proxy_auth REQUIRED
http_access allow authenticated
http_access deny all

cache_dir ufs /var/spool/squid 1000 16 256
```

Test authenticated access:

```bash
# Access through the authenticated proxy
curl -x http://user1:secret123@localhost:3128 http://httpbin.org/ip
```

## Monitoring and Logs

```bash
# View real-time access logs
docker exec squid tail -f /var/log/squid/access.log

# View cache manager statistics
docker exec squid squidclient -h localhost -p 3128 mgr:info

# Check cache hit ratios
docker exec squid squidclient -h localhost -p 3128 mgr:utilization

# View current active connections
docker exec squid squidclient -h localhost -p 3128 mgr:active_requests

# Check cache storage usage
docker exec squid du -sh /var/spool/squid/

# Clear the entire cache
docker exec squid squid -k shutdown
docker exec squid rm -rf /var/spool/squid/*
docker exec squid squid -z
docker compose restart squid
```

## HTTPS Interception (SSL Bump)

For development and testing, Squid can intercept HTTPS traffic. This requires generating a CA certificate:

```bash
# Generate a CA certificate for SSL interception
mkdir -p certs
openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
  -keyout certs/squid-ca-key.pem \
  -out certs/squid-ca-cert.pem \
  -subj "/CN=Squid Proxy CA"

# Combine key and cert
cat certs/squid-ca-cert.pem certs/squid-ca-key.pem > certs/squid-ca-cert-key.pem
```

```
# squid.conf - With SSL bump for HTTPS interception (development only)
http_port 3128 ssl-bump \
  cert=/etc/squid/certs/squid-ca-cert-key.pem \
  generate-host-certificates=on \
  dynamic_cert_mem_cache_size=4MB

acl step1 at_step SslBump1
ssl_bump peek step1
ssl_bump bump all

sslcrtd_program /usr/lib/squid/security_file_certgen -s /var/lib/squid/ssl_db -M 4MB

acl localnet src 172.16.0.0/12
http_access allow localnet
http_access deny all
```

Note: SSL bumping should only be used in development and testing environments. It breaks end-to-end encryption and requires installing the CA certificate on client machines.

## Summary

Squid is a mature, battle-tested proxy that handles caching, access control, and traffic filtering. In Docker environments, it is particularly useful for caching package downloads during builds, enforcing network policies for containers, and inspecting HTTP traffic during development. The configuration file gives you precise control over what gets cached, who can access what, and how traffic flows through your network. Start with a basic caching configuration and add access controls and authentication as your needs evolve.
