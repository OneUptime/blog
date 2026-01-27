# How to Use Ollama with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ollama, Docker, LLM, AI, Machine Learning, GPU, Docker Compose, Self-Hosted, DevOps

Description: A comprehensive guide to running Ollama in Docker containers with GPU passthrough, persistent model storage, and multi-container deployment patterns.

---

> Running large language models locally has never been easier. Ollama in Docker gives you reproducible AI infrastructure that scales from development laptops to production GPU clusters.

## Why Run Ollama in Docker?

Ollama is an open-source tool for running large language models locally. Running it in Docker provides several advantages:

- **Reproducibility**: Same environment across development, staging, and production
- **Isolation**: Keep your host system clean and manage dependencies easily
- **Scalability**: Deploy multiple instances behind a load balancer
- **GPU Management**: Consistent GPU access across different host configurations

## Using the Official Ollama Docker Image

Ollama provides official Docker images that work out of the box.

### Basic CPU-Only Setup

```bash
# Pull the official Ollama image
docker pull ollama/ollama

# Run Ollama container
docker run -d \
  --name ollama \
  -p 11434:11434 \
  ollama/ollama
```

### Pull and Run a Model

```bash
# Execute into the running container to pull a model
docker exec -it ollama ollama pull llama3.2

# Run the model interactively
docker exec -it ollama ollama run llama3.2

# Or use the API directly
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Why is the sky blue?"
}'
```

## GPU Passthrough with NVIDIA

For production workloads, GPU acceleration is essential. Here is how to configure NVIDIA GPU passthrough.

### Prerequisites

1. **NVIDIA Driver**: Install on your host system
2. **NVIDIA Container Toolkit**: Required for Docker GPU support

```bash
# Install NVIDIA Container Toolkit (Ubuntu/Debian)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### Running Ollama with GPU

```bash
# Run with all available GPUs
docker run -d \
  --name ollama-gpu \
  --gpus all \
  -p 11434:11434 \
  ollama/ollama

# Run with specific GPU (useful for multi-GPU systems)
docker run -d \
  --name ollama-gpu \
  --gpus '"device=0"' \
  -p 11434:11434 \
  ollama/ollama

# Run with multiple specific GPUs
docker run -d \
  --name ollama-gpu \
  --gpus '"device=0,1"' \
  -p 11434:11434 \
  ollama/ollama
```

### Verify GPU Access

```bash
# Check if GPU is detected inside container
docker exec ollama-gpu nvidia-smi

# Check Ollama GPU status
docker exec ollama-gpu ollama list
```

## Docker Compose Setup

For easier management, use Docker Compose to define your Ollama infrastructure.

### Basic docker-compose.yml

```yaml
# docker-compose.yml
# Basic Ollama setup with persistent storage

version: "3.8"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      # Expose Ollama API on host port 11434
      - "11434:11434"
    volumes:
      # Persist models between container restarts
      - ollama_data:/root/.ollama
    restart: unless-stopped
    # Health check to ensure Ollama is responding
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  # Named volume for model persistence
  ollama_data:
```

### GPU-Enabled docker-compose.yml

```yaml
# docker-compose.gpu.yml
# Ollama with NVIDIA GPU support

version: "3.8"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama-gpu
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # GPU configuration
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              # Use all available GPUs
              count: all
              capabilities: [gpu]
    environment:
      # Optional: Set specific CUDA devices
      - NVIDIA_VISIBLE_DEVICES=all
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  ollama_data:
```

Start the GPU-enabled setup:

```bash
docker compose -f docker-compose.gpu.yml up -d
```

## Volume Mounting for Models

Models can be large (several gigabytes). Proper volume management is crucial.

### Using Named Volumes

```yaml
# Recommended for most deployments
volumes:
  ollama_data:
    driver: local
```

### Using Bind Mounts

```yaml
# Useful when you want direct filesystem access
services:
  ollama:
    volumes:
      # Bind mount to specific host directory
      - /data/ollama/models:/root/.ollama
```

### Pre-loading Models

Create a script to automatically pull models on startup:

```yaml
# docker-compose.yml with model initialization

version: "3.8"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
      # Mount initialization script
      - ./init-models.sh:/init-models.sh:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Sidecar container to pull models after Ollama starts
  model-loader:
    image: curlimages/curl:latest
    depends_on:
      ollama:
        condition: service_healthy
    # Pull required models
    entrypoint: >
      sh -c "
        curl -X POST http://ollama:11434/api/pull -d '{\"name\": \"llama3.2\"}' &&
        curl -X POST http://ollama:11434/api/pull -d '{\"name\": \"codellama\"}'
      "
    restart: "no"

volumes:
  ollama_data:
