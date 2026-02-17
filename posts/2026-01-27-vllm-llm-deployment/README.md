# How to Deploy LLMs with vLLM for High-Performance Inference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: vLLM, LLM, AI, Inference, GPU, Machine Learning, Model Serving, Python

Description: Learn how to deploy large language models with vLLM for high-throughput inference, including PagedAttention, continuous batching, and API serving.

---

> vLLM is an open-source library that delivers state-of-the-art serving throughput for large language models. With innovations like PagedAttention and continuous batching, vLLM can serve LLMs 10-24x faster than standard implementations, making it the go-to choice for production LLM deployments.

Whether you are running Llama, Mistral, or other popular models, vLLM provides a simple yet powerful way to serve them with minimal latency and maximum throughput. This guide covers everything from basic setup to production deployment patterns.

---

## What is vLLM and Why Use It?

vLLM is a fast and easy-to-use library for LLM inference and serving. Key advantages include:

- **High Throughput**: Achieves up to 24x higher throughput than HuggingFace Transformers
- **PagedAttention**: Novel attention algorithm that efficiently manages memory
- **Continuous Batching**: Dynamically batches incoming requests for optimal GPU utilization
- **OpenAI-Compatible API**: Drop-in replacement for OpenAI API endpoints
- **Tensor Parallelism**: Distribute models across multiple GPUs
- **Quantization Support**: Run larger models with reduced memory using GPTQ, AWQ, and more

---

## Prerequisites

Before we begin, ensure you have:
- Python 3.8 or higher
- CUDA 11.8 or higher (for GPU support)
- A compatible NVIDIA GPU with sufficient VRAM
- pip for package management

---

## Installation and Setup

### Basic Installation

Install vLLM using pip. The package includes all necessary dependencies for GPU inference:

```bash
# Install vLLM with pip
# This installs the core library with CUDA support
pip install vllm

# For the latest features, install from source
pip install git+https://github.com/vllm-project/vllm.git
```

### Verify Installation

```python
# verify_install.py
import vllm
print(f"vLLM version: {vllm.__version__}")

# Check CUDA availability
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
print(f"GPU count: {torch.cuda.device_count()}")

# List available GPUs
for i in range(torch.cuda.device_count()):
    print(f"GPU {i}: {torch.cuda.get_device_name(i)}")
```

---

## PagedAttention Explained

PagedAttention is the core innovation that makes vLLM fast. Traditional attention mechanisms allocate contiguous memory for each sequence, leading to fragmentation and waste.

### How PagedAttention Works

```
Traditional Attention Memory:
[Sequence 1 ████████░░░░░░░░]  <- Wasted space for max length
[Sequence 2 ██████░░░░░░░░░░]  <- More wasted space
[Sequence 3 ████░░░░░░░░░░░░]  <- Even more waste

PagedAttention Memory:
[Block 1: Seq1] [Block 2: Seq1] [Block 3: Seq2] [Block 4: Seq3]
[Block 5: Seq1] [Block 6: Seq2] [Block 7: Seq2] [Block 8: Seq3]
                <- No wasted space, blocks allocated on demand
```

Key benefits:
- **Near-zero memory waste**: Memory allocated in fixed-size blocks as needed
- **Efficient KV cache sharing**: Multiple sequences can share prompt blocks
- **Better batching**: More sequences fit in memory simultaneously

---

## Loading Models

### Basic Model Loading

Load models using the LLM class. vLLM handles tokenization, model loading, and optimization automatically:

```python
# basic_inference.py
from vllm import LLM, SamplingParams

# Initialize the LLM with a HuggingFace model
# vLLM downloads and caches the model automatically
llm = LLM(
    model="meta-llama/Llama-2-7b-chat-hf",  # Model name from HuggingFace
    trust_remote_code=True,                  # Allow custom model code
    dtype="auto",                            # Automatically select dtype (fp16/bf16)
)

# Define sampling parameters for text generation
sampling_params = SamplingParams(
    temperature=0.7,      # Controls randomness (0 = deterministic)
    top_p=0.9,           # Nucleus sampling threshold
    max_tokens=256,      # Maximum tokens to generate
    stop=["</s>", "\n\n"]  # Stop sequences
)

# Generate completions for a batch of prompts
prompts = [
    "Explain what Kubernetes is in simple terms:",
    "Write a Python function to calculate factorial:",
    "What are the benefits of microservices architecture?"
]

# Batch inference - vLLM handles batching internally
outputs = llm.generate(prompts, sampling_params)

# Process and print results
for output in outputs:
    prompt = output.prompt
    generated_text = output.outputs[0].text
    print(f"Prompt: {prompt[:50]}...")
    print(f"Response: {generated_text}\n")
```

