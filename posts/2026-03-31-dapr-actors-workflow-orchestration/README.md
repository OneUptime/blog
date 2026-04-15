# How to Use Actors for Workflow Orchestration in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Workflow, Orchestration, State Machine

Description: Implement workflow orchestration using Dapr actors as state machines, coordinating multi-step processes with durable state and event-driven step transitions.

---

While Dapr has a dedicated Workflow API, actors are a powerful alternative for implementing custom workflow orchestration with precise control over state transitions, compensation logic, and step execution.

## Workflow Actor Design

Model the workflow as a state machine where each workflow instance is an actor:

```yaml
Actor Type: OrderWorkflow
Actor ID:   <workflowId>
States:     pending -> payment_processing -> payment_confirmed -> fulfillment -> shipped -> completed
```

## Implementing the Workflow State Machine

```go
package main

import (
  "context"
  "fmt"
  "time"
  "github.com/dapr/go-sdk/actor"
)

type WorkflowState struct {
  WorkflowID  string                 `json:"workflowId"`
  CurrentStep string                 `json:"currentStep"`
  Steps       []StepRecord           `json:"steps"`
  Input       map[string]interface{} `json:"input"`
  Status      string                 `json:"status"` // running, completed, failed
}

type StepRecord struct {
  Name        string    `json:"name"`
  Status      string    `json:"status"`
  StartedAt   time.Time `json:"startedAt"`
  CompletedAt time.Time `json:"completedAt,omitempty"`
  Error       string    `json:"error,omitempty"`
}

type StepCompletion struct {
  StepName string `json:"stepName"`
  Status   string `json:"status"`
  Error    string `json:"error,omitempty"`
}

type OrderWorkflowActor struct {
  actor.ServerImplBaseCtx
}

func (a *OrderWorkflowActor) Type() string { return "OrderWorkflow" }

func (a *OrderWorkflowActor) StartWorkflow(ctx context.Context, input map[string]interface{}) error {
  state := WorkflowState{
    WorkflowID:  a.ID(),
    CurrentStep: "payment_processing",
    Status:      "running",
    Input:       input,
  }
  return a.GetStateManager().Set(ctx, "workflow", state)
}

func (a *OrderWorkflowActor) CompleteStep(ctx context.Context, req *StepCompletion) error {
  var state WorkflowState
  if err := a.GetStateManager().Get(ctx, "workflow", &state); err != nil {
    return err
  }

  record := StepRecord{
    Name:        req.StepName,
    Status:      req.Status,
    CompletedAt: time.Now().UTC(),
  }
  if req.Error != "" {
    record.Error = req.Error
    state.Status = "failed"
  }
  state.Steps = append(state.Steps, record)

  // Advance to next step
  if req.Status == "success" {
    state.CurrentStep = nextStep(state.CurrentStep)
    if state.CurrentStep == "" {
      state.Status = "completed"
    }
  }

  return a.GetStateManager().Set(ctx, "workflow", state)
}

func (a *OrderWorkflowActor) GetStatus(ctx context.Context) (*WorkflowState, error) {
  var state WorkflowState
  if err := a.GetStateManager().Get(ctx, "workflow", &state); err != nil {
    return nil, fmt.Errorf("workflow not found")
  }
  return &state, nil
}

func nextStep(current string) string {
  steps := []string{"payment_processing", "payment_confirmed", "fulfillment", "shipped", "completed"}
  for i, s := range steps {
    if s == current && i+1 < len(steps) {
      return steps[i+1]
    }
  }
  return ""
}
```

## Starting a Workflow

```bash
curl -X POST http://localhost:3500/v1.0/actors/OrderWorkflow/wf-001/method/StartWorkflow \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-555",
    "customerId": "CUST-123",
    "amount": 249.99
  }'
```

## Completing a Step

```bash
curl -X POST http://localhost:3500/v1.0/actors/OrderWorkflow/wf-001/method/CompleteStep \
  -H "Content-Type: application/json" \
  -d '{
    "stepName": "payment_processing",
    "status": "success"
  }'
```

## Adding Timeout via Reminders

Reminders are registered through the Dapr HTTP API. You can call this from your actor method or from an external service:

```bash
curl -X POST http://localhost:3500/v1.0/actors/OrderWorkflow/wf-001/reminders/workflow-timeout \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "24h"
  }'
```

Omitting the `period` field makes this a one-shot reminder that fires once after 24 hours.

## Summary

Dapr actors serve as durable state machines for workflow orchestration, maintaining step history and current status with automatic persistence. Each workflow instance is isolated in its own actor, enabling thousands of concurrent workflows without contention. This pattern is particularly useful when you need custom state machine logic beyond what the Dapr Workflow API provides out of the box.
