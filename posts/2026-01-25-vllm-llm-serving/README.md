# How to Configure vLLM for LLM Serving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: vLLM, LLM, Machine Learning, Model Serving, GPU

Description: Learn how to deploy and configure vLLM for high-throughput large language model serving with efficient memory management and batching.

---

Serving large language models in production requires careful attention to memory usage, throughput, and latency. vLLM is an open-source library that achieves state-of-the-art serving throughput through PagedAttention, a memory management technique that eliminates memory waste from KV cache fragmentation.

## Why vLLM?

Traditional LLM serving frameworks allocate contiguous memory for the KV cache of each request. This leads to memory fragmentation and limits batch sizes. vLLM solves this with PagedAttention, which manages KV cache memory in non-contiguous blocks, similar to virtual memory in operating systems.

Key benefits of vLLM:
- 2-4x higher throughput compared to HuggingFace Transformers
- Efficient memory sharing for parallel sampling
- Continuous batching for improved GPU utilization
- OpenAI-compatible API server

## Installing vLLM

Install vLLM with pip. You need a GPU with CUDA support.

```bash
# Install vLLM with CUDA 12.1 support
pip install vllm

# Or install from source for the latest features
pip install git+https://github.com/vllm-project/vllm.git

# Verify GPU is detected
python -c "import torch; print(torch.cuda.is_available())"
```

## Basic Model Serving

Start serving a model with a single command:

```bash
# Serve Llama 2 7B with default settings
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-2-7b-chat-hf \
    --port 8000

# Serve with specific GPU memory utilization
python -m vllm.entrypoints.openai.api_server \
    --model mistralai/Mistral-7B-Instruct-v0.2 \
    --gpu-memory-utilization 0.90 \
    --port 8000
```

Query the server using the OpenAI-compatible API:

```python
import requests
import json

# Send a completion request
response = requests.post(
    "http://localhost:8000/v1/completions",
    headers={"Content-Type": "application/json"},
    json={
        "model": "meta-llama/Llama-2-7b-chat-hf",
        "prompt": "Explain the concept of containerization in one paragraph:",
        "max_tokens": 200,
        "temperature": 0.7
    }
)

result = response.json()
print(result["choices"][0]["text"])
```

## Using vLLM Programmatically

For tighter integration, use vLLM directly in your Python code:

```python
from vllm import LLM, SamplingParams

# Initialize the model with specific configuration
llm = LLM(
    model="mistralai/Mistral-7B-Instruct-v0.2",
    tensor_parallel_size=1,      # Number of GPUs for tensor parallelism
    gpu_memory_utilization=0.85, # Reserve 15% GPU memory for other operations
    max_model_len=4096,          # Maximum sequence length
    trust_remote_code=True       # Required for some models
)

# Define sampling parameters
sampling_params = SamplingParams(
    temperature=0.8,
    top_p=0.95,
    max_tokens=256,
    stop=["</s>", "\n\n"]  # Stop sequences
)

# Generate completions for multiple prompts at once
prompts = [
    "Write a haiku about Kubernetes:",
    "Explain microservices in simple terms:",
    "What are the benefits of observability?"
]

outputs = llm.generate(prompts, sampling_params)

for output in outputs:
    prompt = output.prompt
    generated_text = output.outputs[0].text
    print(f"Prompt: {prompt}")
    print(f"Generated: {generated_text}")
    print("-" * 50)
```

## Deploying vLLM on Kubernetes

Create a production-ready deployment with proper resource allocation:

```yaml
# vllm-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-server
  namespace: ml-serving
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vllm-server
  template:
    metadata:
      labels:
        app: vllm-server
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:v0.3.0
          ports:
            - containerPort: 8000
          env:
            # HuggingFace token for gated models
            - name: HUGGING_FACE_HUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: hf-credentials
                  key: token
            # Model download cache location
            - name: HF_HOME
              value: /models
          args:
            - "--model"
            - "meta-llama/Llama-2-13b-chat-hf"
            - "--tensor-parallel-size"
            - "2"
            - "--gpu-memory-utilization"
            - "0.90"
            - "--max-model-len"
            - "4096"
            - "--host"
            - "0.0.0.0"
            - "--port"
            - "8000"
          resources:
            limits:
              nvidia.com/gpu: "2"  # Request 2 GPUs
              memory: "48Gi"
            requests:
              nvidia.com/gpu: "2"
              memory: "32Gi"
          volumeMounts:
            - name: model-cache
              mountPath: /models
            - name: shm
              mountPath: /dev/shm
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: model-cache-pvc
        - name: shm
          emptyDir:
            medium: Memory
            sizeLimit: 16Gi  # Shared memory for tensor parallelism
      nodeSelector:
        nvidia.com/gpu.product: NVIDIA-A100-SXM4-80GB
---
apiVersion: v1
kind: Service
metadata:
  name: vllm-service
  namespace: ml-serving
spec:
  selector:
    app: vllm-server
  ports:
    - port: 8000
      targetPort: 8000
  type: ClusterIP
```

