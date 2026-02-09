# How to Deploy Hugging Face Text Generation Inference Server on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Machine Learning, LLM

Description: Learn how to deploy Hugging Face Text Generation Inference (TGI) server on Kubernetes for high-performance LLM serving with optimized inference, streaming responses, and production-grade scalability.

---

Hugging Face Text Generation Inference (TGI) is a production-ready server optimized for deploying large language models. It includes features like tensor parallelism, quantization, continuous batching, and token streaming that make LLM deployment practical at scale.

In this guide, you'll learn how to deploy TGI on Kubernetes with proper resource management, model caching, horizontal scaling, and monitoring. We'll deploy a Llama-2 7B model, but the patterns apply to any supported model.

## Why TGI Over Basic Model Serving

You could deploy an LLM with a simple Flask wrapper around the transformers library, but you'd quickly hit performance walls. TGI provides critical optimizations:

- Continuous batching that dynamically groups requests for better GPU utilization
- Token streaming for better user experience with long responses
- Quantization support (GPTQ, AWQ, GGML) to reduce memory usage
- Flash Attention v2 for faster inference
- Tensor parallelism to split models across multiple GPUs

These features make the difference between serving 1 request per second and 50 requests per second on the same hardware.

## Prerequisites and Model Selection

You'll need a Kubernetes cluster with GPU nodes. For Llama-2 7B, minimum requirements are:

- 1x NVIDIA A10G GPU (24GB VRAM) for FP16
- 1x NVIDIA T4 GPU (16GB VRAM) if using quantization
- 16GB system RAM
- 50GB disk space for model storage

Choose your model from Hugging Face Hub. For this guide, we'll use `meta-llama/Llama-2-7b-chat-hf`. You'll need to accept Meta's license and create a Hugging Face token with read access.

## Creating the Model Cache PVC

Large models take time to download. Create a PVC to cache models across pod restarts:

```yaml
# tgi-model-cache.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: tgi-model-cache
  namespace: llm-inference
spec:
  accessModes:
    - ReadWriteMany  # Multiple pods can share
  storageClassName: efs-sc  # Use fast storage
  resources:
    requests:
      storage: 100Gi
```

Apply the PVC:

```bash
kubectl create namespace llm-inference
kubectl apply -f tgi-model-cache.yaml
```

## Storing Hugging Face Credentials

Create a Secret with your Hugging Face token:

```bash
# Create token secret
kubectl create secret generic huggingface-token \
  -n llm-inference \
  --from-literal=token='hf_your_token_here'
```

TGI will use this token to download gated models from Hugging Face Hub.

## Deploying TGI with Kubernetes

Create a Deployment that runs TGI with your chosen model:

```yaml
# tgi-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llama2-tgi
  namespace: llm-inference
spec:
  replicas: 2  # Start with 2 for high availability
  selector:
    matchLabels:
      app: llama2-tgi
  template:
    metadata:
      labels:
        app: llama2-tgi
    spec:
      containers:
        - name: tgi
          image: ghcr.io/huggingface/text-generation-inference:2.0
          env:
            # Model configuration
            - name: MODEL_ID
              value: "meta-llama/Llama-2-7b-chat-hf"
            - name: HUGGING_FACE_HUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: huggingface-token
                  key: token
            # Performance settings
            - name: MAX_CONCURRENT_REQUESTS
              value: "128"
            - name: MAX_INPUT_LENGTH
              value: "4096"
            - name: MAX_TOTAL_TOKENS
              value: "4096"
            - name: MAX_BATCH_PREFILL_TOKENS
              value: "4096"
            - name: MAX_BATCH_TOTAL_TOKENS
              value: "8192"
            # Optimization flags
            - name: QUANTIZE
              value: ""  # Leave empty for FP16, use "gptq" or "awq" for quantization
            - name: NUM_SHARD
              value: "1"  # Number of GPUs to split model across
            # Caching
            - name: HUGGINGFACE_HUB_CACHE
              value: "/cache"
          ports:
            - containerPort: 80
              name: http
              protocol: TCP
          resources:
            requests:
              cpu: "4"
              memory: 16Gi
              nvidia.com/gpu: "1"
            limits:
              cpu: "8"
              memory: 32Gi
              nvidia.com/gpu: "1"
          volumeMounts:
            - name: cache
              mountPath: /cache
            - name: shm
              mountPath: /dev/shm
          # Health checks
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 180  # Model download takes time
            periodSeconds: 30
            timeoutSeconds: 5
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 180
            periodSeconds: 10
            timeoutSeconds: 5
      volumes:
        - name: cache
          persistentVolumeClaim:
            claimName: tgi-model-cache
        - name: shm
          emptyDir:
            medium: Memory
            sizeLimit: 2Gi
      nodeSelector:
        accelerator: nvidia-gpu
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
```

