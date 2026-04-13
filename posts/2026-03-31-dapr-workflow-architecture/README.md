# How to Understand Dapr Workflow Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Architecture, Orchestration, Durable Execution

Description: A technical deep dive into Dapr workflow architecture - understand how the workflow engine, actors, and durable execution model work together to provide fault-tolerant orchestration.

---

Dapr Workflows are built on the Durable Task Framework and use the Actor model internally. Understanding the architecture helps you make informed decisions about workflow design, scaling, and debugging.

## Core Components

The Dapr workflow subsystem consists of three key components:

1. **Workflow Engine** - runs inside the Dapr sidecar, manages orchestration logic
2. **Workflow Actor** - a virtual actor that stores workflow state and schedules activities
3. **Activity Worker** - your application code that executes activities

```json
[Your App] <--> [Dapr Sidecar / Workflow Engine] <--> [State Store (Redis/CosmosDB)]
                          |
                   [Activity Dispatch]
                          |
                [Your App Activity Handlers]
```

## Event Sourcing and Replay

Dapr workflows use an event-sourced execution model. The workflow state is stored as a sequence of events:

```text
Event Log:
1. WorkflowStarted  { input: {...} }
2. ActivityScheduled { name: "validate_order" }
3. ActivityCompleted { name: "validate_order", result: {...} }
4. ActivityScheduled { name: "charge_payment" }
5. ActivityCompleted { name: "charge_payment", result: {...} }
```

When a workflow resumes (e.g., after a crash), the engine replays this event log. Activities that already completed return their cached results without re-executing. This is called **deterministic replay**.

## Workflow vs. Activity Thread

The workflow function runs in a special replay context:

```python
def my_workflow(ctx: DaprWorkflowContext, input):
    # This code may be replayed multiple times
    # DO NOT: make HTTP calls, read system clock, use random numbers directly
    # DO: use ctx.current_utc_datetime for time, call ctx.call_activity for side effects

    result = yield ctx.call_activity(my_activity, input=input)
    return result
```

Activities run exactly once and are allowed to have side effects:

```python
def my_activity(ctx: WorkflowActivityContext, input):
    # This runs exactly once (or retries on failure)
    # DO: make HTTP calls, write to database, send events
    response = requests.post("https://api.example.com/process", json=input)
    return response.json()
```

## Internal Actor Model

Each workflow instance maps to a virtual Dapr actor. The actor ID is the workflow instance ID:

```bash
# Inspect workflow actor state in Redis (default namespace)
redis-cli KEYS "*dapr.internal*workflow*"
```

The actor persists the event history and current state. This is why workflows survive restarts - the actor simply replays the event log when reactivated.

## Workflow Scheduler Service

The Dapr Scheduler service manages actor reminders used internally by workflows for scheduling and timers. It runs in both Kubernetes and self-hosted environments:

```yaml
# Check scheduler service status (Kubernetes)
kubectl get pods -n dapr-system | grep scheduler
```

The Scheduler handles reminder-based scheduling for workflow operations, while the actor placement service ensures workflow instances are distributed across available app replicas.

## State Store Configuration

Workflows require an actor-compatible state store for event persistence. Configure a state store component that supports actors:

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
    value: localhost:6379
  - name: actorStateStore
    value: "true"
```

Any state store that supports actors implicitly supports Dapr Workflow. For production, use a persistent state store like PostgreSQL or Azure Cosmos DB instead of Redis.

## Scaling Considerations

Multiple app instances share workflow execution:

- Each instance registers as an activity worker
- The workflow engine dispatches activities across all available workers
- Only one instance runs the orchestrator for any given workflow instance ID (via actor placement)
- Activity concurrency scales horizontally as you add replicas

## Workflow History Size Limits

Long-running workflows accumulate large event histories. Monitor history size:

```bash
dapr workflow history <id> --app-id myapp
```

Purge completed workflow history regularly to reclaim state store space.

## Summary

Dapr workflows combine event sourcing, the actor model, and deterministic replay to deliver durable orchestration. The key insight is that workflow functions are replay-safe orchestrators while activities are the only place for side effects. This separation enables automatic crash recovery, horizontal scaling of activity workers, and reliable long-running process management without external orchestration infrastructure.
