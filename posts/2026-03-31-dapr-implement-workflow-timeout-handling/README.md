# How to Implement Workflow Timeout Handling in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Timeout, Timer, Durability

Description: Implement timeout handling in Dapr workflows using durable timers and activity timeouts to enforce SLAs and prevent indefinite blocking.

---

## Overview

Dapr Workflow provides two mechanisms for timeout enforcement: retry policies with timeouts (how long retries for a single activity can span) and durable timers (delays that survive pod restarts). Both are essential for preventing workflows from blocking indefinitely.

## Activity-Level Timeouts

Set timeouts on individual activity calls using a retry policy with `RetryTimeout`:

```go
package main

import (
    "fmt"
    "time"
    "github.com/dapr/durabletask-go/workflow"
)

func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    // Payment must complete within 30 seconds across all retry attempts
    retryPolicy := &workflow.RetryPolicy{
        MaxAttempts:          3,
        InitialRetryInterval: 5 * time.Second,
        RetryTimeout:         30 * time.Second,
    }

    var paymentResult PaymentResult
    err := ctx.CallActivity(ProcessPayment,
        workflow.WithActivityInput(order),
        workflow.WithActivityRetryPolicy(retryPolicy)).
        Await(&paymentResult)

    if err != nil {
        return nil, fmt.Errorf("payment timed out or failed: %w", err)
    }
    return paymentResult, nil
}
```

## Durable Timers for Workflow Delays

Durable timers survive pod restarts and are persisted via the actor reminder system:

```go
func ApprovalWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var request ApprovalRequest
    ctx.GetInput(&request)

    // Send approval request
    ctx.CallActivity(SendApprovalEmail, workflow.WithActivityInput(request)).Await(nil)

    // Wait for approval or timeout after 48 hours
    // WaitForExternalEvent accepts a timeout duration as the second argument
    var approval ApprovalDecision
    err := ctx.WaitForExternalEvent("approval-received", 48*time.Hour).Await(&approval)
    if err != nil {
        // Timeout - auto-reject
        ctx.CallActivity(SendTimeoutNotification, workflow.WithActivityInput(request)).Await(nil)
        return nil, errors.New("approval timeout after 48 hours")
    }

    if approval.Approved {
        var result any
        err = ctx.CallActivity(ExecuteRequest, workflow.WithActivityInput(request)).Await(&result)
        return result, err
    }
    return nil, errors.New("request rejected")
}
```

## Cascading Timeouts with Sub-Orchestrations

Enforce timeouts on child workflows by passing deadline constraints and using retry policy timeouts on their activities:

```go
func ParentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var data WorkflowData
    ctx.GetInput(&data)

    // Call child workflow that enforces its own 5-minute deadline
    childInput := ChildInput{
        Data:       data,
        MaxTimeout: 5 * time.Minute,
    }

    var result any
    err := ctx.CallChildWorkflow(ChildWorkflow,
        workflow.WithChildWorkflowInput(childInput)).Await(&result)
    if err != nil {
        return nil, fmt.Errorf("child workflow failed: %w", err)
    }
    return result, nil
}

func ChildWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var input ChildInput
    ctx.GetInput(&input)

    // Enforce the parent's timeout via retry policy
    retryPolicy := &workflow.RetryPolicy{
        MaxAttempts:          3,
        InitialRetryInterval: 5 * time.Second,
        RetryTimeout:         input.MaxTimeout,
    }

    var result any
    err := ctx.CallActivity(ProcessStep,
        workflow.WithActivityInput(input.Data),
        workflow.WithActivityRetryPolicy(retryPolicy)).Await(&result)
    if err != nil {
        return nil, errors.New("child workflow exceeded time limit")
    }
    return result, nil
}
```

## Monitoring Timed-Out Workflows

```bash
# Get the status of a specific workflow instance
curl "http://localhost:3500/v1.0/workflows/dapr/order-workflow-123"

# Terminate a stuck workflow
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/stuck-workflow-123/terminate"
```

## Global Workflow Timeout Pattern

Enforce a global timeout across an entire workflow by propagating the deadline to each activity via retry policies:

```go
func WorkflowWithGlobalTimeout(ctx *workflow.WorkflowContext) (any, error) {
    var input WorkflowInput
    ctx.GetInput(&input)

    // Apply global timeout as a retry policy on the child workflow's activities
    var result any
    err := ctx.CallChildWorkflow(ActualWorkflow,
        workflow.WithChildWorkflowInput(input)).Await(&result)
    if err != nil {
        return nil, fmt.Errorf("workflow exceeded %v time limit: %w", input.MaxDuration, err)
    }
    return result, nil
}

// ActualWorkflow enforces per-step timeouts derived from the global deadline
func ActualWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var input WorkflowInput
    ctx.GetInput(&input)

    retryPolicy := &workflow.RetryPolicy{
        MaxAttempts:          3,
        InitialRetryInterval: 5 * time.Second,
        RetryTimeout:         input.MaxDuration,
    }

    var result any
    err := ctx.CallActivity(DoWork,
        workflow.WithActivityInput(input),
        workflow.WithActivityRetryPolicy(retryPolicy)).Await(&result)
    return result, err
}
```

## Summary

Dapr Workflow supports activity-level timeouts via `RetryPolicy.RetryTimeout` and durable timers via `CreateTimer`. Use retry policy timeouts for per-step SLAs and `WaitForExternalEvent` with its built-in timeout parameter for human-in-the-loop approval patterns. Durable timers survive infrastructure failures, making them reliable for business-level timeout enforcement like 48-hour approval windows.
