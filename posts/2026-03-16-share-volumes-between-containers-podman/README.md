# How to Share Volumes Between Containers in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Storage, Data Sharing

Description: Learn how to share data between Podman containers using named volumes, including patterns for producer-consumer workflows, sidecar containers, and data processing pipelines.

---

> Sharing volumes between containers lets you build composable architectures where containers collaborate by reading and writing to common storage.

Many application patterns require multiple containers to access the same data. A web server reads files uploaded by an application container. A log processor reads logs written by a service. A backup container periodically archives database files. Named volumes in Podman make this sharing straightforward.

---

## Basic Volume Sharing

Mount the same named volume in multiple containers:

```bash
# Create a shared volume

podman volume create shared-data

# Container 1: Writes data
podman run -d --name writer \
    -v shared-data:/data \
    alpine:latest \
    sh -c "while true; do date >> /data/log.txt; sleep 5; done"

# Container 2: Reads data
podman run --rm \
    -v shared-data:/data:ro \
    alpine:latest \
    tail -f /data/log.txt
```

## Producer-Consumer Pattern

One container generates data, another processes it:

```bash
# Create the shared volume
podman volume create upload-queue

# Producer: Accepts uploads and writes to the volume
podman run -d --name upload-service \
    -v upload-queue:/uploads \
    -p 8080:8080 \
    upload-handler:latest

# Consumer: Processes uploaded files
podman run -d --name processor \
    -v upload-queue:/input:ro \
    -v processed-data:/output \
    file-processor:latest
```

## Web Application with Shared Static Files

```bash
# Create volume for static assets
podman volume create static-files

# Application container generates/manages static files
podman run -d --name app \
    -v static-files:/app/static \
    webapp:latest

# Nginx serves the static files
podman run -d --name nginx \
    -v static-files:/usr/share/nginx/html:ro \
    -p 80:80 \
    nginx:alpine
```

## Sidecar Log Collection

```bash
# Create volume for logs
podman volume create app-logs

# Main application writes logs
podman run -d --name myapp \
    -v app-logs:/var/log/app \
    myapp:latest

# Sidecar collects and ships logs
podman run -d --name log-shipper \
    -v app-logs:/logs:ro \
    cr.fluentbit.io/fluent/fluent-bit:latest \
    -i tail -p path=/logs/*.log -o stdout
```

## Database Backup Pattern

```bash
# Create volume for database data
podman volume create dbdata

# Run the database
podman run -d --name postgres \
    -v dbdata:/var/lib/postgresql/data \
    -e POSTGRES_PASSWORD=secret \
    postgres:16

# Stop the database before making a file-system backup
mkdir -p ./backup
podman stop postgres

podman run --rm \
    -v dbdata:/data:ro \
    -v ./backup:/backup \
    alpine:latest \
    tar czf /backup/db-$(date +%Y%m%d).tar.gz -C /data .

podman start postgres
```

## Multiple Containers with Read-Write Access

When multiple containers need write access, be careful about concurrent writes:

```bash
# Create shared volume
podman volume create shared-work

# Worker 1 writes to a specific subdirectory
podman run -d --name worker1 \
    -v shared-work:/work \
    alpine:latest \
    sh -c "mkdir -p /work/worker1 && while true; do date > /work/worker1/status; sleep 10; done"

# Worker 2 writes to a different subdirectory
podman run -d --name worker2 \
    -v shared-work:/work \
    alpine:latest \
    sh -c "mkdir -p /work/worker2 && while true; do date > /work/worker2/status; sleep 10; done"

# Aggregator reads from both
podman run --rm \
    -v shared-work:/work:ro \
    alpine:latest \
    find /work -name status -exec cat {} \;
```

## Using Pods for Volume Sharing

Pods group containers that share namespaces. You can mount the same named volume in containers that run in a pod:

```bash
# Create a pod
podman pod create --name webapp-pod -p 8080:80

# Run containers in the pod sharing a volume
podman run -d --pod webapp-pod --name app \
    -v shared-static:/app/static \
    webapp:latest

podman run -d --pod webapp-pod --name nginx \
    -v shared-static:/usr/share/nginx/html:ro \
    nginx:alpine
```

## Initialization Pattern

Use an init container to prepare data before the main container starts:

```bash
# Create the volume
podman volume create app-config

# Init container populates the volume
podman run --rm \
    -v app-config:/config \
    alpine:latest \
    sh -c 'echo "initialized=true" > /config/settings.conf && echo "Config initialized."'

# Main container uses the prepared volume
podman run -d --name myapp \
    -v app-config:/app/config:ro \
    myapp:latest
```

## Verifying Shared Data

```bash
# Check what is in a shared volume from any container
podman run --rm \
    -v shared-data:/data:ro \
    alpine:latest \
    ls -la /data

# Check file timestamps to see which container last wrote
podman run --rm \
    -v shared-data:/data:ro \
    alpine:latest \
    stat /data/*
```

## Summary

Share volumes between Podman containers by mounting the same named volume in multiple containers. Use `:ro` for containers that only need read access. Common patterns include producer-consumer workflows, sidecar log collection, static file serving, and backup containers. Use separate subdirectories when multiple containers need write access to avoid conflicts.
