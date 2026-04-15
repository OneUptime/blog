# How to Use Dapr Conversation API with Streaming Responses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Streaming, LLM, AI, Microservice

Description: Learn how to use streaming responses with the Dapr Conversation API, enabling real-time token-by-token output from LLMs for responsive user interfaces.

---

> **Note:** As of Dapr v1.15, the Conversation API is in alpha and does not natively support streaming responses. The streaming patterns shown below are speculative and based on how streaming could be implemented using standard HTTP streaming techniques on top of the Conversation API. The Dapr Conversation API currently returns complete responses in a single request/response cycle.

Streaming LLM responses dramatically improves perceived performance - users see text appearing in real time rather than waiting for the complete response. While the Dapr Conversation API does not yet natively support streaming, you can implement streaming patterns by combining the API with Server-Sent Events and client-side techniques.

## Understanding Streaming Mode

Without streaming: client waits for the full LLM response (can take 5-30 seconds for long outputs).
With streaming: tokens appear as they are generated (first token in under 1 second).

## Enabling Streaming in the Component

Configure the component:

```yaml
# components/openai-streaming.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openai-streaming
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
    - name: cacheTTL
      value: "10m"
```

Example request using the Conversation API:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/openai-streaming/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [{"content": "Write a 500-word essay on microservices", "role": "user"}],
    "temperature": 0.7
  }'
```

## Streaming with Server-Sent Events (Node.js)

Build a streaming endpoint that proxies Dapr streaming responses to the browser:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

const DAPR_URL = 'http://localhost:3500';

app.post('/api/stream-chat', async (req, res) => {
  const { message } = req.body;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const daprResponse = await fetch(
      `${DAPR_URL}/v1.0-alpha1/conversation/openai-streaming/converse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: [{ content: message, role: 'user' }],
          temperature: 0.7
        })
      }
    );

    // Stream the response back to the client
    const reader = daprResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      res.write(`data: ${chunk}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(6001);
```

## Browser Client for Streaming

```html
<!DOCTYPE html>
<html>
<head><title>Streaming Chat</title></head>
<body>
  <textarea id="message" placeholder="Ask something..."></textarea>
  <button onclick="sendMessage()">Send</button>
  <div id="response"></div>

  <script>
    async function sendMessage() {
      const message = document.getElementById('message').value;
      const responseDiv = document.getElementById('response');
      responseDiv.innerHTML = '';

      const response = await fetch('/api/stream-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.outputs) {
                responseDiv.innerHTML += parsed.outputs[0].result;
              }
            } catch (e) {
              responseDiv.innerHTML += data;
            }
          }
        }
      }
    }
  </script>
</body>
</html>
```

## Streaming with Python

```python
import requests

def stream_conversation(component: str, message: str):
    with requests.post(
        f"http://localhost:3500/v1.0-alpha1/conversation/{component}/converse",
        json={
            "inputs": [{"content": message, "role": "user"}],
            "temperature": 0.7
        },
        stream=True
    ) as response:
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                if decoded.startswith('data:'):
                    chunk = decoded[5:].strip()
                    if chunk != '[DONE]':
                        print(chunk, end='', flush=True)

# Usage
stream_conversation("openai-streaming", "Explain async/await in JavaScript")
print()  # newline after completion
```

## Supported Conversation Providers

The following providers are officially supported by the Dapr Conversation API (as of v1.15, all in alpha):

```yaml
OpenAI:      Supported (conversation.openai)
Anthropic:   Supported (conversation.anthropic)
AWS Bedrock: Supported (conversation.aws.bedrock)
DeepSeek:    Supported (conversation.deepseek)
Mistral:     Supported (conversation.mistral)
Hugging Face: Supported (conversation.huggingface)
```

Note: Native streaming support is not yet available in the Dapr Conversation API for any provider. The underlying LLM providers support streaming in their native APIs, but Dapr does not currently expose this capability.

## Summary

While the Dapr Conversation API does not yet natively support streaming, you can build responsive user interfaces by combining the Conversation API with Server-Sent Events patterns. The code examples above demonstrate how to proxy responses to clients for real-time delivery in web applications. Watch for future Dapr releases that may add native streaming support to the Conversation building block.
