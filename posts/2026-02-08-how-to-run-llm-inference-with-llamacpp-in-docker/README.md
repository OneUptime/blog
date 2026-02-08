# How to Run LLM Inference with llama.cpp in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, llama.cpp, LLM, Machine Learning, AI, Inference, GGUF, Containers

Description: Step-by-step guide to running llama.cpp in Docker for efficient CPU and GPU-based LLM inference

---

Running large language models does not always require expensive GPU clusters. llama.cpp is a C/C++ implementation that runs quantized LLMs efficiently on CPUs, and optionally on GPUs. It supports GGUF model format, which makes it possible to run 7B and 13B parameter models on consumer hardware with acceptable performance. Docker wraps this nicely, giving you a portable inference server that works the same way on a developer laptop and a production server.

This guide covers everything from a basic CPU setup to GPU-accelerated deployments, model management, and API integration.

## Why llama.cpp in Docker

There are several good reasons to choose this combination. llama.cpp compiles to native code with minimal dependencies. Quantized GGUF models are small enough to fit in RAM on modest hardware. The built-in HTTP server is compatible with the OpenAI API format. Docker eliminates the need to install build tools, CUDA toolkits, or manage library versions on the host.

## Quick Start with CPU

The simplest way to get started is to use the official llama.cpp server image:

```bash
# Download a quantized model (Mistral 7B, 4-bit quantization, ~4 GB)
mkdir -p ~/models
wget -O ~/models/mistral-7b-instruct-v0.3.Q4_K_M.gguf \
  https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
```

```bash
# Run llama.cpp server in Docker with CPU-only inference
docker run -d \
  --name llama-server \
  -p 8080:8080 \
  -v ~/models:/models \
  ghcr.io/ggerganov/llama.cpp:server \
  --model /models/mistral-7b-instruct-v0.3.Q4_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --threads 8
```

The `--threads` flag should match the number of physical CPU cores available to the container. Setting it higher than the core count causes contention and hurts performance.

## Testing the Server

Once the container is running, test it with a simple curl request:

```bash
# Send a completion request to the llama.cpp server
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is container orchestration?"}
    ],
    "temperature": 0.7,
    "max_tokens": 256
  }'
```

The response follows the OpenAI Chat Completions format, which means you can point existing OpenAI client libraries at this server with minimal changes.

## GPU-Accelerated Inference

For faster inference, you can offload layers to an NVIDIA GPU. The CUDA-enabled image handles this:

```bash
# Run with GPU acceleration, offloading all layers to GPU
docker run -d \
  --name llama-gpu \
  --gpus all \
  -p 8080:8080 \
  -v ~/models:/models \
  ghcr.io/ggerganov/llama.cpp:server-cuda \
  --model /models/mistral-7b-instruct-v0.3.Q4_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --n-gpu-layers 99 \
  --threads 4
```

The `--n-gpu-layers 99` flag tells llama.cpp to offload as many layers as possible to the GPU. If VRAM is limited, reduce this number. Layers that do not fit on the GPU run on the CPU, so partial offloading is fine.

## Docker Compose Setup

For a more maintainable configuration, use Docker Compose:

```yaml
# docker-compose.yml - llama.cpp with persistent model storage
version: "3.8"

services:
  llama:
    image: ghcr.io/ggerganov/llama.cpp:server
    container_name: llama-server
    ports:
      - "8080:8080"
    volumes:
      # Mount the directory containing your GGUF model files
      - ./models:/models
    command: >
      --model /models/mistral-7b-instruct-v0.3.Q4_K_M.gguf
      --host 0.0.0.0
      --port 8080
      --ctx-size 4096
      --threads 8
      --parallel 4
      --cont-batching
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 8g
```

The `--parallel 4` flag enables handling up to 4 concurrent requests. Combined with `--cont-batching`, the server batches token generation across requests for better throughput.

## Understanding Quantization Levels

GGUF models come in various quantization levels. Choosing the right one balances quality against resource usage:

