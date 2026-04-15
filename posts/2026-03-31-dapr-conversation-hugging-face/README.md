# How to Configure Dapr Conversation with Hugging Face

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Hugging Face, LLM, AI, Open Source

Description: Learn how to configure the Dapr Conversation API with Hugging Face Inference API, accessing open-source LLMs from microservices via the Dapr sidecar.

---

Hugging Face hosts thousands of open-source models through its Inference API. Dapr Conversation supports Hugging Face as a provider, giving your microservices access to models like Mistral, Llama, and Falcon through the unified Dapr interface without managing inference infrastructure.

## Prerequisites

- Dapr CLI installed and initialized
- A Hugging Face API token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

## Creating the Hugging Face Conversation Component

```yaml
# components/huggingface-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: huggingface-conversation
spec:
  type: conversation.huggingface
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: huggingface-secret
        key: api-token
    - name: model
      value: "meta-llama/Meta-Llama-3-8B-Instruct"
    - name: cacheTTL
      value: "10m"
```

Store the token:

```bash
# Kubernetes
kubectl create secret generic huggingface-secret \
  --from-literal=api-token=hf_your_token_here

# Local development
export HUGGINGFACE_API_TOKEN=hf_your_token_here
```

## Popular Models on Hugging Face

```text
meta-llama/Meta-Llama-3-8B-Instruct     # Llama 3 8B - fast general purpose
meta-llama/Meta-Llama-3-70B-Instruct    # Llama 3 70B - high quality
mistralai/Mistral-7B-Instruct-v0.3      # Mistral 7B
microsoft/Phi-3-mini-4k-instruct        # Small but capable
HuggingFaceH4/zephyr-7b-beta           # Fine-tuned for instruction following
```

## Basic Conversation Request

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/huggingface-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "Explain the difference between supervised and unsupervised machine learning",
        "role": "user"
      }
    ],
    "temperature": 0.6
  }'
```

## Querying from Python

```python
import requests

def query_model(prompt: str) -> str:
    response = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/huggingface-conversation/converse",
        json={
            "inputs": [{"content": prompt, "role": "user"}],
            "temperature": 0.5
        }
    )
    response.raise_for_status()
    return response.json()['outputs'][0]['result']

result = query_model("What is gradient descent?")
```

To use a different model, create a separate component YAML pointing to that model.

## Serverless vs Dedicated Inference

The Hugging Face Inference API offers two tiers:

**Serverless (Inference API):** Uses shared infrastructure, rate-limited, free tier available. Good for development.

**Dedicated Endpoints:** Your own inference endpoint, no rate limits, private. Specify the endpoint URL in metadata:

```yaml
    - name: endpoint
      value: "https://your-endpoint.endpoints.huggingface.cloud"
```

## Handling Cold Starts

Serverless models may have cold starts. Implement retry logic:

```javascript
async function queryWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(
        'http://localhost:3500/v1.0-alpha1/conversation/huggingface-conversation/converse',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: [{ content: prompt, role: 'user' }]
          })
        }
      );

      if (response.status === 503) {
        // Model is loading, wait and retry
        console.log(`Model loading, retry ${i + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 20000));
        continue;
      }

      return await response.json();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
    }
  }
}
```

## Summary

Dapr Conversation with Hugging Face provides access to a vast library of open-source models through the unified Dapr API. Using the serverless tier works well for development and low-volume production, while dedicated endpoints suit high-throughput production workloads requiring consistent latency.
