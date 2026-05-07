# How to Fix Podman Compose Compatibility Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Docker Compose, Podman Compose, Container, DevOps

Description: Fix compatibility issues when using Docker Compose files with Podman, including networking, volume handling, and common migration pitfalls.

---

> Migrating from Docker Compose to Podman Compose introduces subtle compatibility issues. This guide covers how to fix networking, volume, and configuration problems to get your compose files working with Podman.

Docker Compose has become the standard for defining multi-container applications. When moving to Podman, you expect your existing `docker-compose.yml` files to work without changes. In practice, there are several compatibility gaps that can break your setup. This guide covers the most common issues and how to fix them.

---

## Understanding Podman Compose Options

There are two main ways to run Compose files with Podman:

1. **podman-compose**: A Python-based reimplementation designed specifically for Podman
2. **docker-compose with Podman socket**: Using the original Docker Compose tool with Podman's Docker-compatible API

Each approach has its own set of compatibility considerations.

### Installing podman-compose

```bash
# Using pip

pip3 install podman-compose

# Fedora / RHEL
sudo dnf install podman-compose

# Ubuntu / Debian
sudo apt install podman-compose
```

### Using docker-compose with Podman

```bash
# Enable the Podman socket
systemctl --user enable --now podman.socket

# Set DOCKER_HOST
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock

# Install docker-compose v2
# It should now use Podman's socket
docker compose version
```

## Common Issues and Fixes

### 1. Networking Differences

Docker Compose creates a custom bridge network for each project by default. Podman Compose handles networking differently depending on the tool you use.

With `podman-compose`, containers are typically placed in a pod rather than a custom network. This can cause DNS resolution issues between services:

```yaml
# docker-compose.yml
services:
  web:
    image: nginx
    depends_on:
      - api
  api:
    image: myapi:latest
    depends_on:
      - db
  db:
    image: postgres:15
```

If `web` cannot resolve `api` by hostname, create an explicit network:

```yaml
services:
  web:
    image: nginx
    networks:
      - mynet
    depends_on:
      - api
  api:
    image: myapi:latest
    networks:
      - mynet
    depends_on:
      - db
  db:
    image: postgres:15
    networks:
      - mynet

networks:
  mynet:
    driver: bridge
```

Then verify DNS resolution:

```bash
podman-compose up -d
podman-compose exec web ping api
```

### 2. Volume Mount Permission Issues

Podman's rootless mode maps user IDs differently than Docker. This causes permission denied errors with volume mounts:

```yaml
services:
  db:
    image: postgres:15
    volumes:
      - ./data:/var/lib/postgresql/data
```

This may fail with permission errors because the container process runs as a different UID than the host user. Fixes:

Option A: Use the `:Z` or `:z` SELinux label (on SELinux-enabled systems):

```yaml
services:
  db:
    image: postgres:15
    volumes:
      - ./data:/var/lib/postgresql/data:Z
```

Option B: Set the `userns_mode` to keep the same UID mapping:

```yaml
services:
  db:
    image: postgres:15
    userns_mode: "keep-id"
    volumes:
      - ./data:/var/lib/postgresql/data
```

Option C: Use named volumes instead of bind mounts:

```yaml
services:
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 3. depends_on with Health Checks

Docker Compose v2 supports `depends_on` with health check conditions. Recent `podman-compose` versions can enforce these with `podman wait`, but older Podman or `podman-compose` versions may not fully support health-based conditions:

```yaml
# This might not work with older podman-compose versions
services:
  web:
    image: nginx
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

If `depends_on` conditions are not respected, use an entrypoint script that waits for dependencies. Make sure the image running the script includes `nc`:

```yaml
services:
  web:
    image: nginx
    entrypoint: ["/bin/sh", "-c", "while ! nc -z db 5432; do sleep 1; done; nginx -g 'daemon off;'"]
    depends_on:
      - db
  db:
    image: postgres:15
```

Or use a wait script:

```dockerfile
# In your Dockerfile
RUN apt-get update && apt-get install -y netcat-openbsd
COPY wait-for.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/wait-for.sh
```

```bash
#!/bin/sh
# wait-for.sh
host="$1"
port="$2"
shift 2
cmd="$@"

until nc -z "$host" "$port"; do
  echo "Waiting for $host:$port..."
  sleep 1
done

exec $cmd
```

### 4. Build Context and Dockerfile Options

Some build options in Compose files behave differently with Podman:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
      args:
        NODE_ENV: development
      target: development