### Advanced Model Configuration

Configure model loading with memory optimization and GPU settings:

```python
# advanced_loading.py
from vllm import LLM, SamplingParams

# Advanced LLM configuration for production use
llm = LLM(
    model="mistralai/Mistral-7B-Instruct-v0.2",

    # Memory configuration
    gpu_memory_utilization=0.90,  # Use 90% of GPU memory
    max_model_len=4096,           # Maximum context length

    # Performance tuning
    enforce_eager=False,          # Enable CUDA graphs for faster inference

    # Quantization (reduces memory, slight quality tradeoff)
    quantization=None,            # Options: "awq", "gptq", "squeezellm"

    # Multi-GPU configuration
    tensor_parallel_size=1,       # Number of GPUs for tensor parallelism

    # Tokenizer settings
    tokenizer_mode="auto",        # Auto-detect tokenizer type

    # Caching
    download_dir="/models/cache", # Custom model cache directory
)

# Chat-style prompts with system message
def format_chat_prompt(system: str, user: str) -> str:
    """Format prompt for instruction-tuned models"""
    return f"&lt;s&gt;[INST] {system}\n\n{user} [/INST]"

# Example usage with chat formatting
system_prompt = "You are a helpful DevOps assistant."
user_query = "How do I set up a Kubernetes deployment?"

formatted_prompt = format_chat_prompt(system_prompt, user_query)

sampling_params = SamplingParams(
    temperature=0.3,     # Lower temperature for more focused responses
    top_p=0.95,
    max_tokens=512,
    presence_penalty=0.1,  # Slight penalty to reduce repetition
)

output = llm.generate([formatted_prompt], sampling_params)
print(output[0].outputs[0].text)
```

---

## OpenAI-Compatible API Server

vLLM provides an OpenAI-compatible API server, making it easy to switch from OpenAI to self-hosted models.

### Starting the Server

```bash
# Start the vLLM API server
# This creates an OpenAI-compatible endpoint at localhost:8000
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-2-7b-chat-hf \
    --host 0.0.0.0 \
    --port 8000 \
    --tensor-parallel-size 1 \
    --gpu-memory-utilization 0.90

# With API key authentication
python -m vllm.entrypoints.openai.api_server \
    --model mistralai/Mistral-7B-Instruct-v0.2 \
    --api-key your-secret-api-key \
    --host 0.0.0.0 \
    --port 8000
```

### Using the API with OpenAI Client

```python
# openai_client.py
from openai import OpenAI

# Point the OpenAI client to your vLLM server
client = OpenAI(
    base_url="http://localhost:8000/v1",  # vLLM server URL
    api_key="your-secret-api-key",        # API key if configured
)

# Chat completion - works exactly like OpenAI API
response = client.chat.completions.create(
    model="mistralai/Mistral-7B-Instruct-v0.2",  # Model name from server
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain container orchestration."}
    ],
    temperature=0.7,
    max_tokens=256,
)

print(response.choices[0].message.content)

# Streaming responses for real-time output
stream = client.chat.completions.create(
    model="mistralai/Mistral-7B-Instruct-v0.2",
    messages=[
        {"role": "user", "content": "Write a haiku about cloud computing."}
    ],
    stream=True,  # Enable streaming
)

# Process streamed tokens as they arrive
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()  # Newline after completion
```

### Using with curl

```bash
# Test the API with curl
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key" \
  -d '{
    "model": "mistralai/Mistral-7B-Instruct-v0.2",
    "messages": [
      {"role": "user", "content": "What is observability?"}
    ],
    "temperature": 0.7,
    "max_tokens": 256
  }'
```

---

## Continuous Batching

Continuous batching is vLLM's approach to request scheduling that maximizes throughput by dynamically batching requests.

### How Continuous Batching Works

Unlike static batching that waits for a batch to fill, continuous batching:

1. **Adds new requests immediately**: No waiting for batch formation
2. **Removes completed sequences**: Frees memory as soon as a sequence finishes
3. **Maximizes GPU utilization**: Keeps the GPU busy with optimal batch sizes

