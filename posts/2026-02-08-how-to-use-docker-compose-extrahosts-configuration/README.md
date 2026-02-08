# How to Use Docker Compose extra_hosts Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Networking, DNS, Host Resolution, DevOps

Description: Use Docker Compose extra_hosts to add custom hostname-to-IP mappings inside your containers for flexible networking.

---

Sometimes you need a container to resolve a hostname to a specific IP address without involving DNS at all. Maybe you are testing against a local service that does not have a DNS entry. Maybe you need to override where a hostname points during development. Docker Compose's `extra_hosts` configuration writes entries directly into a container's `/etc/hosts` file, giving you complete control over name resolution for specific hostnames.

## What extra_hosts Does

The `extra_hosts` directive adds entries to a container's `/etc/hosts` file. This file takes priority over DNS resolution, so any hostname listed there will always resolve to the specified IP, regardless of what DNS says.

This is the Docker Compose equivalent of the `--add-host` flag in `docker run`.

```yaml
# Basic extra_hosts usage
version: "3.8"

services:
  app:
    image: my-app:latest
    extra_hosts:
      - "myhost:192.168.1.100"
```

When the `app` container starts, its `/etc/hosts` file will contain an entry mapping `myhost` to `192.168.1.100`.

## Syntax Options

Docker Compose accepts extra_hosts in two formats. The list format uses the `hostname:ip` pattern.

```yaml
# List format with colon separator
services:
  app:
    image: my-app:latest
    extra_hosts:
      - "api.local:192.168.1.10"
      - "db.local:192.168.1.20"
      - "cache.local:192.168.1.30"
```

The mapping format uses key-value pairs.

```yaml
# Mapping format
services:
  app:
    image: my-app:latest
    extra_hosts:
      api.local: "192.168.1.10"
      db.local: "192.168.1.20"
      cache.local: "192.168.1.30"
```

Both produce the same result. I prefer the list format because it is clearer and matches the `docker run --add-host` syntax.

## Using host-gateway

Docker provides a special value called `host-gateway` that resolves to the host machine's IP address. This is incredibly useful when a container needs to connect to a service running on the host.

```yaml
# Map a hostname to the Docker host's IP address
services:
  app:
    image: my-app:latest
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      API_URL: http://host.docker.internal:3000
```

