# How to Set Up Docker Containers with Host Aliases

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, DNS, Containers, DevOps, Configuration

Description: Learn how to add custom host aliases to Docker containers using --add-host, extra_hosts, and other methods for name resolution control.

---

Sometimes you need a Docker container to resolve a hostname to a specific IP address. Maybe you are redirecting API calls to a mock server during testing. Maybe you need to point a service at a different backend without changing application configuration. Or maybe you need to add entries that your internal DNS does not have. Docker provides several ways to add custom host-to-IP mappings inside containers.

## The --add-host Flag

The most direct way to add a host alias is the `--add-host` flag on `docker run`. This adds an entry to the container's `/etc/hosts` file.

```bash
# Add a custom host mapping: api.example.com resolves to 192.168.1.50
docker run --rm --add-host api.example.com:192.168.1.50 alpine \
  cat /etc/hosts
```

The output shows the custom entry added to `/etc/hosts`:

```
127.0.0.1       localhost
::1             localhost ip6-localhost ip6-loopback
192.168.1.50    api.example.com
172.17.0.2      a1b2c3d4e5f6
```

Now any process inside this container that resolves `api.example.com` gets the IP address 192.168.1.50, regardless of what public DNS says.

## Adding Multiple Host Aliases

Pass `--add-host` multiple times for multiple entries:

```bash
# Add several custom host mappings
docker run --rm \
  --add-host api.example.com:192.168.1.50 \
  --add-host database.internal:10.0.0.5 \
  --add-host cache.internal:10.0.0.6 \
  --add-host queue.internal:10.0.0.7 \
  alpine cat /etc/hosts
```

Each `--add-host` flag creates one line in `/etc/hosts`.

## Pointing to the Host Machine

A very common use case is pointing a container at a service running on the Docker host. Docker provides a special hostname `host-gateway` that resolves to the host's IP address:

```bash
# Map "docker-host" to the Docker host's IP address
docker run --rm \
  --add-host docker-host:host-gateway \
  alpine ping -c 1 docker-host
```

This is particularly useful when a containerized application needs to reach a service (like a database or API) running directly on the host machine:

```bash
# Point the container at a PostgreSQL server running on the host
docker run --rm \
  --add-host database:host-gateway \
  -e DATABASE_URL="postgresql://user:pass@database:5432/mydb" \
  my-app
```

On Docker Desktop (macOS and Windows), the hostname `host.docker.internal` is automatically available. On Linux, `host-gateway` achieves the same result.

## Host Aliases in Docker Compose

In Docker Compose, use the `extra_hosts` directive:

```yaml
# docker-compose.yml with custom host aliases
services:
  web:
    image: my-web-app
    extra_hosts:
      - "api.external.com:192.168.1.100"
      - "auth.external.com:192.168.1.101"
      - "docker-host:host-gateway"
    environment:
      API_URL: http://api.external.com:8080
      AUTH_URL: http://auth.external.com:9090
```

The `extra_hosts` list follows the format `"hostname:ip"`, just like `--add-host`.

## Use Cases and Practical Examples

### Testing Against a Mock Server

When testing, you might want to redirect API calls from a real external service to a local mock:

```bash
# Run a mock API server
docker run -d --name mock-api -p 3000:3000 mock-server:latest

# Get the mock server's IP
MOCK_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mock-api)

# Run the application with the API hostname pointing to the mock
docker run --rm \
  --add-host api.production.com:$MOCK_IP \
  my-app
```

The application thinks it is talking to `api.production.com`, but the traffic goes to your mock server.

### Overriding DNS for Specific Domains

If an external domain is down or returning wrong results, override it:

```bash
# Override DNS for a specific domain
docker run --rm \
  --add-host broken-cdn.example.com:203.0.113.50 \
  my-app
```

### Local Development Matching Production Hostnames

In local development, you often want to use the same hostnames as production:

```yaml
# docker-compose.yml for local development
services:
  app:
    image: my-app:dev
    extra_hosts:
      - "api.mycompany.com:host-gateway"
      - "auth.mycompany.com:host-gateway"
      - "cdn.mycompany.com:host-gateway"
    environment:
      API_URL: https://api.mycompany.com
      AUTH_URL: https://auth.mycompany.com

  api:
    image: my-api:dev
    ports:
      - "443:443"
```

