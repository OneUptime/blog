# How to Configure Dapr Conversation with Ollama

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Ollama, LLM, Local AI, Microservice

Description: Learn how to configure the Dapr Conversation API with Ollama for local LLM inference, running open-source models privately without sending data to external APIs.

---

Ollama enables running large language models locally or on private infrastructure. Dapr Conversation supports Ollama as a provider, making it ideal for air-gapped environments, privacy-sensitive applications, and development workflows where external API costs are a concern.

## Prerequisites

- Dapr CLI installed and initialized
- Ollama installed: [ollama.com](https://ollama.com)
- At least one model pulled in Ollama

## Installing and Running Ollama

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2
ollama pull mistral
ollama pull codellama

# Start Ollama server (runs on port 11434 by default)
ollama serve
```

Verify Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

## Creating the Ollama Conversation Component

```yaml
# components/ollama-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ollama-conversation
spec:
  type: conversation.ollama
  version: v1
  metadata:
    - name: model
      value: "llama3.2"
    - name: endpoint
      value: "http://localhost:11434"
    - name: responseCacheTTL
      value: "10m"
```

No API key is needed for local Ollama.

## Basic Conversation Request

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/ollama-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "Explain how a binary search tree works",
        "role": "user"
      }
    ]
  }'
```

## Running Ollama in Docker for Kubernetes

For Kubernetes deployments, run Ollama as a sidecar or dedicated service:

```yaml
# ollama-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama
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
          volumeMounts:
            - name: ollama-data
              mountPath: /root/.ollama
          resources:
            requests:
              memory: "4Gi"
            limits:
              memory: "8Gi"
      volumes:
        - name: ollama-data
          persistentVolumeClaim:
            claimName: ollama-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: ollama
spec:
  selector:
    app: ollama
  ports:
    - port: 11434
      targetPort: 11434
```

Update the component endpoint for Kubernetes:

```yaml
    - name: endpoint
      value: "http://ollama:11434"
```

## Pre-pulling Models in Kubernetes

Use an init container to pull models before the app starts:

```yaml
      initContainers:
        - name: pull-model
          image: ollama/ollama:latest
          command: ["sh", "-c"]
          args:
            - |
              ollama serve &
              sleep 5
              ollama pull llama3.2
              pkill ollama
```

## Using Codellama for Code Tasks

```python
import requests

def generate_unit_tests(code: str) -> str:
    response = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/ollama-conversation/converse",
        json={
            "inputs": [{
                "content": f"Generate comprehensive unit tests for this code:\n\n{code}",
                "role": "user"
            }],
            "temperature": 0.2,
            "metadata": {
                "model": "codellama"
            }
        }
    )
    response.raise_for_status()
    return response.json()['outputs'][0]['result']
```

## GPU Acceleration

For better performance, use GPU-enabled Ollama:

```bash
# NVIDIA GPU
docker run -d --gpus=all \
  -v ollama:/root/.ollama \
  -p 11434:11434 \
  ollama/ollama

# Pull and test
docker exec -it <container_id> ollama pull llama3.2
```

## Summary

Dapr Conversation with Ollama enables fully private, local LLM inference without sending data to external APIs. This setup is ideal for sensitive workloads, air-gapped environments, and cost-conscious development, while the unified Dapr API makes switching to a cloud provider as simple as changing the component configuration.
