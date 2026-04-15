# How to Use Dapr Agents with OpenAI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, OpenAI, GPT, LLM

Description: Learn how to configure and use Dapr Agents with OpenAI's GPT models, including tool calling, streaming responses, and managing API keys securely.

---

## Why Use Dapr Agents with OpenAI?

Dapr Agents provides a durable, stateful runtime for OpenAI-powered agents. While the OpenAI API handles LLM inference, Dapr handles the operational concerns - state persistence, retries, pub/sub messaging, and deployment on Kubernetes. This combination gives you production-grade AI agents without managing infrastructure complexity.

## Installation

```bash
pip install dapr-agents openai
```

## Configuring the OpenAI LLM Client

Dapr Agents wraps the OpenAI client with additional resiliency features:

```python
from dapr_agents.llm import OpenAIChatClient

llm = OpenAIChatClient(
    model="gpt-4o",
    api_key="sk-your-key",  # or use env var OPENAI_API_KEY
    timeout=30
)
```

## Building an Agent with OpenAI

```python
import os
from dapr_agents import DurableAgent, tool
from dapr_agents.llm import OpenAIChatClient

@tool
def check_syntax(code: str, language: str) -> str:
    """Checks code syntax for the specified programming language.

    Args:
        code: The source code to check.
        language: Programming language (python, javascript, go, etc.)
    """
    # Integrate with language-specific linters
    return f"Syntax check for {language}: No critical errors found."

@tool
def search_vulnerabilities(code: str) -> str:
    """Scans code for known security vulnerabilities."""
    # Integrate with security scanning tools
    return "No known vulnerabilities detected."


agent = DurableAgent(
    name="code-review-agent",
    instructions="""You are an expert code reviewer. Analyze code for bugs,
    security issues, performance problems, and style violations.
    Provide actionable feedback.""",
    tools=[check_syntax, search_vulnerabilities],
    llm=OpenAIChatClient(
        model="gpt-4o",
        api_key=os.environ["OPENAI_API_KEY"]
    )
)

agent.start()
```

## Using GPT-4o with Vision

GPT-4o supports vision through the standard OpenAI message format. When using the LLM client directly, pass image content as part of the message:

```python
from dapr_agents.llm import OpenAIChatClient

llm = OpenAIChatClient(model="gpt-4o")

response = llm.generate(
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Analyze this screenshot"},
                {"type": "image_url", "image_url": {"url": "https://example.com/screenshot.png"}}
            ]
        }
    ]
)
```

## Streaming Responses

For long-running responses, enable streaming at the LLM client level:

```python
from dapr_agents.llm import OpenAIChatClient

llm = OpenAIChatClient(model="gpt-4o")

response = llm.generate(
    messages=[{"role": "user", "content": "Explain quantum computing in detail"}],
    stream=True
)

for chunk in response:
    print(chunk, end="", flush=True)
```

## Storing API Keys Securely with Dapr

Instead of hardcoding API keys, store them in a Dapr secret store:

```yaml
# components/secretstore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
    - name: vaultName
      value: "my-key-vault"
```

Retrieve in your agent:

```python
from dapr.clients import DaprClient

dapr_client = DaprClient()
secret = dapr_client.get_secret(
    store_name="secretstore",
    key="openai-api-key"
)

llm = OpenAIChatClient(
    model="gpt-4o",
    api_key=secret.secret["openai-api-key"]
)
```

## Handling Rate Limits

Dapr's resiliency policies handle OpenAI rate limits automatically:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: openai-resiliency
spec:
  policies:
    retries:
      openai-retry:
        policy: exponential
        maxRetries: 5
        initialInterval: 2s
        maxInterval: 60s
```

## Summary

Dapr Agents integrates with OpenAI through the `OpenAIChatClient` LLM client, supporting GPT-4o, vision, and streaming. Store API keys in Dapr secret stores for security, and use Dapr resiliency policies to handle rate limits with exponential backoff. The combination provides production-grade durability for OpenAI-powered agents.
