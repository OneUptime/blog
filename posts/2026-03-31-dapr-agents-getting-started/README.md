# How to Get Started with Dapr Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, AI, Getting Started, Python

Description: A beginner's guide to Dapr Agents - the AI agent framework built on Dapr's actor and workflow primitives for building reliable, stateful AI applications.

---

## What Are Dapr Agents?

Dapr Agents is an open-source framework for building AI agents using Dapr's infrastructure primitives. Built on top of Dapr's actor model, pub/sub messaging, and workflow engine, Dapr Agents provides:

- Durable, stateful AI agent execution
- Multi-agent coordination via message passing
- Integration with major LLM providers
- Automatic checkpointing and recovery
- Built-in resiliency through Dapr's retry and circuit breaker policies

Dapr Agents is available as a Python SDK and leverages Dapr's existing component ecosystem for state management, pub/sub, and service invocation.

## Prerequisites

Before getting started, install the required tools:

```bash
# Install Dapr CLI
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash

# Initialize Dapr in self-hosted mode
dapr init

# Install Python SDK
pip install dapr-agents
```

Verify Dapr is running:

```bash
dapr --version
docker ps | grep dapr
```

## Creating Your First Agent

Create a simple agent that responds to questions:

```python
# agent.py
from dapr_agents import Agent, tool

class HelperAgent(Agent):
    name = "helper-agent"
    instructions = "You are a helpful assistant. Answer questions clearly and concisely."

    @tool
    def get_current_time(self) -> str:
        """Returns the current server time."""
        from datetime import datetime
        return datetime.now().isoformat()

if __name__ == "__main__":
    import asyncio
    agent = HelperAgent()
    asyncio.run(agent.run("What time is it right now?"))
```

Run the agent with Dapr:

```bash
dapr run --app-id helper-agent \
  --app-port 8080 \
  --dapr-http-port 3500 \
  -- python agent.py
```

## Configuring the LLM Provider

Dapr Agents requires an LLM provider. Set up OpenAI:

```bash
export OPENAI_API_KEY="sk-your-api-key"
```

Or configure via a Dapr secret store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.local.env
  version: v1
```

Reference in your agent code:

```python
from dapr_agents import Agent
from dapr_agents import OpenAIChatClient

agent = HelperAgent(
    llm=OpenAIChatClient(model="gpt-4o")
)
```

## Understanding the Agent Lifecycle

When an agent runs:

1. The agent initializes with its system instructions
2. The user message is passed to the LLM
3. The LLM decides whether to call tools or respond directly
4. Tool calls are executed and results fed back to the LLM
5. The process repeats until the LLM produces a final response

Dapr persists agent state between turns using Dapr's state store, enabling stateful multi-turn conversations.

## Running a Multi-Turn Conversation

```python
import asyncio
from dapr_agents import Agent

async def main():
    agent = HelperAgent()

    # Turn 1
    response1 = await agent.run("My name is Alice. Remember it.")
    print(response1)

    # Turn 2 - agent remembers context
    response2 = await agent.run("What is my name?")
    print(response2)  # "Your name is Alice."

asyncio.run(main())
```

## Listing Available Components

```bash
# Check Dapr state stores (used for agent memory)
dapr components list
```

## Summary

Dapr Agents is a Python framework for building stateful, resilient AI agents on Dapr's infrastructure. Install via `pip install dapr-agents`, configure an LLM provider, define tools using the `@tool` decorator, and run with `dapr run`. Agent state is automatically persisted in Dapr's state store, enabling multi-turn conversations and durable execution.
