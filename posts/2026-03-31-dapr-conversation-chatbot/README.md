# How to Use Dapr Conversation API for Chatbot Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Chatbot, LLM, AI, Microservice

Description: Learn how to build chatbot applications using the Dapr Conversation API, managing conversation history and multi-turn interactions with LLMs in microservices.

---

Building chatbots requires managing conversation history, maintaining context across turns, and handling multi-user sessions. The Dapr Conversation API provides the LLM integration layer, while Dapr State handles conversation history, creating a clean separation of concerns.

## Chatbot Architecture with Dapr

```text
User Request --> API Gateway
                     |
                     v
              Chat Service (handles sessions)
                     |
                     +-- Dapr State (conversation history)
                     |
                     +-- Dapr Conversation (LLM calls)
                     |
                     v
              Response to User
```

## Setting Up the Chat Service

```javascript
const express = require('express');
const app = express();
app.use(express.json());

const DAPR_URL = 'http://localhost:3500';
const STATE_STORE = 'statestore';
const CONVERSATION_COMPONENT = 'openai-conversation';
const MAX_HISTORY = 20; // Maximum messages to retain per session

// Get conversation history from Dapr State
async function getHistory(sessionId) {
  const response = await fetch(
    `${DAPR_URL}/v1.0/state/${STATE_STORE}/chat:${sessionId}`
  );
  if (!response.ok) return [];
  return await response.json() || [];
}

// Save conversation history to Dapr State
async function saveHistory(sessionId, history) {
  await fetch(`${DAPR_URL}/v1.0/state/${STATE_STORE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      key: `chat:${sessionId}`,
      value: history,
      metadata: { ttlInSeconds: "3600" } // 1 hour session TTL
    }])
  });
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message required' });
  }

  try {
    // Load existing history
    let history = await getHistory(sessionId);

    // Add user message
    history.push({ content: message, role: 'user' });

    // Trim history if too long
    if (history.length > MAX_HISTORY) {
      history = history.slice(history.length - MAX_HISTORY);
    }

    // Call LLM via Dapr Conversation
    const llmResponse = await fetch(
      `${DAPR_URL}/v1.0-alpha1/conversation/${CONVERSATION_COMPONENT}/converse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: history,
          temperature: 0.7
        })
      }
    );

    const llmData = await llmResponse.json();
    const assistantMessage = llmData.outputs[0].result;

    // Add assistant response to history
    history.push({ content: assistantMessage, role: 'assistant' });

    // Save updated history
    await saveHistory(sessionId, history);

    res.json({
      sessionId,
      message: assistantMessage,
      turnCount: Math.ceil(history.length / 2)
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat service error' });
  }
});

// Clear conversation session
app.delete('/api/chat/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  await fetch(
    `${DAPR_URL}/v1.0/state/${STATE_STORE}/chat:${sessionId}`,
    { method: 'DELETE' }
  );
  res.json({ cleared: true });
});

app.listen(6001);
```

## Adding a System Prompt

Include a system message at the start of every conversation:

```javascript
async function getConversationInputs(sessionId, userMessage, systemPrompt) {
  const history = await getHistory(sessionId);

  const inputs = [];

  if (history.length === 0 && systemPrompt) {
    inputs.push({ content: systemPrompt, role: 'system' });
  }

  inputs.push(...history);
  inputs.push({ content: userMessage, role: 'user' });

  return inputs;
}
```

## Client Example

Test the chatbot:

```bash
# Start a conversation
curl -X POST http://localhost:6001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-abc123", "message": "Hi, I need help with Kubernetes networking"}'

# Continue the conversation
curl -X POST http://localhost:6001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-abc123", "message": "How do Services and Ingress differ?"}'

# Clear the session
curl -X DELETE http://localhost:6001/api/chat/session-abc123
```

## Switching LLM Providers per User

Route premium users to better models:

```javascript
function getConversationComponent(userTier) {
  return userTier === 'premium'
    ? 'openai-conversation'  // GPT-4
    : 'ollama-conversation'; // Local Llama
}
```

## Summary

The Dapr Conversation API combined with Dapr State provides all the building blocks for a production chatbot: LLM integration through a unified API, conversation history persistence with automatic TTL, and easy provider switching. This architecture scales naturally in microservice deployments.
