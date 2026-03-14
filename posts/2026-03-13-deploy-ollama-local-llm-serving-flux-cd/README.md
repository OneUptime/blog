# How to Deploy Ollama for Local LLM Serving with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Ollama, LLM, Local AI, GPU, MLOps

Description: Deploy Ollama local LLM server to Kubernetes using Flux CD to run open-source language models privately in your own cluster.

---

## Introduction

Ollama simplifies running open-source large language models locally with a single command. On Kubernetes with GPU acceleration, it becomes a powerful private AI inference endpoint supporting models like LLaMA 3, Mistral, Gemma, and hundreds more from the Ollama model library.

By managing Ollama through Flux CD, your organization gets a versioned, auditable LLM serving configuration. Model selections, GPU assignments, and persistence settings are all stored in Git, ensuring consistency across development, staging, and production environments.

This guide covers deploying Ollama to Kubernetes with GPU resources using Flux CD, pre-loading models via an init container, and exposing a compatible API endpoint.

## Prerequisites

- Kubernetes cluster with NVIDIA GPU nodes
- NVIDIA device plugin or GPU Operator installed
- Flux CD v2 bootstrapped to your Git repository
- Sufficient storage for model files (Ollama models range from 4GB to 70GB+)

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/ollama/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ollama
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Create a PVC for Model Storage

```yaml
# clusters/my-cluster/ollama/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ollama-models
  namespace: ollama
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      # Size based on models you plan to serve
      storage: 100Gi
  storageClassName: fast-ssd
```

## Step 3: Deploy Ollama with GPU Support

```yaml
# clusters/my-cluster/ollama/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama
  namespace: ollama
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
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      initContainers:
        # Pull models before the server starts accepting requests
        - name: model-puller
          image: ollama/ollama:0.3.12
          command:
            - "/bin/sh"
            - "-c"
            - |
              # Start ollama serve in the background
              ollama serve &
              SERVER_PID=$!
              sleep 5
              # Pull desired models
              ollama pull llama3:8b
              ollama pull nomic-embed-text
              # Stop background server
              kill $SERVER_PID
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "8Gi"
            limits:
              nvidia.com/gpu: 1
              memory: "8Gi"
          env:
            - name: OLLAMA_MODELS
              value: "/root/.ollama"
          volumeMounts:
            - name: models
              mountPath: /root/.ollama
      containers:
        - name: ollama
          image: ollama/ollama:0.3.12
          ports:
            - containerPort: 11434
              name: http
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "4"
            limits:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "4"
          env:
            - name: OLLAMA_HOST
              value: "0.0.0.0"
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
            - name: OLLAMA_MODELS
              value: "/root/.ollama"
          volumeMounts:
            - name: models
              mountPath: /root/.ollama
          readinessProbe:
            httpGet:
              path: /api/tags
              port: 11434
            initialDelaySeconds: 10
            periodSeconds: 10
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: ollama-models
```

## Step 4: Expose Ollama Service

```yaml
# clusters/my-cluster/ollama/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ollama
  namespace: ollama
spec:
  selector:
    app: ollama
  ports:
    - name: http
      port: 11434
      targetPort: 11434
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/ollama/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - pvc.yaml
  - deployment.yaml
  - service.yaml
---
# clusters/my-cluster/flux-kustomization-ollama.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ollama
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/ollama
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ollama
      namespace: ollama
```

## Step 6: Test the API

```bash
# Check Flux reconciliation
flux get kustomizations ollama

# List available models
curl http://<ollama-svc-ip>:11434/api/tags

# Run a generation request
curl http://<ollama-svc-ip>:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3:8b", "prompt": "What is GitOps?", "stream": false}'

# Use OpenAI-compatible endpoint (Ollama v0.1.14+)
curl http://<ollama-svc-ip>:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3:8b",
    "messages": [{"role": "user", "content": "Explain Flux CD."}]
  }'
```

## Best Practices

- Use an init container to pre-pull models before the main container starts, preventing the server from responding to requests before models are ready.
- Store models on a PVC rather than an emptyDir so model downloads survive pod restarts.
- For production use, set `OLLAMA_NUM_PARALLEL` to control concurrent request handling and avoid memory exhaustion.
- Expose Ollama behind an ingress with authentication if running in a shared environment, since the default API has no auth.
- Track model selections (e.g., `llama3:8b`) as versioned configuration in Git so any model change goes through a pull request review.

## Conclusion

Deploying Ollama with Flux CD on Kubernetes combines the simplicity of Ollama's model management with the reliability of GitOps. Your team gets a private, GPU-accelerated LLM API with all configuration changes version-controlled, auditable, and automatically reconciled - a practical foundation for internal AI tooling.
