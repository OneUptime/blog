# How to Build a Task Management System with Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Task Management, Human-in-the-Loop, Pattern

Description: Learn how to build a task management system using Dapr Workflow with human approval steps, deadline handling, and task escalation workflows.

---

## Overview

A task management system tracks work items through defined stages with assignments, approvals, deadlines, and escalations. Dapr Workflow provides durable execution that survives restarts, making it ideal for long-running task lifecycle management.

## Task Data Model

```go
package main

type TaskStatus string

const (
    StatusPending   TaskStatus = "pending"
    StatusAssigned  TaskStatus = "assigned"
    StatusInReview  TaskStatus = "in_review"
    StatusApproved  TaskStatus = "approved"
    StatusRejected  TaskStatus = "rejected"
    StatusCompleted TaskStatus = "completed"
    StatusEscalated TaskStatus = "escalated"
)

type Task struct {
    ID          string     `json:"id"`
    Title       string     `json:"title"`
    Description string     `json:"description"`
    AssigneeID  string     `json:"assigneeId"`
    ApproverID  string     `json:"approverId"`
    Priority    string     `json:"priority"`
    Deadline    time.Time  `json:"deadline"`
    Status      TaskStatus `json:"status"`
    CreatedAt   time.Time  `json:"createdAt"`
}
```

## Task Workflow

```go
func TaskWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var task Task
    ctx.GetInput(&task)

    // Step 1: Assign task to appropriate person
    var assignment AssignmentResult
    if err := ctx.CallActivity(AssignTask, workflow.WithActivityInput(task)).Await(&assignment); err != nil {
        return nil, err
    }
    task.AssigneeID = assignment.AssigneeID

    // Notify assignee
    ctx.CallActivity(NotifyAssignee, workflow.WithActivityInput(task)).Await(nil)

    // Step 2: Wait for completion or deadline
    deadlineDuration := time.Until(task.Deadline)
    completionEvent := ctx.WaitForSingleEvent("task-completed", deadlineDuration)

    var completionData TaskCompletion
    if err := completionEvent.Await(&completionData); err != nil {
        // Deadline exceeded - escalate
        return ctx.CallActivity(EscalateTask, workflow.WithActivityInput(task)).Await(nil)
    }

    // Step 3: Route to approval if required
    if task.Priority == "high" {
        return approvalSubFlow(ctx, task, completionData)
    }

    // Low priority: auto-approve
    return ctx.CallActivity(CompleteTask, workflow.WithActivityInput(map[string]any{
        "task":       task,
        "completion": completionData,
        "approved":   true,
    })).Await(nil)
}

func approvalSubFlow(ctx *workflow.WorkflowContext, task Task, completion TaskCompletion) (any, error) {
    // Notify approver
    ctx.CallActivity(NotifyApprover, workflow.WithActivityInput(task)).Await(nil)

    // Wait for approval decision (48-hour window)
    approvalEvent := ctx.WaitForSingleEvent("approval-decision", 48*time.Hour)

    var decision ApprovalDecision
    if err := approvalEvent.Await(&decision); err != nil {
        // Auto-approve if approver doesn't respond
        decision = ApprovalDecision{Approved: true, Notes: "Auto-approved: no response"}
    }

    if !decision.Approved {
        return ctx.CallActivity(RejectTask, workflow.WithActivityInput(map[string]any{
            "task":   task,
            "reason": decision.Notes,
        })).Await(nil)
    }

    return ctx.CallActivity(CompleteTask, workflow.WithActivityInput(map[string]any{
        "task":     task,
        "approved": true,
    })).Await(nil)
}
```

## Task Completion Endpoint

```go
func handleTaskComplete(w http.ResponseWriter, r *http.Request) {
    var req struct {
        WorkflowInstanceID string         `json:"workflowInstanceId"`
        Completion         TaskCompletion `json:"completion"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    wfClient, _ := workflow.NewClient()
    err := wfClient.RaiseEvent(
        context.Background(),
        req.WorkflowInstanceID,
        "task-completed",
        req.Completion,
    )
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }
    w.WriteHeader(http.StatusAccepted)
}
```

## Approval Decision Endpoint

```go
func handleApprovalDecision(w http.ResponseWriter, r *http.Request) {
    var req struct {
        WorkflowInstanceID string          `json:"workflowInstanceId"`
        Decision           ApprovalDecision `json:"decision"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    wfClient, _ := workflow.NewClient()
    wfClient.RaiseEvent(
        context.Background(),
        req.WorkflowInstanceID,
        "approval-decision",
        req.Decision,
    )
    w.WriteHeader(http.StatusAccepted)
}
```

## Escalation Activity

```go
func EscalateTask(ctx workflow.ActivityContext) (any, error) {
    var task Task
    ctx.GetInput(&task)

    // Notify manager
    daprClient, _ := dapr.NewClient()
    daprClient.PublishEvent(
        context.Background(),
        "pubsub",
        "task-escalations",
        map[string]any{
            "taskId":     task.ID,
            "assigneeId": task.AssigneeID,
            "deadline":   task.Deadline,
        },
    )

    return map[string]string{"status": "escalated"}, nil
}
```

## Summary

Dapr Workflow provides a durable execution engine for task management workflows that span days or weeks. External events handle human interactions (task completion, approval decisions), timers enforce deadlines and trigger escalations, and activities integrate with notification services. The workflow engine persists state across restarts, ensuring no task is lost even during deployments or failures.
