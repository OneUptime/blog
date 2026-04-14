# How to Trace Workflow Execution in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, Workflow, Observability, Microservice, Activity

Description: Monitor Dapr workflow execution with distributed traces to visualize activity execution order, identify bottlenecks, and debug workflow failures.

---

## Overview

Dapr Workflows orchestrate long-running business processes as durable, resumable workflows. Each workflow execution, activity invocation, and sub-workflow call generates trace spans, giving you a complete picture of workflow progress and performance. This guide covers how Dapr traces workflow execution and how to use those traces to debug and optimize workflows.

## How Dapr Traces Workflows

Dapr generates spans for:
- Workflow instance creation (`StartWorkflow`)
- Activity invocations (`CallActivity`)
- Sub-workflow calls (`CallChildWorkflow`)
- External event waits (`WaitForExternalEvent`)
- Workflow completion or failure

All spans share the same trace ID, creating a complete picture even for long-running workflows.

## Workflow Configuration with Tracing

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: workflow-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

## Example Workflow with Tracing

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext
from dapr.clients import DaprClient

wf_runtime = WorkflowRuntime()

@wf_runtime.workflow(name='order-processing-workflow')
def order_processing_workflow(ctx: DaprWorkflowContext, order_data: dict):
    # Each activity call creates a child span
    inventory_result = yield ctx.call_activity(
        reserve_inventory,
        input={"items": order_data['items'], "orderId": order_data['orderId']}
    )

    if not inventory_result['success']:
        yield ctx.call_activity(
            notify_inventory_failure,
            input={"orderId": order_data['orderId']}
        )
        return {"status": "failed", "reason": "inventory"}

    payment_result = yield ctx.call_activity(
        process_payment,
        input={"amount": order_data['total'], "orderId": order_data['orderId']}
    )

    if not payment_result['success']:
        # Compensating transaction also traced
        yield ctx.call_activity(
            release_inventory,
            input={"items": order_data['items']}
        )
        return {"status": "failed", "reason": "payment"}

    yield ctx.call_activity(
        send_confirmation,
        input={"orderId": order_data['orderId']}
    )

    return {"status": "completed"}

@wf_runtime.activity(name='reserve_inventory')
def reserve_inventory(ctx: WorkflowActivityContext, input_data: dict):
    # Activity execution is traced as a child span of the workflow
    print(f"Reserving inventory for order {input_data['orderId']}")
    # ... inventory logic
    return {"success": True}
```

## Starting a Workflow

```python
from dapr.ext.workflow import DaprWorkflowClient

client = DaprWorkflowClient()
instance_id = client.schedule_new_workflow(
    workflow=order_processing_workflow,
    input={"orderId": "ORD-1001", "total": 99.99, "items": [...]}
)
print(f"Started workflow: {instance_id}")
```

## Reading Workflow Traces

In Jaeger, a workflow trace looks like:

```text
order-processing-workflow (5200ms total)
  |-- StartWorkflow (10ms)
  |-- Activity: reserve_inventory (200ms)
  |-- Activity: process_payment (4500ms)  <- bottleneck!
  |-- Activity: send_confirmation (50ms)
```

The long `process_payment` span immediately identifies where time is spent.

## Correlating Workflow Instance with Traces

Log the workflow instance ID alongside the trace ID:

```python
@wf_runtime.workflow(name='order-processing-workflow')
def order_processing_workflow(ctx: DaprWorkflowContext, order_data: dict):
    instance_id = ctx.instance_id
    # The instance_id appears in Dapr's workflow spans
    # Use it to correlate workflow status API with trace data
    print(f"Workflow instance: {instance_id}")
```

Check workflow status:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/{instanceId}
```

## Analyzing Failed Workflows

```bash
# Find failed workflow traces
curl "http://localhost:16686/api/traces?service=order-service&operation=StartWorkflow&tags=error:true"

# Find slow workflows (>5 seconds)
curl "http://localhost:16686/api/traces?service=order-service&operation=StartWorkflow&minDuration=5000000"
```

## Summary

Dapr traces workflow execution by creating spans for workflow orchestration, activity invocations, and sub-workflows under a shared trace ID. This provides a complete execution timeline even for long-running workflows. Use trace data to identify bottleneck activities, debug compensation logic, and measure end-to-end workflow duration. The workflow instance ID in trace attributes lets you correlate traces with Dapr's workflow status API.
