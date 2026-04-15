# How to Use Dapr Agents Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Python, SDK, LLM

Description: A comprehensive guide to the Dapr Agents Python SDK covering installation, agent classes, tool decorators, memory, messaging, and service patterns.

---

## What Is the Dapr Agents Python SDK?

The Dapr Agents Python SDK (`dapr-agents`) is the official Python library for building AI agents on Dapr. It provides:

- `DurableAgent` class with built-in tool calling loop
- `@tool` decorator for defining callable functions
- LLM client wrappers (OpenAI, HuggingFace Hub, NVIDIA, and vendor-neutral via Dapr Conversation API)
- Memory backends backed by Dapr state stores
- Messaging helpers for Dapr pub/sub
- `AgentRunner` for running agents as HTTP services

## Installation

```bash
pip install dapr-agents

# With vector store support (ChromaDB, sentence-transformers)
pip install dapr-agents[vectorstore]
```

OpenAI and HuggingFace Hub clients are included in the base installation. To use other LLM providers such as Anthropic, Mistral, or AWS Bedrock, configure them through the Dapr Conversation API component.

## Core Agent Class

Create an agent by instantiating `DurableAgent`:

```python
from dapr_agents import DurableAgent
from dapr_agents.llm import OpenAIChatClient

agent = DurableAgent(
    name="my-agent",                             # Dapr app ID
    role="What this agent does",                  # Agent role description
    goal="Accomplish specific tasks",             # Agent goal
    instructions=["System prompt here"],          # LLM system instructions (list of strings)
    llm=OpenAIChatClient(model="gpt-4o"),
)
```

## Defining Tools with @tool

The `@tool` decorator exposes Python functions as LLM-callable tools:

```python
from dapr_agents import tool

@tool
def fetch_url(url: str) -> str:
    """Fetches the content of a URL.

    Args:
        url: The URL to fetch.
    """
    import httpx
    response = httpx.get(url, timeout=10)
    return response.text[:2000]

@tool
def write_file(path: str, content: str) -> str:
    """Writes content to a file.

    Args:
        path: File path to write to.
        content: Content to write.
    """
    with open(path, "w") as f:
        f.write(content)
    return f"Written {len(content)} bytes to {path}"

@tool
def run_shell_command(command: str) -> str:
    """Runs a shell command and returns output. Use with caution.

    Args:
        command: The shell command to execute.
    """
    import subprocess
    result = subprocess.run(
        command, shell=True, capture_output=True, text=True, timeout=30
    )
    return result.stdout if result.returncode == 0 else result.stderr
```

Pass tools to the agent at construction time:

```python
agent = DurableAgent(
    name="utility-agent",
    instructions=["You help with utility tasks."],
    llm=OpenAIChatClient(model="gpt-4o"),
    tools=[fetch_url, write_file, run_shell_command],
)
```

## LLM Client Options

```python
from dapr_agents.llm import (
    OpenAIChatClient,
    HFHubChatClient,
    DaprChatClient,
    NVIDIAChatClient,
)

# OpenAI
openai_llm = OpenAIChatClient(model="gpt-4o", temperature=0.7)

# HuggingFace Hub
hf_llm = HFHubChatClient(model="meta-llama/Llama-3-8b-chat-hf")

# NVIDIA
nvidia_llm = NVIDIAChatClient(model="meta/llama-3.1-70b-instruct")

# Dapr Conversation API (vendor-neutral, supports Anthropic, Mistral, Bedrock, etc.)
dapr_llm = DaprChatClient(component_name="llm-anthropic")

# Ollama (local, via OpenAI-compatible API)
ollama_llm = OpenAIChatClient(
    model="llama3.2",
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)
```

## Memory Backends

```python
from dapr_agents.memory import (
    ConversationListMemory,        # In-process only, lost on restart
    ConversationDaprStateMemory,   # Persistent, Dapr state store backed
)

# In-memory conversation history
list_memory = ConversationListMemory()

# Persistent memory using a Dapr state store
state_memory = ConversationDaprStateMemory(store_name="statestore")
```

Configure memory on the agent:

```python
agent = DurableAgent(
    name="stateful-agent",
    instructions=["You remember user preferences."],
    llm=OpenAIChatClient(model="gpt-4o"),
    memory=state_memory,
)
```

## Running as an HTTP Service

```python
from dapr_agents import AgentRunner, DurableAgent
from dapr_agents.llm import OpenAIChatClient

agent = DurableAgent(
    name="my-agent",
    instructions=["Do something useful."],
    llm=OpenAIChatClient(model="gpt-4o"),
)

runner = AgentRunner()

if __name__ == "__main__":
    runner.serve(agent, port=8001)
```

Invoke via HTTP through the Dapr sidecar:

```bash
curl -X POST http://localhost:3500/v1.0/invoke/my-agent/method/agent/run \
  -H "Content-Type: application/json" \
  -d '{"message": "Do something useful"}'
```

## Async Agent Execution

```python
import asyncio
from dapr_agents import AgentRunner, DurableAgent
from dapr_agents.llm import OpenAIChatClient

async def main():
    agent = DurableAgent(
        name="my-agent",
        instructions=["Perform tasks."],
        llm=OpenAIChatClient(model="gpt-4o"),
    )
    runner = AgentRunner()
    result = await runner.run(agent, payload={"message": "Perform this task asynchronously"})
    print(result)

asyncio.run(main())
```

## Summary

The Dapr Agents Python SDK provides the `DurableAgent` class, `@tool` decorator, multiple LLM client options, and `ConversationDaprStateMemory` for persistent conversation history. Run agents as HTTP services with `AgentRunner`, or invoke them programmatically. The SDK integrates with all Dapr components for state, pub/sub, and secrets.
