# How to Run Open WebUI in Docker for ChatGPT Alternative

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, open webui, chatgpt, ollama, llm, self-hosted, ai, docker compose

Description: Set up Open WebUI in Docker as a self-hosted ChatGPT alternative with Ollama integration for running local language models privately.

---

Open WebUI is a self-hosted web interface for interacting with large language models. It provides a polished, ChatGPT-like experience that runs entirely on your own hardware. When paired with Ollama, you get a complete local AI chat system with no data leaving your network. Docker makes deploying this stack straightforward, whether you are running it on a laptop for personal use or on a GPU server for your team.

## Prerequisites

Before starting, make sure you have:

- Docker and Docker Compose installed
- At least 8 GB of RAM (16 GB recommended)
- A NVIDIA GPU with CUDA drivers installed (optional but strongly recommended for performance)
- At least 20 GB of free disk space for model storage

```bash
# Verify Docker is running
docker info

# Check available disk space
df -h /var/lib/docker

# If you have an NVIDIA GPU, verify the drivers and nvidia-container-toolkit
nvidia-smi
```

## Quick Start with Docker Run

The fastest way to get Open WebUI running is with a single Docker command that includes a bundled Ollama instance.

```bash
# Run Open WebUI with bundled Ollama
# This pulls the image and starts the service on port 3000
docker run -d \
  --name open-webui \
  -p 3000:8080 \
  -v open-webui:/app/backend/data \
  -v ollama:/root/.ollama \
  --restart always \
  ghcr.io/open-webui/open-webui:ollama
```

Open your browser and navigate to `http://localhost:3000`. You will see the registration page. The first account you create becomes the admin.

## Production Setup with Docker Compose

For a more robust deployment, use Docker Compose to run Open WebUI and Ollama as separate services.

```yaml
# docker-compose.yml
# Production-ready Open WebUI setup with separate Ollama service
version: "3.8"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      # Persist downloaded models across container restarts
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    restart: unless-stopped
    # Uncomment the following lines if you have an NVIDIA GPU
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    volumes:
      # Persist user data, chat history, and settings
      - open_webui_data:/app/backend/data
    ports:
      - "3000:8080"
    environment:
      # Point Open WebUI to the Ollama service
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      - ollama
    restart: unless-stopped

volumes:
  ollama_data:
  open_webui_data:
```

Start the stack:

```bash
# Start both services in the background
docker compose up -d

# Watch the logs to confirm everything starts cleanly
docker compose logs -f
```

## GPU Support with NVIDIA

If you have an NVIDIA GPU, enabling GPU passthrough dramatically improves model inference speed.

```bash
# Install the NVIDIA Container Toolkit
# On Ubuntu/Debian
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use the NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify GPU access inside containers
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

Update the Docker Compose file to enable GPU access for Ollama:

```yaml
# Add this under the ollama service in docker-compose.yml
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped
```

## Downloading and Managing Models

With Ollama running, you need to download language models.

```bash
# Download the Llama 3.1 8B model (approximately 4.7 GB)
docker exec ollama ollama pull llama3.1

# Download a smaller model for testing
docker exec ollama ollama pull phi3

# Download a code-focused model
docker exec ollama ollama pull codellama

# List all downloaded models
docker exec ollama ollama list

# Check model details
docker exec ollama ollama show llama3.1
```

You can also download models through the Open WebUI interface by clicking the model selector dropdown and entering a model name to pull.

## Connecting to External APIs

Open WebUI supports connecting to OpenAI-compatible APIs alongside local Ollama models. This lets you use both local and cloud models from the same interface.

Set the environment variables in your Docker Compose file:

```yaml
# Add these environment variables to the open-webui service
  open-webui:
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      # Connect to OpenAI API as an additional backend
      - OPENAI_API_BASE_URLS=https://api.openai.com/v1
      - OPENAI_API_KEYS=sk-your-api-key-here
```

## Configuring Authentication

For team deployments, you will want to configure authentication properly.

```yaml
# Authentication-related environment variables for Open WebUI
  open-webui:
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      # Disable signup after initial admin account creation
      - ENABLE_SIGNUP=false
      # Set a default role for new users
      - DEFAULT_USER_ROLE=pending
      # Enable OAuth2 authentication (optional)
      # - OAUTH_CLIENT_ID=your-client-id
      # - OAUTH_CLIENT_SECRET=your-client-secret
      # - OPENID_PROVIDER_URL=https://your-idp.com/.well-known/openid-configuration
```

## Adding a Reverse Proxy with HTTPS

For production, put Open WebUI behind a reverse proxy with TLS.

```yaml
# docker-compose.yml with Caddy reverse proxy for automatic HTTPS
version: "3.8"

services:
  caddy:
    image: caddy:2
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    volumes:
      - open_webui_data:/app/backend/data
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
    restart: unless-stopped

volumes:
  ollama_data:
  open_webui_data:
  caddy_data:
```

Create the Caddyfile:

```
# Caddyfile - Caddy reverse proxy configuration
# Replace chat.yourdomain.com with your actual domain
chat.yourdomain.com {
    reverse_proxy open-webui:8080
}
```

## Backup and Restore

Protect your chat history and settings by backing up the volumes.

```bash
# Backup Open WebUI data (chat history, users, settings)
docker run --rm \
  -v open_webui_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/open-webui-backup.tar.gz -C /data .

# Backup Ollama models
docker run --rm \
  -v ollama_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/ollama-models-backup.tar.gz -C /data .

# Restore Open WebUI data
docker run --rm \
  -v open_webui_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/open-webui-backup.tar.gz"
```

## Monitoring Resource Usage

Keep an eye on resource consumption, especially when running large models.

```bash
# Monitor real-time resource usage of all containers
docker stats

# Check GPU utilization if applicable
nvidia-smi -l 1

# View Ollama logs for model loading and inference details
docker logs -f ollama
```

## Updating Open WebUI

Keeping Open WebUI updated is simple with Docker Compose.

```bash
# Pull the latest images
docker compose pull

# Recreate containers with the updated images
# The -d flag runs them in the background
docker compose up -d

# Verify the new version is running
docker compose ps
```

## Summary

Open WebUI with Ollama gives you a private, self-hosted AI chat experience that rivals commercial offerings. Docker makes the deployment reproducible and easy to manage. With GPU support, you can run models like Llama 3.1 at impressive speeds. The combination of persistent volumes, reverse proxy support, and flexible authentication options makes this stack suitable for both personal and team use.
