# How to Monitor Dapr Workflow Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Monitoring, Observability, Microservice

Description: Learn how to monitor Dapr workflow execution status, query running instances, and use Prometheus metrics to observe workflow health and performance.

---

## Overview

Monitoring long-running workflows is critical for operational visibility. Dapr exposes workflow status through its management API, emits traces via OpenTelemetry, and publishes metrics to Prometheus. This guide covers the key tools and techniques for monitoring Dapr Workflow execution in production.

## Querying Workflow Status via the HTTP API

The Dapr workflow management API lets you check the state of any workflow instance:

```bash
GET http://localhost:3500/v1.0/workflows/dapr/{instanceId}
```

Example using curl:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/order-workflow-abc123
```

Response:

```json
{
  "instanceID": "order-workflow-abc123",
  "workflowName": "OrderWorkflow",
  "createdAt": "2026-03-31T10:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:02:30Z",
  "runtimeStatus": "RUNNING",
  "properties": {
    "dapr.workflow.custom_status": "Processing payment"
  }
}
```

## Runtime Status Values

| Status | Meaning |
|--------|---------|
| RUNNING | Workflow is actively executing |
| COMPLETED | Workflow finished successfully |
| FAILED | Workflow terminated due to an unhandled error |
| TERMINATED | Workflow was manually stopped |
| SUSPENDED | Workflow is waiting for an external event |

## Querying Status in Code (.NET)

```csharp
using Dapr.Client;

var client = new DaprClientBuilder().Build();

var state = await client.GetWorkflowAsync(
    instanceId: "order-workflow-abc123",
    workflowComponent: "dapr",
    workflowName: "OrderWorkflow"
);

Console.WriteLine($"Status: {state.RuntimeStatus}");
Console.WriteLine($"Custom Status: {state.Properties["dapr.workflow.custom_status"]}");

if (state.RuntimeStatus == WorkflowRuntimeStatus.Completed)
{
    var result = state.ReadOutputAs<OrderResult>();
    Console.WriteLine($"Order ID: {result.OrderId}");
}
```

## Setting Custom Status Messages

Update custom status from within the workflow to communicate progress:

```csharp
public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderRequest order)
{
    context.SetCustomStatus("Step 1/3: Checking inventory");
    await context.CallActivityAsync(nameof(CheckInventoryActivity), order);

    context.SetCustomStatus("Step 2/3: Processing payment");
    await context.CallActivityAsync(nameof(ProcessPaymentActivity), order);

    context.SetCustomStatus("Step 3/3: Shipping order");
    await context.CallActivityAsync(nameof(ShipOrderActivity), order);

    context.SetCustomStatus("Completed");
    return new OrderResult { Success = true };
}
```

## Using the Dapr CLI

Check a specific workflow instance:

```bash
dapr workflow get order-workflow-abc123 --app-id orderservice
```

Terminate a stuck workflow:

```bash
dapr workflow terminate order-workflow-abc123 \
  --app-id orderservice
```

Purge completed workflow history:

```bash
dapr workflow purge order-workflow-abc123 \
  --app-id orderservice
```

## Enabling OpenTelemetry Tracing

Configure Dapr to export traces to Zipkin or OTLP:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin.monitoring:9411/api/v2/spans"
```

Apply to your namespace:

```bash
kubectl apply -f tracing-config.yaml
kubectl annotate deployment orderservice dapr.io/config=tracing-config
```

Each workflow and activity generates a span, allowing you to see end-to-end latency and step durations in Jaeger, Zipkin, or any OTLP-compatible backend.

## Prometheus Metrics

Dapr emits the following workflow-related metrics:

```text
dapr_runtime_workflow_operation_count - total workflow operations by status
dapr_runtime_workflow_operation_latency - duration of workflow operations
dapr_runtime_workflow_activity_operation_count - total activity operations
dapr_runtime_workflow_activity_operation_latency - duration of activity executions
```

Example Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: 'dapr'
    static_configs:
      - targets: ['dapr-sidecar:9090']
    metrics_path: '/metrics'
```

## Example Grafana Dashboard Query

Track workflow success vs failure rate:

```text
rate(dapr_runtime_workflow_operation_count{status="success"}[5m])
/
rate(dapr_runtime_workflow_operation_count[5m])
```

Alert on high failure rate:

```yaml
alert: DaprWorkflowHighFailureRate
expr: rate(dapr_runtime_workflow_operation_count{status="failed"}[5m]) > 0.1
for: 2m
labels:
  severity: critical
annotations:
  summary: "Dapr workflow failure rate exceeds 10%"
```

## Building a Polling Monitor in Python

Implement a simple monitor that polls workflow status until completion:

```python
import time
import requests

def wait_for_workflow(app_id: str, instance_id: str, timeout_seconds: int = 300):
    start = time.time()
    dapr_port = 3500

    while time.time() - start < timeout_seconds:
        url = f"http://localhost:{dapr_port}/v1.0/workflows/dapr/{instance_id}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        status = data.get("runtimeStatus")
        custom = data.get("properties", {}).get("dapr.workflow.custom_status", "")

        print(f"[{time.strftime('%H:%M:%S')}] Status: {status} | {custom}")

        if status in ("COMPLETED", "FAILED", "TERMINATED"):
            return data

        time.sleep(5)

    raise TimeoutError(f"Workflow {instance_id} did not complete within {timeout_seconds}s")

result = wait_for_workflow("orderservice", "order-workflow-abc123")
print(f"Final status: {result['runtimeStatus']}")
```

## Summary

Dapr Workflow execution can be monitored through multiple layers: the workflow management HTTP API and Dapr CLI for instance-level status, OpenTelemetry traces for distributed tracing across activities, and Prometheus metrics for aggregate monitoring and alerting. Custom status messages set from within the workflow provide human-readable progress indicators that are surfaced through the API and any monitoring dashboard connected to your observability stack.
