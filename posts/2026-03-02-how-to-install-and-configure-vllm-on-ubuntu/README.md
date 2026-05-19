# How to Install and Configure vLLM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VLLM, LLM, GPU, Machine Learning

Description: A complete guide to installing vLLM on Ubuntu for high-throughput LLM inference, serving models via the OpenAI-compatible API, and optimizing throughput for production use.

---

vLLM is a high-performance library for LLM (Large Language Model) inference. It implements PagedAttention - an efficient memory management algorithm for the KV cache - which significantly increases throughput compared to naive implementations. It also provides an OpenAI-compatible REST API server, making it easy to swap in as a backend for applications that already use the OpenAI API.

## What Makes vLLM Different

Standard LLM inference often allocates contiguous KV cache memory for each sequence. vLLM's PagedAttention manages KV cache like virtual memory pages - allocating fixed-size blocks on demand and enabling cache sharing where requests overlap. This allows:

- Up to 24x higher throughput than Hugging Face Transformers in the original vLLM benchmarks
- Efficient batching of requests with different sequence lengths
- Continuous batching (new requests added to existing batches)

## Prerequisites

- Ubuntu 22.04 or 24.04
- NVIDIA GPU with at least 16GB VRAM (24GB+ recommended for 7B models)
- NVIDIA driver new enough for the CUDA backend selected by PyTorch/vLLM
- Python 3.10-3.13
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
# Install Python, venv, curl, and uv
sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv curl
curl -LsSf https://astral.sh/uv/install.sh | sh
source "$HOME/.local/bin/env"

# Create a dedicated venv
uv venv --python 3.12 --seed --managed-python ~/vllm-env
source ~/vllm-env/bin/activate

# Upgrade pip
pip install --upgrade pip
```

## Step 3: Install vLLM

```bash
# Install vLLM with a PyTorch backend selected for your CUDA driver
uv pip install vllm --torch-backend=auto

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
vllm serve meta-llama/Llama-3.2-1B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --served-model-name "llama-3.2-1b"

# Or use a locally downloaded model
vllm serve /opt/models/llama-3.2-1b-instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --served-model-name "llama-3.2-1b"  # Name used in API requests
```

### Server Options

```bash
vllm serve meta-llama/Meta-Llama-3-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 2 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.90 \
  --dtype bfloat16 \
  --max-num-seqs 256 \
  --enable-chunked-prefill \
  --api-key "your-secret-key"
```

`--tensor-parallel-size 2` uses 2 GPUs, `--max-model-len` limits context length to reduce VRAM usage, `--gpu-memory-utilization 0.90` reserves 90% of GPU memory for the vLLM instance, `--dtype bfloat16` is suitable for GPUs with BF16 support, `--max-num-seqs` controls concurrent sequences, `--enable-chunked-prefill` can improve scheduling for long prompts, and `--api-key` makes the server require an API key.

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
vllm serve TheBloke/Llama-2-13B-chat-AWQ \
  --quantization awq \
  --max-model-len 4096

# GPTQ quantized model
vllm serve TheBloke/Llama-2-13B-chat-GPTQ \
  --quantization gptq

# bitsandbytes (4-bit, slower than AWQ/GPTQ but more models available)
vllm serve meta-llama/Meta-Llama-3-70B-Instruct \
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
# Cache models here
Environment="HF_HOME=/opt/models"

ExecStart=/home/ubuntu/vllm-env/bin/vllm serve meta-llama/Llama-3.2-1B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --served-model-name llama-3.2-1b \
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

# Run offline throughput benchmark
vllm bench throughput \
  --backend vllm \
  --model meta-llama/Llama-3.2-1B-Instruct \
  --dataset-name sharegpt \
  --dataset-path ShareGPT_V3_unfiltered_cleaned_split.json \
  --num-prompts 1000

# Online serving benchmark (requires server to be running)
vllm bench serve \
  --backend openai-chat \
  --model llama-3.2-1b \
  --base-url http://localhost:8000 \
  --num-prompts 100 \
  --request-rate 10  # requests per second
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
