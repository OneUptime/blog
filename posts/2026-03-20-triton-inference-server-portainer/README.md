# How to Deploy NVIDIA Triton Inference Server via Portainer - Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, NVIDIA, Triton, Machine Learning, GPU

Description: Deploy NVIDIA Triton Inference Server for multi-framework AI model serving using Portainer.

## Introduction

How to Deploy NVIDIA Triton Inference Server via Portainer provides a comprehensive guide to deploying and configuring this technology in a containerized environment managed by Portainer. Whether you're setting up a development environment or production workload, this guide covers everything you need.

## Prerequisites

- Portainer installed with Docker
- Docker and Docker Compose installed
- NVIDIA Container Toolkit installed for GPU workloads
- For the `26.03-py3` image below, a supported NVIDIA driver for CUDA 13.2 and a GPU with CUDA compute capability 7.5 or later for GPU workloads
- A Triton model repository prepared on the host
- Network access to NVIDIA NGC to pull the Triton container image

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

# Create a host directory for the Triton model repository
mkdir -p /data/triton/models
```

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack** and use the following docker-compose.yml:

```yaml
services:
  triton:
    image: nvcr.io/nvidia/tritonserver:26.03-py3
    container_name: tritonserver
    restart: always
    command: ["tritonserver", "--model-repository=/models"]
    shm_size: "1g"
    ulimits:
      memlock: -1
      stack: 67108864
    ports:
      - "8000:8000" # HTTP
      - "8001:8001" # gRPC
      - "8002:8002" # Prometheus metrics
    volumes:
      - triton-models:/models
    # GPU support (uncomment if needed)
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]
    healthcheck:
      test: ["CMD-SHELL", "python3 -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/v2/health/ready', timeout=2)\""]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "3"
    networks:
      - triton-net

volumes:
  triton-models:

networks:
  triton-net:
    driver: bridge
```

## Step 3: Configure the Application

Configure Triton through server arguments and the model repository you mount at `/models`. The repository must follow Triton's required layout:

```text
/data/triton/models/
  <model-name>/
    config.pbtxt
    1/
      <model-definition-file>
```

## Step 4: Initialize and Verify

After deployment, verify the service is running:

```bash
# Check container health
docker ps | grep tritonserver

# View logs via Portainer or CLI
docker logs tritonserver --tail 50

# Test the Triton readiness endpoint
curl -f http://localhost:8000/v2/health/ready

# List models in the repository
curl -X POST http://localhost:8000/v2/repository/index \
  -H "Content-Type: application/json" \
  -d '{"ready":true}'

# Access the HTTP API at http://your-server:8000/v2
```

## Step 5: Configure Persistent Storage

Ensure data persists across container restarts:

```yaml
# In docker-compose.yml
volumes:
  triton-models:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/triton/models
```

Create the host directory:

```bash
mkdir -p /data/triton/models
chmod 755 /data/triton/models
```

## Step 6: Monitor Performance

Use Portainer's built-in monitoring and set up Prometheus metrics:

```yaml
# Add Prometheus metrics scraping
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"
    networks:
      - triton-net
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'tritonserver'
    static_configs:
      - targets: ['tritonserver:8002']
    metrics_path: /metrics
```

## Step 7: Backup and Recovery

Configure automated backups via Portainer:

```bash
#!/bin/bash
# backup.sh - run as a Portainer Edge Job or scheduled task

BACKUP_DIR="/backups/triton"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup the Triton model repository
docker run --rm \
  -v triton-models:/source:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/triton-models-$DATE.tar.gz -C /source .

echo "Backup completed: triton-models-$DATE.tar.gz"

# Retain last 7 backups
ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
```

## Conclusion

How to Deploy NVIDIA Triton Inference Server via Portainer using Portainer provides a streamlined approach to deploying and managing sophisticated workloads. Portainer's visual interface reduces operational complexity while its API enables automation and GitOps workflows. This deployment pattern scales from development environments to production clusters, making it suitable for teams at any stage of their containerization journey.
