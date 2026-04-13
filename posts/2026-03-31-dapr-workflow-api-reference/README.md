# How to Use the Dapr Workflow API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, API, Orchestration, Durable

Description: A practical reference for the Dapr Workflow API covering start, get, pause, resume, terminate, raise event, and purge operations.

---

## Overview

The Dapr Workflow API manages long-running, durable workflow instances. Workflows survive process restarts, support human-in-the-loop patterns via external events, and provide a complete audit trail of execution history. The HTTP API gives you programmatic control over workflow lifecycle from outside the application.

## Base URL

```yaml
http://localhost:{daprPort}/v1.0/workflows/{workflowComponentName}/{workflowName}
```

## Starting a Workflow

**POST** `/v1.0/workflows/{componentName}/{workflowName}/start`

```bash
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/OrderFulfillmentWorkflow/start?instanceID=ord-workflow-001" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ord-001", "customerId": "cust-123"}'
```

Response:

```json
{
  "instanceID": "ord-workflow-001"
}
```

## Getting Workflow Status

**GET** `/v1.0/workflows/{componentName}/{instanceID}`

```bash
curl http://localhost:3500/v1.0/workflows/dapr/ord-workflow-001
```

Response:

```json
{
  "instanceID": "ord-workflow-001",
  "workflowName": "OrderFulfillmentWorkflow",
  "createdAt": "2026-03-31T10:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:00:10Z",
  "runtimeStatus": "RUNNING",
  "properties": {
    "dapr.workflow.input": "{\"orderId\":\"ord-001\"}"
  }
}
```

## Pausing a Workflow

**POST** `/v1.0/workflows/{componentName}/{instanceID}/pause`

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/ord-workflow-001/pause
```

## Resuming a Workflow

**POST** `/v1.0/workflows/{componentName}/{instanceID}/resume`

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/ord-workflow-001/resume
```

## Terminating a Workflow

**POST** `/v1.0/workflows/{componentName}/{instanceID}/terminate`

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/ord-workflow-001/terminate
```

## Raising an External Event

Send an external event to a waiting workflow (e.g., for approval flows):

**POST** `/v1.0/workflows/{componentName}/{instanceID}/raiseEvent/{eventName}`

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/ord-workflow-001/raiseEvent/ManagerApproval \
  -H "Content-Type: application/json" \
  -d '{"approved": true, "approvedBy": "manager@example.com"}'
```

In the workflow, waiting for the event:

```csharp
var approval = await context.WaitForExternalEventAsync<ApprovalResult>(
    "ManagerApproval"
);
if (!approval.Approved)
{
    return new OrderResult { Status = "rejected" };
}
```

## Purging Workflow History

**POST** `/v1.0/workflows/{componentName}/{instanceID}/purge`

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/ord-workflow-001/purge
```

## Runtime Status Values

| Status | Description |
|---|---|
| RUNNING | Actively executing |
| COMPLETED | Finished successfully |
| CONTINUED_AS_NEW | Restarted with new input |
| FAILED | Terminated with error |
| CANCELED | Canceled by request |
| TERMINATED | Forcefully stopped |
| PENDING | Not yet started |
| SUSPENDED | Paused awaiting resume |

## Summary

The Dapr Workflow API gives full lifecycle control over durable workflow instances through a clean REST interface. The external event mechanism enables human-in-the-loop patterns like approval workflows. Use the purge endpoint to manage storage costs after workflows complete, and build monitoring dashboards by polling the status endpoint for all active workflow instances.
