# How to Use Compose Configs with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, CONFIG, Configuration

Description: Learn how to use the Compose configs directive with Podman to mount configuration files into containers.

---

> Compose configs inject non-sensitive configuration files into containers, keeping your images generic and your settings external.

The `configs` directive in Compose files provides a way to mount configuration files into containers without baking them into the image. This is ideal for application config files, nginx configurations, and other non-sensitive settings that vary between environments.

Podman runs Compose workloads through an external Compose provider. The examples below require a provider that implements Compose `configs`, such as Docker Compose connected to the Podman socket through `podman compose`. The standalone `podman-compose` Python project does not currently implement service `configs`; use bind mounts with `podman-compose` if you need the same result there.

---

## Basic Config Usage

```yaml
# docker-compose.yml

services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    configs:
      - source: nginx_config
        target: /etc/nginx/conf.d/default.conf

configs:
  nginx_config:
    file: ./nginx/default.conf
```

```bash
# Create the config file
mkdir -p nginx
cat > nginx/default.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    location / {
        root /usr/share/nginx/html;
        index index.html;
    }
    location /api {
        proxy_pass http://localhost:5000;
    }
}
EOF

# Deploy with a Compose provider that supports configs
podman compose up -d

# Verify the config is mounted
podman exec project_web_1 cat /etc/nginx/conf.d/default.conf
```

## Multiple Configs

```yaml
# docker-compose.yml
services:
  app:
    image: docker.io/library/python:3.12-slim
    command: python app.py
    configs:
      - source: app_config
        target: /app/config.yaml
      - source: logging_config
        target: /app/logging.conf

configs:
  app_config:
    file: ./config/app.yaml
  logging_config:
    file: ./config/logging.conf
```

## Short Syntax

```yaml
services:
  web:
    image: docker.io/library/nginx:alpine
    configs:
      # Short syntax - mounts to /<config_name> in the container
      - nginx_config

configs:
  nginx_config:
    file: ./nginx.conf
```

## Config with Custom Permissions

The Compose Specification defines `uid`, `gid`, and `mode` for configs. Docker Compose does not implement these attributes for configs sourced from local files because it uses a bind mount under the hood.

```yaml
services:
  web:
    image: docker.io/library/nginx:alpine
    configs:
      - source: nginx_config
        target: /etc/nginx/conf.d/default.conf
        uid: "0"
        gid: "0"
        mode: 0444

configs:
  nginx_config:
    file: ./nginx/default.conf
```

## Environment-Specific Configs

```bash
# config/dev.yaml
database:
  host: localhost
  port: 5432

# config/prod.yaml
database:
  host: db.production.internal
  port: 5432
```

```yaml
# docker-compose.yml
services:
  app:
    image: docker.io/library/python:3.12-slim
    configs:
      - source: app_config
        target: /app/config.yaml

configs:
  app_config:
    file: ./config/${ENV:-dev}.yaml
```

```bash
# Use dev config (default)
podman compose up -d

# Use production config
ENV=prod podman compose up -d
```

## Configs vs Bind Mounts

```yaml
# Bind mount - syncs changes in real time (good for development)
services:
  web:
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro

# Config - declared as application configuration (provider behavior varies)
services:
  web:
    configs:
      - source: nginx_config
        target: /etc/nginx/conf.d/default.conf
```

## Summary

Compose configs mount external configuration files into containers. Use them for nginx configs, application settings, and other non-sensitive files that should not be baked into images. Configs support custom mount paths, and the Compose Specification defines custom permissions where the provider supports them. Configs can be swapped per environment using variable substitution.
