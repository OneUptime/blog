# How to Build Your First AI Agent with Dapr Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, AI, Python, LLM

Description: Step-by-step tutorial for building your first AI agent with Dapr Agents, including tool definition, state management, and running the agent end to end.

---

## Project Setup

Start by creating a project directory and installing dependencies:

```bash
mkdir my-first-agent && cd my-first-agent
python -m venv venv && source venv/bin/activate
pip install dapr-agents openai
```

Create a `components` directory for Dapr configuration:

```bash
mkdir components
```

## Define a State Store Component

Agents need a state store to persist conversation history. Create a Redis state store component:

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      value: ""
```

## Write the Agent

Create the main agent file:

```python
# main.py
from dapr_agents import DurableAgent, tool
from dapr_agents.agents.llm import OpenAIChatClient
from dapr_agents.workflow.runners import AgentRunner


@tool
def get_weather(city: str) -> str:
    """Retrieves current weather for a city.

    Args:
        city: The name of the city to get weather for.
    """
    # In a real agent, call a weather API here
    weather_data = {
        "London": "15C, cloudy with light rain",
        "New York": "22C, sunny",
        "Tokyo": "18C, partly cloudy",
    }
    return weather_data.get(city, f"Weather data for {city} is unavailable.")


@tool
def get_forecast(city: str, days: int = 3) -> str:
    """Returns a multi-day weather forecast.

    Args:
        city: The name of the city.
        days: Number of days to forecast (1-7).
    """
    return f"{days}-day forecast for {city}: Mild temperatures with occasional showers."


if __name__ == "__main__":
    llm = OpenAIChatClient(model="gpt-4o")

    agent = DurableAgent(
        name="weather-agent",
        role="Weather Assistant",
        goal="Answer questions about weather using available tools",
        instructions=[
            "Use the available tools to answer questions about weather.",
            "Always provide helpful context.",
        ],
        tools=[get_weather, get_forecast],
        llm=llm,
    )

    runner = AgentRunner()
    runner.serve(agent, port=8001)
```

## Run the Agent with Dapr

```bash
export OPENAI_API_KEY="sk-your-key-here"

dapr run --app-id weather-agent \
  --app-port 8001 \
  --dapr-http-port 3500 \
  --components-path ./components \
  -- python main.py
```

Once the agent is running, invoke it via HTTP:

```bash
curl -X POST http://localhost:8001/agent/run \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather in London and should I bring an umbrella?"}'
```

The POST returns a workflow ID. Query the result with:

```bash
curl http://localhost:8001/agent/instances/{WORKFLOW_ID}
```

## Adding Agent Memory

To make the agent remember previous messages:

```python
from dapr_agents import DurableAgent
from dapr_agents.agents.configs import AgentMemoryConfig
from dapr_agents.memory import ConversationDaprStateMemory

agent = DurableAgent(
    name="weather-agent",
    role="Weather Assistant",
    goal="Answer questions about weather",
    instructions=["You are a weather assistant."],
    tools=[get_weather, get_forecast],
    llm=llm,
    memory=AgentMemoryConfig(
        store=ConversationDaprStateMemory(
            store_name="statestore",
            session_id="weather-session",
        )
    ),
)
```

## Handling Errors Gracefully

Add error handling for tool failures:

```python
@tool
def get_weather(city: str) -> str:
    """Retrieves weather for a city."""
    try:
        response = requests.get(
            f"https://api.weather.com/current?city={city}",
            timeout=5
        )
        response.raise_for_status()
        return response.json()["description"]
    except requests.RequestException as e:
        return f"Unable to retrieve weather for {city}: {str(e)}"
```

## Running as a Service

The agent is already served as an HTTP service via `AgentRunner`. You can also invoke it through the Dapr sidecar for service-to-service communication:

```bash
curl -X POST http://localhost:3500/v1.0/invoke/weather-agent/method/agent/run \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather in Tokyo?"}'
```

## Summary

Building a Dapr Agent involves defining tool functions with `@tool`, creating a `DurableAgent` with your tools and LLM client, and serving it with `AgentRunner` under `dapr run`. Dapr manages state persistence automatically using the configured state store. Add `ConversationDaprStateMemory` via `AgentMemoryConfig` for multi-turn conversation history, and wrap tools in try/except blocks for production reliability.
