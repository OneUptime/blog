# How to Use the Dapr Conversation API to Interact with LLMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation API, LLM, AI, Microservice

Description: Learn how to use the Dapr Conversation API to send prompts to large language models like OpenAI GPT from your microservices with a unified, provider-agnostic interface.

---

## What Is the Dapr Conversation API

The Dapr Conversation API is a building block that provides a unified interface for interacting with large language models (LLMs) such as OpenAI GPT, Azure OpenAI, and other compatible providers. Instead of embedding LLM SDK code and API keys in each service, you configure an LLM component in Dapr and call it through the sidecar API.

This makes your AI-enabled services portable - you can switch LLM providers by changing a component file without touching application code.

## Prerequisites

- Dapr CLI installed (v1.15+)
- An OpenAI API key or Azure OpenAI deployment
- Basic familiarity with Dapr components

## Define the OpenAI Conversation Component

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
  - name: cacheTTL
    value: "60s"
```

Create the secret:

```bash
kubectl create secret generic openai-secret \
  --from-literal=apiKey="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
```

## Define an Azure OpenAI Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-llm
  namespace: default
spec:
  type: conversation.openai
  version: v1
  metadata:
  - name: apiType
    value: "azure"
  - name: key
    secretKeyRef:
      name: azure-openai-secret
      key: apiKey
  - name: endpoint
    value: "https://my-openai.openai.azure.com/"
  - name: model
    value: "gpt-4"
  - name: apiVersion
    value: "2024-02-01"
```

## Send a Prompt via the HTTP API

```bash
curl -X POST \
  http://localhost:3500/v1.0-alpha1/conversation/openai-llm/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "Summarize the following text in 3 bullet points: Dapr is a portable, event-driven runtime that makes it easy for any developer to build resilient, stateless and stateful applications that run on the cloud and edge.",
        "role": "user"
      }
    ],
    "temperature": 0.5,
    "parameters": {
      "maxTokens": "200"
    }
  }'
```

Response:

```json
{
  "outputs": [
    {
      "result": "- Dapr is a portable, event-driven runtime for building microservices\n- Supports both stateless and stateful applications\n- Designed for cloud and edge deployment"
    }
  ]
}
```

## Use in a Node.js Application

```javascript
const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || '3500';
const LLM_COMPONENT = 'openai-llm';

async function askLLM(userMessage, systemPrompt = null) {
  const inputs = [];

  if (systemPrompt) {
    inputs.push({ content: systemPrompt, role: 'system' });
  }

  inputs.push({ content: userMessage, role: 'user' });

  const response = await fetch(
    `http://localhost:${DAPR_HTTP_PORT}/v1.0-alpha1/conversation/${LLM_COMPONENT}/converse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs,
        temperature: 0.7,
        parameters: { maxTokens: '1000' },
      }),
    }
  );

  const data = await response.json();
  return data.outputs[0].result;
}

// Example: document summarization service
async function summarizeDocument(documentText) {
  const systemPrompt = 'You are a professional document summarizer. Provide concise, accurate summaries.';
  const prompt = `Summarize the following document in 3-5 sentences:\n\n${documentText}`;

  return await askLLM(prompt, systemPrompt);
}

// Example: customer support AI
async function handleCustomerQuery(query, context) {
  const systemPrompt = `You are a helpful customer support agent for ${context.companyName}.
    Be polite, concise, and accurate. If you cannot answer, say so.`;

  return await askLLM(query, systemPrompt);
}

// Example: code review assistant
async function reviewCode(codeSnippet, language) {
  const prompt = `Review this ${language} code for bugs, performance issues, and best practice violations. Provide specific, actionable feedback:\n\n\`\`\`${language}\n${codeSnippet}\n\`\`\``;

  return await askLLM(prompt, 'You are an expert code reviewer. Be specific and constructive.');
}
```

## Use in Python

```python
from dapr.clients import DaprClient

LLM_COMPONENT = 'openai-llm'

def ask_llm(user_message: str, system_prompt: str = None, max_tokens: int = 500) -> str:
    with DaprClient() as client:
        inputs = []

        if system_prompt:
            inputs.append({'content': system_prompt, 'role': 'system'})

        inputs.append({'content': user_message, 'role': 'user'})

        response = client.converse_alpha1(
            name=LLM_COMPONENT,
            inputs=inputs,
            temperature=0.7,
            parameters={'maxTokens': str(max_tokens)}
        )

        return response.outputs[0].result

# Sentiment analysis for product reviews
def analyze_sentiment(review_text: str) -> dict:
    prompt = f"""Analyze the sentiment of this product review.
    Return JSON with keys: sentiment (positive/negative/neutral), score (0-10), summary.

    Review: {review_text}"""

    raw = ask_llm(prompt, 'Respond with valid JSON only.')
    import json
    return json.loads(raw)

# Generate SQL from natural language
def natural_language_to_sql(question: str, schema: str) -> str:
    prompt = f"""Given this database schema:
{schema}

Generate a SQL query to answer: {question}

Return only the SQL query, no explanation."""

    return ask_llm(prompt, 'You are a SQL expert. Return only valid SQL.')
```

## Implement Conversation History

```javascript
const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || '3500';

class ConversationSession {
  constructor(llmComponent, systemPrompt) {
    this.component = llmComponent;
    this.history = systemPrompt
      ? [{ content: systemPrompt, role: 'system' }]
      : [];
  }

  async chat(userMessage) {
    this.history.push({ content: userMessage, role: 'user' });

    const response = await fetch(
      `http://localhost:${DAPR_HTTP_PORT}/v1.0-alpha1/conversation/${this.component}/converse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: this.history }),
      }
    );

    const data = await response.json();
    const reply = data.outputs[0].result;
    this.history.push({ content: reply, role: 'assistant' });

    return reply;
  }
}

// Multi-turn conversation
const session = new ConversationSession(
  'openai-llm',
  'You are a helpful cooking assistant.'
);

const response1 = await session.chat('I have chicken, garlic, and lemon. What can I make?');
const response2 = await session.chat('How long does it take to cook?');
const response3 = await session.chat('What temperature should the oven be?');
```

## Summary

The Dapr Conversation API provides a portable, provider-agnostic interface for integrating large language models into microservices. By configuring LLM providers as Dapr components, you can switch between OpenAI, Azure OpenAI, and other providers without code changes, while keeping API keys securely stored in Dapr secret stores. The unified API supports single-turn prompts, multi-turn conversations, and customizable parameters like temperature and token limits.