Key configuration points:

- `MAX_CONCURRENT_REQUESTS`: How many requests TGI queues
- `MAX_BATCH_TOTAL_TOKENS`: Total tokens across all batched requests
- `QUANTIZE`: Set to "gptq" or "awq" to reduce memory usage
- `NUM_SHARD`: Set >1 to split model across multiple GPUs
- `/dev/shm` mount: Required for inter-process communication

Apply the deployment:

```bash
kubectl apply -f tgi-deployment.yaml
```

Monitor the rollout (first deployment takes 5-10 minutes to download the model):

```bash
kubectl rollout status deployment/llama2-tgi -n llm-inference
kubectl logs -f deployment/llama2-tgi -n llm-inference
```

## Exposing TGI with a Service

Create a Service to expose the TGI server:

```yaml
# tgi-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: llama2-tgi
  namespace: llm-inference
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "80"
    prometheus.io/path: "/metrics"
spec:
  selector:
    app: llama2-tgi
  ports:
    - name: http
      port: 80
      targetPort: 80
      protocol: TCP
  type: ClusterIP
```

Apply the service:

```bash
kubectl apply -f tgi-service.yaml
```

## Testing Text Generation

Port-forward to test locally:

```bash
kubectl port-forward -n llm-inference svc/llama2-tgi 8080:80
```

Send a generation request:

```bash
# Simple completion
curl http://localhost:8080/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": "What is Kubernetes?",
    "parameters": {
      "max_new_tokens": 200,
      "temperature": 0.7,
      "top_p": 0.95,
      "do_sample": true
    }
  }'
```

Test streaming responses:

```bash
# Streaming completion
curl http://localhost:8080/generate_stream \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": "Explain how Kubernetes scheduling works",
    "parameters": {
      "max_new_tokens": 500,
      "temperature": 0.7
    }
  }'
```

The streaming endpoint returns server-sent events with tokens as they're generated, providing a better user experience.

## Implementing Horizontal Pod Autoscaling

Scale TGI based on request queue depth:

```yaml
# tgi-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llama2-tgi-hpa
  namespace: llm-inference
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: llama2-tgi
  minReplicas: 2
  maxReplicas: 10
  metrics:
    # Scale based on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    # Custom metric: queue depth (requires metrics adapter)
    - type: Pods
      pods:
        metric:
          name: tgi_queue_size
        target:
          type: AverageValue
          averageValue: "10"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
```

Apply the HPA:

```bash
kubectl apply -f tgi-hpa.yaml
```

This configuration scales up quickly when load increases but scales down slowly to avoid thrashing.

## Configuring Ingress for External Access

Expose TGI through an Ingress with rate limiting:

```yaml
# tgi-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: llama2-tgi
  namespace: llm-inference
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rate-limit: "10"  # 10 req/sec per IP
    nginx.ingress.kubernetes.io/limit-rps: "100"  # 100 req/sec total
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"  # 5 min for long generations
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - llm.yourdomain.com
      secretName: llm-tls
  rules:
    - host: llm.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: llama2-tgi
                port:
                  number: 80
```

