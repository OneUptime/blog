# How to Use Dapr Agents with Ollama for Local LLMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Ollama, Local LLM, Privacy

Description: Learn how to run Dapr Agents with Ollama for fully local LLM inference - ideal for air-gapped environments, privacy-sensitive workloads, and development.

---

## Why Local LLMs with Ollama?

Ollama makes running open-source LLMs locally trivial. When combined with Dapr Agents, you get a fully local, privacy-preserving AI agent stack where no data leaves your infrastructure. This is critical for:

- Healthcare and legal applications with strict data residency requirements
- Air-gapped enterprise environments
- Development and testing without API costs
- Edge deployments with intermittent connectivity

## Installing Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve

# Pull a model
ollama pull llama3.2
ollama pull mistral
ollama pull phi3
```

Verify Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

## Configuring Dapr Agents with Ollama

Ollama exposes an OpenAI-compatible API. Use the `OpenAIChatClient` pointing to the local Ollama server:

```python
from dapr_agents.llm import OpenAIChatClient

llm = OpenAIChatClient(
    model="llama3.2",
    base_url="http://localhost:11434/v1",
    api_key="ollama"  # Required but not used by Ollama
)
```

## Building a Local-First Agent

```python
from dapr_agents import DurableAgent, AgentRunner, tool
from dapr_agents.llm import OpenAIChatClient

@tool
def read_document(filepath: str) -> str:
    """Reads and returns the content of a document file.

    Args:
        filepath: Path to the document file.
    """
    with open(filepath) as f:
        content = f.read()
    return content[:4000]  # Limit for context window

@tool
def extract_entities(text: str) -> str:
    """Extracts named entities (people, organizations, dates) from text.

    Args:
        text: The text to extract entities from.
    """
    import re
    dates = re.findall(r'\b\d{1,2}/\d{1,2}/\d{2,4}\b', text)
    return f"Found {len(dates)} dates in document"

@tool
def save_summary(filename: str, summary: str) -> str:
    """Saves an analysis summary to a file.

    Args:
        filename: Output filename for the summary.
        summary: The summary text to save.
    """
    with open(filename, "w") as f:
        f.write(summary)
    return f"Summary saved to {filename}"


llm = OpenAIChatClient(
    model="llama3.2",
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

agent = DurableAgent(
    name="private-doc-agent",
    role="Private document analyzer",
    goal="Analyze sensitive documents locally without sending data to external services",
    instructions=[
        "You analyze sensitive documents locally.",
        "Never send data to external services.",
        "Provide concise summaries and extract key information from documents."
    ],
    llm=llm,
    tools=[read_document, extract_entities, save_summary],
)

runner = AgentRunner()

if __name__ == "__main__":
    runner.serve(agent, port=8080)
```

## Running Ollama in Docker

For containerized deployments:

```yaml
version: "3.8"
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  agent:
    image: myapp/dapr-agent:latest
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434/v1
    depends_on:
      - ollama

volumes:
  ollama-data:
```

## Choosing the Right Local Model

| Model | Size | Best For |
|-------|------|----------|
| `phi3` | 3.8B | Quick responses, tool calling |
| `llama3.2` | 3B | General tasks, fast inference |
| `mistral` | 7B | Code, multilingual |
| `llama3.1:70b` | 70B | Complex reasoning |
| `codellama` | 7B-34B | Code generation |

## Preloading Models on Startup

```bash
#!/bin/bash
# startup.sh - preload required models
ollama pull llama3.2
ollama pull mistral

# Then start the agent
dapr run --app-id private-doc-agent \
  --app-port 8080 \
  --resources-path ./components \
  -- python agent.py
```

## Configuring Context Window

Some models support larger context windows. Configure via Modelfile:

```bash
# Create a custom Modelfile
cat > Modelfile << 'EOF'
FROM llama3.2
PARAMETER num_ctx 8192
EOF

ollama create llama3.2-8k -f Modelfile
```

## Summary

Dapr Agents works with Ollama through Ollama's OpenAI-compatible API, enabling fully local AI agent deployments. Use `OpenAIChatClient` with `base_url` pointing to the local Ollama server. Choose models based on your hardware - Phi-3 and Llama 3.2 3B for low-resource environments, Llama 3.1 70B for maximum capability. Deploy Ollama in Docker with GPU support for production workloads.
