# How to Store Conversation History for AI Agents in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AI, Agent, Conversation

Description: Store and manage multi-turn conversation history for AI agents using Redis lists and hashes with session isolation, TTL management, and context truncation.

---

AI agents need reliable conversation memory to maintain context across multiple tool calls and user interactions. Redis lists provide a fast, ordered store for conversation turns with built-in expiry and atomic operations.

## Installation

```bash
pip install redis openai
```

## Session Storage Design

Each agent session stores:
- Ordered message list (for the LLM context window)
- Session metadata (start time, agent type, user ID)

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

SESSION_TTL = 7200  # 2 hours
MAX_MESSAGES = 50   # max messages per session

def create_session(session_id: str, user_id: str,
                   agent_type: str = "assistant") -> dict:
    meta_key = f"agent:session:{session_id}:meta"
    r.hset(meta_key, mapping={
        "user_id": user_id,
        "agent_type": agent_type,
        "created_at": int(time.time()),
        "message_count": 0
    })
    r.expire(meta_key, SESSION_TTL)
    return {"session_id": session_id, "user_id": user_id}

def get_session_meta(session_id: str) -> dict:
    return r.hgetall(f"agent:session:{session_id}:meta")
```

## Storing and Retrieving Messages

```python
def append_message(session_id: str, role: str, content: str,
                   tool_name: str = None) -> int:
    msg = {"role": role, "content": content, "timestamp": int(time.time())}
    if tool_name:
        msg["tool"] = tool_name

    history_key = f"agent:session:{session_id}:history"
    r.rpush(history_key, json.dumps(msg))
    r.expire(history_key, SESSION_TTL)

    # Keep only the last MAX_MESSAGES entries
    r.ltrim(history_key, -MAX_MESSAGES, -1)

    # Update message count in metadata
    r.hincrby(f"agent:session:{session_id}:meta", "message_count", 1)
    return r.llen(history_key)

def get_history(session_id: str, last_n: int = None) -> list:
    history_key = f"agent:session:{session_id}:history"
    if last_n:
        raw = r.lrange(history_key, -last_n, -1)
    else:
        raw = r.lrange(history_key, 0, -1)
    return [json.loads(m) for m in raw]
```

## Context Window Management

Truncate history to fit within LLM token limits:

```python
def get_context_window(session_id: str,
                       max_chars: int = 12000) -> list:
    all_messages = get_history(session_id)
    # Build context from most recent messages backwards
    messages = []
    total_chars = 0

    for msg in reversed(all_messages):
        msg_chars = len(msg.get("content", ""))
        if total_chars + msg_chars > max_chars and messages:
            break
        messages.insert(0, msg)
        total_chars += msg_chars

    return messages
```

## Tool Call Storage

Track tool calls made during agent execution:

```python
def store_tool_call(session_id: str, tool_name: str,
                    tool_input: dict, tool_output: str):
    append_message(session_id, "tool_call",
                   json.dumps(tool_input), tool_name)
    append_message(session_id, "tool_result",
                   tool_output, tool_name)
```

## Agent Run Loop

Example agent loop using stored history:

```python
import openai

client = openai.OpenAI()

def run_agent_turn(session_id: str, user_message: str) -> str:
    append_message(session_id, "user", user_message)

    context = get_context_window(session_id)
    llm_messages = [
        {"role": m["role"] if m["role"] in ["user", "assistant", "system"]
         else "assistant",
         "content": m["content"]}
        for m in context
        if m["role"] in ["user", "assistant", "system"]
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system",
             "content": "You are a helpful AI agent."}
        ] + llm_messages
    )

    answer = response.choices[0].message.content
    append_message(session_id, "assistant", answer)
    return answer
```

## Listing Active Sessions

```python
def get_active_sessions(user_id: str) -> list:
    pattern = "agent:session:*:meta"
    sessions = []
    for key in r.scan_iter(pattern):
        meta = r.hgetall(key)
        if meta.get("user_id") == user_id:
            session_id = key.split(":")[2]
            sessions.append({"session_id": session_id, **meta})
    return sessions
```

## Summary

Redis provides everything needed for AI agent conversation storage: ordered lists for message history, hashes for session metadata, atomic RPUSH/LTRIM for windowed storage, and TTL-based expiry for automatic cleanup. The context window management function ensures you never exceed LLM token limits while always prioritizing the most recent exchanges.
