# How to Use Init Containers in a Podman Pod

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Init Container, Startup

Description: Learn how to use init containers in Podman pods to run setup tasks before the main application starts.

---

> Init containers run to completion before the main containers start, handling setup tasks like database migrations and config generation.

Init containers are short-lived containers that perform initialization work before the main application containers begin. They run sequentially and must exit successfully before the next init container or the main containers start. This pattern is borrowed from Kubernetes and is available in Podman pods.

---

## Creating a Pod with an Init Container

```bash
# Create a pod

podman pod create --name app-pod -p 8080:80 -v app-config:/tmp/shared

# Create an init container that sets up configuration
podman create --pod app-pod --init-ctr always --name init-config \
  docker.io/library/alpine \
  sh -c "mkdir -p /tmp/shared && echo 'server_name=myapp' > /tmp/shared/config.ini"

# Create the main application container
podman create --pod app-pod --name app docker.io/library/alpine \
  sh -c "cat /tmp/shared/config.ini && sleep 3600"

# Start the pod
podman pod start app-pod
```

The `--init-ctr` flag marks the container as an init container. The value `always` means it runs every time the pod starts with `podman pod start`. Init containers must be created while the pod is stopped.

## Init Container Types

```bash
podman pod create --name init-types-pod

# 'always' - runs every time the pod starts
podman create --pod init-types-pod --init-ctr always --name setup \
  docker.io/library/alpine echo "Running setup"

# 'once' - runs only on the first pod start
podman create --pod init-types-pod --init-ctr once --name first-run \
  docker.io/library/alpine echo "First time initialization"
```

## Use Case: Database Migration

```bash
# Create a pod for a web application
podman pod create --name web-pod -p 5000:5000

# Create an init container that waits for an external database and runs migrations
podman create --pod web-pod --init-ctr always --name migrate \
  docker.io/library/alpine \
  sh -c "
    echo 'Waiting for database...'
    sleep 5
    echo 'Running migrations...'
    echo 'Migrations complete'
  "

# The main application starts after migrations complete
podman create --pod web-pod --name app docker.io/library/alpine \
  sh -c "echo 'App starting after init' && sleep 3600"

podman pod start web-pod
```

## Use Case: Downloading Configuration

```bash
# Init container that fetches configuration before the app starts
podman pod create --name config-pod -v shared-data:/data

podman create --pod config-pod --init-ctr always --name fetch-config \
  docker.io/library/alpine \
  sh -c "echo '{\"setting\": \"value\"}' > /data/config.json && echo 'Config downloaded'"

# Main container uses the downloaded configuration
podman create --pod config-pod --name app \
  docker.io/library/alpine \
  sh -c "cat /data/config.json && sleep 3600"

podman pod start config-pod
```

## Verifying Init Container Execution

```bash
# List all containers including init containers
podman ps -a --filter pod=app-pod --format "table {{.Names}}\t{{.Status}}"

# Init containers show as Exited with code 0 on success
# Check init container logs
podman logs init-config
```

## Handling Init Container Failures

```bash
# If an init container exits with a non-zero code, the pod will not start
podman pod create --name fail-pod

podman create --pod fail-pod --init-ctr always --name bad-init \
  docker.io/library/alpine sh -c "echo 'failing' && exit 1"

podman create --pod fail-pod --name app docker.io/library/alpine sleep 3600

podman pod start fail-pod

# Check the exit code
podman inspect bad-init --format '{{.State.ExitCode}}'
# Output: 1
```

## Summary

Init containers in Podman pods run setup tasks before the main application starts. Use `--init-ctr always` for tasks that should run on every pod start and `--init-ctr once` for one-time initialization. Init containers are ideal for database migrations, configuration downloads, and dependency checks.