```python
# continuous_batching_demo.py
import asyncio
from vllm import AsyncLLMEngine, SamplingParams
from vllm.engine.arg_utils import AsyncEngineArgs

async def main():
    # Configure async engine for continuous batching
    engine_args = AsyncEngineArgs(
        model="meta-llama/Llama-2-7b-chat-hf",
        gpu_memory_utilization=0.90,
        max_num_batched_tokens=4096,  # Max tokens per batch
        max_num_seqs=256,              # Max concurrent sequences
    )

    # Initialize the async engine
    engine = AsyncLLMEngine.from_engine_args(engine_args)

    sampling_params = SamplingParams(
        temperature=0.7,
        max_tokens=100
    )

    # Simulate concurrent requests
    prompts = [
        f"Question {i}: Explain topic {i}"
        for i in range(10)
    ]

    async def generate(prompt: str, request_id: str):
        """Generate completion for a single request"""
        results_generator = engine.generate(prompt, sampling_params, request_id)

        final_output = None
        async for output in results_generator:
            final_output = output

        return final_output

    # Submit all requests concurrently
    # vLLM batches these automatically for optimal throughput
    tasks = [
        generate(prompt, f"request-{i}")
        for i, prompt in enumerate(prompts)
    ]

    results = await asyncio.gather(*tasks)

    for result in results:
        print(f"Request {result.request_id}: {result.outputs[0].text[:50]}...")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Tensor Parallelism

Tensor parallelism distributes a single model across multiple GPUs, enabling you to run models larger than a single GPU's memory.

### Multi-GPU Configuration

```python
# tensor_parallel.py
from vllm import LLM, SamplingParams

# Distribute model across 4 GPUs using tensor parallelism
# Each GPU holds a portion of the model weights
llm = LLM(
    model="meta-llama/Llama-2-70b-chat-hf",  # Large model
    tensor_parallel_size=4,                    # Use 4 GPUs
    gpu_memory_utilization=0.90,
    dtype="float16",
)

sampling_params = SamplingParams(
    temperature=0.7,
    max_tokens=256
)

# Inference works the same way
# vLLM handles cross-GPU communication automatically
prompts = ["Explain distributed computing in detail:"]
outputs = llm.generate(prompts, sampling_params)

print(outputs[0].outputs[0].text)
```

### Server with Tensor Parallelism

```bash
# Start server with tensor parallelism across 4 GPUs
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-2-70b-chat-hf \
    --tensor-parallel-size 4 \
    --host 0.0.0.0 \
    --port 8000

# For multi-node deployment (across multiple machines)
# Node 0 (master)
RAY_HEAD_ADDRESS=<node0-ip>:6379 python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-2-70b-chat-hf \
    --tensor-parallel-size 8 \
    --pipeline-parallel-size 2
```

---

## Quantization Options

Quantization reduces model memory footprint while maintaining acceptable quality. vLLM supports multiple quantization formats.

### AWQ Quantization

```python
# awq_quantization.py
from vllm import LLM, SamplingParams

# Load an AWQ-quantized model
# AWQ models use 4-bit weights, reducing memory by ~4x
llm = LLM(
    model="TheBloke/Llama-2-7B-Chat-AWQ",  # Pre-quantized model
    quantization="awq",                     # Specify quantization format
    gpu_memory_utilization=0.90,
)

# Inference is identical to full-precision models
sampling_params = SamplingParams(temperature=0.7, max_tokens=256)
outputs = llm.generate(["Explain machine learning:"], sampling_params)
print(outputs[0].outputs[0].text)
```

### GPTQ Quantization

```python
# gptq_quantization.py
from vllm import LLM, SamplingParams

# Load a GPTQ-quantized model
llm = LLM(
    model="TheBloke/Llama-2-13B-chat-GPTQ",
    quantization="gptq",
    dtype="float16",  # GPTQ requires float16
    gpu_memory_utilization=0.90,
)

sampling_params = SamplingParams(temperature=0.7, max_tokens=256)
outputs = llm.generate(["What is observability?"], sampling_params)
print(outputs[0].outputs[0].text)
```

### Quantization Comparison

| Method | Bits | Memory Reduction | Quality Impact | Speed |
|--------|------|------------------|----------------|-------|
| None   | 16   | Baseline         | Baseline       | Fast  |
| AWQ    | 4    | ~4x smaller      | Minimal        | Fast  |
| GPTQ   | 4    | ~4x smaller      | Minimal        | Fast  |
| SqueezeLLM | 4 | ~4x smaller    | Low            | Moderate |

---

## Performance Tuning

### Memory Optimization

```python
# performance_tuning.py
from vllm import LLM, SamplingParams

