# How to Install and Configure vLLM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, vLLM, LLM, GPU, Machine Learning

Description: A complete guide to installing vLLM on Ubuntu for high-throughput LLM inference, serving models via the OpenAI-compatible API, and optimizing throughput for production use.

---

vLLM is a high-performance library for LLM (Large Language Model) inference. It implements PagedAttention - an efficient memory management algorithm for the KV cache - which significantly increases throughput compared to naive implementations. It also provides an OpenAI-compatible REST API, making it easy to swap in as a backend for applications that already use the OpenAI API.

## What Makes vLLM Different

Standard LLM inference allocates KV cache memory upfront for the maximum sequence length. vLLM's PagedAttention manages KV cache like virtual memory pages - allocating blocks on demand and sharing cache between concurrent requests. This allows:

- 2-4x higher throughput than Hugging Face Transformers serving
- Efficient batching of requests with different sequence lengths
- Continuous batching (new requests added to existing batches)

## Prerequisites

- Ubuntu 20.04 or 22.04
- NVIDIA GPU with at least 16GB VRAM (24GB+ recommended for 7B models)
- NVIDIA driver 525+ and CUDA 12.1+
- Python 3.9-3.12
- At least 32GB system RAM

For smaller GPUs, quantized models (GPTQ, AWQ, bitsandbytes) reduce VRAM requirements significantly.

## Step 1: Verify GPU Setup

```bash
# Check GPU and driver
nvidia-smi

# Check CUDA version
nvcc --version || nvidia-smi | grep "CUDA Version"

# Check available GPU memory
nvidia-smi --query-gpu=memory.total,memory.free --format=csv
```

## Step 2: Create Python Environment

```bash
# Install Python and venv
sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv

# Create a dedicated venv
python3 -m venv ~/vllm-env
source ~/vllm-env/bin/activate

# Upgrade pip
pip install --upgrade pip
```

## Step 3: Install vLLM

```bash
# Install vLLM with CUDA support
pip install vllm

# This installs PyTorch with CUDA, vLLM, and all dependencies
# Installation can take 10-20 minutes due to large CUDA packages

# Verify installation
python3 -c "import vllm; print(vllm.__version__)"
```

## Step 4: Download a Model

vLLM loads models from Hugging Face Hub. Some models require accepting usage agreements on the HF website. For open models:

```bash
# Install huggingface_hub for model downloading
pip install huggingface_hub

# Optional: authenticate for gated models
huggingface-cli login

# Pre-download a model (optional - vLLM downloads on first use)
python3 -c "
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id='meta-llama/Llama-3.2-1B-Instruct',  # Small model for testing
    # repo_id='meta-llama/Meta-Llama-3-8B-Instruct',  # 8B model, needs 16GB VRAM
    local_dir='/opt/models/llama-3.2-1b-instruct'
)
"
```

## Step 5: Run vLLM as an OpenAI-Compatible Server

```bash
# Start the server with a small model
python3 -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.2-1B-Instruct \
  --host 0.0.0.0 \
  --port 8000

# Or use a locally downloaded model
python3 -m vllm.entrypoints.openai.api_server \
  --model /opt/models/llama-3.2-1b-instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --served-model-name "llama-3.2-1b"  # Name used in API requests
```

### Server Options

```bash
python3 -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 2 \      # Use 2 GPUs (must divide num attention heads evenly)
  --max-model-len 4096 \          # Max context length (reduces VRAM usage)
  --gpu-memory-utilization 0.90 \ # Use 90% of GPU memory for model + KV cache
  --dtype bfloat16 \              # Use bfloat16 for A100/H100, float16 for RTX series
  --max-num-seqs 256 \            # Max concurrent sequences
  --enable-chunked-prefill \      # Improve throughput for long prompts
  --api-key "your-secret-key"     # Optional: require API key
```

## Querying the Server

The API is fully compatible with OpenAI's API:

```bash
# Chat completion
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.2-1b",
    "messages": [
      {"role": "user", "content": "Explain what a KV cache is in 2 sentences."}
    ],
    "max_tokens": 200,
    "temperature": 0.7
  }'

# Text completion
curl http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.2-1b",
    "prompt": "The capital of France is",
    "max_tokens": 50
  }'

# List available models
curl http://localhost:8000/v1/models
```

