# How to Deploy vLLM on Kubernetes for High-Throughput Large Language Model Inference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, vLLM, LLM, Inference, Large Language Models

Description: Deploy vLLM on Kubernetes for high-throughput, low-latency inference of large language models with PagedAttention, continuous batching, and optimized CUDA kernels.

---

Serving large language models efficiently is challenging. vLLM is a high-performance inference engine that uses PagedAttention and continuous batching to achieve up to 24x higher throughput than traditional serving methods. Running vLLM on Kubernetes provides scalability, fault tolerance, and efficient resource utilization for LLM workloads.

This guide shows you how to deploy vLLM on Kubernetes for production LLM serving.

## Understanding vLLM Architecture

vLLM provides several key optimizations:

- **PagedAttention**: Efficient KV cache management inspired by virtual memory
- **Continuous Batching**: Dynamic batching of requests as they complete
- **Optimized CUDA Kernels**: Fast attention and sampling operations
- **Model Parallelism**: Tensor and pipeline parallelism for large models

These features make vLLM ideal for serving LLMs like Llama, Mistral, and GPT variants.

## Prerequisites

Ensure your cluster has GPU nodes:

```bash
# Check for GPU nodes
kubectl get nodes -l nvidia.com/gpu.present=true

# Verify GPU capacity
kubectl describe node <gpu-node> | grep nvidia.com/gpu

# Minimum requirements:
# - A100 (40GB/80GB) or H100 for large models
# - 24GB+ GPU memory for 7B models
# - 40GB+ GPU memory for 13B models
# - 80GB+ GPU memory for 70B models
```

## Building a vLLM Container

Create a Dockerfile with vLLM and model:

```dockerfile
# Dockerfile.vllm
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install vLLM
RUN pip install --no-cache-dir \
    vllm==0.3.0 \
    ray==2.9.0

# Install additional packages
RUN pip install --no-cache-dir \
    fastapi==0.104.0 \
    uvicorn==0.24.0 \
    pydantic==2.5.0

WORKDIR /app

# Copy serving script
COPY serve.py /app/

# Expose port
EXPOSE 8000

# Set environment variables
ENV CUDA_VISIBLE_DEVICES=0

CMD ["python3", "/app/serve.py"]
```

Create a serving script:

```python
# serve.py
from vllm import LLM, SamplingParams
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import os

# Initialize FastAPI app
app = FastAPI(title="vLLM Inference Server")

# Model configuration
MODEL_NAME = os.getenv("MODEL_NAME", "meta-llama/Llama-2-7b-chat-hf")
TENSOR_PARALLEL_SIZE = int(os.getenv("TENSOR_PARALLEL_SIZE", "1"))
GPU_MEMORY_UTILIZATION = float(os.getenv("GPU_MEMORY_UTILIZATION", "0.9"))

# Initialize vLLM
print(f"Loading model: {MODEL_NAME}")
llm = LLM(
    model=MODEL_NAME,
    tensor_parallel_size=TENSOR_PARALLEL_SIZE,
    gpu_memory_utilization=GPU_MEMORY_UTILIZATION,
    trust_remote_code=True,
    download_dir="/models"
)

print("Model loaded successfully")

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.8
    top_p: float = 0.95
    top_k: int = 50
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0

class GenerateResponse(BaseModel):
    generated_text: str
    num_tokens: int

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model": MODEL_NAME}

@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest):
    """Generate text from prompt"""
    try:
        # Create sampling parameters
        sampling_params = SamplingParams(
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            top_k=request.top_k,
            presence_penalty=request.presence_penalty,
            frequency_penalty=request.frequency_penalty
        )

        # Generate
        outputs = llm.generate([request.prompt], sampling_params)
        generated_text = outputs[0].outputs[0].text

        return GenerateResponse(
            generated_text=generated_text,
            num_tokens=len(outputs[0].outputs[0].token_ids)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch-generate")
def batch_generate(requests: list[GenerateRequest]):
    """Batch generation endpoint"""
    prompts = [req.prompt for req in requests]

    # Use first request's params for batch (or make configurable)
    sampling_params = SamplingParams(
        max_tokens=requests[0].max_tokens,
        temperature=requests[0].temperature,
        top_p=requests[0].top_p,
        top_k=requests[0].top_k
    )

    # Batch generation
    outputs = llm.generate(prompts, sampling_params)

    results = []
    for output in outputs:
        results.append({
            "generated_text": output.outputs[0].text,
            "num_tokens": len(output.outputs[0].token_ids)
        })

    return {"results": results}

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
```

Build and push:

```bash
docker build -t your-registry/vllm-server:v1 -f Dockerfile.vllm .
docker push your-registry/vllm-server:v1
```

## Deploying vLLM on Kubernetes

Create a deployment for vLLM:

