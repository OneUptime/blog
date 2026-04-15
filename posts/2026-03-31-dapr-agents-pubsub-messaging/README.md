# How to Use Pub/Sub Messaging for Agent Communication in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Pub/Sub, Messaging, Event-Driven

Description: Learn how to use Dapr's pub/sub messaging for asynchronous agent-to-agent communication, enabling event-driven multi-agent architectures.

---

## Why Pub/Sub for Agent Communication?

Pub/sub messaging enables loose coupling between agents - a publishing agent does not need to know about its subscribers. This is ideal for:

- Fanout patterns where one event triggers multiple agents
- Asynchronous task delegation without waiting for responses
- Event-driven pipelines where agents react to state changes
- Decoupling agent scaling from the rest of the system

## Setting Up the Pub/Sub Component

Define a pub/sub component (Redis example):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: agent-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      value: ""
    - name: enableTLS
      value: "false"
```

## Publishing Events from an Agent

An agent can publish events to trigger other agents:

```python
from dapr import Client
from dapr_agents import Agent, tool
import json

class OrchestratorAgent(Agent):
    name = "orchestrator-agent"
    instructions = """You are an orchestrator that breaks down complex tasks
    and delegates them to specialized agents via pub/sub events."""

    def __init__(self):
        super().__init__()
        self.dapr_client = Client()

    @tool
    def delegate_analysis(self, data: str, task_id: str) -> str:
        """Publishes a data analysis task to the analysis agent topic.

        Args:
            data: The data payload to analyze.
            task_id: Unique identifier for tracking this task.
        """
        self.dapr_client.publish_event(
            pubsub_name="agent-pubsub",
            topic_name="analysis-tasks",
            data=json.dumps({
                "task_id": task_id,
                "data": data,
                "priority": "high"
            }),
            data_content_type="application/json"
        )
        return f"Analysis task {task_id} published successfully"

    @tool
    def notify_completion(self, task_id: str, result: str) -> str:
        """Publishes a task completion notification.

        Args:
            task_id: The completed task identifier.
            result: Summary of the task result.
        """
        self.dapr_client.publish_event(
            pubsub_name="agent-pubsub",
            topic_name="task-completions",
            data=json.dumps({"task_id": task_id, "result": result})
        )
        return f"Completion notification sent for task {task_id}"
```

## Subscribing to Events in an Agent

Create a subscribing agent using the Dapr FastAPI extension:

```python
from fastapi import FastAPI, Body
from dapr.ext.fastapi import DaprApp
from dapr_agents import Agent
import json

app = FastAPI()
dapr_app = DaprApp(app)

class AnalysisAgent(Agent):
    name = "analysis-agent"
    instructions = "You perform detailed data analysis on incoming datasets."


@dapr_app.subscribe(pubsub="agent-pubsub", topic="analysis-tasks")
async def handle_analysis_task(event: dict = Body()):
    data = event['data']
    agent = AnalysisAgent()
    result = agent.run(f"Analyze this data: {data['data']}")

    # Publish result
    from dapr import Client
    client = Client()
    client.publish_event(
        pubsub_name="agent-pubsub",
        topic_name="analysis-results",
        data=json.dumps({
            "task_id": data["task_id"],
            "result": result
        })
    )
```

## Running Both Agents

```bash
# Agent 1: Orchestrator
dapr run --app-id orchestrator-agent \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --components-path ./components \
  -- python orchestrator.py

# Agent 2: Analysis subscriber
dapr run --app-id analysis-agent \
  --app-port 8081 \
  --dapr-http-port 3501 \
  --components-path ./components \
  -- uvicorn analysis_agent:app --port 8081
```

## Subscription Configuration via Component

For Kubernetes, define subscriptions declaratively:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: analysis-task-subscription
spec:
  pubsubname: agent-pubsub
  topic: analysis-tasks
  routes:
    default: /handle-analysis-task
  scopes:
    - analysis-agent
```

## Dead Letter Topics for Failed Events

Handle failed agent tasks with dead letter topics:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: analysis-task-subscription
spec:
  pubsubname: agent-pubsub
  topic: analysis-tasks
  deadLetterTopic: failed-tasks
  routes:
    default: /handle-analysis-task
```

## Summary

Dapr pub/sub enables loose, event-driven communication between agents. Publishing agents use the Dapr client to emit events without knowing who consumes them. Subscribing agents use FastAPI with the Dapr extension or declarative subscription components to receive and process events. Add dead letter topics to handle failed agent tasks gracefully.
