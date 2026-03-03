# How to Run LLM Inference Workloads on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, LLM, Inference, Kubernetes, GPU, AI, Machine Learning

Description: Deploy and run large language model inference workloads on Talos Linux using vLLM, text-generation-inference, and Ollama on Kubernetes.

---

Large language models have become a core part of many applications, from chatbots and content generation to code completion and document analysis. Running LLM inference in your own infrastructure rather than relying on external APIs gives you control over latency, cost, and data privacy. Talos Linux is a solid choice for this because its immutable OS and minimal attack surface protect the infrastructure running your models, while Kubernetes provides the scheduling and scaling capabilities needed for production inference workloads.

This guide covers deploying LLM inference on Talos Linux using three popular frameworks: vLLM, Hugging Face Text Generation Inference (TGI), and Ollama.

## Prerequisites

- A Talos Linux cluster with GPU nodes (NVIDIA GPUs with at least 24GB VRAM for most 7B parameter models)
- NVIDIA device plugin or GPU Operator installed
- kubectl and Helm configured
- Persistent storage for model weights
- At least 48GB of VRAM for 13B+ parameter models

## Model Storage Setup

LLM weights are large (7B parameter models are typically 14-28GB). Set up persistent storage to avoid re-downloading on every pod restart:

```yaml
# model-storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: model-cache
  namespace: llm-inference
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 200Gi
```

```bash
kubectl create namespace llm-inference
kubectl apply -f model-storage.yaml
```

## Deploying vLLM

vLLM is a high-throughput LLM serving engine that uses PagedAttention for efficient memory management. It is currently the most popular choice for production LLM serving.

```yaml
# vllm-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-server
  namespace: llm-inference
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
          args:
            - --model
            - mistralai/Mistral-7B-Instruct-v0.2
            - --tensor-parallel-size
            - "1"
            - --max-model-len
            - "8192"
            - --gpu-memory-utilization
            - "0.90"
            - --port
            - "8000"
          ports:
            - containerPort: 8000
              name: http
          env:
            - name: HUGGING_FACE_HUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: hf-token
                  key: token
          resources:
            requests:
              cpu: "4"
              memory: 16Gi
              nvidia.com/gpu: 1
            limits:
              cpu: "8"
              memory: 32Gi
              nvidia.com/gpu: 1
          volumeMounts:
            - name: model-cache
              mountPath: /root/.cache/huggingface
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 120
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 180
            periodSeconds: 30
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: model-cache
---
apiVersion: v1
kind: Service
metadata:
  name: vllm
  namespace: llm-inference
spec:
  ports:
    - port: 8000
      targetPort: 8000
  selector:
    app: vllm
```

Create the Hugging Face token secret:

```bash
# Create a secret with your Hugging Face API token
kubectl create secret generic hf-token \
  --namespace llm-inference \
  --from-literal=token='your-huggingface-token'
```

Deploy and test:

```bash
kubectl apply -f vllm-deployment.yaml

# Wait for the model to load (this takes a few minutes)
kubectl wait --for=condition=ready pod -l app=vllm -n llm-inference --timeout=600s

# Test with a request (vLLM provides an OpenAI-compatible API)
kubectl port-forward -n llm-inference svc/vllm 8000:8000

curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Mistral-7B-Instruct-v0.2",
    "messages": [{"role": "user", "content": "Explain Kubernetes in 3 sentences."}],
    "max_tokens": 200
  }'
```

## Multi-GPU vLLM for Larger Models

For models that do not fit in a single GPU, use tensor parallelism:

```yaml
# vllm-multi-gpu.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-70b
  namespace: llm-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vllm-70b
  template:
    metadata:
      labels:
        app: vllm-70b
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:latest
          args:
            - --model
            - meta-llama/Llama-2-70b-chat-hf
            - --tensor-parallel-size
            - "4"
            - --max-model-len
            - "4096"
            - --gpu-memory-utilization
            - "0.95"
          resources:
            limits:
              nvidia.com/gpu: 4
          env:
            - name: HUGGING_FACE_HUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: hf-token
                  key: token
          volumeMounts:
            - name: model-cache
              mountPath: /root/.cache/huggingface
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: model-cache
```

