# How to Serve AI Models Using vLLM on RHEL for Production Inference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, vLLM, AI, Inference, LLM

Description: Deploy vLLM on RHEL for high-throughput, low-latency LLM inference serving with an OpenAI-compatible API for production applications.

---

vLLM is a high-throughput serving engine for large language models. It uses PagedAttention to efficiently manage GPU memory, enabling higher throughput than naive serving approaches. Here is how to set it up on RHEL for production inference.

## Prerequisites

- RHEL 9 with an NVIDIA GPU (A100, H100, or similar)
- NVIDIA drivers and CUDA toolkit installed
- Python 3.10 or 3.11

## Install NVIDIA Drivers and CUDA

```bash
# Add the CUDA repository
sudo dnf config-manager --add-repo \
    https://developer.download.nvidia.com/compute/cuda/repos/rhel9/x86_64/cuda-rhel9.repo

# Install CUDA toolkit
sudo dnf install -y cuda-toolkit-12-4

# Verify GPU access
nvidia-smi
```

## Install vLLM

```bash
# Create a virtual environment
python3.11 -m venv ~/vllm-env
source ~/vllm-env/bin/activate

# Install vLLM
pip install vllm

# Verify installation
python -c "import vllm; print(vllm.__version__)"
```

## Start the vLLM Server

```bash
# Serve a model with the OpenAI-compatible API
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len 4096 \
    --gpu-memory-utilization 0.9
```

For models requiring authentication:

```bash
# Set your Hugging Face token
export HF_TOKEN="your_token_here"

python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --host 0.0.0.0 \
    --port 8000
```

## Test the API

```bash
# Send a chat completion request
curl http://localhost:8000/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "meta-llama/Llama-3.1-8B-Instruct",
        "messages": [
            {"role": "user", "content": "How do I check disk usage on RHEL?"}
        ],
        "max_tokens": 256,
        "temperature": 0.7
    }'

# Test the completions endpoint
curl http://localhost:8000/v1/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "meta-llama/Llama-3.1-8B-Instruct",
        "prompt": "The capital of France is",
        "max_tokens": 50
    }'
```

## Create a systemd Service

```bash
sudo tee /etc/systemd/system/vllm.service << 'EOF'
[Unit]
Description=vLLM Inference Server
After=network.target

[Service]
Type=simple
User=vllm
Environment=HF_TOKEN=your_token_here
ExecStart=/home/vllm/vllm-env/bin/python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len 4096 \
    --gpu-memory-utilization 0.9
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now vllm
```

## Configure Firewall

```bash
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

## Multi-GPU Serving

For models too large for a single GPU:

```bash
# Use tensor parallelism across 4 GPUs
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-70B-Instruct \
    --tensor-parallel-size 4 \
    --host 0.0.0.0 \
    --port 8000
```

vLLM on RHEL provides a production-ready inference server with an OpenAI-compatible API, making it straightforward to integrate LLMs into your applications.