## Python Client

```python
#!/usr/bin/env python3
# Use the openai library to talk to vLLM

from openai import OpenAI

# Point the client to your local vLLM server
client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="your-secret-key"  # Can be any string if no auth configured
)

# Simple chat completion
response = client.chat.completions.create(
    model="llama-3.2-1b",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is the difference between a process and a thread?"}
    ],
    max_tokens=300,
    temperature=0.7,
    stream=False
)

print(response.choices[0].message.content)

# Streaming response
stream = client.chat.completions.create(
    model="llama-3.2-1b",
    messages=[{"role": "user", "content": "Write a short poem about Linux."}],
    max_tokens=200,
    stream=True
)

print("Streaming response: ", end='', flush=True)
for chunk in stream:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end='', flush=True)
print()
```

## Using Quantized Models

For GPUs with less VRAM, quantized models reduce memory requirements:

```bash
# AWQ quantized model (very fast inference)
python3 -m vllm.entrypoints.openai.api_server \
  --model TheBloke/Llama-2-13B-chat-AWQ \
  --quantization awq \
  --max-model-len 4096

# GPTQ quantized model
python3 -m vllm.entrypoints.openai.api_server \
  --model TheBloke/Llama-2-13B-chat-GPTQ \
  --quantization gptq

# bitsandbytes (4-bit, slower than AWQ/GPTQ but more models available)
python3 -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-70B-Instruct \
  --quantization bitsandbytes \
  --load-format bitsandbytes \
  --tensor-parallel-size 4
```

## Running as a Systemd Service

```bash
sudo tee /etc/systemd/system/vllm.service << 'EOF'
[Unit]
Description=vLLM OpenAI-Compatible Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu

Environment="PATH=/home/ubuntu/vllm-env/bin:/usr/local/cuda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"
Environment="HF_HOME=/opt/models"  # Cache models here

ExecStart=/home/ubuntu/vllm-env/bin/python3 \
  -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.2-1B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.90

Restart=on-failure
RestartSec=10

# GPU access
Environment="CUDA_VISIBLE_DEVICES=0"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable vllm
sudo systemctl start vllm

sudo journalctl -u vllm -f
```

## Benchmarking Throughput

vLLM includes a benchmarking tool:

```bash
# Install benchmark dependencies
pip install aiohttp

# Run throughput benchmark
python3 benchmarks/benchmark_throughput.py \
  --backend vllm \
  --model meta-llama/Llama-3.2-1B-Instruct \
  --dataset ShareGPT_V3_unfiltered_cleaned_split.json \
  --num-prompts 1000 \
  --request-rate 10  # requests per second

# Online serving benchmark (requires server to be running)
python3 benchmarks/benchmark_serving.py \
  --backend openai-chat \
  --model llama-3.2-1b \
  --base-url http://localhost:8000 \
  --num-prompts 100
```

## Troubleshooting

**CUDA out of memory during model loading:**
```bash
# Reduce max model length
--max-model-len 2048  # Reduces KV cache size

# Use quantization to reduce model weights size
--quantization awq

# Reduce GPU memory utilization
--gpu-memory-utilization 0.80
```

**Model downloads extremely slowly:**
```bash
# Enable fast download
HF_HUB_ENABLE_HF_TRANSFER=1 pip install hf_transfer
export HF_HUB_ENABLE_HF_TRANSFER=1
```

**Server starts but returns errors:**
```bash
# Check if the model name matches in the request
curl http://localhost:8000/v1/models

# View server logs for detailed errors
sudo journalctl -u vllm --since "5 minutes ago" -f
```

**Slow first request:**
- vLLM warms up the CUDA kernels on the first request - this is normal
- Subsequent requests are much faster
- Consider sending a warmup request after startup

vLLM's OpenAI compatibility means you can serve models locally and swap the endpoint in existing applications by just changing the base URL - no code changes required. For teams running RAG pipelines or AI-powered features against proprietary data, running vLLM on-premises is a practical alternative to sending data to external API providers.