Apply the ingress:

```bash
kubectl apply -f tgi-ingress.yaml
```

## Monitoring TGI Performance

TGI exposes Prometheus metrics at `/metrics`. Key metrics to monitor:

```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tgi-alerts
  namespace: llm-inference
spec:
  groups:
    - name: tgi-performance
      interval: 30s
      rules:
        - alert: HighInferenceLatency
          expr: |
            histogram_quantile(0.95, rate(tgi_request_duration_seconds_bucket[5m])) > 5
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "TGI inference latency is high"
            description: "P95 latency is {{ $value }}s"

        - alert: HighQueueDepth
          expr: tgi_queue_size > 50
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "TGI request queue is backing up"
            description: "Queue depth is {{ $value }}"

        - alert: LowThroughput
          expr: rate(tgi_request_success_total[5m]) < 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "TGI throughput is unusually low"
            description: "Processing {{ $value }} requests/sec"
```

Create a Grafana dashboard to visualize:

- Request rate (successful and failed)
- Latency percentiles (P50, P95, P99)
- Queue depth over time
- GPU utilization
- Tokens per second throughput

## Optimizing for Cost and Performance

Reduce costs with quantization:

```yaml
# Update deployment env vars
env:
  - name: QUANTIZE
    value: "gptq"  # or "awq"
```

GPTQ quantization reduces model size to 4-bit, cutting memory usage by 75% with minimal quality loss. This lets you run on smaller, cheaper GPUs.

For multi-GPU nodes, enable tensor parallelism:

```yaml
env:
  - name: NUM_SHARD
    value: "4"  # Split across 4 GPUs
resources:
  requests:
    nvidia.com/gpu: "4"
  limits:
    nvidia.com/gpu: "4"
```

This splits the model across multiple GPUs, enabling larger models or higher throughput.

## Implementing Request Authentication

Add authentication middleware to protect your endpoint:

```yaml
# auth-middleware-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tgi-auth-proxy
  namespace: llm-inference
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tgi-auth-proxy
  template:
    metadata:
      labels:
        app: tgi-auth-proxy
    spec:
      containers:
        - name: proxy
          image: nginx:alpine
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
      volumes:
        - name: config
          configMap:
            name: tgi-proxy-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: tgi-proxy-config
  namespace: llm-inference
data:
  nginx.conf: |
    events {}
    http {
      upstream tgi {
        server llama2-tgi:80;
      }
      server {
        listen 8080;
        location / {
          # Validate API key
          if ($http_x_api_key = "") {
            return 401;
          }
          proxy_pass http://tgi;
          proxy_set_header Host $host;
        }
      }
    }
```

This simple proxy validates an API key header before forwarding to TGI.

## Handling Model Updates

To deploy a new model version without downtime:

```bash
# Create new deployment with v2
kubectl apply -f tgi-deployment-v2.yaml

# Wait for v2 to be ready
kubectl rollout status deployment/llama2-tgi-v2 -n llm-inference

# Update service selector to point to v2
kubectl patch service llama2-tgi -n llm-inference \
  -p '{"spec":{"selector":{"app":"llama2-tgi-v2"}}}'

# Delete old deployment
kubectl delete deployment llama2-tgi -n llm-inference
```

This blue-green deployment approach ensures zero downtime during model updates.

## Conclusion

Hugging Face TGI brings production-grade LLM serving to Kubernetes with optimizations that dramatically improve performance and reduce costs. By combining TGI with proper Kubernetes patterns like autoscaling, caching, and monitoring, you create a robust inference platform.

Start with a single replica to validate your setup, monitor performance metrics closely, and scale horizontally as load increases. The combination of TGI's continuous batching and Kubernetes' orchestration creates a system that handles variable load efficiently while maintaining low latency.

For production deployments, implement authentication, set up comprehensive monitoring, and establish processes for model updates and rollbacks. These operational practices ensure your LLM service remains reliable and performant as usage grows.
