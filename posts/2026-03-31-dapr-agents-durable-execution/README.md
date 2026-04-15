# How to Use Durable Execution for AI Workflows in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Workflow, Durable Execution, Reliability

Description: Learn how to use Dapr's durable workflow execution for AI agent workflows that survive process restarts, enabling long-running and reliable AI pipelines.

---

## What Is Durable Execution?

Durable execution means that a workflow's state is persisted at each step, so if the process crashes or is restarted, the workflow resumes from where it left off rather than starting over. For AI agent workflows this is critical because:

- LLM calls can be expensive - you do not want to repeat them after a crash
- Multi-step pipelines may take minutes or hours
- Partial results should not be lost

Dapr Workflows provides durable execution built on the Dapr actor model.

## Defining a Durable AI Workflow

Install the Dapr Workflow SDK:

```python
pip install dapr-ext-workflow
```

Define a workflow with multiple AI steps:

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext
from dapr_agents import OpenAIChatClient
import dapr.ext.workflow as wf

wfr = WorkflowRuntime()

@wfr.workflow(name="ai-research-workflow")
def research_workflow(ctx: DaprWorkflowContext, input: dict):
    """Durable multi-step research workflow."""
    # Step 1: Search for information (durable - will not re-run on restart)
    search_results = yield ctx.call_activity(
        search_web_activity,
        input={"query": input["topic"]}
    )

    # Step 2: Analyze results with LLM
    analysis = yield ctx.call_activity(
        analyze_content_activity,
        input={"content": search_results, "focus": input.get("focus", "general")}
    )

    # Step 3: Generate final report
    report = yield ctx.call_activity(
        generate_report_activity,
        input={"analysis": analysis, "format": input.get("format", "markdown")}
    )

    return {"report": report, "topic": input["topic"]}


@wfr.activity(name="search_web_activity")
def search_web_activity(ctx: WorkflowActivityContext, input: dict) -> str:
    """Searches the web for information on the given query."""
    # Simulate web search
    return f"Search results for '{input['query']}': Found 15 relevant articles."


@wfr.activity(name="analyze_content_activity")
def analyze_content_activity(ctx: WorkflowActivityContext, input: dict) -> str:
    """Uses LLM to analyze content and extract key insights."""
    llm = OpenAIChatClient(model="gpt-4o")
    response = llm.generate(
        f"Analyze this content and extract key insights about {input['focus']}: "
        f"{input['content']}"
    )
    return response.get_message().content


@wfr.activity(name="generate_report_activity")
def generate_report_activity(ctx: WorkflowActivityContext, input: dict) -> str:
    """Generates a formatted report from the analysis."""
    llm = OpenAIChatClient(model="gpt-4o")
    response = llm.generate(
        f"Generate a {input['format']} report from: {input['analysis']}"
    )
    return response.get_message().content
```

## Starting a Durable Workflow

```python
from dapr.clients import DaprClient
import uuid

with DaprClient() as client:
    instance_id = str(uuid.uuid4())

    # Start the workflow
    client.start_workflow(
        workflow_component="dapr",
        workflow_name="ai-research-workflow",
        input={
            "topic": "quantum computing advances in 2025",
            "focus": "practical applications",
            "format": "executive summary"
        },
        instance_id=instance_id
    )

    print(f"Workflow started: {instance_id}")

    # Poll for completion
    import time
    while True:
        state = client.get_workflow(
            instance_id=instance_id,
            workflow_component="dapr"
        )
        print(f"Status: {state.runtime_status}")

        if state.runtime_status in ["COMPLETED", "FAILED", "TERMINATED"]:
            print(f"Result: {state.serialized_output}")
            break
        time.sleep(5)
```

## State Persistence Component

Workflows require a state store for durability:

```yaml
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
    - name: actorStateStore
      value: "true"
```

## Running the Workflow App

```bash
dapr run --app-id research-workflow \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --components-path ./components \
  -- python workflow_app.py
```

## Resuming After Restart

If the workflow app crashes during step 2, on restart Dapr replays the workflow history. Step 1's result is retrieved from the state store - the web search is not repeated. The workflow continues from step 2, saving the cost of rerunning completed LLM calls.

## Setting Timeouts on Activities

Prevent hung LLM calls with activity timeouts:

```python
from datetime import timedelta

analysis = yield ctx.call_activity(
    analyze_content_activity,
    input={"content": search_results},
    retry_policy=wf.RetryPolicy(
        max_number_of_attempts=3,
        first_retry_interval=timedelta(seconds=5)
    )
)
```

## Summary

Dapr's durable workflow execution persists AI workflow state at each step, enabling recovery from crashes without repeating expensive LLM calls. Define workflows using `@wfr.workflow` and activities with `@wfr.activity`, back them with a Redis state store configured as an actor state store, and start workflows via the Dapr client. On restart, completed steps are replayed from history rather than re-executed.
