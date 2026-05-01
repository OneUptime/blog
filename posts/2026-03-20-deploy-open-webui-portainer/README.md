# How to Deploy Open WebUI for AI Chat via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Open WebUI, AI, LLM, Docker

Description: Deploy Open WebUI as a feature-rich chat interface for Ollama and OpenAI-compatible APIs using Portainer.

## Introduction

How to Deploy Open WebUI for AI Chat via Portainer provides a comprehensive guide to deploying and configuring this technology in a containerized environment managed by Portainer. Whether you're setting up a development environment or production workload, this guide covers everything you need.

## Prerequisites

- Portainer installed and connected to a Docker environment
- Adequate hardware resources (CPU/GPU/RAM as needed)
- Docker installed on the target host
- Network access to Ollama or an OpenAI-compatible API endpoint

## Step 1: Prepare Your Environment

Ensure your system meets the requirements:

```bash
# Check available resources

free -h
nproc
df -h

# For GPU workloads, check NVIDIA availability
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.9.0-base-ubuntu22.04 nvidia-smi
```

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack** and use the following docker-compose.yml:

```yaml
services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:v0.9.2
    container_name: open-webui
    restart: unless-stopped
    ports:
      - "3000:8080"
    volumes:
      - open-webui:/app/backend/data
    environment:
      - WEBUI_SECRET_KEY=${WEBUI_SECRET_KEY}
    extra_hosts:
      - host.docker.internal:host-gateway
    # For NVIDIA GPU support, switch the image tag to v0.9.2-cuda and uncomment:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]
    healthcheck:
      test: ["CMD-SHELL", "curl --silent --fail http://localhost:8080/health | jq -ne 'input.status == true' || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "3"

volumes:
  open-webui:
```

## Step 3: Configure the Application

Edit the stack in Portainer and set environment variables for your provider connection. Open WebUI stores many connection settings internally after first launch, so if you want the stack file to remain the source of truth across restarts, you can set `ENABLE_PERSISTENT_CONFIG=False`:

```yaml
environment:
  # If Ollama runs on the Docker host:
  - OLLAMA_BASE_URL=http://host.docker.internal:11434
  # Optional: keep Portainer-managed environment variables authoritative
  # - ENABLE_PERSISTENT_CONFIG=False
  # Optional: create the first admin account automatically on a fresh install
  # - WEBUI_ADMIN_EMAIL=admin@example.com
  # - WEBUI_ADMIN_PASSWORD=change-this-password
  # Optional: configure an OpenAI-compatible endpoint instead of, or alongside, Ollama
  # - OPENAI_API_BASE_URL=https://api.openai.com/v1
  # - OPENAI_API_KEY=your-api-key
```

## Step 4: Initialize and Verify

After deployment, verify the service is running:

```bash
# Check container health
docker ps | grep open-webui

# View logs via Portainer or CLI
docker logs open-webui --tail 50

# Test the health endpoint
curl http://localhost:3000/health

# After creating an API key in Open WebUI, verify provider connectivity
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3000/api/models

# Access UI at http://your-server:3000
```

## Step 5: Configure Persistent Storage

Ensure data persists across container restarts:

```yaml
# In docker-compose.yml
services:
  open-webui:
    volumes:
      - /data/open-webui:/app/backend/data
```

Create the host directory:

```bash
mkdir -p /data/open-webui
chmod 755 /data/open-webui
```

## Step 6: Monitor Performance

Use Portainer's built-in monitoring and, if you have an OTLP-compatible backend, enable OpenTelemetry export:

```yaml
# Add these to the open-webui service environment
environment:
  - ENABLE_OTEL=true
  - ENABLE_OTEL_METRICS=true
  - OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector:4317
  - OTEL_EXPORTER_OTLP_INSECURE=true
  - OTEL_SERVICE_NAME=open-webui
```

```bash
# Basic service health
curl http://your-open-webui-instance:3000/health

# After generating an API key, verify provider connectivity
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://your-open-webui-instance:3000/api/models
```

## Step 7: Backup and Recovery

Configure automated backups via Portainer:

```bash
#!/bin/bash
# backup.sh - run from cron, a Portainer Edge Job, or another scheduler

BACKUP_DIR="/backups/open-webui"
SOURCE_DIR="/data/open-webui"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup application data
tar czf "$BACKUP_DIR/open-webui-data-$DATE.tar.gz" -C "$SOURCE_DIR" .

echo "Backup completed: open-webui-data-$DATE.tar.gz"

# Retain last 7 backups
ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +8 | xargs -r rm -f
```

## Conclusion

How to Deploy Open WebUI for AI Chat via Portainer using Portainer provides a streamlined approach to deploying and managing containerized AI interfaces. Portainer's visual interface reduces operational complexity while its API enables automation and GitOps workflows. This deployment pattern works well for development and smaller production deployments, and larger rollouts can build on it by moving to external databases, shared storage, and centralized observability.
