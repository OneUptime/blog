# How to Configure Dapr Conversation with DeepSeek

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, DeepSeek, LLM, AI, Microservice

Description: Learn how to configure the Dapr Conversation API with DeepSeek, accessing DeepSeek-R1 and DeepSeek-V3 models from microservices via the Dapr sidecar.

---

DeepSeek offers high-performance language models known for strong reasoning capabilities at competitive pricing. The Dapr Conversation API supports DeepSeek as a provider, letting you integrate DeepSeek models into microservices through the unified Dapr interface.

## Prerequisites

- Dapr CLI installed and initialized
- A DeepSeek API key from [platform.deepseek.com](https://platform.deepseek.com)

## Creating the DeepSeek Conversation Component

```yaml
# components/deepseek-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: deepseek-conversation
spec:
  type: conversation.deepseek
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: deepseek-secret
        key: api-key
    - name: model
      value: "deepseek-chat"
    - name: responseCacheTTL
      value: "10m"
```

Store the API key:

```bash
# Kubernetes
kubectl create secret generic deepseek-secret \
  --from-literal=api-key=sk-your-deepseek-key

# Local development
export DEEPSEEK_API_KEY=sk-your-deepseek-key
```

For local env var secret store:

```yaml
    - name: key
      secretKeyRef:
        name: DEEPSEEK_API_KEY
        key: DEEPSEEK_API_KEY
```

## Available DeepSeek Models

```text
deepseek-chat     # DeepSeek-V3 - general purpose, fast
deepseek-reasoner # DeepSeek-R1 - advanced reasoning with chain-of-thought
```

## Calling DeepSeek via HTTP API

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/deepseek-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "Write a Python function to find the nth Fibonacci number using memoization",
        "role": "user"
      }
    ],
    "parameters": {
      "temperature": 0.3,
      "maxTokens": 800
    }
  }'
```

## Using DeepSeek-R1 for Complex Reasoning

DeepSeek-R1 excels at mathematical and logical reasoning tasks:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/deepseek-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "A distributed system has 5 nodes. If the probability of any single node failing per hour is 0.01, what is the probability that at least 3 nodes are available after 2 hours?",
        "role": "user"
      }
    ],
    "parameters": {
      "temperature": 0.1
    },
    "metadata": {
      "model": "deepseek-reasoner"
    }
  }'
```

## Code Review Example

````python
import requests
import json

def review_code_with_deepseek(code: str, language: str) -> str:
    response = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/deepseek-conversation/converse",
        json={
            "inputs": [{
                "content": f"Review this {language} code for bugs, security issues, "
                           f"and performance problems:\n\n```{language}\n{code}\n```",
                "role": "user"
            }],
            "parameters": {
                "temperature": 0.2,
                "maxTokens": 1500
            }
        }
    )
    response.raise_for_status()
    return response.json()['outputs'][0]['result']

# Example usage
code = """
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query)
"""

review = review_code_with_deepseek(code, "python")
print(review)
````

## Comparing Models in the Same Application

Use multiple components to compare outputs from different DeepSeek models:

```yaml
# components/deepseek-chat.yaml
metadata:
  name: deepseek-chat
spec:
  type: conversation.deepseek
  metadata:
    - name: model
      value: "deepseek-chat"

# components/deepseek-reasoner.yaml
metadata:
  name: deepseek-reasoner
spec:
  type: conversation.deepseek
  metadata:
    - name: model
      value: "deepseek-reasoner"
```

```bash
# Compare outputs
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/deepseek-chat/converse \
  -H "Content-Type: application/json" \
  -d '{"inputs": [{"content": "Solve: 2x + 5 = 13", "role": "user"}]}'

curl -X POST http://localhost:3500/v1.0-alpha1/conversation/deepseek-reasoner/converse \
  -H "Content-Type: application/json" \
  -d '{"inputs": [{"content": "Solve: 2x + 5 = 13", "role": "user"}]}'
```

## Summary

Configuring Dapr Conversation with DeepSeek follows the same pattern as other providers - a component YAML and a secret. DeepSeek-V3 suits general tasks while DeepSeek-R1 shines for complex reasoning and mathematical problems, and you can switch between them at the component level without changing application code.