```yaml
# vllm-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-llama2-7b
  namespace: llm-serving
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vllm-llama2-7b
  template:
    metadata:
      labels:
        app: vllm-llama2-7b
    spec:
      # Node selector for GPU nodes
      nodeSelector:
        nvidia.com/gpu.product: A100-SXM4-40GB

      containers:
      - name: vllm
        image: your-registry/vllm-server:v1
        env:
        - name: MODEL_NAME
          value: "meta-llama/Llama-2-7b-chat-hf"
        - name: TENSOR_PARALLEL_SIZE
          value: "1"
        - name: GPU_MEMORY_UTILIZATION
          value: "0.9"
        - name: HUGGING_FACE_HUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: hf-token
              key: token

        ports:
        - containerPort: 8000
          name: http

        resources:
          requests:
            nvidia.com/gpu: 1
            cpu: "8"
            memory: "32Gi"
          limits:
            nvidia.com/gpu: 1
            cpu: "16"
            memory: "64Gi"

        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 300
          periodSeconds: 30
          timeoutSeconds: 10

        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 300
          periodSeconds: 10

        # Volume for model cache
        volumeMounts:
        - name: model-cache
          mountPath: /models

      volumes:
      - name: model-cache
        persistentVolumeClaim:
          claimName: vllm-model-cache
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vllm-model-cache
  namespace: llm-serving
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: vllm-llama2-7b
  namespace: llm-serving
spec:
  selector:
    app: vllm-llama2-7b
  ports:
  - port: 8000
    targetPort: 8000
    name: http
  type: ClusterIP
```

Create HuggingFace token secret:

```bash
# Create secret for HuggingFace token
kubectl create secret generic hf-token \
  --from-literal=token=your-huggingface-token \
  -n llm-serving
```

Deploy:

```bash
kubectl create namespace llm-serving
kubectl apply -f vllm-deployment.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=vllm-llama2-7b -n llm-serving --timeout=10m

# Check logs
kubectl logs -n llm-serving -l app=vllm-llama2-7b -f
```

## Testing the Deployment

Test the inference endpoint:

```bash
# Port forward
kubectl port-forward -n llm-serving svc/vllm-llama2-7b 8000:8000

# Test health endpoint
curl http://localhost:8000/health

# Generate text
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a story about a brave knight:",
    "max_tokens": 256,
    "temperature": 0.7
  }'

# Batch generation
curl -X POST http://localhost:8000/batch-generate \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {"prompt": "Explain quantum computing:"},
      {"prompt": "What is machine learning?"},
      {"prompt": "Describe the solar system:"}
    ]
  }'
```

## Deploying Large Models with Tensor Parallelism

For models that don't fit on a single GPU, use tensor parallelism:

```yaml
# vllm-llama2-70b.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-llama2-70b
  namespace: llm-serving
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vllm-llama2-70b
  template:
    metadata:
      labels:
        app: vllm-llama2-70b
    spec:
      nodeSelector:
        nvidia.com/gpu.product: A100-SXM4-80GB

      containers:
      - name: vllm
        image: your-registry/vllm-server:v1
        env:
        - name: MODEL_NAME
          value: "meta-llama/Llama-2-70b-chat-hf"
        - name: TENSOR_PARALLEL_SIZE
          value: "4"  # Use 4 GPUs
        - name: GPU_MEMORY_UTILIZATION
          value: "0.95"

        resources:
          requests:
            nvidia.com/gpu: 4  # Request 4 GPUs
            cpu: "32"
            memory: "128Gi"
          limits:
            nvidia.com/gpu: 4
            cpu: "64"
            memory: "256Gi"
```

## Autoscaling Based on Request Load

Configure HPA based on custom metrics:

```yaml
# vllm-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vllm-hpa
  namespace: llm-serving
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vllm-llama2-7b
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: vllm_requests_per_second
      target:
        type: AverageValue
        averageValue: "10"

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
```

## Monitoring vLLM Performance

Add Prometheus metrics:

```python
# Add to serve.py
from prometheus_client import Counter, Histogram, start_http_server

REQUEST_COUNT = Counter('vllm_requests_total', 'Total requests')
REQUEST_LATENCY = Histogram('vllm_request_latency_seconds', 'Request latency')
TOKENS_GENERATED = Counter('vllm_tokens_generated_total', 'Total tokens generated')

# Start metrics server
start_http_server(9090)

@app.post("/generate")
def generate(request: GenerateRequest):
    import time
    start = time.time()

    REQUEST_COUNT.inc()

    # ... generation code ...

    TOKENS_GENERATED.inc(len(outputs[0].outputs[0].token_ids))
    REQUEST_LATENCY.observe(time.time() - start)

    return response
```

Query metrics:

```promql
# Request rate
rate(vllm_requests_total[1m])

# P95 latency
histogram_quantile(0.95, rate(vllm_request_latency_seconds_bucket[5m]))

# Tokens per second
rate(vllm_tokens_generated_total[1m])

# GPU utilization
DCGM_FI_DEV_GPU_UTIL{pod=~"vllm.*"}
```

## Conclusion

vLLM on Kubernetes provides a high-performance platform for serving large language models at scale. The combination of PagedAttention, continuous batching, and Kubernetes orchestration delivers excellent throughput and latency while maintaining operational simplicity. With support for tensor parallelism and model parallelism, vLLM can serve models of any size, from 7B parameter models on a single GPU to 70B+ parameter models across multiple GPUs.
