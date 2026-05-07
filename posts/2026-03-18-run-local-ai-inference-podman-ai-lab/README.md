# How to Run Local AI Inference with Podman AI Lab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, Machine Learning, Inference, LLM, Local AI

Description: Learn how to run AI inference locally using Podman AI Lab to process prompts and generate text without cloud APIs.

---

> Local AI inference keeps your data private and eliminates per-token API costs.

Running AI inference locally means your prompts and responses never leave your machine. Podman AI Lab makes this straightforward by providing an inference server that wraps downloaded models with an OpenAI-compatible API. This guide shows how to start inference services, send requests, and optimize performance for your hardware.

---

## Prerequisites

```bash
# Verify Podman is running with adequate resources

podman machine inspect --format 'CPUs: {{.Resources.CPUs}}, Memory: {{.Resources.Memory}}MB'

# Ensure you have at least one model downloaded in Podman AI Lab
# The default local model directory is under the AI Lab user data directory,
# for example:
ls -lh "$HOME/aistudio/models/"

# Recommended minimums for inference:
# - 4 CPUs for 7B parameter models
# - 8GB RAM for Q4 quantized 7B models
# - 8 CPUs and 16GB RAM for 13B models
```

## Starting an Inference Service

### Using the Podman Desktop UI

1. Open Podman Desktop and click the Podman AI Lab icon in the left navigation pane.
2. In the Podman AI Lab navigation bar, click **Services**.
3. Click **New Model Service**, select your downloaded model, and edit the port number if needed.
4. Click **Create service**.
5. The service will spin up a container running an inference server. Note the port number displayed.

### Using the CLI

```bash
# Start a llama.cpp-based inference server with a downloaded GGUF model
# Replace the host path and model filename with the model you downloaded.
podman run -d \
  --name ai-inference \
  -p 8080:8080 \
  -v "$HOME/aistudio/models:/models:ro" \
  --label ai-lab-model=true \
  rlcr.io/ramalama/llamacpp-cpu-distroless:latest \
  --model /models/mistral-7b-instruct-q4_0.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --threads 4

# Verify the container is running
podman ps --filter "name=ai-inference" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Wait for the model to finish loading
podman logs -f ai-inference 2>&1 | head -20
```

## Sending Inference Requests

### Using curl with the OpenAI-Compatible API

```bash
# Send a simple chat completion request
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral-7b-instruct",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain containerization in three sentences."}
    ],
    "temperature": 0.7,
    "max_tokens": 256
  }' | python3 -m json.tool

# Send a simple text completion request
curl -s http://localhost:8080/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral-7b-instruct",
    "prompt": "Write a bash script that lists all running containers:\n```bash\n",
    "max_tokens": 200,
    "temperature": 0.3,
    "stop": ["```"]
  }' | python3 -m json.tool
```

### Using Python

```bash
# Install the OpenAI Python client
pip install openai

# Create a test script
cat << 'PYEOF' > test_inference.py
#!/usr/bin/env python3
# Connect to the local Podman AI Lab inference server
from openai import OpenAI

# Point the client at the local inference server
client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="sk-no-key-required"  # Local server does not require auth
)

# Send a chat completion request
response = client.chat.completions.create(
    model="mistral-7b-instruct",
    messages=[
        {"role": "system", "content": "You are a DevOps expert."},
        {"role": "user", "content": "How do I monitor container resource usage?"}
    ],
    temperature=0.7,
    max_tokens=512
)

# Print the response
print(response.choices[0].message.content)
PYEOF

python3 test_inference.py
```

## Tuning Inference Parameters

```bash
# Key parameters that affect inference quality and speed:

# temperature: Controls randomness (0.0 = deterministic, 1.0 = creative)
# max_tokens: Maximum number of tokens to generate
# top_p: Nucleus sampling threshold (0.1 = focused, 0.9 = diverse)
# ctx-size: Context window size (affects memory usage)

# Restart the server with optimized settings for code generation
podman stop ai-inference && podman rm ai-inference

podman run -d \
  --name ai-inference \
  -p 8080:8080 \
  -v "$HOME/aistudio/models:/models:ro" \
  --label ai-lab-model=true \
  rlcr.io/ramalama/llamacpp-cpu-distroless:latest \
  --model /models/codellama-7b-instruct-q4_0.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 8192 \
  --threads 8 \
  --batch-size 512
```

## Monitoring Inference Performance

```bash
# Check inference server resource usage
podman stats ai-inference --no-stream --format \
  "CPU: {{.CPUPerc}}, Memory: {{.MemUsage}}, Net: {{.NetIO}}"

# Watch real-time performance during inference
podman stats ai-inference

# Check inference server logs for timing information
podman logs ai-inference 2>&1 | grep -E "tokens|timing|speed"

# Benchmark inference speed with a timed request
time curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral-7b-instruct",
    "messages": [{"role": "user", "content": "Count from 1 to 20."}],
    "max_tokens": 100
  }' > /dev/null
```

## Stopping Inference Services

```bash
# Stop the inference container
podman stop ai-inference

# Remove the container when done
podman rm ai-inference

# To stop all AI Lab inference containers
podman ps --filter "label=ai-lab-model=true" -q | xargs -r podman stop
podman ps -a --filter "label=ai-lab-model=true" -q | xargs -r podman rm
```

## Summary

Running local AI inference with Podman AI Lab gives you a private, cost-free alternative to cloud AI APIs. The inference server provides an OpenAI-compatible API, making it easy to integrate with existing tools and scripts. Tuning parameters like context size, thread count, and batch size lets you balance speed against quality for your specific hardware. Monitor resource usage during inference to find the optimal configuration for your workloads.
