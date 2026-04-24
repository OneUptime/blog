# How to Configure Traefik TCP Routing for Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, TCP, Routing, Database

Description: Learn how to configure Traefik TCP routing for non-HTTP services like databases and message queues deployed through Portainer, using SNI-based routing or dedicated ports.

## Introduction

Traefik can route TCP traffic in addition to HTTP, making it useful for exposing databases, Redis, MQTT brokers, and other non-HTTP services managed through Portainer. TCP routing uses TLS SNI (Server Name Indication) for multiplexing multiple services on port 443, or dedicated ports for non-TLS services. This guide covers both approaches.

## Prerequisites

- Traefik deployed with ports 80/443 and any custom TCP ports published
- Portainer managing services on the proxy network
- Understanding of TLS passthrough vs termination

## Step 1: Define TCP Entrypoints

Add TCP-specific entrypoints in `traefik.yml`:

```yaml
# traefik.yml

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

  # Database-specific entrypoints
  postgres:
    address: ":5432"    # PostgreSQL
  mysql:
    address: ":3306"    # MySQL
  redis:
    address: ":6379"    # Redis
  mqtt:
    address: ":1883"    # MQTT broker

api:
  dashboard: true

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /data/acme.json
      httpChallenge:
        entryPoint: web
```

## Step 2: Expose TCP Ports in Docker Compose

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    ports:
      - "80:80"
      - "443:443"
      - "5432:5432"    # PostgreSQL
      - "3306:3306"    # MySQL
      - "6379:6379"    # Redis
      - "1883:1883"    # MQTT
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/traefik.yml:/traefik.yml:ro
      - /opt/traefik/data:/data
    networks:
      - proxy
```

## Step 3: TCP Routing for PostgreSQL

```yaml
# Portainer stack - PostgreSQL with TCP routing
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: dbuser
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    networks:
      - proxy
    labels:
      # TCP routing labels (different from HTTP labels)
      - "traefik.enable=true"

      # TCP router - special catch-all rule for non-TLS TCP on this entrypoint
      - "traefik.tcp.routers.postgres.rule=HostSNI(`*`)"
      - "traefik.tcp.routers.postgres.entrypoints=postgres"
      - "traefik.tcp.routers.postgres.service=postgres"

      # TCP service - target port inside container
      - "traefik.tcp.services.postgres.loadbalancer.server.port=5432"

secrets:
  db_password:
    external: true

networks:
  proxy:
    external: true
```

## Step 4: SNI-Based TCP Routing on Port 443

Route multiple TLS-capable TCP services on port 443 using TLS SNI (requires TLS passthrough or termination). For PostgreSQL, Traefik handles the Postgres STARTTLS negotiation, so clients should connect with `sslmode=require` or stricter:

```yaml
# TLS Passthrough - backend handles TLS itself
services:
  postgres-tls:
    image: postgres:15-alpine
    command:
      - "postgres"
      - "-c"
      - "ssl=on"
      - "-c"
      - "ssl_cert_file=/certs/server.crt"
      - "-c"
      - "ssl_key_file=/certs/server.key"
    volumes:
      - /opt/postgres/certs:/certs:ro
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      # Match on specific SNI hostname
      - "traefik.tcp.routers.pg-tls.rule=HostSNI(`db.example.com`)"
      - "traefik.tcp.routers.pg-tls.entrypoints=websecure"
      - "traefik.tcp.routers.pg-tls.tls=true"
      - "traefik.tcp.routers.pg-tls.tls.passthrough=true"    # Forward TLS as-is
      - "traefik.tcp.routers.pg-tls.service=pg-tls"
      - "traefik.tcp.services.pg-tls.loadbalancer.server.port=5432"
```

```yaml
# TLS Termination - Traefik terminates TLS, connects to backend in plaintext
services:
  redis:
    image: redis:7-alpine
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.tcp.routers.redis-secure.rule=HostSNI(`redis.example.com`)"
      - "traefik.tcp.routers.redis-secure.entrypoints=websecure"
      - "traefik.tcp.routers.redis-secure.tls=true"
      - "traefik.tcp.routers.redis-secure.tls.certresolver=letsencrypt"    # Traefik gets cert
      # No passthrough - Traefik terminates TLS
      - "traefik.tcp.routers.redis-secure.service=redis-secure"
      - "traefik.tcp.services.redis-secure.loadbalancer.server.port=6379"    # Plain Redis port
```

## Step 5: Connect to TCP Services

```bash
# Connect to PostgreSQL via Traefik
psql -h your-server-ip -p 5432 -U dbuser -d mydb

# With TLS via SNI routing (PostgreSQL STARTTLS)
psql "host=db.example.com port=443 sslmode=require user=dbuser dbname=mydb"

# Connect to Redis via Traefik
redis-cli -h your-server-ip -p 6379

# With TLS termination via SNI
redis-cli -h redis.example.com -p 443 --tls
```

## Step 6: MQTT Broker TCP Routing

```yaml
services:
  mosquitto:
    image: eclipse-mosquitto:latest
    networks:
      - proxy
    labels:
      - "traefik.enable=true"

      # Non-TLS MQTT on dedicated port
      - "traefik.tcp.routers.mqtt.rule=HostSNI(`*`)"
      - "traefik.tcp.routers.mqtt.entrypoints=mqtt"
      - "traefik.tcp.routers.mqtt.service=mqtt"
      - "traefik.tcp.services.mqtt.loadbalancer.server.port=1883"

      # TLS MQTT on websecure via SNI
      - "traefik.tcp.routers.mqtt-tls.rule=HostSNI(`mqtt.example.com`)"
      - "traefik.tcp.routers.mqtt-tls.entrypoints=websecure"
      - "traefik.tcp.routers.mqtt-tls.tls=true"
      - "traefik.tcp.routers.mqtt-tls.tls.certresolver=letsencrypt"
      - "traefik.tcp.routers.mqtt-tls.service=mqtt-tls"
      - "traefik.tcp.services.mqtt-tls.loadbalancer.server.port=1883"
```

## Conclusion

Traefik TCP routing extends Portainer's infrastructure management to non-HTTP services like databases, caches, and message brokers. Use dedicated entrypoints with ``HostSNI(`*`)`` for simple port-based routing, or SNI-based routing on port 443 for TLS-capable services. TLS termination at Traefik lets backend services stay in plaintext while external clients connect securely, eliminating the need for TLS configuration in each database service.
