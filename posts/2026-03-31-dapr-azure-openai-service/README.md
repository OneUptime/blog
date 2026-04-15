# How to Use Dapr with Azure OpenAI Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, OpenAI, AI, Microservice

Description: Learn how to invoke Azure OpenAI endpoints from Dapr microservices using service invocation and output bindings for AI-powered applications.

---

## Overview

Azure OpenAI Service provides access to powerful language models like GPT-4. Integrating it with Dapr allows your microservices to call AI endpoints using Dapr's service invocation or HTTP output binding, keeping your application decoupled from direct SDK dependencies.

## Prerequisites

- An Azure OpenAI resource with a deployed model (e.g., gpt-4)
- Dapr CLI installed
- A running Dapr sidecar

## Approach 1: HTTP Output Binding

Use Dapr's HTTP output binding to call the Azure OpenAI completion endpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-openai
  namespace: default
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "https://myopenai.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2024-10-21"
```

Invoke a completion:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/azure-openai \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "messages": [{"role": "user", "content": "Summarize this order: #1001"}]
    },
    "metadata": {
      "Content-Type": "application/json",
      "Api-Key": "YOUR_API_KEY"
    },
    "operation": "post"
  }'
```

## Approach 2: Sidecar-to-Service Invocation

Deploy an AI service alongside Dapr and invoke it from other microservices:

```yaml
# ai-service deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "ai-service"
        dapr.io/app-port: "8080"
```

Call the AI service from another Dapr app:

```bash
curl -X POST http://localhost:3500/v1.0/invoke/ai-service/method/summarize \
  -H "Content-Type: application/json" \
  -d '{"orderId": "1001", "items": ["widget", "gadget"]}'
```

## Storing Conversation History with Dapr State

Use Dapr state management to persist conversation history:

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient();

async function chat(userId, userMessage) {
  // Load conversation history
  const history = await client.state.get("statestore", `chat-${userId}`) || [];

  history.push({ role: "user", content: userMessage });

  // Call Azure OpenAI
  const response = await callAzureOpenAI(history);
  const assistantMessage = response.choices[0].message.content;

  history.push({ role: "assistant", content: assistantMessage });

  // Save updated history
  await client.state.save("statestore", [
    { key: `chat-${userId}`, value: history }
  ]);

  return assistantMessage;
}
```

## Using Dapr Secrets for API Key Management

Store the Azure OpenAI API key in a Dapr secrets store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-keyvault
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "my-key-vault"
```

Reference the secret in your binding component using `securityToken` and `securityTokenHeader`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-openai
  namespace: default
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "https://myopenai.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2024-10-21"
  - name: securityToken
    secretKeyRef:
      name: azure-openai-api-key
      key: apiKey
  - name: securityTokenHeader
    value: "api-key"
  auth:
    secretStore: azure-keyvault
```

## Summary

Dapr enables clean integration with Azure OpenAI Service through HTTP output bindings and service invocation patterns. Combining AI calls with Dapr's state management and secrets store lets you build scalable, secure AI-powered microservices without vendor lock-in.