| Quantization | Size (7B model) | Quality | Speed |
|-------------|-----------------|---------|-------|
| Q2_K | ~2.7 GB | Lower | Fastest |
| Q4_K_M | ~4.1 GB | Good | Fast |
| Q5_K_M | ~4.8 GB | Better | Moderate |
| Q6_K | ~5.5 GB | Very Good | Slower |
| Q8_0 | ~7.2 GB | Near FP16 | Slowest |

For most applications, Q4_K_M offers the best balance. Use Q5_K_M or Q6_K when you need higher quality and have the memory headroom.

## Building a Custom Image

If you need a specific llama.cpp version or custom compilation flags, build from source:

```dockerfile
# Dockerfile - custom llama.cpp build with specific optimizations
FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone and build llama.cpp with AVX2 and FMA support
RUN git clone https://github.com/ggerganov/llama.cpp.git /build
WORKDIR /build
RUN cmake -B build -DLLAMA_NATIVE=OFF -DLLAMA_AVX2=ON -DLLAMA_FMA=ON \
    && cmake --build build --target llama-server -j$(nproc)

FROM ubuntu:22.04
COPY --from=builder /build/build/bin/llama-server /usr/local/bin/llama-server

EXPOSE 8080
ENTRYPOINT ["llama-server"]
```

Build and run the custom image:

```bash
# Build the custom llama.cpp image
docker build -t llama-custom .

# Run with the custom image
docker run -d --name llama-custom -p 8080:8080 \
  -v ~/models:/models \
  llama-custom \
  --model /models/mistral-7b-instruct-v0.3.Q4_K_M.gguf \
  --host 0.0.0.0 --port 8080
```

## Using with Python Applications

You can integrate llama.cpp's server with Python applications using the OpenAI client library:

```python
# app.py - connect to llama.cpp using the OpenAI Python client
from openai import OpenAI

# Point the client at the llama.cpp server instead of OpenAI
client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="not-needed"  # llama.cpp does not require an API key
)

response = client.chat.completions.create(
    model="local-model",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain microservices architecture."}
    ],
    max_tokens=512,
    temperature=0.7
)

print(response.choices[0].message.content)
```

## Memory and Performance Tuning

Several flags help you squeeze more performance out of llama.cpp:

- `--threads`: Set to physical CPU core count for CPU inference.
- `--batch-size`: Controls prompt processing batch size. Default is 512. Higher values speed up long prompts.
- `--ctx-size`: The context window size. Larger values consume more memory linearly.
- `--mlock`: Prevents the OS from swapping model weights to disk. Useful when memory is tight but sufficient.
- `--cont-batching`: Enables continuous batching for concurrent requests.

```bash
# Optimized CPU configuration for a server with 16 cores and 32 GB RAM
docker run -d \
  --name llama-optimized \
  -p 8080:8080 \
  -v ~/models:/models \
  ghcr.io/ggerganov/llama.cpp:server \
  --model /models/mistral-7b-instruct-v0.3.Q4_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --threads 16 \
  --batch-size 1024 \
  --parallel 8 \
  --cont-batching \
  --mlock
```

## Health Checking

Add a health check to your container so orchestrators like Docker Swarm or Kubernetes can detect when the server is ready:

```bash
# Check if the llama.cpp server is responding
docker run -d \
  --name llama-health \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-timeout 5s \
  --health-retries 3 \
  -p 8080:8080 \
  -v ~/models:/models \
  ghcr.io/ggerganov/llama.cpp:server \
  --model /models/mistral-7b-instruct-v0.3.Q4_K_M.gguf \
  --host 0.0.0.0 --port 8080
```

## Conclusion

llama.cpp in Docker gives you a lightweight, portable way to run LLM inference without depending on cloud APIs. CPU-only mode works well for development and low-traffic applications, while GPU offloading handles production loads. The OpenAI-compatible API means you can swap between local and cloud models with a configuration change. Start with a Q4_K_M quantized model, benchmark against your latency requirements, and adjust the thread count and GPU layer offloading from there.
