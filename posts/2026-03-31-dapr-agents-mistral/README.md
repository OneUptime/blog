# How to Use Dapr Agents with Mistral

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Mistral, LLM, AI

Description: Learn how to configure Dapr Agents with Mistral AI models for efficient, cost-effective AI agent deployments with strong multilingual and code generation capabilities.

---

## Why Mistral with Dapr Agents?

Mistral AI offers a range of models from the efficient Mistral Small to the powerful Mistral Large, with strong performance in multilingual tasks and code generation. When cost efficiency matters, Mistral models provide excellent performance-per-dollar. Paired with Dapr's operational infrastructure, you get reliable agent execution without overpaying for inference.

## Installation

```bash
pip install dapr-agents
```

Mistral is accessed through the Dapr Conversation API, so no separate Mistral client library is needed. The Dapr sidecar handles communication with the Mistral API.

## Configuring the Dapr Conversation Component for Mistral

Create a Dapr component YAML file to configure the Mistral backend:

```yaml
# components/llm-mistral.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-mistral
spec:
  type: conversation.mistral
  version: v1
  metadata:
    - name: key
      value: "your-mistral-api-key"  # or use a Dapr secret store reference
    - name: model
      value: "mistral-large-latest"
```

## Configuring the Mistral LLM Client

```python
from dapr_agents.llm import DaprChatClient

llm = DaprChatClient(component_name="llm-mistral")
```

Available models (set in the component YAML):
- `mistral-small-latest` - Fast and efficient
- `mistral-large-latest` - Most capable

## Building a Code Generation Agent

Mistral excels at code tasks. Here is a code generation agent:

```python
from dapr_agents import DurableAgent, tool
from dapr_agents.llm import DaprChatClient

@tool
def create_file(filename: str, content: str) -> str:
    """Creates a new code file with the specified content.

    Args:
        filename: The name of the file to create.
        content: The code content to write.
    """
    with open(filename, "w") as f:
        f.write(content)
    return f"Created {filename} ({len(content)} bytes)"

@tool
def run_tests(test_file: str) -> str:
    """Runs Python unit tests in a test file.

    Args:
        test_file: Path to the test file to run.
    """
    import subprocess
    result = subprocess.run(
        ["python", "-m", "pytest", test_file, "-v"],
        capture_output=True, text=True, timeout=60
    )
    return result.stdout if result.returncode == 0 else result.stderr


llm = DaprChatClient(component_name="llm-mistral")

agent = DurableAgent(
    name="codegen-agent",
    instructions=[
        "You are an expert software engineer specializing in Python and Go.",
        "Generate clean, well-documented, production-ready code.",
        "Always include error handling and tests."
    ],
    tools=[create_file, run_tests],
    llm=llm,
)

agent.start()
```

## Multilingual Agent with Mistral

Mistral handles European languages particularly well:

```python
from dapr_agents import DurableAgent, tool
from dapr_agents.llm import DaprChatClient

@tool
def detect_language(text: str) -> str:
    """Detects the language of the input text.

    Args:
        text: The text to detect the language of.
    """
    from langdetect import detect
    return detect(text)

@tool
def translate_response(text: str, target_lang: str) -> str:
    """Translates a response to the target language.

    Args:
        text: The text to translate.
        target_lang: The target language code.
    """
    # Integrate translation API
    return f"[Translated to {target_lang}]: {text}"


agent = DurableAgent(
    name="support-agent",
    instructions=[
        "You are a multilingual customer support agent.",
        "Detect the user's language and respond in the same language.",
        "Support French, Spanish, German, Italian, and English."
    ],
    tools=[detect_language, translate_response],
    llm=DaprChatClient(component_name="llm-mistral"),
)
```

## Using Self-Hosted Mistral

For self-hosted Mistral (via vLLM or Ollama), use the OpenAI-compatible client since these servers expose an OpenAI-compatible API:

```python
from dapr_agents.llm import OpenAIChatClient

llm = OpenAIChatClient(
    model="mistral-7b-instruct",
    base_url="http://your-vllm-server:8000/v1",
    api_key="not-needed"
)
```

## Function Calling with Mistral

Mistral supports function calling, which works with Dapr Agents' `@tool` decorator:

```python
from dapr_agents import DurableAgent, tool
from dapr_agents.llm import DaprChatClient

@tool
def add(a: float, b: float) -> float:
    """Adds two numbers together.

    Args:
        a: First number.
        b: Second number.
    """
    return a + b

@tool
def multiply(a: float, b: float) -> float:
    """Multiplies two numbers together.

    Args:
        a: First number.
        b: Second number.
    """
    return a * b

llm = DaprChatClient(component_name="llm-mistral")

agent = DurableAgent(
    name="calculator-agent",
    instructions=["You are a helpful calculator."],
    tools=[add, multiply],
    llm=llm,
)

agent.start()
```

## Running with Dapr

```bash
dapr run --app-id codegen-agent \
  --app-port 8080 \
  --components-path ./components \
  -- python agent.py
```

Set your Mistral API key in the component YAML or use a Dapr secret store reference.

## Summary

Dapr Agents integrates with Mistral AI through the `DaprChatClient` and the Dapr Conversation API. Configure a `conversation.mistral` component to connect to Mistral's API. Mistral Large is ideal for complex code generation and reasoning, while Mistral Small offers cost-effective inference for simpler tasks. Mistral's multilingual capabilities make it a strong choice for global applications, and its function calling works seamlessly with Dapr Agents' `@tool` decorator. For self-hosted Mistral via vLLM or Ollama, use `OpenAIChatClient` with the server's OpenAI-compatible endpoint.