The app container resolves production hostnames to the Docker host, where the local API service is running.

### Service Migration

During a migration from one infrastructure to another, you can gradually redirect containers:

```bash
# Old infrastructure
docker run -d --name app-v1 \
  --add-host database:10.0.1.5 \
  my-app

# New infrastructure (pointing to the new database server)
docker run -d --name app-v2 \
  --add-host database:10.0.2.5 \
  my-app
```

## How /etc/hosts Resolution Works

When a process inside a container resolves a hostname, the order of resolution depends on the configuration in `/etc/nsswitch.conf`. By default on most Linux distributions, it checks `/etc/hosts` first, then DNS. This means `--add-host` entries take priority over Docker's embedded DNS and any external DNS.

Verify the resolution order:

```bash
# Check nsswitch.conf to see name resolution order
docker run --rm ubuntu cat /etc/nsswitch.conf | grep hosts
```

Typical output: `hosts: files dns`

This means `/etc/hosts` (files) is checked before DNS.

## Combining with Docker DNS

Host aliases from `--add-host` work alongside Docker's embedded DNS. Container names still resolve through Docker DNS, and custom entries from `--add-host` resolve through `/etc/hosts`. Both systems coexist.

```bash
# Create a network
docker network create test-net

# Start a database container
docker run -d --name postgres --network test-net postgres:16

# Start an app container with both Docker DNS and custom host entries
docker run --rm --network test-net \
  --add-host api.external.com:203.0.113.50 \
  alpine sh -c "
    echo '--- Docker DNS resolution ---'
    nslookup postgres
    echo '--- /etc/hosts resolution ---'
    getent hosts api.external.com
  "
```

## IPv6 Host Aliases

You can add IPv6 addresses as host aliases:

```bash
# Add an IPv6 host alias
docker run --rm \
  --add-host ipv6-service:[2001:db8::1] \
  alpine ping6 -c 1 ipv6-service
```

Or mix IPv4 and IPv6 for the same hostname:

```bash
# Both IPv4 and IPv6 for the same host
docker run --rm \
  --add-host dual-stack:192.168.1.100 \
  --add-host dual-stack:[2001:db8::100] \
  alpine cat /etc/hosts
```

## Dynamic Host Aliases with Scripts

For more dynamic setups, generate `--add-host` flags from a configuration file:

```bash
#!/bin/bash
# run-with-hosts.sh - Start a container with host aliases from a file

# hosts.txt format: hostname:ip (one per line)
HOSTS_FILE="hosts.txt"
EXTRA_HOSTS=""

while IFS= read -r line; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" == \#* ]] && continue
    EXTRA_HOSTS="$EXTRA_HOSTS --add-host $line"
done < "$HOSTS_FILE"

# Run the container with all host aliases
docker run --rm $EXTRA_HOSTS my-app
```

With a hosts.txt file:

```text
# Custom host mappings
api.example.com:192.168.1.50
database.internal:10.0.0.5
cache.internal:10.0.0.6
```

## Modifying /etc/hosts After Container Start

The `--add-host` flag only works at container creation time. If you need to modify `/etc/hosts` in a running container, you can write to it directly:

```bash
# Add a host entry to a running container
docker exec my-container sh -c 'echo "192.168.1.200 new-service.internal" >> /etc/hosts'

# Verify the entry was added
docker exec my-container cat /etc/hosts
```

Note that Docker manages `/etc/hosts` and may overwrite manual changes in certain situations (like container restart). For persistent entries, always prefer `--add-host` or `extra_hosts`.

## Limitations

There are some things to keep in mind:

1. `/etc/hosts` entries are static. If the target IP changes, you need to recreate the container.
2. `/etc/hosts` does not support wildcards. You cannot add `*.example.com` as a host alias.
3. Some applications bypass `/etc/hosts` by using their own DNS resolver. Most standard Linux applications respect it, but verify for your specific application.
4. Host aliases are per-container. They are not shared across containers on a network.

## Summary

Docker's `--add-host` flag and the `extra_hosts` Compose directive let you inject custom hostname-to-IP mappings into containers. This is invaluable for testing with mock servers, local development with production-like hostnames, and routing traffic without changing application configuration. Combine host aliases with Docker's embedded DNS for flexible name resolution that covers both internal container names and custom external mappings.