The `host-gateway` value gets replaced with the actual IP of the host machine (typically `172.17.0.1` on Linux or the VM's gateway on Docker Desktop). This approach is more reliable than hardcoding the host IP, which can change between environments.

On Docker Desktop for Mac and Windows, `host.docker.internal` is available by default. On Linux, you need to add it explicitly using `extra_hosts` as shown above.

## Common Use Cases

### Development: Connecting to Host Services

During development, you often run some services in containers and others directly on your machine. Use `extra_hosts` to let containers reach host services.

```yaml
# Development setup where the database runs on the host
version: "3.8"

services:
  app:
    build: ./app
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      # The app connects to PostgreSQL running on the host machine
      DATABASE_URL: postgres://dev:devpass@host.docker.internal:5432/myapp
      # Redis also running on the host
      REDIS_URL: redis://host.docker.internal:6379
    ports:
      - "8080:8080"
```

### Testing: Overriding External Services

When running integration tests, you might want to redirect external service calls to local mock servers.

```yaml
# Test environment with mocked external services
services:
  test-runner:
    build: ./tests
    extra_hosts:
      # Redirect external API calls to the mock server
      - "api.stripe.com:172.20.0.10"
      - "api.sendgrid.com:172.20.0.10"
      - "oauth.google.com:172.20.0.10"
    depends_on:
      - mock-server

  mock-server:
    build: ./mock-server
    networks:
      test-net:
        ipv4_address: 172.20.0.10

networks:
  test-net:
    ipam:
      config:
        - subnet: 172.20.0.0/24
```

This setup intercepts calls to external services and routes them to your mock server instead. Your application code does not need any changes.

### Multi-Environment Configuration

Use extra_hosts to point services at different backends depending on the environment.

```yaml
# Compose file that adapts to different environments via .env
services:
  app:
    image: my-app:latest
    extra_hosts:
      - "database:${DB_HOST_IP}"
      - "cache:${CACHE_HOST_IP}"
      - "search:${SEARCH_HOST_IP}"
    environment:
      DATABASE_HOST: database
      CACHE_HOST: cache
      SEARCH_HOST: search
```

Then define different `.env` files for each environment.

```bash
# .env.development
DB_HOST_IP=192.168.1.10
CACHE_HOST_IP=192.168.1.11
SEARCH_HOST_IP=192.168.1.12

# .env.staging
DB_HOST_IP=10.0.1.50
CACHE_HOST_IP=10.0.1.51
SEARCH_HOST_IP=10.0.1.52
```

Run the appropriate configuration with the `--env-file` flag.

```bash
# Start with development settings
docker compose --env-file .env.development up -d

# Start with staging settings
docker compose --env-file .env.staging up -d
```

### Accessing Services on Other Docker Networks

When services run on separate Docker networks and you cannot merge them, `extra_hosts` provides a workaround.

```yaml
# Connect to a container on another network by its host-mapped IP
services:
  app:
    image: my-app:latest
    extra_hosts:
      - "legacy-api:172.18.0.5"
```

To find the IP of the target container:

```bash
# Get the IP address of a container on another network
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' legacy-api-container
```

## Verifying the Configuration

After starting your services, confirm that the `/etc/hosts` entries are correct.

```bash
# Check the hosts file inside the container
docker exec my-container cat /etc/hosts

# Test resolution
docker exec my-container ping -c 1 myhost

# Verify with getent
docker exec my-container getent hosts api.local
```

Example output from `cat /etc/hosts`:

```
127.0.0.1       localhost
::1             localhost ip6-localhost ip6-loopback
192.168.1.100   myhost
192.168.1.10    api.local
192.168.1.20    db.local
172.20.0.2      abc123def456    my-container
```

## Full Stack Example

Here is a production-like setup that demonstrates several `extra_hosts` patterns together.

```yaml
# Full stack with extra_hosts for external service connectivity
version: "3.8"

services:
  # Web application
  web:
    build: ./web
    ports:
      - "80:80"
    extra_hosts:
      - "host.docker.internal:host-gateway"
      - "metrics.internal:${METRICS_SERVER_IP:-10.0.0.50}"
    environment:
      API_URL: http://api:3000
      METRICS_URL: http://metrics.internal:9090

  # API server
  api:
    build: ./api
    extra_hosts:
      - "host.docker.internal:host-gateway"
      - "ldap.corp:10.10.1.5"
      - "smtp.corp:10.10.1.6"
    environment:
      DB_HOST: postgres
      LDAP_HOST: ldap.corp
      SMTP_HOST: smtp.corp
    depends_on:
      - postgres

  # Database
  postgres:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  # Worker that connects to external queue on the host
  worker:
    build: ./worker
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      QUEUE_URL: amqp://guest:guest@host.docker.internal:5672

volumes:
  pgdata:
```

## extra_hosts vs DNS vs Docker Networking

Each approach has its place. Here is when to use which.

**Use extra_hosts when:**
- You need to map specific hostnames to specific IPs
- You want to override DNS for testing
- You need to reach the Docker host from a container
- The target service has no DNS entry

**Use Docker networking when:**
- Services are all in the same Compose project
- You want automatic service discovery by container name
- You need dynamic scaling

**Use custom DNS (dns option) when:**
- You need to resolve many names from an internal DNS server
- Hostnames change frequently
- You are in a corporate environment with existing DNS infrastructure

## Things to Keep in Mind

**Hosts file entries are static.** They are written when the container starts and do not update if the target IP changes. If you need dynamic resolution, DNS is a better choice.

**IPv6 is supported.** You can map hostnames to IPv6 addresses.

```yaml
services:
  app:
    image: my-app:latest
    extra_hosts:
      - "myhost-v6:::1"
      - "myhost-v4:192.168.1.100"
```

**Hosts entries override DNS.** An entry in `/etc/hosts` always wins over a DNS lookup for that hostname. This is powerful but can cause confusion if you forget an override is in place.

**Multiple entries for the same hostname.** You can add multiple IPs for one hostname, but most applications will only use the first one.

The `extra_hosts` configuration is a straightforward tool that solves a surprising number of networking challenges. Whether you are bridging the gap between containers and host services, mocking external APIs in tests, or connecting to corporate infrastructure, adding a few lines to your Compose file can save hours of networking gymnastics.