# Optimized configuration for maximum throughput
llm = LLM(
    model="mistralai/Mistral-7B-Instruct-v0.2",

    # Memory settings
    gpu_memory_utilization=0.95,     # Use more GPU memory
    max_model_len=8192,              # Adjust based on your use case

    # Batching settings
    max_num_batched_tokens=8192,     # Max tokens per iteration
    max_num_seqs=512,                # Max concurrent sequences

    # Performance optimizations
    enforce_eager=False,             # Use CUDA graphs
    enable_prefix_caching=True,      # Cache common prefixes

    # Block size for PagedAttention
    block_size=16,                   # Memory block size (16 or 32)
)

# Sampling params optimized for throughput
sampling_params = SamplingParams(
    temperature=0.7,
    top_p=0.9,
    max_tokens=256,

    # Early stopping improves throughput
    stop=["</s>", "\n\n", "Human:", "Assistant:"],

    # Skip special tokens in output
    skip_special_tokens=True,
)
```

### Benchmarking Throughput

```python
# benchmark.py
import time
from vllm import LLM, SamplingParams

def benchmark_throughput(llm: LLM, num_prompts: int = 100):
    """Measure tokens per second throughput"""

    # Generate test prompts
    prompts = [f"Write a short paragraph about topic {i}:" for i in range(num_prompts)]

    sampling_params = SamplingParams(
        temperature=0.7,
        max_tokens=100,
    )

    # Warm up the model
    _ = llm.generate(prompts[:5], sampling_params)

    # Benchmark
    start_time = time.perf_counter()
    outputs = llm.generate(prompts, sampling_params)
    end_time = time.perf_counter()

    # Calculate metrics
    total_tokens = sum(
        len(output.outputs[0].token_ids)
        for output in outputs
    )
    elapsed_time = end_time - start_time
    tokens_per_second = total_tokens / elapsed_time

    print(f"Prompts processed: {num_prompts}")
    print(f"Total output tokens: {total_tokens}")
    print(f"Time elapsed: {elapsed_time:.2f} seconds")
    print(f"Throughput: {tokens_per_second:.2f} tokens/second")
    print(f"Latency per request: {elapsed_time / num_prompts * 1000:.2f} ms")

    return tokens_per_second

# Run benchmark
llm = LLM(model="mistralai/Mistral-7B-Instruct-v0.2")
benchmark_throughput(llm, num_prompts=100)
```

---

## Production Deployment Patterns

### Docker Deployment

```dockerfile
# Dockerfile
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install vLLM
RUN pip3 install vllm

# Create model cache directory
RUN mkdir -p /models

# Set environment variables
ENV HF_HOME=/models
ENV CUDA_VISIBLE_DEVICES=0

# Copy startup script
COPY start_server.sh /start_server.sh
RUN chmod +x /start_server.sh

# Expose API port
EXPOSE 8000

# Start the server
CMD ["/start_server.sh"]
```

```bash
# start_server.sh
#!/bin/bash
python3 -m vllm.entrypoints.openai.api_server \
    --model ${MODEL_NAME:-"mistralai/Mistral-7B-Instruct-v0.2"} \
    --host 0.0.0.0 \
    --port 8000 \
    --tensor-parallel-size ${TENSOR_PARALLEL_SIZE:-1} \
    --gpu-memory-utilization ${GPU_MEMORY_UTIL:-0.90} \
    --max-model-len ${MAX_MODEL_LEN:-4096}
```

### Kubernetes Deployment

```yaml
# vllm-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-server
  labels:
    app: vllm
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vllm
  template:
    metadata:
      labels:
        app: vllm
    spec:
      containers:
      - name: vllm
        image: vllm/vllm-openai:latest
        ports:
        - containerPort: 8000
        env:
        - name: MODEL_NAME
          value: "mistralai/Mistral-7B-Instruct-v0.2"
        - name: GPU_MEMORY_UTIL
          value: "0.90"
        resources:
          limits:
            nvidia.com/gpu: 1
            memory: "32Gi"
          requests:
            nvidia.com/gpu: 1
            memory: "16Gi"
        volumeMounts:
        - name: model-cache
          mountPath: /root/.cache/huggingface
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 120
          periodSeconds: 30
      volumes:
      - name: model-cache
        persistentVolumeClaim:
          claimName: model-cache-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: vllm-service
spec:
  selector:
    app: vllm
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
```

### Load Balancing Multiple Instances

```python
# load_balancer.py
import httpx
import asyncio
from typing import List
import random

