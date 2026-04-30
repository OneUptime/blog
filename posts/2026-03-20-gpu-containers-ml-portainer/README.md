# How to Set Up GPU Containers for ML Workloads in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GPU, Machine Learning, NVIDIA, Docker

Description: Configure NVIDIA GPU support in Docker containers managed by Portainer for accelerated machine learning workloads.

## Introduction

How to Set Up GPU Containers for ML Workloads in Portainer requires NVIDIA drivers and the NVIDIA Container Toolkit on the Docker host before Portainer can deploy GPU-enabled containers. Whether you're setting up a development environment or a production workload, this guide covers the Docker and Portainer pieces needed for a working setup.

## Prerequisites

- Docker Engine installed and working on a Docker Standalone host
- Portainer connected to that Docker Standalone environment
- A supported NVIDIA GPU with the NVIDIA driver installed on the host
- NVIDIA Container Toolkit installed and configured for Docker
- Sudo or root access on the Docker host

## Step 1: Prepare Your Environment

Ensure Docker can see the GPU before you deploy through Portainer:

```bash
# Check that the NVIDIA driver is working on the host
nvidia-smi

# Configure Docker to use the NVIDIA runtime, then restart Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify GPU access from a container
sudo docker run --rm --runtime=nvidia --gpus all ubuntu nvidia-smi
```

If the NVIDIA Container Toolkit is not installed yet, install it first by following NVIDIA's installation guide for your Linux distribution.

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack** and use the following compose file:

```yaml
services:
  ml-app:
    image: nvidia/cuda:12.9.0-base-ubuntu22.04
    container_name: ml-app
    command: ["sh", "-c", "nvidia-smi && sleep infinity"]
    restart: unless-stopped
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    environment:
      NVIDIA_VISIBLE_DEVICES: all
      NVIDIA_DRIVER_CAPABILITIES: compute,utility
    volumes:
      - app-data:/data
      - model-cache:/models

volumes:
  app-data:
    name: ml-app-data
  model-cache:
    name: ml-model-cache
```

## Step 3: Configure the Application

For Docker Standalone environments, set application options in the stack file or through Portainer's environment variable form. Portainer's **Configs** section maps to Docker configs, which are only available to Docker Swarm services.

```yaml
# Add or adjust variables under ml-app.environment
environment:
  NVIDIA_VISIBLE_DEVICES: all
  NVIDIA_DRIVER_CAPABILITIES: compute,utility
  MODEL_DIR: /models
  DATA_DIR: /data
```

## Step 4: Initialize and Verify

After deployment, verify the container is running and has GPU access:

```bash
# Check that the container is running
docker ps --filter name=ml-app

# View the startup logs
docker logs ml-app --tail 50

# Verify GPU access inside the running container
docker exec ml-app nvidia-smi
```

## Step 5: Configure Persistent Storage

The named volumes in the stack file already persist data across container restarts. If you need host-path access for models or datasets, replace those named volumes with bind mounts:

```yaml
# Under services.ml-app.volumes
volumes:
  - /data/ml-app:/data
  - /data/ml-models:/models
```

Create the host directories:

```bash
sudo mkdir -p /data/ml-app /data/ml-models
sudo chmod 755 /data/ml-app /data/ml-models
```

## Step 6: Monitor Performance

Use Portainer's container statistics for CPU, memory, network, and I/O, and use `nvidia-smi` for GPU utilization and memory usage:

```bash
# Check GPU utilization on the host
nvidia-smi

# Or check GPU visibility from inside the container
docker exec ml-app nvidia-smi
```

If your ML application exposes a Prometheus `/metrics` endpoint, scrape that application endpoint separately. Portainer can show container stats and logs, but it does not create application metrics endpoints for you.

## Step 7: Backup and Recovery

Back up the named data volume from the Docker host:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/ml-app"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup application data from the named volume
docker run --rm \
  -v ml-app-data:/source:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/app-data-$DATE.tar.gz" -C /source .

echo "Backup completed: app-data-$DATE.tar.gz"

# Retain last 7 backups
ls -1t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
```

To restore, create or reuse the target volume and extract the archive into it with a temporary container.

## Conclusion

How to Set Up GPU Containers for ML Workloads in Portainer provides a practical way to deploy and manage GPU-enabled containers once Docker itself has been configured for NVIDIA GPUs. After the host can successfully run `docker run --rm --runtime=nvidia --gpus all ubuntu nvidia-smi`, Portainer can use the same Docker capabilities to deploy and manage GPU-backed ML workloads from its interface.
