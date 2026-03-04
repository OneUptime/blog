# How to Run LLM Inference with vLLM in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, vLLM, LLM, Machine Learning, AI, Inference, GPU, Containers

Description: A practical guide to deploying vLLM for high-throughput LLM inference inside Docker containers with GPU support

---

Large Language Models have become central to modern AI applications, but serving them efficiently requires specialized infrastructure. vLLM is an open-source library designed for fast LLM inference and serving. It uses PagedAttention to manage GPU memory more efficiently than naive approaches, which translates to higher throughput and lower latency. Running vLLM inside Docker makes deployments reproducible and simplifies the management of CUDA dependencies, Python packages, and model weights.

This guide walks you through setting up vLLM in Docker from scratch, covering GPU passthrough, model downloading, API configuration, and production-ready patterns.

## Prerequisites

Before you begin, make sure you have the following:

- A Linux host with an NVIDIA GPU (compute capability 7.0 or higher)
- Docker Engine 24.0+ installed
- The NVIDIA Container Toolkit installed and configured
- At least 16 GB of GPU VRAM for smaller models (7B parameter class)

You can verify your GPU is visible to Docker with this command:

```bash
# Confirm Docker can see your NVIDIA GPU
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
```

If you see your GPU listed in the output, you are ready to proceed.

## Running vLLM with a Single Command

The fastest way to get started is to pull the official vLLM Docker image and run it directly. This command downloads the Mistral-7B-Instruct model and starts the OpenAI-compatible API server:

```bash
# Start vLLM serving Mistral-7B with GPU access on port 8000
docker run -d \
  --name vllm-server \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model mistralai/Mistral-7B-Instruct-v0.3 \
  --max-model-len 4096
```

A few things to note here. The `-v` flag mounts your local Hugging Face cache directory so model weights persist between container restarts. The `--max-model-len` flag limits the context window, which reduces GPU memory usage. Without it, vLLM tries to allocate memory for the model's full context length.

## Testing the API

Once the container is running, you can send requests using curl. The API follows the OpenAI Chat Completions format:

```bash
# Send a test chat completion request to the vLLM server
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Mistral-7B-Instruct-v0.3",
    "messages": [
      {"role": "user", "content": "Explain Docker in three sentences."}
    ],
    "max_tokens": 256,
    "temperature": 0.7
  }'
```

You should receive a JSON response with the model's generated text within a few seconds.

## Using Docker Compose for Production

For production deployments, a Docker Compose file gives you more control over configuration and makes the setup easier to version control.

```yaml
# docker-compose.yml - vLLM production deployment
version: "3.8"

services:
  vllm:
    image: vllm/vllm-openai:latest
    container_name: vllm-server
    ports:
      - "8000:8000"
    volumes:
      # Persist downloaded model weights on the host
      - model-cache:/root/.cache/huggingface
    environment:
      - HUGGING_FACE_HUB_TOKEN=${HF_TOKEN}
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    command: >
      --model mistralai/Mistral-7B-Instruct-v0.3
      --max-model-len 4096
      --tensor-parallel-size 1
      --gpu-memory-utilization 0.90
      --host 0.0.0.0
      --port 8000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  model-cache:
```

Start the service with:

```bash
# Launch vLLM using Compose (detached mode)
HF_TOKEN=your_token_here docker compose up -d
```

The `--gpu-memory-utilization 0.90` flag tells vLLM to use up to 90% of available GPU memory for KV cache. This is a good default. Going higher risks out-of-memory errors during peak load.

## Serving Gated Models

Some models on Hugging Face require you to accept a license before downloading. Llama 2 and Llama 3 are common examples. Pass your Hugging Face token as an environment variable:

```bash
# Serve a gated model by providing your HF token
docker run -d \
  --name vllm-llama \
  --gpus all \
  -p 8000:8000 \
  -e HUGGING_FACE_HUB_TOKEN=hf_your_token_here \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model meta-llama/Meta-Llama-3-8B-Instruct \
  --max-model-len 8192
```

## Multi-GPU Tensor Parallelism

If you have multiple GPUs, vLLM can split the model across them using tensor parallelism. This allows you to serve larger models that would not fit on a single GPU:

```bash
# Serve a 70B model across 4 GPUs using tensor parallelism
docker run -d \
  --name vllm-70b \
  --gpus all \
  --shm-size=16g \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model meta-llama/Meta-Llama-3-70B-Instruct \
  --tensor-parallel-size 4 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.90
```

The `--shm-size=16g` flag increases shared memory, which is required for inter-process communication when using multiple GPUs.

## Quantized Models for Lower VRAM

When GPU memory is limited, quantized models let you run larger models on smaller hardware. vLLM supports AWQ and GPTQ quantization formats:

```bash
# Run a 4-bit quantized model to reduce VRAM usage
docker run -d \
  --name vllm-quantized \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model TheBloke/Mistral-7B-Instruct-v0.2-AWQ \
  --quantization awq \
  --max-model-len 4096
```

A 4-bit AWQ model typically uses around 25% of the VRAM that the full-precision version requires.

## Monitoring with Prometheus

vLLM exposes Prometheus metrics on its server endpoint, which you can scrape for monitoring throughput, latency, and queue depth:

```yaml
# prometheus.yml - scrape config for vLLM metrics
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "vllm"
    static_configs:
      - targets: ["vllm-server:8000"]
    metrics_path: /metrics
```

Key metrics to watch include `vllm:num_requests_running`, `vllm:num_requests_waiting`, and `vllm:avg_generation_throughput_toks_per_s`. These tell you whether your server is keeping up with demand or if you need to scale.

## Building a Custom Image

If you need additional Python packages or custom model loading logic, build your own image on top of the official one:

```dockerfile
# Dockerfile - custom vLLM image with extra dependencies
FROM vllm/vllm-openai:latest

# Install additional packages for custom post-processing
RUN pip install --no-cache-dir langchain tiktoken

# Copy custom entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

## Performance Tuning Tips

Several configuration flags affect vLLM throughput significantly:

- `--max-num-batched-tokens`: Controls the maximum batch size. Higher values improve throughput but increase latency and VRAM usage.
- `--max-num-seqs`: Limits concurrent sequences. Set this based on your expected concurrency.
- `--enable-prefix-caching`: Reuses KV cache for prompts that share a common prefix. Useful for chatbots where system prompts repeat.
- `--disable-log-requests`: Reduces I/O overhead in production.

```bash
# Tuned production configuration for high throughput
docker run -d \
  --name vllm-tuned \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model mistralai/Mistral-7B-Instruct-v0.3 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.92 \
  --max-num-batched-tokens 8192 \
  --max-num-seqs 128 \
  --enable-prefix-caching \
  --disable-log-requests
```

## Conclusion

vLLM in Docker provides a clean, reproducible way to serve LLMs with production-grade performance. The PagedAttention mechanism, combined with Docker's isolation and GPU passthrough, gives you a setup that can handle real traffic. Start with the single-container approach, benchmark with your actual workloads, and then tune the batch size and memory utilization parameters to match your requirements. For teams that need to serve multiple models or handle variable load, consider running multiple vLLM containers behind a load balancer, each pinned to specific GPUs.
