# How to Deploy Hugging Face Text Generation Inference with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Hugging Face, TGI, LLM, GPU, MLOps

Description: Deploy Hugging Face Text Generation Inference server to Kubernetes using Flux CD for optimized, production-grade LLM serving with streaming support.

---

## Introduction

Hugging Face Text Generation Inference (TGI) is a high-performance inference server for transformer models. It features tensor parallelism, continuous batching, quantization support (GPTQ, AWQ, bitsandbytes), and streaming responses - making it one of the most production-ready options for deploying Hugging Face Hub models.

Managing TGI deployments through Flux CD ensures that model selection, quantization configuration, and GPU resource allocations are all tracked in version control. Swapping models or updating TGI versions becomes a straightforward pull request rather than a manual `kubectl` operation.

This guide covers deploying TGI on Kubernetes with GPU support using Flux CD, including model configuration, secrets management for gated models, and health probe setup.

## Prerequisites

- Kubernetes cluster with NVIDIA GPU nodes (Ampere or newer recommended for best performance)
- NVIDIA GPU Operator or device plugin installed
- Flux CD v2 bootstrapped to your Git repository
- Hugging Face Hub account and token for accessing gated models

## Step 1: Create Namespace and Secret

```yaml
# clusters/my-cluster/tgi/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tgi
  labels:
    app.kubernetes.io/managed-by: flux
```

Create the Hugging Face token secret (use External Secrets or SOPS in production):

```bash
kubectl create secret generic hf-credentials \
  --from-literal=HUGGING_FACE_HUB_TOKEN=hf_xxxxxxxxxxxxxxxx \
  -n tgi
```

## Step 2: Create a PVC for Model Cache

```yaml
# clusters/my-cluster/tgi/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: tgi-model-cache
  namespace: tgi
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 60Gi
  storageClassName: fast-ssd
```

## Step 3: Deploy TGI Server

```yaml
# clusters/my-cluster/tgi/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tgi-server
  namespace: tgi
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tgi-server
  template:
    metadata:
      labels:
        app: tgi-server
    spec:
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      containers:
        - name: tgi
          image: ghcr.io/huggingface/text-generation-inference:2.0.4
          args:
            - "--model-id"
            - "mistralai/Mistral-7B-Instruct-v0.3"
            # Use 4-bit quantization
            - "--quantize"
            - "bitsandbytes-nf4"
            # Max concurrent requests
            - "--max-concurrent-requests"
            - "128"
            # Max total tokens (prompt + generation)
            - "--max-total-tokens"
            - "4096"
            # Max input length
            - "--max-input-length"
            - "3072"
            # Hostname and port
            - "--hostname"
            - "0.0.0.0"
            - "--port"
            - "8080"
          ports:
            - containerPort: 8080
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
                  name: hf-credentials
                  key: HUGGING_FACE_HUB_TOKEN
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
            # Point cache to PVC
            - name: HF_HOME
              value: "/data"
          volumeMounts:
            - name: model-cache
              mountPath: /data
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 120
            periodSeconds: 15
            failureThreshold: 20
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 180
            periodSeconds: 30
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: tgi-model-cache
```

## Step 4: Expose the Service

```yaml
# clusters/my-cluster/tgi/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: tgi-server
  namespace: tgi
spec:
  selector:
    app: tgi-server
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/tgi/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - pvc.yaml
  - deployment.yaml
  - service.yaml
---
# clusters/my-cluster/flux-kustomization-tgi.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tgi
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/tgi
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: tgi-server
      namespace: tgi
```

## Step 6: Test Text Generation

```bash
# Verify Flux reconciliation
flux get kustomizations tgi

# Check pod readiness
kubectl rollout status deployment/tgi-server -n tgi

# Generate text (streaming)
curl http://<tgi-svc-ip>:8080/generate_stream \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": "What is Flux CD and why use GitOps?",
    "parameters": {
      "max_new_tokens": 200,
      "temperature": 0.7,
      "top_p": 0.9
    }
  }'

# OpenAI-compatible endpoint
curl http://<tgi-svc-ip>:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tgi",
    "messages": [{"role": "user", "content": "Explain Kubernetes in simple terms."}],
    "stream": false
  }'
```

## Best Practices

- Mount a PVC for `HF_HOME` so model weights (often 10-30GB) are cached across pod restarts and not re-downloaded each time.
- Use `bitsandbytes-nf4` quantization for 4-bit loading on consumer or mid-range GPUs to reduce VRAM usage by roughly 75%.
- Set `failureThreshold` high on readiness probes - large models can take 3-10 minutes to download and load on first run.
- For multi-GPU setups, add `--num-shard N` where N is the number of GPUs and request N `nvidia.com/gpu` resources.
- Use Flux's SOPS integration to encrypt the Hugging Face token secret at rest in your Git repository.

## Conclusion

Hugging Face TGI deployed via Flux CD gives your team a production-grade LLM serving platform managed entirely through GitOps. Model updates, quantization changes, and resource adjustments are all version-controlled and automatically reconciled, making it straightforward to iterate quickly on LLM serving while maintaining the reliability your users expect.