```

If `target` is not working, make sure you are using a recent version of `podman-compose`:

```bash
pip3 install --upgrade podman-compose
```

For build arguments that are not being passed through:

```bash
# Pass build arguments explicitly
podman-compose build --build-arg NODE_ENV=development
```

### 5. Environment File Handling

Podman Compose handles `.env` files slightly differently:

```yaml
services:
  app:
    image: myapp
    env_file:
      - .env
      - .env.local
```

If environment variables are not being loaded, check the file format. Use standard Compose env file syntax, where each line is `KEY=VALUE`; quotes are valid, but remember that double-quoted values are parsed and interpolated:

```bash
# .env - compatible format
DATABASE_URL=postgres://localhost/mydb
API_KEY=abc123
DEBUG=true

# Quoted values are also valid
DATABASE_URL="postgres://localhost/mydb"
```

Also distinguish service-level `env_file` from the CLI `--env-file` option. `env_file` entries are service environment files resolved from the Compose file, while `--env-file` supplies variables for Compose interpolation and is resolved from the current working directory:

```bash
podman-compose --env-file .env up
```

### 6. Restart Policy Differences

Docker Compose supports `restart: always`, and `podman-compose` passes restart policies through to Podman. For reboot-time startup and production supervision, manage the containers with systemd because Podman is daemonless:

```yaml
services:
  web:
    image: nginx
    restart: always
```

Generate a systemd unit file:

```bash
# Start the container
podman-compose up -d

# Generate systemd service for a specific container
# Note: podman generate systemd is deprecated. Use Quadlet files for new deployments.
podman generate systemd --name myproject_web_1 --files --new

# Install and enable the service
mkdir -p ~/.config/systemd/user/
cp container-myproject_web_1.service ~/.config/systemd/user/
systemctl --user enable --now container-myproject_web_1.service
```

Alternatively, use `podman-compose` with the `--in-pod` flag to create a pod that can be managed as a unit:

```bash
podman-compose --in-pod true up -d
```

### 7. Docker Compose v2 Syntax Compatibility

Some Docker Compose v2 features have historically had uneven support in `podman-compose`. Recent versions support `profiles`, pass `deploy.resources` CPU and memory limits to Podman, and pass `platform` to Podman, so upgrade if these options are being ignored:

```yaml
services:
  app:
    profiles: ["dev"]
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: "512M"
    platform: linux/amd64
```

On older versions where Compose resource limits are ignored, use Podman's native flags by running containers directly:

```bash
podman run --cpus 0.5 --memory 512m myapp:latest
```

Or switch to using `docker compose` (v2) with the Podman socket, which has better compatibility with the full compose specification:

```bash
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
docker compose up -d
```

### 8. Container Name Conflicts

Podman Compose uses a different naming convention than Docker Compose. Docker Compose v2 uses `project-service-1` while `podman-compose` uses `project_service_1`:

```bash
# Docker Compose naming
myproject-web-1

# podman-compose naming
myproject_web_1
```

This can break scripts that reference containers by name. Prefer service names on the Compose network. If external scripts require a fixed container name, set one explicitly:

```yaml
services:
  web:
    container_name: web  # Explicit name for consistency
    image: nginx
```

Or use `podman-compose` commands to reference services:

```bash
podman-compose exec web nginx -s reload
```

### 9. Secrets and Configs

Recent `podman-compose` versions support file-backed runtime secrets, but external secrets, environment-sourced secrets, and configs have more limited compatibility than Docker Compose:

```yaml
services:
  app:
    secrets:
      - db_password
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

Use environment variables or bind mounts as alternatives:

```yaml
services:
  app:
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - ./secrets/db_password.txt:/run/secrets/db_password:ro
```

### 10. Migration Checklist

When migrating a `docker-compose.yml` to Podman, work through this checklist:

```bash
# 1. Install podman-compose or configure docker compose with Podman socket
pip3 install podman-compose

# 2. Validate the compose file
podman-compose config

# 3. Try a dry run
podman-compose up --no-start

# 4. Start services and check logs
podman-compose up -d
podman-compose logs

# 5. Verify networking between services
podman-compose exec web ping api

# 6. Check volume mounts
podman-compose exec db ls -la /var/lib/postgresql/data

# 7. Verify environment variables
podman-compose exec app env | sort
```

## Conclusion

Most Docker Compose files work with Podman with minor adjustments. The most common issues are networking (use explicit networks), volume permissions (use `:Z` labels or `userns_mode: keep-id`), and feature gaps in `podman-compose` (consider using `docker compose` with the Podman socket for better compatibility). Start by validating your compose file, test each service individually, and address networking and permission issues as they arise. For production deployments, consider generating systemd unit files from your containers to get proper restart behavior without a daemon.
