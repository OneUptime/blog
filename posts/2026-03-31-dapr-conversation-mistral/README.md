# How to Configure Dapr Conversation with Mistral

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Mistral, LLM, AI, Microservice

Description: Learn how to configure the Dapr Conversation API with Mistral AI, accessing Mistral models from microservices via the Dapr sidecar for efficient AI integration.

---

Mistral AI offers high-quality, efficient language models known for strong performance at lower costs than competing providers. Dapr Conversation supports Mistral as a provider, enabling your microservices to access Mistral models through the unified Dapr interface.

## Prerequisites

- Dapr CLI installed and initialized
- A Mistral API key from [console.mistral.ai](https://console.mistral.ai)

## Creating the Mistral Conversation Component

```yaml
# components/mistral-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mistral-conversation
spec:
  type: conversation.mistral
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: mistral-secret
        key: api-key
    - name: model
      value: "mistral-large-latest"
    - name: responseCacheTTL
      value: "10m"
```

Store the API key:

```bash
# Kubernetes
kubectl create secret generic mistral-secret \
  --from-literal=api-key=your-mistral-api-key

# Local development
export MISTRAL_API_KEY=your-mistral-api-key
```

## Available Mistral Models

```text
mistral-large-latest     # Most capable, best for complex tasks
mistral-small-latest     # Efficient, good price-performance
codestral-latest         # Optimized for code generation
mistral-embed            # Text embeddings (not for conversation)
open-mistral-nemo        # Open-weight, community model
```

## Basic Conversation Request

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/mistral-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "What are the SOLID principles in software engineering?",
        "role": "user"
      }
    ],
    "parameters": {
      "temperature": 0.4,
      "maxTokens": 600
    }
  }'
```

## Code Generation with Codestral

Codestral is optimized for code-related tasks:

```python
import requests

def generate_code(description: str, language: str) -> str:
    response = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/mistral-conversation/converse",
        json={
            "inputs": [{
                "content": f"Write a {language} function that: {description}\n"
                           "Include error handling and docstring.",
                "role": "user"
            }],
            "metadata": {
                "model": "codestral-latest"
            },
            "parameters": {
                "temperature": 0.1,
                "maxTokens": 1000
            }
        }
    )
    response.raise_for_status()
    return response.json()['outputs'][0]['result']

# Generate a database query builder
code = generate_code(
    "builds parameterized SQL SELECT queries with optional WHERE clauses",
    "Python"
)
print(code)
```

## Multi-turn Code Review

```javascript
const conversationHistory = [];

async function reviewCodeIteratively(initialCode) {
  const daprUrl = 'http://localhost:3500/v1.0-alpha1/conversation/mistral-conversation/converse';

  // First pass: identify issues
  conversationHistory.push({
    content: `Review this code and identify any issues:\n\n${initialCode}`,
    role: 'user'
  });

  let response = await fetch(daprUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: conversationHistory })
  });
  let data = await response.json();
  const reviewResult = data.outputs[0].result;

  conversationHistory.push({
    content: reviewResult,
    role: 'assistant'
  });

  // Second pass: request fixes
  conversationHistory.push({
    content: 'Now rewrite the code with all the issues fixed.',
    role: 'user'
  });

  response = await fetch(daprUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: conversationHistory })
  });
  data = await response.json();

  return {
    issues: reviewResult,
    fixedCode: data.outputs[0].result
  };
}
```

## Function Calling Support

Mistral models support function calling. Pass tool definitions in parameters:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/mistral-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [{"content": "What is the weather in Paris?", "role": "user"}],
    "parameters": {
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "get_weather",
            "description": "Get current weather for a city",
            "parameters": {
              "type": "object",
              "properties": {
                "city": {"type": "string"}
              }
            }
          }
        }
      ]
    }
  }'
```

## Summary

Dapr Conversation with Mistral provides a cost-effective path to capable language models, with Codestral offering specialized code generation capabilities. The unified Dapr API means you can combine multiple Mistral models in one application and switch between them through component configuration alone.
