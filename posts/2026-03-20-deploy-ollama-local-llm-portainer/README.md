# How to Deploy Ollama for Local LLM Inference via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ollama, LLM, AI, Portainer, Docker, Local AI, Machine Learning, Privacy

Description: Deploy Ollama via Portainer to run large language models locally without sending data to external APIs, with GPU acceleration and an OpenAI-compatible REST interface.

---

Ollama lets you run LLMs like Llama 3, Mistral, Gemma, and Phi locally with a simple REST API and an OpenAI-compatible endpoint. Deploying it via Portainer gives your team a shared, managed LLM inference service that keeps data on-premises.

## Step 1: Deploy Ollama via Portainer Stack

For a CPU-only deployment:

```yaml
# ollama-stack.yml

version: "3.8"

services:
  ollama:
    image: ollama/ollama
    volumes:
      # Persist downloaded models - models can be several GB
      - ollama-data:/root/.ollama
    ports:
      - "11434:11434"    # Ollama REST API
    restart: unless-stopped
    networks:
      - ollama-net

volumes:
  ollama-data:

networks:
  ollama-net:
    driver: bridge
```

For GPU-accelerated inference on Docker Standalone with NVIDIA GPUs, add NVIDIA device configuration:

```yaml
services:
  ollama:
    image: ollama/ollama
    volumes:
      - ollama-data:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
    restart: unless-stopped
```

## Step 2: Pull a Model

After deploying, pull a model via the Portainer container console or via the API:

```bash
# Pull Llama 3 8B (4.7GB download)
curl http://localhost:11434/api/pull \
  -d '{"model": "llama3"}'

# Pull Mistral 7B
curl http://localhost:11434/api/pull \
  -d '{"model": "mistral"}'

# Pull a smaller model for resource-constrained environments
curl http://localhost:11434/api/pull \
  -d '{"model": "phi3:mini"}'

# List downloaded models
curl http://localhost:11434/api/tags
```

## Step 3: Run Inference

Ollama provides an OpenAI-compatible chat completions API:

```python
# ollama_chat.py - use Ollama's OpenAI-compatible API
from openai import OpenAI

# Point the OpenAI client at your local Ollama instance
client = OpenAI(
    base_url="http://localhost:11434/v1/",
    api_key="ollama"   # required but ignored
)

response = client.chat.completions.create(
    model="llama3",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain distributed tracing in two sentences."}
    ],
    stream=False
)

print(response.choices[0].message.content)
```

For streaming responses:

```python
# Streaming inference - useful for interactive UIs
response = client.chat.completions.create(
    model="llama3",
    messages=[{"role": "user", "content": "Write a haiku about containers."}],
    stream=True
)

for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)
```

## Step 4: Deploy Multiple Models

Manage multiple models from a single Ollama instance:

```bash
# Ollama can keep multiple models loaded if they fit in available memory
# By default, models stay loaded for 5 minutes after use

# Customize model parameters with a Modelfile
cat > /tmp/custom-llama3.modelfile << 'EOF'
FROM llama3

# Set the system prompt
SYSTEM """You are a DevOps expert specializing in containers and Kubernetes."""

# Adjust generation parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
EOF

# Create the custom model from the container console
ollama create devops-llama3 -f /tmp/custom-llama3.modelfile
```

## Step 5: Resource Planning

Actual memory usage depends on quantization, context length, concurrent requests, and whether the model is fully loaded on the GPU.

| Model | Approx. model size | Default context window | Notes |
|-------|--------------------|------------------------|-------|
| phi3:mini (3.8B) | 2.2GB | 4K | Smallest option in this list |
| mistral (7B) | 4.4GB | 32K | Good general-purpose 7B model |
| llama3 (8B) | 4.7GB | 8K | Default `llama3` tag |
| llama3:70b | 40GB | 8K | Requires a high-memory host or GPU |

## Summary

Ollama deployed via Portainer gives your team a private, on-premises LLM service that works with the same OpenAI API your code already uses. All data stays local, latency is predictable, and Portainer handles the container lifecycle.
