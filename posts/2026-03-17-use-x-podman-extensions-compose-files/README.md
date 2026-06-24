# How to Use x-podman Extensions in Compose Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Extension, Configuration

Description: Learn how to use x-podman extension fields in Compose files to access Podman-specific features like pods and rootful mode.

---

> x-podman extensions let you use Podman-specific features in your compose files while keeping them compatible with Docker Compose.

The Compose specification allows custom extension fields prefixed with `x-`. podman-compose recognizes `x-podman` extensions to expose Podman-specific capabilities like pod settings, no-hosts mode, UID/GID mappings, and custom pod creation arguments that Docker Compose does not support natively.

---

## Grouping Services into a Pod

```yaml
# docker-compose.yml

version: "3.8"
x-podman:
  # Place services in the default project pod
  in_pod: true

services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
  api:
    image: docker.io/library/python:3.12-slim
    command: python -m http.server 5000
```

```bash
# Start services - web and api share a pod
podman-compose up -d

# Verify the pod was created
podman pod ls
```

## Running with UID and GID Mappings

```yaml
# docker-compose.yml
version: "3.8"
x-podman:
  # UID/GID maps are set on containers, so disable the shared pod
  in_pod: false

services:
  mapped-app:
    image: docker.io/library/alpine:latest
    command: sleep infinity
    # Pass UID and GID mappings to podman create
    x-podman.uidmaps:
      - "0:100000:65536"
    x-podman.gidmaps:
      - "0:100000:65536"
```

## Custom Pod Creation Arguments

```yaml
# docker-compose.yml
version: "3.8"
x-podman:
  # Pass additional arguments to podman pod create
  pod_args:
    - "--infra=false"
    - "--share="
    - "--cpus=1"

services:
  app:
    image: docker.io/library/nginx:alpine
```

## Specifying Container Names

```yaml
# docker-compose.yml
version: "3.8"
services:
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    # Override the auto-generated container name
    container_name: my-database
```

## Using No-Hosts Option

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    image: docker.io/library/alpine:latest
    command: sleep infinity
    # Do not add host entries to /etc/hosts
    x-podman.no_hosts: true
```

## Combining Multiple Extensions

```yaml
# docker-compose.yml
version: "3.8"
x-podman:
  # Global Podman settings
  in_pod: myproject-pod
  pod_args:
    - "--infra=false"
    - "--share="
    - "--cpus=1"

services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    x-podman.no_hosts: true
  worker:
    image: docker.io/library/python:3.12-slim
    command: python -c "import time; time.sleep(3600)"
    x-podman.no_hosts: true
```

```bash
# Deploy with all Podman-specific options
podman-compose up -d

# Verify the custom pod name
podman pod inspect myproject-pod
```

## Docker Compose Compatibility

```bash
# x-podman fields are ignored by Docker Compose
# so the same file works with both tools
docker compose up -d  # Ignores x-podman
podman-compose up -d  # Uses x-podman extensions
```

## Summary

Use `x-podman` extension fields in your compose files to access Podman-specific features like pod grouping, UID/GID mappings, no-hosts mode, and custom pod creation arguments. These extensions are ignored by Docker Compose, so your compose files remain compatible with both tools.
