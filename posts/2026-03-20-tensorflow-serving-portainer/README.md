# How to Deploy TensorFlow Serving via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, TensorFlow, Machine Learning, Model Serving, Docker

Description: Deploy TensorFlow Serving for production ML model inference using Portainer container management.

## Introduction

How to Deploy TensorFlow Serving via Portainer provides a comprehensive guide to deploying and configuring this technology in a containerized environment managed by Portainer. Whether you're setting up a development environment or production workload, this guide covers everything you need.

## Prerequisites

- Portainer installed with Docker
- Adequate hardware resources (CPU/GPU/RAM as needed)
- Docker and Docker Compose installed
- Network access to required services

## Step 1: Prepare Your Environment

Ensure your system meets the requirements:

```bash
# Check available resources

free -h
nproc
df -h

# For GPU workloads, check NVIDIA availability
nvidia-smi
docker run --rm --gpus all ubuntu nvidia-smi
```

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack** and use the following docker-compose.yml:

```yaml
services:
  tensorflow-serving:
    image: tensorflow/serving:latest
    container_name: tensorflow-serving
    restart: unless-stopped
    ports:
      - "8501:8501" # REST API
      - "8500:8500" # gRPC API
    volumes:
      - /data/tensorflow-serving/models/my_model:/models/my_model:ro
    environment:
      - MODEL_NAME=my_model
    # GPU support (uncomment if needed)
    # image: tensorflow/serving:latest-gpu
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]
    healthcheck:
      test: ["CMD-SHELL", "timeout 5 bash -c '</dev/tcp/127.0.0.1/8501'"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "3"
    networks:
      - ml-net

networks:
  ml-net:
    driver: bridge
```

## Step 3: Configure the Application

Configure TensorFlow Serving through stack environment variables and bind-mounted files. Portainer's Configs section is only available for Docker Swarm environments:

```protobuf
# models.config (optional, for multiple models or version policies)
model_config_list {
  config {
    name: 'my_model'
    base_path: '/models/my_model'
    model_platform: 'tensorflow'
  }
}
```

## Step 4: Initialize and Verify

After deployment, verify the service is running:

```bash
# Check container health
docker ps | grep tensorflow-serving

# View logs via Portainer or CLI
docker logs tensorflow-serving --tail 50

# Test the model status endpoint
curl http://localhost:8501/v1/models/my_model

# REST listens at http://your-server:8501 and gRPC listens on your-server:8500
```

## Step 5: Configure Persistent Storage

Ensure data persists across container restarts:

```yaml
# In docker-compose.yml
services:
  tensorflow-serving:
    volumes:
      - /data/tensorflow-serving/models/my_model:/models/my_model:ro
```

Create the host directory before deploying or redeploying the stack:

```bash
mkdir -p /data/tensorflow-serving/models/my_model
chmod 755 /data/tensorflow-serving /data/tensorflow-serving/models /data/tensorflow-serving/models/my_model
```

Place SavedModel exports under versioned subdirectories, such as `/data/tensorflow-serving/models/my_model/1/`.

## Step 6: Monitor Performance

Use Portainer's built-in monitoring and set up Prometheus metrics:

```protobuf
# monitoring_config.txt
prometheus_config {
  enable: true
  path: "/monitoring/prometheus/metrics"
}
```

```yaml
# Add monitoring config and Prometheus metrics scraping
services:
  tensorflow-serving:
    volumes:
      - /data/tensorflow-serving/models/my_model:/models/my_model:ro
      - /data/tensorflow-serving/monitoring_config.txt:/models/monitoring_config.txt:ro
    command:
      - --monitoring_config_file=/models/monitoring_config.txt

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - /data/tensorflow-serving/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"
    networks:
      - ml-net
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'tensorflow-serving'
    static_configs:
      - targets: ['tensorflow-serving:8501']
    metrics_path: /monitoring/prometheus/metrics
```

## Step 7: Backup and Recovery

Configure automated backups via Portainer:

```bash
#!/bin/bash
# backup.sh - run as a Portainer Edge Job or scheduled task

BACKUP_DIR="/backups/tensorflow-serving"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup SavedModel data
docker run --rm \
  -v /data/tensorflow-serving/models:/source:ro \
  -v "$BACKUP_DIR:/backup" \
  alpine tar czf "/backup/models-$DATE.tar.gz" -C /source .

echo "Backup completed: models-$DATE.tar.gz"

# Retain last 7 backups
ls -t "$BACKUP_DIR"/models-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
```

## Conclusion

How to Deploy TensorFlow Serving via Portainer using Portainer provides a streamlined approach to deploying and managing sophisticated workloads. Portainer's visual interface reduces operational complexity while its API enables automation and GitOps workflows. This deployment pattern scales from development environments to production clusters, making it suitable for teams at any stage of their containerization journey.
