# How to Use Dapr Agents for Multi-Agent Coordination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Multi-Agent, Coordination, Pub/Sub

Description: Learn how to coordinate multiple Dapr Agents using pub/sub messaging and Dapr's actor model for building scalable multi-agent AI systems.

---

## What Is Multi-Agent Coordination?

Multi-agent systems break complex tasks into specialized agents that collaborate by exchanging messages. In Dapr Agents, coordination happens through:

- **Orchestrator agents** - a coordinator agent uses an LLM to plan and delegate tasks to specialist agents
- **Pub/Sub messaging** - agents communicate through Dapr pub/sub topics
- **Shared registry** - agents discover each other and can invoke one another as tools
- **Workflow composition** - agents are chained together in Dapr Workflows using `call_agent`

This architecture enables parallel processing, specialization, and fault isolation between agents.

## Architecture Overview

A typical multi-agent pipeline has an orchestrator agent that routes tasks to specialist agents:

```text
User Request
     |
Orchestrator Agent
    /         \
Research      Writer
Agent         Agent
     \         /
   Final Response
```

## Defining Specialist Agents

Create each specialist agent as its own Dapr-enabled service. In the Dapr Agents SDK, agents are instantiated with constructor parameters rather than subclassed, and tools are standalone functions decorated with `@tool`:

```python
# research_agent.py
from dapr_agents import DurableAgent, tool, AgentRunner
from dapr_agents.agents.configs import AgentPubSubConfig, AgentStateConfig, AgentRegistryConfig
from dapr_agents.llm import OpenAIChatClient

@tool
def search_web(query: str) -> str:
    """Search the web for information on a topic."""
    # Call search API here
    return f"Search results for: {query}"

research_agent = DurableAgent(
    name="research-agent",
    role="Research Assistant",
    instructions=["You research topics and return structured findings."],
    tools=[search_web],
    llm=OpenAIChatClient(model="gpt-4o"),
    pubsub=AgentPubSubConfig(
        pubsub_name="pubsub",
        agent_topic="research-tasks",
        broadcast_topic="agents.broadcast"
    ),
    state=AgentStateConfig(store_name="agent-statestore"),
    registry=AgentRegistryConfig(
        store_name="agent-statestore",
        team_name="content-pipeline"
    ),
)

runner = AgentRunner()
runner.serve(research_agent, port=8081)
```

```python
# writer_agent.py
from dapr_agents import DurableAgent, tool, AgentRunner
from dapr_agents.agents.configs import AgentPubSubConfig, AgentStateConfig, AgentRegistryConfig
from dapr_agents.llm import OpenAIChatClient

@tool
def format_content(content: str, style: str = "blog") -> str:
    """Formats content into the specified style."""
    return f"Formatted as {style}: {content}"

writer_agent = DurableAgent(
    name="writer-agent",
    role="Content Writer",
    instructions=["You write clear, engaging content based on research findings."],
    tools=[format_content],
    llm=OpenAIChatClient(model="gpt-4o"),
    pubsub=AgentPubSubConfig(
        pubsub_name="pubsub",
        agent_topic="writing-tasks",
        broadcast_topic="agents.broadcast"
    ),
    state=AgentStateConfig(store_name="agent-statestore"),
    registry=AgentRegistryConfig(
        store_name="agent-statestore",
        team_name="content-pipeline"
    ),
)

runner = AgentRunner()
runner.serve(writer_agent, port=8082)
```

## Orchestrator Agent with Task Routing

The orchestrator agent uses `OrchestrationMode.AGENT` to let the LLM plan which specialist agents to invoke. Because all agents share the same registry with `team_name="content-pipeline"`, the orchestrator automatically discovers them:

```python
# coordinator_agent.py
from dapr_agents import DurableAgent, AgentRunner
from dapr_agents.agents.configs import (
    AgentPubSubConfig, AgentStateConfig,
    AgentRegistryConfig, AgentExecutionConfig, OrchestrationMode
)
from dapr_agents.llm import OpenAIChatClient

orchestrator = DurableAgent(
    name="coordinator-agent",
    role="Task Coordinator",
    instructions=[
        "You coordinate research and writing tasks.",
        "Break user requests into research and writing subtasks."
    ],
    llm=OpenAIChatClient(model="gpt-4o"),
    pubsub=AgentPubSubConfig(
        pubsub_name="pubsub",
        agent_topic="coordinator-tasks",
        broadcast_topic="agents.broadcast"
    ),
    state=AgentStateConfig(store_name="agent-statestore"),
    registry=AgentRegistryConfig(
        store_name="agent-statestore",
        team_name="content-pipeline"
    ),
    execution=AgentExecutionConfig(
        max_iterations=5,
        orchestration_mode=OrchestrationMode.AGENT,
    ),
)

runner = AgentRunner()
runner.serve(orchestrator, port=8080)
```

## Dapr Component Configuration

Define the pub/sub and state store components all agents share:

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
```

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: agent-statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
```

## Running Multiple Agents

Start each agent as a separate Dapr-enabled process:

```bash
# Terminal 1
dapr run --app-id coordinator-agent --app-port 8080 \
  --components-path ./components -- python coordinator_agent.py

# Terminal 2
dapr run --app-id research-agent --app-port 8081 \
  --components-path ./components -- python research_agent.py

# Terminal 3
dapr run --app-id writer-agent --app-port 8082 \
  --components-path ./components -- python writer_agent.py
```

## Alternative: Workflow Composition with call_agent

Instead of an orchestrator agent, you can explicitly chain agents in a Dapr Workflow using `call_agent`:

```python
import dapr.ext.workflow as wf
from dapr_agents import call_agent

@wf.workflow(name="content_pipeline")
def content_pipeline(ctx: wf.DaprWorkflowContext, request: dict) -> str:
    research = yield call_agent(
        ctx, "research-agent",
        input={"task": request["query"]},
        app_id="research-agent"
    )
    content = yield call_agent(
        ctx, "writer-agent",
        input={"task": research["content"]},
        app_id="writer-agent"
    )
    return content["content"]
```

## Monitoring Agent Coordination

Track agent interactions using Dapr distributed tracing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
```

## Summary

Dapr Agents supports multi-agent coordination through orchestrator agents, pub/sub messaging, shared registries, and workflow composition. Define specialist agents as separate Dapr services using `DurableAgent`, use an orchestrator with `OrchestrationMode.AGENT` to let the LLM route tasks automatically, and monitor coordination with Dapr's built-in tracing. This pattern enables scalable, fault-tolerant AI pipelines where agents can be scaled and replaced independently.
