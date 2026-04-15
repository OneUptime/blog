# How to Use Dapr Azure OpenAI Binding for AI Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, OpenAI, Binding, AI

Description: Learn how to configure and use the Dapr Azure OpenAI output binding to call GPT and embedding models from microservices for chat completion and text embedding tasks.

---

## What Is the Dapr Azure OpenAI Binding?

The Dapr Azure OpenAI binding provides a simple interface for calling Azure OpenAI Service models - including GPT-4, GPT-3.5-turbo, and text embedding models - from any Dapr-enabled microservice. This eliminates direct OpenAI SDK dependencies and centralizes model endpoint configuration.

## Setting Up Azure OpenAI Service

```bash
# Create an Azure OpenAI resource
az cognitiveservices account create \
  --name my-openai-resource \
  --resource-group my-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus

# Deploy a GPT-4 model
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group my-rg \
  --deployment-name gpt-4-deployment \
  --model-name gpt-4 \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard

# Deploy an embedding model
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group my-rg \
  --deployment-name text-embedding-deployment \
  --model-name text-embedding-ada-002 \
  --model-version "2" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard
```

## Configuring the Azure OpenAI Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ai-assistant
  namespace: default
spec:
  type: bindings.azure.openai
  version: v1
  metadata:
    - name: endpoint
      value: "https://my-openai-resource.openai.azure.com/"
    - name: apiKey
      secretKeyRef:
        name: openai-secrets
        key: apiKey
```

```bash
kubectl create secret generic openai-secrets \
  --from-literal=apiKey=<your-azure-openai-api-key>
```

## Chat Completion

Use the `chat-completion` operation to generate chat responses:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function chatWithAI(userMessage, conversationHistory = []) {
  const messages = [
    {
      role: "system",
      content: "You are a helpful customer support assistant for an e-commerce platform. Be concise and friendly.",
    },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const result = await client.binding.send(
    "ai-assistant",
    "chat-completion",
    null,
    {
      deploymentID: "gpt-4-deployment",
      messages: JSON.stringify(messages),
      temperature: "0.7",
      maxTokens: "500",
    }
  );

  return result[0].message.content;
}

const response = await chatWithAI("Where is my order ORD-001?");
console.log("AI Response:", response);
```

## Multi-Turn Conversations

```javascript
const conversationHistory = [];

async function chat(userMessage) {
  conversationHistory.push({ role: "user", content: userMessage });

  const aiResponse = await chatWithAI(userMessage, conversationHistory.slice(-10));

  conversationHistory.push({ role: "assistant", content: aiResponse });

  return aiResponse;
}

// Maintain conversation context across turns
let reply = await chat("I placed an order yesterday.");
console.log("AI:", reply);

reply = await chat("Can I change the shipping address?");
console.log("AI:", reply);
```

## Text Embeddings for Semantic Search

```javascript
async function generateEmbedding(text) {
  const result = await client.binding.send(
    "ai-assistant",
    "get-embedding",
    null,
    {
      deploymentID: "text-embedding-deployment",
      message: text,
    }
  );
  return result; // 1536-dimensional float array
}

async function findSimilarProducts(query, productDescriptions) {
  const queryEmbedding = await generateEmbedding(query);

  const similarities = await Promise.all(
    productDescriptions.map(async (product) => {
      const productEmbedding = await generateEmbedding(product.description);
      const similarity = cosineSimilarity(queryEmbedding, productEmbedding);
      return { product, similarity };
    })
  );

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)
    .map((s) => s.product);
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}
```

## Error Handling for Rate Limits

```javascript
async function safeCompletion(messages) {
  try {
    return await client.binding.send("ai-assistant", "chat-completion", null, {
      deploymentID: "gpt-4-deployment",
      messages: JSON.stringify(messages),
    });
  } catch (err) {
    if (err.message.includes("429")) {
      console.warn("OpenAI rate limit hit - will retry via Dapr resiliency");
    }
    throw err;
  }
}
```

## Summary

The Dapr Azure OpenAI binding integrates GPT and embedding models into any microservice with a simple binding call. Use the `chat-completion` operation for chat generation and `get-embedding` for semantic search. Centralizing model configuration in a Dapr component enables teams to swap models, adjust parameters, and rotate API keys without redeploying application code.
