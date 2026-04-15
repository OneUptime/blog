# How to Configure Dapr Conversation with Anthropic Claude

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Anthropic, Claude, LLM, AI

Description: Learn how to configure the Dapr Conversation API with Anthropic Claude, setting up the component and calling Claude models from microservices via the Dapr sidecar.

---

The Dapr Conversation API supports Anthropic Claude as a provider, letting your microservices interact with Claude models through the unified Dapr interface. This removes direct Anthropic SDK dependencies from your application code and centralizes API key management.

## Prerequisites

- Dapr CLI installed and initialized
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

## Creating the Anthropic Conversation Component

```yaml
# components/anthropic-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: anthropic-conversation
spec:
  type: conversation.anthropic
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: anthropic-secret
        key: api-key
    - name: model
      value: "claude-3-5-sonnet-20241022"
    - name: responseCacheTTL
      value: "10m"
```

Store the API key:

```bash
# Kubernetes
kubectl create secret generic anthropic-secret \
  --from-literal=api-key=sk-ant-your-key

# Local development
export ANTHROPIC_API_KEY=sk-ant-your-key
```

For local development with env var store:

```yaml
    - name: key
      secretKeyRef:
        name: ANTHROPIC_API_KEY
        key: ANTHROPIC_API_KEY
```

## Calling Claude via HTTP API

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/anthropic-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "Review this Go function for potential issues and suggest improvements",
        "role": "user"
      }
    ],
    "parameters": {
      "temperature": 0.3,
      "max_tokens": 1000
    }
  }'
```

## Multi-Turn Conversation

Claude excels at multi-turn conversations. Pass conversation history in the inputs:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/anthropic-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "I am building a distributed cache system",
        "role": "user"
      },
      {
        "content": "Great! What consistency model are you targeting - eventual or strong consistency?",
        "role": "assistant"
      },
      {
        "content": "I need strong consistency. What are my options?",
        "role": "user"
      }
    ]
  }'
```

## Using the Python SDK

```python
import asyncio
from dapr.clients import DaprClient
from dapr.clients.grpc._request import ConversationInput

async def ask_claude(question: str) -> str:
    with DaprClient() as client:
        inputs = [ConversationInput(message=question, role="user")]

        response = await client.converse_alpha1(
            component_name="anthropic-conversation",
            inputs=inputs,
            parameters={"temperature": 0.5}
        )

        return response.outputs[0].result

async def main():
    answer = await ask_claude(
        "What are the key differences between Saga and 2PC for distributed transactions?"
    )
    print(answer)

asyncio.run(main())
```

## Selecting Claude Model Variants

Different Claude models suit different tasks:

```yaml
# Claude 3.5 Sonnet - best for complex reasoning
    - name: model
      value: "claude-3-5-sonnet-20241022"

# Claude 3 Haiku - fastest, most cost-effective
    - name: model
      value: "claude-3-haiku-20240307"

# Claude 3 Opus - most capable for complex tasks
    - name: model
      value: "claude-3-opus-20240229"
```

Override the model per request:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/anthropic-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [{"content": "Hello", "role": "user"}],
    "parameters": {"model": "claude-3-haiku-20240307"}
  }'
```

## Summary

Configuring Dapr Conversation with Anthropic Claude requires a simple component YAML and secret management. The unified API lets you switch between Claude model variants or even change providers entirely without modifying application code, enabling flexible AI integration in microservice architectures.
