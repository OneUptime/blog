# How to Configure Dapr Conversation with OpenAI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, OpenAI, LLM, AI, Microservice

Description: Learn how to configure the Dapr Conversation API with OpenAI, setting up the component YAML and making LLM calls from your microservices using GPT models.

---

The Dapr Conversation API provides a unified interface for interacting with LLM providers. Configuring it with OpenAI lets your microservices call GPT models without directly managing API keys in application code or handling provider-specific SDK dependencies.

## Prerequisites

- Dapr CLI installed and initialized
- An OpenAI API key from [platform.openai.com](https://platform.openai.com)

## Creating the OpenAI Conversation Component

Create a component YAML file for the OpenAI provider:

```yaml
# components/openai-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openai-conversation
spec:
  type: conversation.openai
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: openai-secret
        key: api-key
    - name: model
      value: "gpt-4o"
    - name: responseCacheTTL
      value: "10m"
```

Store the API key as a Kubernetes secret:

```bash
kubectl create secret generic openai-secret \
  --from-literal=api-key=sk-your-openai-key
```

For local development, use an environment variable secret store:

```yaml
# components/secrets.yaml (local dev)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secret-store
spec:
  type: secretstores.local.env
  version: v1
```

Set the env var:

```bash
export OPENAI_API_KEY=sk-your-openai-key
```

Update the component to use the local store:

```yaml
    - name: key
      secretKeyRef:
        name: OPENAI_API_KEY
        key: OPENAI_API_KEY
```

## Calling OpenAI via the Dapr HTTP API

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/openai-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "Explain the CAP theorem in simple terms",
        "role": "user"
      }
    ],
    "parameters": {
      "temperature": 0.7
    }
  }'
```

Response:

```json
{
  "outputs": [
    {
      "result": "The CAP theorem states that in a distributed system, you can only guarantee two of three properties: Consistency, Availability, and Partition tolerance...",
      "parameters": {}
    }
  ]
}
```

## Using the Go SDK

```go
package main

import (
    "context"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    input := dapr.ConversationInput{
        Content: "Summarize the benefits of microservices architecture",
    }

    request := dapr.NewConversationRequest("openai-conversation", []dapr.ConversationInput{input})

    resp, err := client.ConverseAlpha1(context.Background(), request)
    if err != nil {
        log.Fatal(err)
    }

    for _, output := range resp.Outputs {
        fmt.Println(output.Result)
    }
}
```

## Specifying a Different Model

Override the model at request time:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/openai-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [{"content": "Write a haiku about Kubernetes", "role": "user"}],
    "metadata": {
      "model": "gpt-4o-mini"
    },
    "parameters": {
      "temperature": 1.0
    }
  }'
```

## Enabling Response Caching

The `responseCacheTTL` metadata caches identical prompts for the specified duration, reducing API costs:

```yaml
    - name: responseCacheTTL
      value: "30m"
```

## Summary

Configuring Dapr Conversation with OpenAI takes just a component YAML file and a secret. The unified Conversation API means you can call GPT models from any language using the Dapr sidecar, while keeping API keys out of application code and enabling provider switching without code changes.
