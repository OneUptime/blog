# How to Use Dapr Agents with Anthropic Claude

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Anthropic, Claude, LLM

Description: Learn how to configure Dapr Agents to use Anthropic's Claude models, including tool use, extended thinking, and secure API key management.

---

## Why Use Claude with Dapr Agents?

Anthropic's Claude models offer strong reasoning, long context windows, and reliable tool use. Paired with Dapr Agents, you get durable state management, pub/sub coordination, and Kubernetes-native deployment for Claude-powered agents.

## Installation

```bash
pip install dapr-agents
```

## Configuring the Anthropic LLM Client

Dapr Agents integrates with Anthropic Claude through the Dapr Conversation API. First, create a Dapr component configuration:

```yaml
# components/llm-anthropic.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-anthropic
spec:
  type: conversation.anthropic
  version: v1
  metadata:
    - name: key
      value: "<ANTHROPIC_API_KEY>"  # or use a Dapr secret store
    - name: model
      value: "claude-sonnet-4-20250514"
```

Then initialize the client in Python:

```python
from dapr_agents.llm import DaprChatClient

llm = DaprChatClient(component_name="llm-anthropic")
```

## Building an Analysis Agent with Claude

```python
from dapr_agents import DurableAgent, AgentRunner, tool
from dapr_agents.llm import DaprChatClient

@tool
def load_csv(filepath: str) -> str:
    """Loads and parses a CSV file for analysis.

    Args:
        filepath: Path to the CSV file to load.
    """
    import csv
    rows = []
    with open(filepath) as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    return f"Loaded {len(rows)} rows with columns: {list(rows[0].keys()) if rows else []}"

@tool
def calculate_statistics(column: str, data: str) -> str:
    """Calculates basic statistics for a numeric column.

    Args:
        column: Name of the column to analyze.
        data: JSON string of data values.
    """
    import json
    import statistics
    values = [float(v) for v in json.loads(data) if v]
    return (
        f"Column '{column}': "
        f"mean={statistics.mean(values):.2f}, "
        f"median={statistics.median(values):.2f}, "
        f"stdev={statistics.stdev(values):.2f}"
    )


llm = DaprChatClient(component_name="llm-anthropic")

agent = DurableAgent(
    name="analysis-agent",
    role="Data Analysis Expert",
    instructions=[
        "Use available tools to analyze data, identify trends, and provide clear insights.",
        "Always explain your reasoning step by step."
    ],
    tools=[load_csv, calculate_statistics],
    llm=llm
)

runner = AgentRunner()
runner.serve(agent, port=8080)
```

## Using Claude's Extended Thinking

Claude models support extended thinking mode for complex reasoning. This is a provider-specific feature accessed through the Anthropic API directly:

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000
    },
    messages=[{"role": "user", "content": "Solve this multi-step logistics optimization problem..."}]
)
```

Extended thinking is not directly configurable through Dapr's Conversation API abstraction. For agents requiring this feature, use the `anthropic` Python SDK (`pip install anthropic`) alongside Dapr for state management and coordination.

## Handling Claude's Long Context Window

Claude supports up to 200,000 token context windows. For document analysis agents:

```python
@tool
def analyze_document(document_path: str) -> str:
    """Analyzes a long document using Claude's extended context window."""
    with open(document_path) as f:
        content = f.read()
    # Claude can handle very large documents directly
    return f"Document length: {len(content)} chars - ready for analysis"
```

Configure the model in your Dapr component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-anthropic
spec:
  type: conversation.anthropic
  version: v1
  metadata:
    - name: key
      value: "<ANTHROPIC_API_KEY>"
    - name: model
      value: "claude-sonnet-4-20250514"
```

## Storing Anthropic API Keys in Dapr

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.local.file
  version: v1
  metadata:
    - name: secretsFile
      value: "./secrets.json"
```

`secrets.json`:

```json
{
  "anthropic-api-key": "sk-ant-your-key-here"
}
```

Reference the secret in your Anthropic conversation component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-anthropic
spec:
  type: conversation.anthropic
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: anthropic-api-key
        key: anthropic-api-key
    - name: model
      value: "claude-sonnet-4-20250514"
auth:
  secretStore: secretstore
```

You can also retrieve secrets programmatically using the Dapr Python SDK:

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    secret = client.get_secret(store_name="secretstore", key="anthropic-api-key")
    api_key = secret.secret["anthropic-api-key"]
```

## Running with Dapr

```bash
dapr run --app-id analysis-agent \
  --app-port 8080 \
  --resources-path ./components \
  -- python agent.py
```

## Summary

Dapr Agents supports Anthropic Claude through the Dapr Conversation API and the `DaprChatClient`. Configure Claude as a conversation component in your Dapr setup, then build agents using `DurableAgent` with standalone `@tool` functions. Leverage Claude's 200K token context window for document analysis agents, and secure API keys using Dapr secret stores.
