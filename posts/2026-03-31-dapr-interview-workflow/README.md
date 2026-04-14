# How to Explain Dapr Workflow in an Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Interview, Orchestration, Durability

Description: Explain Dapr Workflow in a technical interview covering durability, the orchestrator and activity model, common patterns, and comparisons to Temporal and AWS Step Functions.

---

## Core Workflow Answer

**Strong interview answer:**

"Dapr Workflow is a durable workflow engine built on the Durable Task Framework. Workflows survive process restarts, crashes, and scaling events because every step is persisted to a state store. You write workflows as code - ordinary C#, Python, Java, Go, or JavaScript functions - and Dapr handles the durability, retries, and long-running execution. Workflows consist of an orchestrator function that sequences activities, and activity functions that do the actual work."

## Orchestrator and Activity Model

```python
import dapr.ext.workflow as wf

# Create a WorkflowRuntime instance - decorators are registered on this
wfr = wf.WorkflowRuntime()

# Orchestrator - defines the sequence of steps
@wfr.workflow(name="order-fulfillment")
def order_fulfillment(ctx: wf.DaprWorkflowContext, order_id: str):
    # Sequential activities
    validated = yield ctx.call_activity(validate_order, input=order_id)
    charged = yield ctx.call_activity(charge_payment, input=validated)
    shipped = yield ctx.call_activity(ship_order, input=charged)
    return shipped

# Activities - do actual work (can call external APIs, databases)
@wfr.activity(name="validate-order")
def validate_order(ctx: wf.WorkflowActivityContext, order_id: str) -> dict:
    # Runs once, result persisted
    order = fetch_order_from_db(order_id)
    return {"orderId": order_id, "total": order["total"]}
```

## Why Orchestrators Must Be Deterministic

```python
# BAD - non-deterministic (fails on replay)
@wfr.workflow
def bad_workflow(ctx, input):
    timestamp = datetime.now()  # Different value on replay!
    random_id = uuid.uuid4()    # Different value on replay!

# GOOD - use Dapr-provided deterministic APIs
@wfr.workflow
def good_workflow(ctx: wf.DaprWorkflowContext, input):
    timestamp = ctx.current_utc_datetime  # Deterministic
    # Use activity for any non-deterministic work
    random_id = yield ctx.call_activity(generate_id, input=None)
```

## Common Workflow Patterns

**Fan-out/Fan-in:**
```python
@wfr.workflow
def parallel_processing(ctx: wf.DaprWorkflowContext, order_ids: list):
    # Launch all activities in parallel
    tasks = [ctx.call_activity(process_order, input=oid) for oid in order_ids]
    # Wait for all to complete
    results = yield wf.when_all(tasks)
    return results
```

**External Event Wait:**
```python
@wfr.workflow
def approval_workflow(ctx: wf.DaprWorkflowContext, request_id: str):
    yield ctx.call_activity(notify_approver, input=request_id)
    # Pause until approval event arrives
    approved = yield ctx.wait_for_external_event("approval-decision")
    if approved:
        yield ctx.call_activity(execute_request, input=request_id)
```

## Start and Monitor a Workflow

```bash
# Start workflow via Dapr HTTP API
curl -X POST http://localhost:3500/v1.0/workflows/dapr/order-fulfillment/start \
  -H "Content-Type: application/json" \
  -d '{"input": "order-123"}'

# Returns: {"instanceID": "abc-123-xyz"}

# Check status
curl http://localhost:3500/v1.0/workflows/dapr/abc-123-xyz

# Send external event (for approval workflow)
curl -X POST http://localhost:3500/v1.0/workflows/dapr/abc-123-xyz/raiseEvent/approval-decision \
  -d 'true'
```

## Dapr Workflow vs Alternatives

| Aspect | Dapr Workflow | Temporal | AWS Step Functions |
|--------|---------------|----------|--------------------|
| Code language | C#/Python/Java/Go/JS | Go/Java/.NET/Python/TypeScript/PHP | JSON/YAML DSL |
| Self-hosted | Yes | Yes | No (AWS only) |
| State backend | Pluggable (Redis, etc.) | Cassandra/MySQL/PostgreSQL | Managed |
| Long-running | Yes (years) | Yes | Yes (1 year max) |
| Replay model | Event sourcing | Event sourcing | Managed |
| Cost | Open source | Open source (hosting cost) | Per state transition |

## Common Interview Follow-Ups

**Q: What happens if the workflow crashes mid-execution?**
"The workflow replays from the beginning using the persisted event history. Activities that already completed are not re-executed - Dapr returns the cached result. The workflow resumes from where it left off."

**Q: How long can a Dapr workflow run?**
"Indefinitely. Workflows persist every step to the state store. A workflow can wait for an external event for days, weeks, or months."

**Q: What's the difference between a workflow and a saga?**
"A saga is a pattern for distributed transactions - it defines compensating actions to undo completed steps. Dapr Workflow can implement the saga pattern - each activity is a saga step, and compensation logic runs if a step fails."

## Summary

Dapr Workflow provides durable, code-first workflow orchestration using the event-sourcing replay model. Workflows consist of a deterministic orchestrator that sequences activities, which perform the actual work. Key interview points are durability through replay, determinism requirements for orchestrators, common patterns (fan-out, external events, timers), and the comparison to Temporal - similar replay model but Dapr integrates with the rest of the Dapr building block ecosystem.
