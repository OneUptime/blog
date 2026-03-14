# How to Deploy vLLM for Large Language Model Serving with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, vLLM, LLM, Large Language Models, GPU, MLOps

Description: Deploy vLLM LLM inference server to Kubernetes using Flux CD for high-throughput large language model serving with PagedAttention.

---

## Introduction

vLLM is a high-throughput LLM inference engine that uses PagedAttention to dramatically improve GPU memory utilization and serving throughput compared to naive implementations. It supports a wide range of models including LLaMA, Mistral, Mixtral, and models hosted on Hugging Face Hub.

Deploying vLLM through Flux CD brings reproducibility and auditability to your LLM serving infrastructure. Model selection, quantization settings, and GPU resource allocations are all defined in Git, making it trivial to promote configurations across environments or roll back a problematic change.

This guide covers deploying vLLM on Kubernetes with GPU support using Flux CD, including Hugging Face Hub integration, serving configuration, and health checks.

## Prerequisites

- Kubernetes cluster with high-memory GPU nodes (A100 80GB or H100 recommended for large models)
- NVIDIA device plugin or GPU Operator installed
- Flux CD v2 bootstrapped to your Git repository
- A Hugging Face Hub token if using gated models
- Sufficient GPU memory for your chosen model (e.g., 40GB+ for LLaMA-2-13B)

## Step 1: Create the Namespace and Secret

```yaml
# clusters/my-cluster/vllm/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: vllm
  labels:
    app.kubernetes.io/managed-by: flux
```

Store the Hugging Face token as a Kubernetes Secret (use Flux's SOPS or External Secrets for secret management in production):

```bash
kubectl create secret generic hf-token \
  --from-literal=token=hf_xxxxxxxxxxxx \
  -n vllm
```

## Step 2: Deploy vLLM Server

```yaml
# clusters/my-cluster/vllm/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-server
  namespace: vllm
spec:
  # vLLM uses tensor parallelism - typically 1 replica per GPU group
  replicas: 1
  selector:
    matchLabels:
      app: vllm-server
  template:
    metadata:
      labels:
        app: vllm-server
    spec:
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      containers:
        - name: vllm
          image: vllm/vllm-openai:v0.4.2
          args:
            - "--model"
            - "mistralai/Mistral-7B-Instruct-v0.2"
            # Use 4-bit quantization to fit in smaller GPU memory
            - "--quantization"
            - "awq"
            # Tensor parallel degree (match number of GPUs)
            - "--tensor-parallel-size"
            - "1"
            # Max model length in tokens
            - "--max-model-len"
            - "8192"
            # Enable OpenAI-compatible API
            - "--served-model-name"
            - "mistral-7b"
            - "--host"
            - "0.0.0.0"
            - "--port"
            - "8000"
          ports:
            - containerPort: 8000
              name: http
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "24Gi"
              cpu: "8"
            limits:
              nvidia.com/gpu: 1
              memory: "24Gi"
              cpu: "8"
          env:
            - name: HUGGING_FACE_HUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: hf-token
                  key: token
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
            # Cache models to a writable path
            - name: HF_HOME
              value: "/model-cache"
          volumeMounts:
            - name: model-cache
              mountPath: /model-cache
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 120
            periodSeconds: 20
            failureThreshold: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 180
            periodSeconds: 30
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: vllm-model-cache-pvc
```

## Step 3: Create the Service

```yaml
# clusters/my-cluster/vllm/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: vllm-server
  namespace: vllm
spec:
  selector:
    app: vllm-server
  ports:
    - name: http
      port: 8000
      targetPort: 8000
```

## Step 4: Add a PVC for Model Cache

```yaml
# clusters/my-cluster/vllm/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vllm-model-cache-pvc
  namespace: vllm
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/flux-kustomization-vllm.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vllm
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/vllm
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: vllm-server
      namespace: vllm
```

## Step 6: Test the OpenAI-Compatible API

```bash
# Verify deployment
flux get kustomizations vllm
kubectl rollout status deployment/vllm-server -n vllm

# List available models
curl http://<vllm-svc-ip>:8000/v1/models

# Run a chat completion
curl http://<vllm-svc-ip>:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral-7b",
    "messages": [{"role": "user", "content": "Explain GitOps in one sentence."}],
    "max_tokens": 100
  }'
```

## Best Practices

- Use a PVC for the Hugging Face model cache (`HF_HOME`) so model weights are not re-downloaded on every pod restart.
- For large models requiring multiple GPUs, set `--tensor-parallel-size` equal to the number of GPUs and request that many `nvidia.com/gpu` resources.
- Use AWQ or GPTQ quantization (`--quantization awq`) to serve larger models on fewer GPUs without significant quality loss.
- Set generous `initialDelaySeconds` on probes — model loading can take several minutes for large weights.
- Use Flux image update automation to automatically roll out new vLLM container releases from your registry.

## Conclusion

vLLM on Kubernetes managed by Flux CD provides a scalable, GitOps-governed LLM serving infrastructure. By version-controlling model selection, quantization strategy, and resource allocation, your team can iterate quickly on serving configuration while maintaining the auditability and reliability that production workloads demand.
