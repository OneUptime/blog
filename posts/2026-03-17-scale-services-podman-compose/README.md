# How to Scale Services with podman-compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Scaling

Description: Learn how to run multiple instances of a service using podman-compose scale for horizontal scaling.

---

> Scaling services with podman-compose lets you run multiple container instances to handle increased load during development and testing.

podman-compose supports scaling services to run multiple replicas of a container. This is useful for testing load balancing, simulating production-like environments, and validating that your application handles multiple instances correctly.

---

## Basic Scaling

```bash
# Scale the worker service to 3 instances

podman-compose up -d --scale worker=3

# Check the running instances
podman-compose ps
# Output shows project_worker_1, project_worker_2, project_worker_3 (project name may vary)
```

## Example Compose File for Scaling

```yaml
# docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
  worker:
    image: docker.io/library/python:3.12-slim
    command: python -c "import time; [print(f'Working...', flush=True) or time.sleep(5) for _ in iter(int, 1)]"
  redis:
    image: docker.io/library/redis:7-alpine
```

```bash
# Start web and redis normally, scale workers to 5
podman-compose up -d --scale worker=5

# Verify all instances are running
podman ps --filter label=com.docker.compose.service=worker
```

## Scaling Up and Down

```bash
# Scale up to 5 workers
podman-compose up -d --scale worker=5

# Scale back down to 2 workers
podman-compose up -d --scale worker=2

# Scale to zero (stop all instances of a service)
podman-compose up -d --scale worker=0
```

## Port Considerations

When scaling, avoid fixed host port mappings since multiple containers cannot bind to the same port.

```yaml
# docker-compose.yml
services:
  api:
    image: docker.io/library/python:3.12-slim
    command: python -m http.server 5000
    # Omit the host port so each instance gets an available host port
    ports:
      - "5000"
```

```bash
# Scale the api service to 3 instances
podman-compose up -d --scale api=3

# Each instance gets a random host port
podman ps --format "{{.Names}}\t{{.Ports}}"
```

## Checking Scaled Service Status

```bash
# List all instances of the worker service
podman-compose ps worker

# View logs from all worker instances
podman-compose logs worker

# View logs from a specific instance
podman logs project_worker_2
```

## Using deploy.replicas in Compose

```yaml
# docker-compose.yml
services:
  worker:
    image: docker.io/library/python:3.12-slim
    command: python -c "import time; time.sleep(3600)"
    deploy:
      mode: replicated
      replicas: 3
```

```bash
# Start with the defined replica count
podman-compose up -d
```

## Summary

Scale services with `podman-compose up -d --scale service=N` to run multiple container instances. Avoid fixed host port bindings on scaled services. Use scaling to test load handling and multi-instance behavior during development.
