# How to Convert Docker Compose to Kubernetes YAML Using Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, Docker Compose, Migration

Description: Learn how to convert a Docker Compose project into Kubernetes YAML by running it with Podman and exporting the pod definitions.

---

> Podman can run your Compose services and export them as Kubernetes YAML, bridging the gap between Docker Compose and Kubernetes.

Many projects start with Docker Compose for local development but eventually need to deploy to Kubernetes. Podman provides a path to convert Compose-based projects into Kubernetes YAML by running the services as containers or pods and generating manifests with `podman kube generate`.

---

## Starting with a Compose File

```yaml
# docker-compose.yml

services:
  web:
    container_name: web
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
  api:
    container_name: api
    image: docker.io/library/python:3.12-slim
    command: python -m http.server 5000
    ports:
      - "5000:5000"
  db:
    container_name: db
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data
volumes:
  db-data:
```

## Running with podman compose

```bash
# Start the services using Podman's Compose wrapper
podman compose up -d

# Verify all containers are running
podman ps
```

## Generating Kubernetes YAML from Running Containers

```bash
# List running containers to find their names
podman ps --format "{{.Names}}"

# Generate Kubernetes YAML for each service
podman kube generate web > web-k8s.yaml
podman kube generate api > api-k8s.yaml
podman kube generate db > db-k8s.yaml
```

## Alternative: Create a Pod and Generate

```bash
# Stop the compose services
podman compose down

# Recreate as a Podman pod for a single combined YAML
podman pod create --name myapp -p 8080:80 -p 5000:5000

podman run -d --pod myapp --name web docker.io/library/nginx:alpine
podman run -d --pod myapp --name api docker.io/library/python:3.12-slim \
  python -m http.server 5000
podman run -d --pod myapp --name db \
  -e POSTGRES_PASSWORD=secret \
  -v db-data:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine

# Generate a single YAML with all containers
podman kube generate myapp > myapp-k8s.yaml
```

## Adapting the Generated YAML

The generated YAML may need adjustments for a real cluster.

```bash
# Common changes needed:
# 1. Update image references to a registry
sed -i 's|docker.io/library/|registry.example.com/|g' myapp-k8s.yaml

# 2. Add resource limits
# 3. Add liveness and readiness probes
# 4. Convert to Deployments for scalability
# 5. Add Services for networking
```

## Creating Kubernetes Services

```yaml
# services.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: myapp
  ports:
    - name: http
      port: 80
      targetPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: myapp
  ports:
    - name: api
      port: 5000
      targetPort: 5000
```

## Complete Conversion Script

```bash
#!/bin/bash
# compose-to-kube.sh - convert a Compose project to Kubernetes YAML

# Step 1: Start services with podman compose
podman compose up -d

# Step 2: Get container names
CONTAINERS=$(podman ps --format "{{.Names}}")

# Step 3: Generate YAML for each container
for container in $CONTAINERS; do
  echo "Generating YAML for $container..."
  podman kube generate "$container" > "${container}-k8s.yaml"
done

# Step 4: Stop services
podman compose down

echo "Kubernetes YAML files generated."
ls -la *-k8s.yaml
```

## Summary

Convert Docker Compose projects to Kubernetes YAML by running services with Podman and exporting with `podman kube generate`. Create the services as a Podman pod for a combined manifest, then adapt the generated YAML with registry paths, resource limits, and Kubernetes Services for cluster deployment.
