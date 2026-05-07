# How to Serve AI Models Locally with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, Machine Learning, Model Serving, llama.cpp, API

Description: Learn how to set up a local AI model serving infrastructure using Podman containers for private and cost-free inference.

---

> Serving AI models locally with Podman gives you a production-grade inference API without cloud costs or data leakage.

Running your own model server lets you serve AI models through a standard API endpoint that any application can consume. Podman is ideal for this because it runs containers without a daemon and supports rootless operation. This guide covers setting up model serving with llama.cpp, configuring for performance, and managing multiple models.

---

## Prerequisites

```bash
# Verify Podman is installed and running

podman --version

# Download a model file in GGUF format for serving
mkdir -p ~/ai-models

# Download a model from Hugging Face (example: Mistral 7B)
curl -L -o ~/ai-models/mistral-7b-instruct-q4_k_m.gguf \
  "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf"

# Download a second model for the multiple-model example
curl -L -o ~/ai-models/codellama-7b-instruct-q4_k_m.gguf \
  "https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf"

# Verify the download
ls -lh ~/ai-models/
```

## Serving with llama.cpp Server

### Basic Model Server

```bash
# Run the llama.cpp server container with a mounted model
podman run -d \
  --name llama-server \
  -p 8080:8080 \
  -v ~/ai-models:/models:ro \
  ghcr.io/ggml-org/llama.cpp:server \
  --model /models/mistral-7b-instruct-q4_k_m.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --threads 4 \
  --n-gpu-layers 0

# Wait for the server to be ready
podman logs -f llama-server 2>&1 | grep -m1 "listening"

# Test the server health endpoint
curl -s http://localhost:8080/health
```

### Optimized Server Configuration

```bash
# Stop the basic server
podman stop llama-server && podman rm llama-server

# Start with optimized settings for production use
podman run -d \
  --name llama-server \
  -p 8080:8080 \
  -v ~/ai-models:/models:ro \
  --cpus 6 \
  --memory 8g \
  ghcr.io/ggml-org/llama.cpp:server \
  --model /models/mistral-7b-instruct-q4_k_m.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --threads 6 \
  --parallel 2 \
  --batch-size 512 \
  --cont-batching

# The key flags:
# --parallel 2     : Handle 2 concurrent requests
# --batch-size 512 : Process tokens in batches of 512 for throughput
# --cont-batching  : Enable continuous batching for multi-user serving
```

## Testing the Model Server

```bash
# Send a chat completion request (OpenAI-compatible)
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain how containers work in two sentences."}
    ],
    "temperature": 0.7,
    "max_tokens": 200
  }' | python3 -m json.tool

# Send a text completion request
curl -s http://localhost:8080/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The benefits of running AI models locally include",
    "max_tokens": 150,
    "temperature": 0.5
  }' | python3 -m json.tool

# List available models
curl -s http://localhost:8080/v1/models | python3 -m json.tool
```

## Serving Multiple Models

```bash
# Run multiple model servers on different ports
# Server 1: General-purpose chat model
podman run -d \
  --name model-chat \
  -p 8081:8080 \
  -v ~/ai-models:/models:ro \
  --cpus 4 --memory 6g \
  ghcr.io/ggml-org/llama.cpp:server \
  --model /models/mistral-7b-instruct-q4_k_m.gguf \
  --host 0.0.0.0 --port 8080 \
  --ctx-size 4096 --threads 4

# Server 2: Code generation model
podman run -d \
  --name model-code \
  -p 8082:8080 \
  -v ~/ai-models:/models:ro \
  --cpus 4 --memory 6g \
  ghcr.io/ggml-org/llama.cpp:server \
  --model /models/codellama-7b-instruct-q4_k_m.gguf \
  --host 0.0.0.0 --port 8080 \
  --ctx-size 8192 --threads 4

# Verify both servers are running
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Monitoring Model Servers

```bash
# Check resource consumption of all model servers
podman stats --no-stream model-chat model-code \
  --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Monitor a specific server in real time
podman stats model-chat

# Check server logs for performance metrics
podman logs model-chat 2>&1 | grep -E "slot|token|timing"

# Health check script for monitoring
cat << 'SCRIPT' > ~/check_model_health.sh
#!/bin/bash
# Check health of all model servers
for port in 8081 8082; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
  if [ "$status" = "200" ]; then
    echo "Port $port: HEALTHY"
  else
    echo "Port $port: UNHEALTHY (HTTP $status)"
  fi
done
SCRIPT
chmod +x ~/check_model_health.sh
```

## Auto-Restart with Systemd

```bash
# Create a systemd user service for the model server
mkdir -p ~/.config/systemd/user

cat << 'EOF' > ~/.config/systemd/user/ai-model-server.service
[Unit]
Description=Local AI Model Server (Podman)
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
Restart=on-failure
RestartSec=10
ExecStartPre=-/usr/bin/podman stop llama-server
ExecStartPre=-/usr/bin/podman rm llama-server
ExecStart=/usr/bin/podman run --replace --name llama-server \
  -p 8080:8080 \
  -v %h/ai-models:/models:ro \
  --cpus 6 --memory 8g \
  ghcr.io/ggml-org/llama.cpp:server \
  --model /models/mistral-7b-instruct-q4_k_m.gguf \
  --host 0.0.0.0 --port 8080 --ctx-size 4096 --threads 6
ExecStop=/usr/bin/podman stop llama-server
ExecStopPost=-/usr/bin/podman rm llama-server

[Install]
WantedBy=default.target
EOF

# Enable and start the service
systemctl --user daemon-reload
systemctl --user enable ai-model-server.service
systemctl --user start ai-model-server.service

# Check status
systemctl --user status ai-model-server.service
```

## Cleaning Up

```bash
# Stop all model servers
podman stop model-chat model-code llama-server 2>/dev/null
podman rm model-chat model-code llama-server 2>/dev/null
```

## Summary

Serving AI models locally with Podman provides a private, cost-free inference infrastructure with an OpenAI-compatible API. Using llama.cpp as the serving backend gives you efficient CPU-based inference with support for concurrent requests. Running multiple model servers on different ports lets you specialize models for different tasks. Combined with systemd for auto-restart, you get a reliable local AI serving setup that runs without any cloud dependency.
