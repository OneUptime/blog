# How to Configure Traefik TCP Routing for Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, TCP, Database, Port Routing

Description: Learn how to configure Traefik TCP routing to expose non-HTTP services like databases and message brokers deployed via Portainer, without exposing ports directly on the host.

## When to Use TCP Routing

HTTP routing works for web applications, but some services speak raw TCP:

- MySQL / PostgreSQL (databases)
- Redis
- MQTT brokers
- Custom TCP applications

Traefik TCP routing proxies these services on dedicated ports.

## Traefik TCP vs HTTP Routing

| Feature | HTTP Routing | TCP Routing |
|---------|-------------|-------------|
| Protocol | HTTP/HTTPS | Any TCP |
| TLS termination | Yes | Optional (passthrough) |
| Path/host routing | Path and Host header | SNI only (no paths) |
| Middleware support | Full | Limited |

## Step 1: Define TCP EntryPoints in Traefik

```yaml
# traefik.yml

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"
  # Add dedicated TCP ports for your services
  mysql:
    address: ":3306"
  postgres:
    address: ":5432"
  redis:
    address: ":6379"
```

Or via Docker Compose CLI flags:

```yaml
services:
  traefik:
    command:
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.mysql.address=:3306"
      - "--entrypoints.postgres.address=:5432"
    ports:
      - "80:80"
      - "443:443"
      - "3306:3306"
      - "5432:5432"
```

## Step 2: TCP Labels for a MySQL Container

```yaml
# In Portainer: Add Stack
services:
  mysql:
    image: mysql:8.0
    networks:
      - proxy
    environment:
      - MYSQL_ROOT_PASSWORD_FILE=/run/secrets/db_root_pw
      - MYSQL_DATABASE=appdb
    labels:
      - "traefik.enable=true"
      # TCP router for MySQL
      - "traefik.tcp.routers.mysql.rule=HostSNI(`*`)"
      - "traefik.tcp.routers.mysql.entrypoints=mysql"
      - "traefik.tcp.services.mysql.loadbalancer.server.port=3306"
    volumes:
      - mysql_data:/var/lib/mysql
```

## Step 3: TCP with TLS Passthrough

For encrypted PostgreSQL connections (Traefik supports PostgreSQL STARTTLS, so it can inspect SNI before passing the TLS stream through):

```yaml
labels:
  - "traefik.tcp.routers.postgres.rule=HostSNI(`db.example.com`)"
  - "traefik.tcp.routers.postgres.entrypoints=postgres"
  - "traefik.tcp.routers.postgres.tls=true"
  - "traefik.tcp.routers.postgres.tls.passthrough=true"
  - "traefik.tcp.services.postgres.loadbalancer.server.port=5432"
```

With TLS passthrough, Traefik doesn't terminate TLS - the backend handles it. SNI-based routing allows multiplexing multiple backends on port 443 when the client sends TLS SNI. MySQL's protocol starts with a server handshake, so route MySQL on a dedicated entrypoint with ``HostSNI(`*`)`` and let Traefik pass the connection through as opaque TCP.

## TCP Routing on Port 443 with SNI

You can route multiple TCP services on a single port (443) using SNI:

```yaml
services:
  traefik:
    command:
      - "--entrypoints.websecure.address=:443"

  postgresql:
    image: postgres:16
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.tcp.routers.postgres.rule=HostSNI(`db.example.com`)"
      - "traefik.tcp.routers.postgres.entrypoints=websecure"
      - "traefik.tcp.routers.postgres.tls=true"
      - "traefik.tcp.routers.postgres.tls.passthrough=true"
      - "traefik.tcp.services.postgres.loadbalancer.server.port=5432"
```

Connect with: `psql "sslmode=require host=db.example.com port=443 dbname=mydb"`

## Combining TCP and HTTP on the Same Entrypoint

Port 443 can serve both HTTPS and TCP with SNI:

```yaml
labels:
  # HTTP service - routes by Host header
  - "traefik.http.routers.web.rule=Host(`app.example.com`)"
  - "traefik.http.routers.web.entrypoints=websecure"
  - "traefik.http.routers.web.tls.certresolver=letsencrypt"

  # TCP service - routes by SNI (different subdomain)
  - "traefik.tcp.routers.db.rule=HostSNI(`db.example.com`)"
  - "traefik.tcp.routers.db.entrypoints=websecure"
  - "traefik.tcp.routers.db.tls=true"
  - "traefik.tcp.routers.db.tls.passthrough=true"
  - "traefik.tcp.services.db.loadbalancer.server.port=5432"
```

## Verifying TCP Routing

```bash
# Test MySQL TCP routing
mysql -h traefik.example.com -P 3306 -u root -p

# Test PostgreSQL
psql -h traefik.example.com -p 5432 -U postgres

# Check TCP routers in Traefik API, if the API is enabled
curl http://localhost:8080/api/tcp/routers | jq '.[] | {name, rule, entrypoints}'
```

## Conclusion

Traefik TCP routing allows Portainer-managed non-HTTP services like databases to be accessed through Traefik without publishing each backend container's port directly on every host. SNI-based routing even allows multiplexing multiple TLS-capable TCP services on a single port, keeping your firewall rules minimal while maintaining access control.