Apply the deployment:

```bash
# Create namespace and secrets
kubectl create namespace ml-serving
kubectl create secret generic hf-credentials \
    --from-literal=token='your-hf-token' \
    -n ml-serving

# Create PVC for model cache
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: model-cache-pvc
  namespace: ml-serving
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
EOF

# Deploy vLLM
kubectl apply -f vllm-deployment.yaml
```

## Configuring Tensor Parallelism

For models that do not fit on a single GPU, use tensor parallelism to split the model across multiple GPUs:

```bash
# Serve a 70B model across 4 GPUs
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-2-70b-chat-hf \
    --tensor-parallel-size 4 \
    --gpu-memory-utilization 0.95 \
    --max-model-len 2048 \
    --port 8000
```

## Quantization for Efficiency

vLLM supports quantized models for lower memory usage:

```python
from vllm import LLM, SamplingParams

# Load an AWQ quantized model
llm = LLM(
    model="TheBloke/Llama-2-13B-chat-AWQ",
    quantization="awq",
    gpu_memory_utilization=0.85
)

# Or use GPTQ quantization
llm_gptq = LLM(
    model="TheBloke/Llama-2-13B-chat-GPTQ",
    quantization="gptq",
    gpu_memory_utilization=0.85
)

# Generate with the quantized model
params = SamplingParams(temperature=0.7, max_tokens=100)
output = llm.generate(["Hello, how are you?"], params)
print(output[0].outputs[0].text)
```

## Performance Tuning

Fine-tune vLLM performance with these configuration options:

```bash
python -m vllm.entrypoints.openai.api_server \
    --model mistralai/Mistral-7B-Instruct-v0.2 \
    --gpu-memory-utilization 0.90 \
    --max-num-batched-tokens 32768 \
    --max-num-seqs 256 \
    --block-size 16 \
    --swap-space 4 \
    --enforce-eager \
    --port 8000
```

Key parameters explained:
- `gpu-memory-utilization`: Fraction of GPU memory for KV cache (0.85-0.95 recommended)
- `max-num-batched-tokens`: Maximum tokens per batch (higher = better throughput)
- `max-num-seqs`: Maximum concurrent sequences
- `block-size`: KV cache block size (16 or 32)
- `swap-space`: CPU swap space in GB for overflow
- `enforce-eager`: Disable CUDA graphs for debugging

## Monitoring and Health Checks

vLLM exposes metrics for monitoring:

```python
import requests

# Health check endpoint
health = requests.get("http://localhost:8000/health")
print(f"Health status: {health.status_code}")

# Get server metrics
metrics = requests.get("http://localhost:8000/metrics")
print(metrics.text)
```

Create a Kubernetes readiness probe:

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 120  # Model loading takes time
  periodSeconds: 10
  failureThreshold: 3
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 180
  periodSeconds: 30
  failureThreshold: 3
```

## Streaming Responses

Enable streaming for chat applications:

```python
import requests
import json

def stream_response(prompt):
    """Stream tokens as they are generated."""
    response = requests.post(
        "http://localhost:8000/v1/completions",
        headers={"Content-Type": "application/json"},
        json={
            "model": "mistralai/Mistral-7B-Instruct-v0.2",
            "prompt": prompt,
            "max_tokens": 200,
            "temperature": 0.7,
            "stream": True
        },
        stream=True
    )

    for line in response.iter_lines():
        if line:
            # Parse Server-Sent Events format
            line = line.decode("utf-8")
            if line.startswith("data: "):
                data = line[6:]
                if data != "[DONE]":
                    chunk = json.loads(data)
                    token = chunk["choices"][0]["text"]
                    print(token, end="", flush=True)
    print()  # Final newline

stream_response("Write a short story about a robot learning to cook:")
```

## Best Practices

1. **Pre-download models**: Download models before deployment to avoid cold start delays
2. **Use appropriate GPU memory utilization**: Start at 0.85 and increase carefully
3. **Match tensor parallelism to your hardware**: Use NVLink-connected GPUs for best performance
4. **Enable quantization for production**: AWQ or GPTQ reduces memory by 50-75%
5. **Set reasonable max sequence lengths**: Shorter lengths allow larger batches
6. **Monitor GPU memory**: Watch for OOM errors during peak load

---

vLLM makes production LLM serving accessible without sacrificing performance. Its PagedAttention mechanism and continuous batching deliver throughput that matches or exceeds proprietary solutions. Start with a single GPU setup and scale horizontally as your traffic grows.
