# How to Configure Dapr Conversation with Google AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Google AI, Gemini, LLM, AI

Description: Learn how to configure the Dapr Conversation API with Google AI Gemini models, enabling microservices to interact with Gemini through the unified Dapr sidecar interface.

---

Google AI provides the Gemini family of models through the Google AI Studio API. Dapr Conversation supports Google AI as a provider, giving your microservices access to Gemini models through a standardized interface that decouples application code from provider-specific SDKs.

## Prerequisites

- Dapr CLI installed and initialized
- A Google AI API key from [aistudio.google.com](https://aistudio.google.com)

## Creating the Google AI Conversation Component

```yaml
# components/google-ai-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: google-ai-conversation
spec:
  type: conversation.googleai
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: google-ai-secret
        key: api-key
    - name: model
      value: "gemini-2.0-flash"
    - name: responseCacheTTL
      value: "10m"
```

Store the API key:

```bash
# Kubernetes
kubectl create secret generic google-ai-secret \
  --from-literal=api-key=AIzaSy-your-google-api-key

# Local development
export GOOGLE_AI_API_KEY=AIzaSy-your-google-api-key
```

## Available Gemini Models

```text
gemini-2.0-flash         # Fast, efficient, best for most tasks
gemini-2.5-flash         # Enhanced reasoning with thinking capabilities
gemini-1.5-pro           # Long context window (2M tokens)
gemini-1.5-flash         # Fast and cost-effective
```

## Basic Conversation Request

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/google-ai-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "What are the main differences between REST and gRPC for microservice communication?",
        "role": "user"
      }
    ],
    "temperature": 0.5
  }'
```

## Using Gemini 1.5 Pro for Long Context

Gemini 1.5 Pro supports up to 2 million tokens, making it suitable for analyzing large codebases:

```python
import requests

def analyze_large_document(document_content: str) -> str:
    response = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/google-ai-conversation/converse",
        json={
            "inputs": [{
                "content": (
                    "Analyze the following document and provide a structured summary "
                    "with key findings, action items, and risks:\n\n"
                    + document_content
                ),
                "role": "user"
            }],
            "temperature": 0.3
        }
    )
    response.raise_for_status()
    return response.json()['outputs'][0]['result']
```

## JavaScript SDK Example

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/translate', async (req, res) => {
  const { text, targetLanguage } = req.body;

  const response = await fetch(
    'http://localhost:3500/v1.0-alpha1/conversation/google-ai-conversation/converse',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: [{
          content: `Translate the following text to ${targetLanguage}:\n\n${text}`,
          role: 'user'
        }],
        temperature: 0.1
      })
    }
  );

  const data = await response.json();
  res.json({ translation: data.outputs[0].result });
});

app.listen(6001);
```

## Google AI vs Vertex AI

Google AI (via AI Studio) is what the `conversation.googleai` component uses. For enterprise use on Google Cloud, Vertex AI is a separate service with additional features like VPC-SC support and enterprise SLAs. As of Dapr 1.14, there is no dedicated `conversation.vertexai` component — use the `conversation.googleai` component with your Google AI API key for Dapr Conversation workloads.

## Summary

Configuring Dapr Conversation with Google AI gives your microservices access to the Gemini model family through the unified Dapr interface. Gemini 2.0 Flash is ideal for most production workloads, while Gemini 1.5 Pro suits long-context tasks, and switching between them requires only a component configuration change.