class VLLMLoadBalancer:
    """Simple round-robin load balancer for vLLM instances"""

    def __init__(self, endpoints: List[str]):
        self.endpoints = endpoints
        self.current_index = 0
        self.client = httpx.AsyncClient(timeout=60.0)

    def get_next_endpoint(self) -> str:
        """Round-robin endpoint selection"""
        endpoint = self.endpoints[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.endpoints)
        return endpoint

    async def generate(self, messages: List[dict], **kwargs) -> dict:
        """Send request to next available endpoint"""
        endpoint = self.get_next_endpoint()

        payload = {
            "model": kwargs.get("model", "default"),
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 256),
        }

        response = await self.client.post(
            f"{endpoint}/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {kwargs.get('api_key', '')}"}
        )

        return response.json()

# Usage
async def main():
    balancer = VLLMLoadBalancer([
        "http://vllm-1:8000",
        "http://vllm-2:8000",
        "http://vllm-3:8000",
    ])

    # Concurrent requests are distributed across instances
    tasks = [
        balancer.generate(
            [{"role": "user", "content": f"Query {i}"}],
            model="mistral",
            temperature=0.7
        )
        for i in range(10)
    ]

    results = await asyncio.gather(*tasks)
    for r in results:
        print(r["choices"][0]["message"]["content"][:50])

asyncio.run(main())
```

---

## Health Checks and Monitoring

```python
# health_check.py
import httpx
import time
from dataclasses import dataclass
from typing import Optional

@dataclass
class HealthStatus:
    healthy: bool
    latency_ms: float
    model_loaded: bool
    gpu_memory_used: Optional[float] = None
    error: Optional[str] = None

def check_vllm_health(endpoint: str) -> HealthStatus:
    """Check vLLM server health and metrics"""

    start_time = time.perf_counter()

    try:
        # Check health endpoint
        response = httpx.get(f"{endpoint}/health", timeout=5.0)
        latency_ms = (time.perf_counter() - start_time) * 1000

        if response.status_code == 200:
            return HealthStatus(
                healthy=True,
                latency_ms=latency_ms,
                model_loaded=True,
            )
        else:
            return HealthStatus(
                healthy=False,
                latency_ms=latency_ms,
                model_loaded=False,
                error=f"Status code: {response.status_code}"
            )

    except httpx.TimeoutException:
        return HealthStatus(
            healthy=False,
            latency_ms=5000,
            model_loaded=False,
            error="Timeout"
        )
    except Exception as e:
        return HealthStatus(
            healthy=False,
            latency_ms=0,
            model_loaded=False,
            error=str(e)
        )

# Usage
status = check_vllm_health("http://localhost:8000")
print(f"Healthy: {status.healthy}")
print(f"Latency: {status.latency_ms:.2f}ms")
```

---

## Best Practices Summary

### Memory Management
- Set `gpu_memory_utilization` to 0.90-0.95 for production
- Use quantization (AWQ/GPTQ) for larger models
- Monitor GPU memory with `nvidia-smi`

### Performance Optimization
- Enable prefix caching for repeated prompts
- Use appropriate `max_model_len` for your use case
- Tune `max_num_batched_tokens` based on workload

### Production Deployment
- Use health checks and readiness probes
- Implement load balancing for high availability
- Cache models on persistent storage
- Set resource limits in Kubernetes

### Monitoring
- Track tokens per second throughput
- Monitor request latency percentiles
- Alert on GPU memory pressure
- Log generation failures

---

## Conclusion

vLLM provides a production-ready solution for deploying large language models with exceptional performance. Key takeaways:

- **PagedAttention** eliminates memory waste and enables higher throughput
- **Continuous batching** maximizes GPU utilization
- **OpenAI-compatible API** simplifies migration from cloud services
- **Tensor parallelism** enables running models larger than single GPU memory
- **Quantization** reduces memory requirements with minimal quality loss

With proper configuration and deployment patterns, vLLM can serve LLMs at scale while maintaining low latency and high throughput.

---

*Need to monitor your LLM deployments? [OneUptime](https://oneuptime.com) provides comprehensive observability for AI infrastructure, including GPU metrics, latency tracking, and error monitoring. Get started with our free tier today.*

**Related Reading:**
- [Monitoring LLM Applications with Openlit and OneUptime](https://oneuptime.com/blog/post/2024-09-13-monitoring-llm-with-openlit-and-oneuptime/view)
- [How to Instrument Python Applications with OpenTelemetry](https://oneuptime.com/blog/post/2025-01-06-instrument-python-opentelemetry/view)
