# How to Build Conversational AI Applications with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversational AI, Chatbot, LLM, State Management

Description: Learn how to build stateful conversational AI applications with Dapr using persistent conversation history, multi-turn context, and session management.

---

## What Makes a Conversational AI Application?

A conversational AI application maintains context across multiple turns of a conversation. Unlike a single-shot LLM call, it:

- Stores conversation history per user/session
- Retrieves relevant history on each turn
- Maintains user preferences and context
- Supports multiple concurrent sessions
- Handles session expiry and cleanup

Dapr's state management and actor model are ideal for building these systems.

## Session State Design

Use a structured conversation session object:

```python
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List

@dataclass
class Message:
    role: str  # "user" or "assistant"
    content: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

@dataclass
class ConversationSession:
    session_id: str
    user_id: str
    messages: List[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
```

## Building the Conversation Service

```python
from fastapi import FastAPI
from dapr.clients import DaprClient
from dapr_agents import Agent, tool
from dapr_agents.llm import OpenAIChat
from dapr_agents.memory import DaprStateMemory
import json

app = FastAPI()
dapr_client = DaprClient()

class ConversationalAgent(Agent):
    name = "conversational-agent"
    instructions = """You are a helpful AI assistant. Maintain conversation
    context, remember what was discussed earlier in this session, and
    provide consistent, helpful responses. Be concise but thorough."""

    @tool
    def recall_session_context(self, session_id: str) -> str:
        """Recalls previous context from the current conversation session.

        Args:
            session_id: The conversation session identifier.
        """
        state = dapr_client.get_state("statestore", f"session-{session_id}")
        if state.data:
            session = json.loads(state.data)
            recent = session["messages"][-5:]  # Last 5 messages
            return json.dumps(recent)
        return "No previous context found for this session."

    @tool
    def save_user_preference(self, session_id: str, key: str, value: str) -> str:
        """Saves a user preference to the session.

        Args:
            session_id: The session to save the preference to.
            key: Preference key (e.g., language, format, topic).
            value: Preference value.
        """
        state = dapr_client.get_state("statestore", f"prefs-{session_id}")
        prefs = json.loads(state.data) if state.data else {}
        prefs[key] = value
        dapr_client.save_state("statestore", f"prefs-{session_id}", json.dumps(prefs))
        return f"Saved preference {key}={value}"


def get_agent_for_session(session_id: str) -> ConversationalAgent:
    """Returns an agent instance with session-specific memory."""
    return ConversationalAgent(
        llm=OpenAIChat(model="gpt-4o"),
        memory=DaprStateMemory(
            store_name="statestore",
            session_id=session_id,
            max_history=20
        )
    )
```

## Conversation API Endpoints

```python
@app.post("/chat/{session_id}")
async def chat(session_id: str, request: dict):
    user_message = request["message"]
    user_id = request.get("user_id", "anonymous")

    # Load or create session
    state = dapr_client.get_state("statestore", f"session-{session_id}")
    if state.data:
        session = json.loads(state.data)
    else:
        session = ConversationSession(
            session_id=session_id,
            user_id=user_id
        ).__dict__

    # Add user message to history
    session["messages"].append({"role": "user", "content": user_message})
    session["updated_at"] = datetime.utcnow().isoformat()

    # Get agent response
    agent = get_agent_for_session(session_id)
    response = agent.run(user_message)

    # Save assistant response
    session["messages"].append({"role": "assistant", "content": response})
    dapr_client.save_state("statestore", f"session-{session_id}", json.dumps(session))

    return {
        "session_id": session_id,
        "response": response,
        "turn": len(session["messages"]) // 2
    }

@app.delete("/chat/{session_id}")
async def end_session(session_id: str):
    """Clears the conversation session."""
    dapr_client.delete_state("statestore", f"session-{session_id}")
    dapr_client.delete_state("statestore", f"prefs-{session_id}")
    return {"status": "session cleared"}
```

## Session Expiry with Dapr State TTL

```python
dapr_client.save_state(
    "statestore",
    f"session-{session_id}",
    json.dumps(session),
    state_metadata={"ttlInSeconds": "3600"}  # 1 hour TTL
)
```

## Running the Service

```bash
dapr run --app-id conversational-agent \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --components-path ./components \
  -- uvicorn chat_service:app --port 8080
```

Test a multi-turn conversation:

```bash
curl -X POST http://localhost:8080/chat/session-001 \
  -H "Content-Type: application/json" \
  -d '{"message": "My name is Alice. I prefer concise answers.", "user_id": "user-1"}'

curl -X POST http://localhost:8080/chat/session-001 \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my name?"}'
```

## Summary

Dapr Agents enables stateful conversational AI by using `DaprStateMemory` for session-scoped conversation history and the Dapr state store for persistent session data. Design sessions as structured objects, store them with TTL for automatic expiry, and expose conversations via a REST API. Multi-turn context is maintained across process restarts since state lives in the Dapr state store, not in-process memory.