```

### Model Storage Best Practices

```bash
# Check model storage usage
docker exec ollama du -sh /root/.ollama/models/*

# Backup models
docker run --rm \
  -v ollama_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/ollama-models-backup.tar.gz /data

# Restore models
docker run --rm \
  -v ollama_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/ollama-models-backup.tar.gz -C /
```

## API Configuration

Ollama exposes a REST API for integration with your applications.

### Environment Variables

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    environment:
      # Bind to all interfaces (required for container networking)
      - OLLAMA_HOST=0.0.0.0
      # Set custom port (default: 11434)
      - OLLAMA_PORT=11434
      # Enable debug logging
      - OLLAMA_DEBUG=1
      # Set number of parallel requests
      - OLLAMA_NUM_PARALLEL=4
      # Maximum loaded models
      - OLLAMA_MAX_LOADED_MODELS=2
      # Keep models in memory (seconds, 0 = forever)
      - OLLAMA_KEEP_ALIVE=300
```

### API Endpoints Reference

```bash
# List available models
curl http://localhost:11434/api/tags

# Generate completion
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Explain Docker in one sentence",
  "stream": false
}'

# Chat completion (multi-turn conversation)
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {"role": "user", "content": "Hello!"},
    {"role": "assistant", "content": "Hi! How can I help you?"},
    {"role": "user", "content": "What is Kubernetes?"}
  ]
}'

# Generate embeddings
curl http://localhost:11434/api/embeddings -d '{
  "model": "llama3.2",
  "prompt": "Docker containers are lightweight"
}'

# Pull a model
curl http://localhost:11434/api/pull -d '{
  "name": "codellama"
}'

# Delete a model
curl -X DELETE http://localhost:11434/api/delete -d '{
  "name": "codellama"
}'
```

### Configuring for Production

```yaml
# docker-compose.prod.yml
# Production-ready Ollama configuration

version: "3.8"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "127.0.0.1:11434:11434"  # Bind to localhost only
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
      - OLLAMA_NUM_PARALLEL=4
      - OLLAMA_MAX_LOADED_MODELS=2
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
        limits:
          # Limit CPU and memory
          cpus: "8"
          memory: 32G
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"

volumes:
  ollama_data:
```

## Multi-Container Deployment

For high availability and scalability, deploy multiple Ollama instances.

### Load-Balanced Architecture

```yaml
# docker-compose.cluster.yml
# Multi-instance Ollama with nginx load balancer

version: "3.8"

services:
  # Load balancer
  nginx:
    image: nginx:alpine
    container_name: ollama-lb
    ports:
      - "11434:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - ollama-1
      - ollama-2
    restart: unless-stopped

  # Ollama instance 1 (GPU 0)
  ollama-1:
    image: ollama/ollama:latest
    container_name: ollama-1
    volumes:
      # Shared volume so models are available to all instances
      - ollama_shared:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ["0"]
              capabilities: [gpu]
    environment:
      - OLLAMA_HOST=0.0.0.0
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Ollama instance 2 (GPU 1)
  ollama-2:
    image: ollama/ollama:latest
    container_name: ollama-2
    volumes:
      - ollama_shared:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ["1"]
              capabilities: [gpu]
    environment:
      - OLLAMA_HOST=0.0.0.0
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  ollama_shared:
```

### Nginx Configuration

```nginx
# nginx.conf
# Load balancer configuration for Ollama cluster

events {
    worker_connections 1024;
}

http {
    # Upstream configuration for Ollama instances
    upstream ollama_cluster {
        # Use least connections for better load distribution
        least_conn;

        server ollama-1:11434 weight=1;
        server ollama-2:11434 weight=1;

        # Keep connections alive for better performance
        keepalive 32;
    }

    server {
        listen 80;

        # Increase timeouts for long-running LLM requests
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        location / {
            proxy_pass http://ollama_cluster;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Connection "";

            # Buffer settings for large responses
            proxy_buffering off;
            proxy_buffer_size 4k;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### Integration with Application Services

```yaml
# docker-compose.app.yml
# Full stack with Ollama and application

version: "3.8"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    environment:
      - OLLAMA_HOST=0.0.0.0
    restart: unless-stopped
    networks:
      - app-network

  # Your application that uses Ollama
  app:
    image: your-app:latest
    container_name: your-app
    ports:
      - "8080:8080"
    environment:
      # Point to Ollama service by container name
      - OLLAMA_BASE_URL=http://ollama:11434
      - OLLAMA_MODEL=llama3.2
    depends_on:
      - ollama
    restart: unless-stopped
    networks:
      - app-network

  # Optional: Redis for caching LLM responses
  redis:
    image: redis:alpine
    container_name: redis
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  ollama_data:
  redis_data:
```

## Best Practices Summary

### Container Configuration

- **Always use named volumes** for model persistence to survive container recreation
- **Set resource limits** in production to prevent runaway memory usage
- **Use health checks** to ensure Ollama is ready before dependent services start
- **Bind to localhost** in production and use a reverse proxy for external access

### GPU Management

- **Install NVIDIA Container Toolkit** on all hosts that will run Ollama with GPU
- **Pin specific GPUs** in multi-GPU systems to prevent contention
- **Monitor GPU memory** as large models can exhaust VRAM quickly

### Networking

- **Use Docker networks** for service-to-service communication
- **Set appropriate timeouts** as LLM inference can take several seconds
- **Implement load balancing** for high-availability deployments

### Model Management

- **Pre-pull models** in your deployment pipeline to reduce cold start times
- **Share model volumes** across instances to avoid duplicate storage
- **Backup model volumes** regularly, especially for fine-tuned models

### Security

- **Never expose Ollama directly to the internet** without authentication
- **Use a reverse proxy** with TLS termination and rate limiting
- **Run containers as non-root** when possible using user namespaces

### Monitoring

- **Enable logging** with rotation to prevent disk space issues
- **Monitor API response times** to detect performance degradation
- **Track GPU utilization** to optimize instance sizing

---

Running Ollama in Docker transforms local LLM inference from a development experiment into production-ready infrastructure. Start with a simple single-container setup, add GPU acceleration when you need performance, and scale horizontally when demand grows. The containerized approach ensures your AI infrastructure is reproducible, maintainable, and ready for whatever scale your applications require.

For monitoring your Ollama deployments and the applications that depend on them, check out [OneUptime](https://oneuptime.com) for comprehensive observability across your entire stack.
