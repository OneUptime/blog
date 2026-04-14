# How to Set Up Integration Tests for Dapr Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Workflow, Integration Test, Go

Description: Write integration tests for Dapr workflows that start real workflow instances, invoke activities, and verify state transitions against a live Dapr runtime.

---

Dapr workflows are built on top of the actor model and require the placement service and a state store. Integration tests verify workflow execution order, activity completion, compensation logic, and pause/resume behavior that unit tests cannot fully cover.

## Infrastructure Requirements

Workflow integration tests need:
1. Dapr placement service
2. Redis (as the workflow state store)
3. Your workflow-hosting application with Dapr sidecar

## Minimal Docker Compose Setup

```yaml
# docker-compose.workflow-test.yaml
version: "3.8"
services:
  redis:
    image: redis:7-alpine

  placement:
    image: daprio/placement:1.14.0
    command: ["./placement", "-port", "50006"]

  workflow-app:
    build: .
    ports:
      - "8080:8080"

  workflow-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "-app-id"
      - "workflow-service"
      - "-app-port"
      - "8080"
      - "-placement-host-address"
      - "placement:50006"
      - "-components-path"
      - "/components"
    volumes:
      - ./components:/components
    network_mode: "service:workflow-app"
```

## Workflow Definition (Go SDK)

```go
// workflow.go
package main

import (
    "fmt"

    "github.com/dapr/go-sdk/workflow"
)

func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order OrderRequest
    ctx.GetInput(&order)

    var paymentResult PaymentResult
    if err := ctx.CallActivity(ProcessPayment, workflow.ActivityInput(order)).Await(&paymentResult); err != nil {
        return nil, err
    }
    if !paymentResult.Success {
        return nil, fmt.Errorf("payment failed")
    }

    var shipResult ShipResult
    ctx.CallActivity(ShipOrder, workflow.ActivityInput(order)).Await(&shipResult)

    return map[string]any{
        "orderId": order.ID,
        "shipped": shipResult.TrackingId,
    }, nil
}
```

## Integration Test

```go
// workflow_integration_test.go
package integration_test

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    "testing"
    "time"
)

const daprURL = "http://localhost:3500"

func TestWorkflowExecution(t *testing.T) {
    instanceID := fmt.Sprintf("test-order-%d", time.Now().UnixMilli())

    // Start workflow
    resp, err := http.Post(
        fmt.Sprintf("%s/v1.0/workflows/dapr/OrderWorkflow/start?instanceID=%s", daprURL, instanceID),
        "application/json",
        strings.NewReader(`{"orderId":"` + instanceID + `","amount":200}`),
    )
    if err != nil || resp.StatusCode != 202 {
        t.Fatalf("failed to start workflow: %v", err)
    }

    // Poll for completion
    var status map[string]interface{}
    for i := 0; i < 30; i++ {
        r, _ := http.Get(fmt.Sprintf("%s/v1.0/workflows/dapr/%s", daprURL, instanceID))
        json.NewDecoder(r.Body).Decode(&status)
        r.Body.Close()
        if status["runtimeStatus"] == "COMPLETED" {
            break
        }
        time.Sleep(1 * time.Second)
    }

    if status["runtimeStatus"] != "COMPLETED" {
        t.Errorf("workflow did not complete, status: %v", status["runtimeStatus"])
    }

    props := status["properties"].(map[string]interface{})
    output := props["dapr.workflow.output"].(string)
    if !strings.Contains(output, "shipped") {
        t.Errorf("expected shipped in output, got: %s", output)
    }
}

func TestWorkflowPauseResume(t *testing.T) {
    instanceID := fmt.Sprintf("pause-test-%d", time.Now().UnixMilli())

    http.Post(
        fmt.Sprintf("%s/v1.0/workflows/dapr/OrderWorkflow/start?instanceID=%s", daprURL, instanceID),
        "application/json",
        strings.NewReader(`{"orderId":"` + instanceID + `"}`),
    )

    // Pause the workflow
    http.Post(fmt.Sprintf("%s/v1.0/workflows/dapr/%s/pause", daprURL, instanceID), "", nil)
    time.Sleep(1 * time.Second)

    var pausedStatus map[string]interface{}
    r, _ := http.Get(fmt.Sprintf("%s/v1.0/workflows/dapr/%s", daprURL, instanceID))
    json.NewDecoder(r.Body).Decode(&pausedStatus)
    if pausedStatus["runtimeStatus"] != "SUSPENDED" {
        t.Errorf("expected SUSPENDED, got %v", pausedStatus["runtimeStatus"])
    }

    // Resume
    http.Post(fmt.Sprintf("%s/v1.0/workflows/dapr/%s/resume", daprURL, instanceID), "", nil)
}
```

## Summary

Integration tests for Dapr workflows start real workflow instances and poll for completion, verifying that activities execute in sequence and state transitions occur correctly. Testing pause, resume, and termination against a live runtime ensures your workflow orchestration logic works end-to-end.
