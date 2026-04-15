# How to Use Dapr Conversation API with LLMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, LLM, AI, API

Description: Learn how to use Dapr's Conversation API to integrate Large Language Models into your microservices, with support for OpenAI, Azure OpenAI, and other LLM providers.

---

## Introduction

Dapr's Conversation API (alpha in Dapr 1.15+) provides a building block for integrating Large Language Models (LLMs) into microservices applications. It abstracts provider-specific APIs behind a uniform interface, so your application code remains portable across OpenAI, Azure OpenAI, Hugging Face, and other supported providers.

Use cases:
- AI-powered chatbots and assistants
- Document summarization pipelines
- Sentiment analysis for customer feedback
- Code generation helpers in developer tools
- Automated content moderation

## Architecture

```mermaid
flowchart LR
    App[Application] -->|POST /v1.0-alpha1/conversation/{provider}/converse| Sidecar[Dapr Sidecar]
    Sidecar -->|Auth + API call| LLMProvider[LLM Provider]
    LLMProvider -->|Completion response| Sidecar
    Sidecar -->|Return response| App

    subgraph Providers["Supported Providers"]
        OpenAI[OpenAI]
        AzureOAI[Azure OpenAI]
        HF[Hugging Face]
        Anthropic[Anthropic]
    end
    LLMProvider --- Providers
```

## Prerequisites

- Dapr v1.15 or later
- An LLM provider API key (OpenAI, Azure OpenAI, etc.)
- Dapr initialized locally or on Kubernetes

## Step 1: Configure the Conversation Component

### OpenAI

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openai-llm
  namespace: default
spec:
  type: conversation.openai
  version: v1
  metadata:
  - name: key
    secretKeyRef:
      name: openai-secret
      key: apiKey
  - name: model
    value: "gpt-4o"
  - name: cachingEnabled
    value: "false"
```

Create the secret:

```bash
kubectl create secret generic openai-secret \
  --from-literal=apiKey=sk-your-openai-api-key
```

### Azure OpenAI

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-openai-llm
  namespace: default
spec:
  type: conversation.openai
  version: v1
  metadata:
  - name: key
    secretKeyRef:
      name: azure-openai-secret
      key: apiKey
  - name: endpoint
    value: "https://my-resource.openai.azure.com/"
  - name: model
    value: "gpt-4"
  - name: apiType
    value: "azure"
  - name: apiVersion
    value: "2024-02-01"
```

## Step 2: Send a Conversation Request

### Via HTTP API

```bash
curl -X POST \
  "http://localhost:3500/v1.0-alpha1/conversation/openai-llm/converse" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "message": "You are a helpful customer support agent.",
        "role": "system"
      },
      {
        "message": "What is the return policy for electronics?",
        "role": "user"
      }
    ],
    "parameters": {
      "temperature": 0.7,
      "maxTokens": 500
    }
  }'
```

Response:

```json
{
  "outputs": [
    {
      "result": "Our electronics return policy allows returns within 30 days of purchase with original receipt. Items must be in original packaging...",
      "parameters": {}
    }
  ]
}
```

### Via Go SDK

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

    ctx := context.Background()

    request := &dapr.ConversationRequest{
        ComponentName: "openai-llm",
        Inputs: []dapr.ConversationInput{
            {
                Message: "You are a helpful customer support agent.",
                Role:    dapr.ConversationRoleSystem,
            },
            {
                Message: "What is the return policy for electronics?",
                Role:    dapr.ConversationRoleUser,
            },
        },
        Parameters: map[string]interface{}{
            "temperature": 0.7,
            "maxTokens":   500,
        },
    }

    response, err := client.ConverseAlpha1(ctx, request)
    if err != nil {
        log.Fatalf("Conversation failed: %v", err)
    }

    for _, output := range response.Outputs {
        fmt.Printf("AI Response: %s\n", output.Result)
    }
}
```

### Via Python SDK

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._request import ConversationInput, ConversationRole

with DaprClient() as client:
    response = client.converse_alpha1(
        component_name='openai-llm',
        inputs=[
            ConversationInput(
                message="You are a helpful customer support agent.",
                role=ConversationRole.SYSTEM
            ),
            ConversationInput(
                message="What is the return policy for electronics?",
                role=ConversationRole.USER
            )
        ],
        parameters={
            'temperature': 0.7,
            'maxTokens': 500
        }
    )
    for output in response.outputs:
        print(f"AI Response: {output.result}")
```

## Multi-Turn Conversations

Build multi-turn conversations by including prior exchanges in the inputs:

```python
conversation_history = [
    {'role': 'system', 'message': 'You are a helpful assistant.'},
    {'role': 'user', 'message': 'What is the capital of France?'},
    {'role': 'assistant', 'message': 'The capital of France is Paris.'},
    {'role': 'user', 'message': 'What is its population?'}
]

inputs = [ConversationInput(message=msg['message'], role=msg['role'])
          for msg in conversation_history]

response = client.converse_alpha1(
    component_name='openai-llm',
    inputs=inputs
)
print(response.outputs[0].result)
```

## Caching LLM Responses

Enable response caching to reduce API costs for repeated identical queries:

```yaml
spec:
  metadata:
  - name: cachingEnabled
    value: "true"
  - name: cacheTTL
    value: "3600"
```

With caching enabled, identical inputs return the cached response without calling the LLM provider.

## PII Scrubbing (Obfuscation)

Configure sensitive data scrubbing before sending to the LLM:

```yaml
spec:
  metadata:
  - name: scrubPII
    value: "true"
```

This replaces detected PII (emails, phone numbers, SSNs) with placeholders before the request is sent to the provider.

## Building a Simple Chatbot Service

```javascript
// Node.js chatbot endpoint
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const sessions = {}; // In production, use Redis or a session store

app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessions[sessionId]) {
    sessions[sessionId] = [
      { role: 'system', message: 'You are a helpful shopping assistant.' }
    ];
  }

  sessions[sessionId].push({ role: 'user', message });

  const response = await axios.post(
    'http://localhost:3500/v1.0-alpha1/conversation/openai-llm/converse',
    { inputs: sessions[sessionId], parameters: { temperature: 0.7 } }
  );

  const aiMessage = response.data.outputs[0].result;
  sessions[sessionId].push({ role: 'assistant', message: aiMessage });

  res.json({ response: aiMessage });
});

app.listen(3000);
```

## Summary

Dapr's Conversation API provides a portable, cloud-agnostic interface for integrating LLMs into microservices. Configure a provider component (OpenAI, Azure OpenAI, etc.) with your API key and model settings. Send conversation inputs with system and user roles via the HTTP API or SDK. Enable caching to reduce costs, and use PII scrubbing for compliance. The uniform API means switching LLM providers requires only a component configuration change, not application code changes.
