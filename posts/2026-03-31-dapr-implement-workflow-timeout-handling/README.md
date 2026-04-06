# How to Implement Workflow Timeout Handling in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Timeout, Timer, Durability

Description: Implement timeout handling in Dapr workflows using durable timers and activity timeouts to enforce SLAs and prevent indefinite blocking.

---

## Overview

Dapr Workflow provides two mechanisms for timeout enforcement: activity-level timeouts (how long a single activity can run) and workflow-level timers (durable delays that survive pod restarts). Both are essential for preventing workflows from blocking indefinitely.

## Activity-Level Timeouts

Set timeouts on individual activity calls:

```go
package main

import (
    "time"
    "github.com/dapr/go-sdk/workflow"
)

func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    // Payment must complete within 30 seconds
    retryPolicy := workflow.ActivityRetryPolicy{
        MaxAttempts:          3,
        InitialRetryInterval: 5 * time.Second,
    }

    var paymentResult PaymentResult
    err := ctx.CallActivity(ProcessPayment,
        workflow.ActivityInput(order),
        workflow.WithRetryPolicy(retryPolicy),
        workflow.WithActivityTimeout(30*time.Second)).
        Await(&paymentResult)

    if err != nil {
        return nil, fmt.Errorf("payment timed out or failed: %w", err)
    }
    return paymentResult, nil
}
```

## Durable Timers for Workflow Delays

Durable timers survive pod restarts and are stored in the state store:

```go
func ApprovalWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var request ApprovalRequest
    ctx.GetInput(&request)

    // Send approval request
    ctx.CallActivity(SendApprovalEmail, workflow.ActivityInput(request))

    // Wait for approval or timeout after 48 hours
    approvalChan := ctx.WaitForExternalEvent("approval-received")
    timerChan := ctx.CreateTimer(48 * time.Hour)

    select {
    case approvalResult := <-approvalChan.Channel():
        var approval ApprovalDecision
        approvalResult.Get(&approval)
        if approval.Approved {
            return ctx.CallActivity(ExecuteRequest, workflow.ActivityInput(request)), nil
        }
        return nil, errors.New("request rejected")

    case <-timerChan.Channel():
        // Timeout - auto-reject
        ctx.CallActivity(SendTimeoutNotification, workflow.ActivityInput(request))
        return nil, errors.New("approval timeout after 48 hours")
    }
}
```

## Cascading Timeouts with Sub-Orchestrations

Enforce parent timeouts across sub-workflows:

```go
func ParentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    // Child workflow must complete in 5 minutes
    childChan := ctx.CallChildWorkflow(ChildWorkflow,
        workflow.ChildWorkflowInput(data))
    timerChan := ctx.CreateTimer(5 * time.Minute)

    select {
    case result := <-childChan.Channel():
        return result, nil
    case <-timerChan.Channel():
        // Terminate the child workflow
        ctx.CallActivity(TerminateStuckWorkflow,
            workflow.ActivityInput(ctx.InstanceID()))
        return nil, errors.New("child workflow exceeded time limit")
    }
}
```

## Monitoring Timed-Out Workflows

```bash
# Find long-running workflows
curl "http://localhost:3500/v1.0/workflows/dapr?status=RUNNING&createdTimeTo=2026-03-30T00:00:00Z"

# Terminate a stuck workflow
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/stuck-workflow-123/terminate" \
  -H "Content-Type: application/json" \
  -d '{"terminationReason": "manual timeout enforcement"}'
```

## Global Workflow Timeout Pattern

```go
func WorkflowWithGlobalTimeout(ctx *workflow.WorkflowContext) (any, error) {
    var input WorkflowInput
    ctx.GetInput(&input)

    deadline := ctx.CreateTimer(input.MaxDuration)

    resultChan := ctx.CallChildWorkflow(ActualWorkflow,
        workflow.ChildWorkflowInput(input))

    select {
    case result := <-resultChan.Channel():
        return result, nil
    case <-deadline.Channel():
        return nil, fmt.Errorf("workflow exceeded %v time limit", input.MaxDuration)
    }
}
```

## Summary

Dapr Workflow supports activity-level timeouts via `WithActivityTimeout` and durable timers via `CreateTimer`. Use activity timeouts for per-step SLAs and `WaitForExternalEvent` combined with a timer for human-in-the-loop approval patterns. Durable timers survive infrastructure failures, making them reliable for business-level timeout enforcement like 48-hour approval windows.
