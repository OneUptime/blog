# How to Use Dapr Agents for Workflow Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Workflow, Automation, Microservice

Description: Learn how to use Dapr Agents to automate complex workflows by combining AI reasoning with Dapr's durable workflow primitives.

---

## Overview

Dapr Agents bring together AI-driven decision making and Dapr's workflow engine to automate multi-step business processes. An agent can observe state, invoke other services, and trigger workflow transitions without manual coordination.

## Setting Up a Dapr Agent

First, ensure your cluster has Dapr installed. The workflow engine is built-in to the Dapr sidecar, so no separate workflow component file is needed.

```bash
dapr init --kubernetes
```

## Implementing the Agent Workflow

In Python, use the Dapr workflow SDK to define an agent-driven workflow:

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext
import dapr.ext.workflow as wf

def agent_workflow(ctx: DaprWorkflowContext, input_data: dict):
    # Agent decides the next action
    decision = yield ctx.call_activity(evaluate_task, input=input_data)
    if decision["action"] == "approve":
        yield ctx.call_activity(execute_approval, input=decision)
    elif decision["action"] == "escalate":
        yield ctx.call_activity(notify_manager, input=decision)
    return {"status": "completed", "action": decision["action"]}

def evaluate_task(ctx: WorkflowActivityContext, data: dict) -> dict:
    # Call an LLM or rule engine to decide next step
    score = data.get("risk_score", 0)
    action = "approve" if score < 50 else "escalate"
    return {"action": action, "original": data}
```

## Triggering the Workflow via the Dapr API

Start a workflow instance using the Dapr HTTP API:

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/agent_workflow/start \
  -H "Content-Type: application/json" \
  -d '{"task_id": "task-123", "risk_score": 30}'
```

Check the status of a running workflow:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/{instance_id}
```

## Combining Agents with Pub/Sub Triggers

Agents can react to external events through Dapr pub/sub. Subscribe to a topic and start a workflow on each message:

```python
from flask import Flask, request, jsonify
from dapr.ext.workflow import DaprWorkflowClient

app = Flask(__name__)

@app.route('/task-events', methods=['POST'])
def handle_task():
    event = request.json
    with DaprWorkflowClient() as client:
        client.schedule_new_workflow(
            workflow=agent_workflow,
            input=event["data"]
        )
    return jsonify({"status": "started"}), 200
```

## Monitoring Agent Workflows

Use Dapr's dashboard or query the workflow API to track agent decisions:

```bash
dapr dashboard -k
# Navigate to Workflows tab to view active and completed instances
```

## Summary

Dapr Agents combine AI reasoning with Dapr's durable workflow engine to automate complex multi-step processes. By defining workflows as code and using activity functions for decision points, you can build autonomous agents that reliably orchestrate business logic across distributed microservices.
