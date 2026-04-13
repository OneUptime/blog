# How to Use Dapr Workflow with Timers and Delays

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Timer, Delay, Scheduling

Description: Learn how to use Dapr workflow timers and delays to pause workflows for a duration or until a specific time, enabling scheduling, retry backoff, and time-based patterns.

---

Dapr workflows support durable timers - pauses in execution that survive process restarts. Unlike `time.sleep()`, a Dapr timer is stored in the workflow state, so if the process crashes during a delay, the workflow resumes correctly after restart and honors the original timer deadline.

## Why Durable Timers Matter

If you use `time.sleep(3600)` in a workflow activity or directly in the orchestrator:
- A process restart during the sleep loses the timer
- The activity restarts from scratch, potentially duplicating work
- You cannot inspect or cancel the timer externally

`ctx.create_timer()` stores the deadline in the workflow state store and resumes at the correct time regardless of crashes.

## Basic Delay Usage

Pause a workflow for a fixed duration:

```python
from dapr.ext.workflow import DaprWorkflowContext
from datetime import timedelta

def delayed_notification_workflow(ctx: DaprWorkflowContext, params: dict):
    # Send initial confirmation
    yield ctx.call_activity(send_confirmation, input=params)

    # Wait 24 hours before sending a follow-up
    yield ctx.create_timer(
        ctx.current_utc_datetime + timedelta(hours=24)
    )

    # Send follow-up
    yield ctx.call_activity(send_followup, input=params)
    return {"status": "completed"}
```

## Scheduling Work at a Specific Time

Schedule an activity to run at a future timestamp:

```python
from datetime import datetime, timezone

def scheduled_report_workflow(ctx: DaprWorkflowContext, config: dict):
    # Parse the target time
    target_time = datetime.fromisoformat(config["run_at"]).replace(tzinfo=timezone.utc)

    # Wait until the specified time
    yield ctx.create_timer(target_time)

    # Run the report
    result = yield ctx.call_activity(generate_report, input=config)
    yield ctx.call_activity(deliver_report, input=result)
    return result
```

## Retry with Exponential Backoff

Implement retry delays with exponential backoff in the workflow:

```python
def retry_with_backoff_workflow(ctx: DaprWorkflowContext, task: dict):
    max_retries = 5
    base_delay_seconds = 2

    for attempt in range(max_retries):
        result = yield ctx.call_activity(attempt_task, input=task)

        if result.get("success"):
            return result

        if attempt < max_retries - 1:
            delay = base_delay_seconds * (2 ** attempt)  # 2, 4, 8, 16 seconds
            yield ctx.create_timer(
                ctx.current_utc_datetime + timedelta(seconds=delay)
            )

    return {"success": False, "message": "Max retries exceeded"}
```

## Timeout with Timer and External Event

Combine a timer with an external event to implement a timeout:

```python
from dapr.ext.workflow import when_any

def approval_with_timeout_workflow(ctx: DaprWorkflowContext, request: dict):
    # Send approval request
    yield ctx.call_activity(send_approval_request, input=request)

    # Race: wait for approval OR timeout after 48 hours
    approval_event = ctx.wait_for_external_event("approval-decision")
    timeout = ctx.create_timer(ctx.current_utc_datetime + timedelta(hours=48))

    winner = yield when_any([approval_event, timeout])

    if winner == timeout:
        yield ctx.call_activity(handle_timeout, input=request)
        return {"status": "timed_out"}

    decision = approval_event.get_result()
    return {"status": "approved" if decision["approved"] else "rejected"}
```

## Recurring Pattern with Timer Loop

Build a periodic task using a timer inside a loop:

```python
def heartbeat_workflow(ctx: DaprWorkflowContext, config: dict):
    interval_seconds = config.get("interval", 60)
    iterations = config.get("iterations", 10)

    for i in range(iterations):
        yield ctx.call_activity(send_heartbeat, input={"sequence": i + 1})
        yield ctx.create_timer(
            ctx.current_utc_datetime + timedelta(seconds=interval_seconds)
        )

    return {"heartbeats_sent": iterations}
```

## Using Current UTC Time

Always use `ctx.current_utc_datetime` instead of `datetime.utcnow()` in workflow orchestrators:

```python
# CORRECT - uses replay-safe workflow time
delay_until = ctx.current_utc_datetime + timedelta(minutes=30)
yield ctx.create_timer(delay_until)

# INCORRECT - not replay-safe, will give different values on replay
from datetime import datetime
delay_until = datetime.utcnow() + timedelta(minutes=30)  # DO NOT USE
```

## Summary

Dapr workflow timers provide durable, crash-safe delays by storing timer deadlines in the workflow state store. Use `ctx.create_timer()` with `ctx.current_utc_datetime` for all time-based logic in orchestrators. Timers enable scheduled execution, exponential backoff retry, timeout races with external events, and recurring periodic patterns - all with automatic recovery across process restarts.