## Deploying Hugging Face TGI

Text Generation Inference is Hugging Face's production inference server, optimized for text generation models:

```yaml
# tgi-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tgi-server
  namespace: llm-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tgi
  template:
    metadata:
      labels:
        app: tgi
    spec:
      containers:
        - name: tgi
          image: ghcr.io/huggingface/text-generation-inference:latest
          args:
            - --model-id
            - mistralai/Mistral-7B-Instruct-v0.2
            - --max-input-length
            - "4096"
            - --max-total-tokens
            - "8192"
            - --max-batch-prefill-tokens
            - "8192"
            - --quantize
            - awq
          ports:
            - containerPort: 80
              name: http
          env:
            - name: HUGGING_FACE_HUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: hf-token
                  key: token
          resources:
            limits:
              nvidia.com/gpu: 1
          volumeMounts:
            - name: model-cache
              mountPath: /data
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: model-cache
---
apiVersion: v1
kind: Service
metadata:
  name: tgi
  namespace: llm-inference
spec:
  ports:
    - port: 80
      targetPort: 80
  selector:
    app: tgi
```

## Deploying Ollama for Easy Model Management

Ollama provides a simpler experience for running multiple models without managing weights manually:

```yaml
# ollama-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama
  namespace: llm-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ollama
  template:
    metadata:
      labels:
        app: ollama
    spec:
      containers:
        - name: ollama
          image: ollama/ollama:latest
          ports:
            - containerPort: 11434
          resources:
            limits:
              nvidia.com/gpu: 1
          volumeMounts:
            - name: ollama-data
              mountPath: /root/.ollama
      volumes:
        - name: ollama-data
          persistentVolumeClaim:
            claimName: ollama-storage
---
apiVersion: v1
kind: Service
metadata:
  name: ollama
  namespace: llm-inference
spec:
  ports:
    - port: 11434
  selector:
    app: ollama
```

Pull and run models through the Ollama API:

```bash
# Pull a model
kubectl exec -n llm-inference deployment/ollama -- ollama pull mistral:7b

# Test inference
kubectl port-forward -n llm-inference svc/ollama 11434:11434
curl http://localhost:11434/api/generate -d '{
  "model": "mistral:7b",
  "prompt": "What is Talos Linux?",
  "stream": false
}'
```

## Autoscaling LLM Inference

Scale inference based on request queue depth or GPU utilization:

```yaml
# llm-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vllm-hpa
  namespace: llm-inference
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vllm-server
  minReplicas: 1
  maxReplicas: 4
  metrics:
    - type: Pods
      pods:
        metric:
          name: vllm_requests_running
        target:
          type: AverageValue
          averageValue: "10"
```

## Performance Tuning

For optimal LLM inference performance on Talos Linux:

- Use quantized models (AWQ, GPTQ) for better throughput with minimal quality loss
- Set `gpu-memory-utilization` to 0.90-0.95 to maximize KV cache size
- Use continuous batching (enabled by default in vLLM and TGI)
- Consider using FlashAttention-2 for reduced memory usage
- Pin model pods to specific GPU nodes to avoid scheduling delays

## Monitoring LLM Inference

vLLM and TGI both expose Prometheus metrics. Key metrics to track:

- Request throughput (tokens per second)
- Time to first token (TTFT)
- Queue depth
- GPU memory utilization
- KV cache utilization

## Conclusion

Running LLM inference on Talos Linux gives you full control over your AI infrastructure with the security and reliability benefits of an immutable OS. Whether you choose vLLM for maximum throughput, TGI for Hugging Face ecosystem integration, or Ollama for simplicity, Talos Linux provides a clean Kubernetes platform that handles the infrastructure concerns so you can focus on delivering AI-powered features to your users.
