# How to Build a Ticketing System with Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Ticketing, Support, Human-in-the-Loop

Description: Learn how to build a customer support ticketing system using Dapr Workflow for ticket lifecycle management with SLA enforcement and escalation workflows.

---

## Overview

A support ticketing system manages customer issues through defined stages: creation, triage, assignment, resolution, and closure. Dapr Workflow provides durable execution for ticket lifecycles that can span days or weeks, with SLA timers and automatic escalation.

## Ticket Data Model

```go
package main

import "time"

type TicketPriority string
type TicketStatus string

const (
    PriorityLow      TicketPriority = "low"
    PriorityMedium   TicketPriority = "medium"
    PriorityHigh     TicketPriority = "high"
    PriorityCritical TicketPriority = "critical"
)

const (
    StatusNew        TicketStatus = "new"
    StatusTriaged    TicketStatus = "triaged"
    StatusAssigned   TicketStatus = "assigned"
    StatusInProgress TicketStatus = "in_progress"
    StatusPending    TicketStatus = "pending_customer"
    StatusResolved   TicketStatus = "resolved"
    StatusClosed     TicketStatus = "closed"
    StatusEscalated  TicketStatus = "escalated"
)

type Ticket struct {
    ID          string         `json:"id"`
    CustomerID  string         `json:"customerId"`
    Subject     string         `json:"subject"`
    Description string         `json:"description"`
    Priority    TicketPriority `json:"priority"`
    Status      TicketStatus   `json:"status"`
    AssigneeID  string         `json:"assigneeId"`
    TeamID      string         `json:"teamId"`
    CreatedAt   time.Time      `json:"createdAt"`
    SLADeadline time.Time      `json:"slaDeadline"`
}
```

## SLA Configuration

```go
var slaDurations = map[TicketPriority]time.Duration{
    PriorityCritical: 2 * time.Hour,
    PriorityHigh:     8 * time.Hour,
    PriorityMedium:   24 * time.Hour,
    PriorityLow:      72 * time.Hour,
}
```

## Ticket Workflow

```go
func TicketWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var ticket Ticket
    ctx.GetInput(&ticket)

    ticket.CreatedAt = ctx.CurrentUTCDateTime()
    ticket.SLADeadline = ticket.CreatedAt.Add(slaDurations[ticket.Priority])

    // Step 1: Auto-triage (categorize and route)
    var triageResult TriageResult
    ctx.CallActivity(TriageTicket, workflow.ActivityInput(ticket)).Await(&triageResult)
    ticket.TeamID = triageResult.TeamID

    // Notify team
    ctx.CallActivity(NotifyTeam, workflow.ActivityInput(ticket)).Await(nil)

    // Step 2: Wait for assignment (with SLA timer)
    slaDuration := ticket.SLADeadline.Sub(ctx.CurrentUTCDateTime())
    assignEvent := ctx.WaitForExternalEvent("ticket-assigned", slaDuration)

    var assignment AssignmentEvent
    if err := assignEvent.Await(&assignment); err != nil {
        // SLA breach - escalate
        ctx.CallActivity(EscalateTicket, workflow.ActivityInput(map[string]any{
            "ticket": ticket,
            "reason": "SLA breach: not assigned in time",
        })).Await(nil)
        return map[string]string{"status": string(StatusEscalated)}, nil
    }
    ticket.AssigneeID = assignment.AssigneeID

    // Step 3: Wait for resolution
    resolveEvent := ctx.WaitForExternalEvent("ticket-resolved", ticket.SLADeadline.Sub(ctx.CurrentUTCDateTime()))

    var resolution ResolutionEvent
    if err := resolveEvent.Await(&resolution); err != nil {
        ctx.CallActivity(EscalateTicket, workflow.ActivityInput(map[string]any{
            "ticket": ticket,
            "reason": "SLA breach: not resolved in time",
        })).Await(nil)
        return map[string]string{"status": string(StatusEscalated)}, nil
    }

    // Step 4: Send resolution to customer, wait for confirmation (48 hours)
    ctx.CallActivity(NotifyCustomerResolution, workflow.ActivityInput(map[string]any{
        "ticket":     ticket,
        "resolution": resolution.Summary,
    })).Await(nil)

    confirmEvent := ctx.WaitForExternalEvent("customer-confirmed", 48*time.Hour)
    var confirm ConfirmEvent
    if err := confirmEvent.Await(&confirm); err != nil {
        // No response - auto-close
        confirm = ConfirmEvent{Satisfied: true, AutoClosed: true}
    }

    if !confirm.Satisfied {
        // Reopen - restart the workflow with the same ticket
        ctx.ContinueAsNew(ticket, true)
        return nil, nil
    }

    ctx.CallActivity(CloseTicket, workflow.ActivityInput(ticket)).Await(nil)

    return map[string]string{
        "ticketId": ticket.ID,
        "status":   string(StatusClosed),
    }, nil
}
```

## Agent Endpoints (Raise External Events)

```go
func handleAssignTicket(w http.ResponseWriter, r *http.Request) {
    var req struct {
        WorkflowInstanceID string `json:"workflowInstanceId"`
        AssigneeID         string `json:"assigneeId"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    wfClient, _ := workflow.NewClient()
    wfClient.RaiseEvent(r.Context(), req.WorkflowInstanceID, "ticket-assigned",
        workflow.WithEventPayload(AssignmentEvent{AssigneeID: req.AssigneeID}))
    w.WriteHeader(http.StatusAccepted)
}

func handleResolveTicket(w http.ResponseWriter, r *http.Request) {
    var req struct {
        WorkflowInstanceID string `json:"workflowInstanceId"`
        Summary            string `json:"summary"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    wfClient, _ := workflow.NewClient()
    wfClient.RaiseEvent(r.Context(), req.WorkflowInstanceID, "ticket-resolved",
        workflow.WithEventPayload(ResolutionEvent{Summary: req.Summary}))
    w.WriteHeader(http.StatusAccepted)
}
```

## Ticket Dashboard Query

```bash
# Check specific ticket status by instance ID
curl http://localhost:3500/v1.0/workflows/dapr/TICKET-123
```

## Summary

Dapr Workflow manages the complete ticket lifecycle with durable state persistence that survives service restarts. SLA timers automatically trigger escalations when tickets aren't assigned or resolved within priority-based deadlines. External events drive human interactions (assignments, resolutions, customer confirmations), while activities handle notifications and integrations. The workflow's complete history provides an audit trail of every ticket state transition.
