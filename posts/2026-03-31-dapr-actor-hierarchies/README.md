# How to Implement Actor Hierarchies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Hierarchy, Composition, Microservice

Description: Design parent-child actor hierarchies in Dapr where parent actors coordinate child actors, enabling complex stateful workflows with clean separation of concerns.

---

Dapr actors can call other actors, enabling hierarchical designs where parent actors orchestrate child actors. This pattern is useful for modeling real-world domain hierarchies like Organizations - Teams - Users or Orders - LineItems - Products.

## Design Principles for Actor Hierarchies

- Each actor manages its own state and children are referenced by ID
- Parent actors invoke child actors via Dapr's actor invocation API
- Avoid deep hierarchies (more than 3-4 levels) to limit call chain latency
- Enable reentrancy if parent-child calls can cycle back

## Organization Hierarchy Example

```text
OrgActor (org-001)
  |- DepartmentActor (dept-eng)
  |    |- TeamActor (team-backend)
  |- DepartmentActor (dept-sales)
       |- TeamActor (team-west)
```

## Parent Actor (OrgActor)

```go
package main

import (
  "context"
  "encoding/json"
  "fmt"

  dapr "github.com/dapr/go-sdk/client"
  "github.com/dapr/go-sdk/actor"
)

type OrgState struct {
  OrgID       string   `json:"orgId"`
  Name        string   `json:"name"`
  Departments []string `json:"departments"`
}

type OrgActor struct {
  actor.ServerImplBaseCtx
  daprClient dapr.Client
}

func (a *OrgActor) Type() string { return "Org" }

func (a *OrgActor) AddDepartment(ctx context.Context, req *AddDeptRequest) error {
  var state OrgState
  a.GetStateManager().Get(ctx, "org", &state)

  deptID := fmt.Sprintf("%s-dept-%s", a.ID(), req.Name)
  state.Departments = append(state.Departments, deptID)
  a.GetStateManager().Set(ctx, "org", state)

  // Initialize the child department actor
  _, err := a.daprClient.InvokeActor(ctx, &dapr.InvokeActorRequest{
    ActorType: "Department",
    ActorID:   deptID,
    Method:    "Initialize",
    Data:      mustMarshal(map[string]string{"orgId": a.ID(), "name": req.Name}),
  })
  return err
}

func (a *OrgActor) GetHeadcount(ctx context.Context) (int, error) {
  var state OrgState
  a.GetStateManager().Get(ctx, "org", &state)

  total := 0
  for _, deptID := range state.Departments {
    resp, err := a.daprClient.InvokeActor(ctx, &dapr.InvokeActorRequest{
      ActorType: "Department",
      ActorID:   deptID,
      Method:    "GetHeadcount",
    })
    if err == nil {
      var count int
      json.Unmarshal(resp.Data, &count)
      total += count
    }
  }
  return total, nil
}
```

## Child Actor (DepartmentActor)

```go
type DeptState struct {
  DeptID  string   `json:"deptId"`
  OrgID   string   `json:"orgId"`
  Name    string   `json:"name"`
  Members []string `json:"members"`
}

type DepartmentActor struct {
  actor.ServerImplBaseCtx
}

func (a *DepartmentActor) Type() string { return "Department" }

func (a *DepartmentActor) Initialize(ctx context.Context, req map[string]string) error {
  state := DeptState{
    DeptID: a.ID(),
    OrgID:  req["orgId"],
    Name:   req["name"],
  }
  return a.GetStateManager().Set(ctx, "dept", state)
}

func (a *DepartmentActor) AddMember(ctx context.Context, userID string) error {
  var state DeptState
  a.GetStateManager().Get(ctx, "dept", &state)
  state.Members = append(state.Members, userID)
  return a.GetStateManager().Set(ctx, "dept", state)
}

func (a *DepartmentActor) GetHeadcount(ctx context.Context) (int, error) {
  var state DeptState
  a.GetStateManager().Get(ctx, "dept", &state)
  return len(state.Members), nil
}
```

## Enabling Reentrancy for Bidirectional Calls

If child actors need to call back to parent actors, enable reentrancy:

```json
{
  "entities": ["Org", "Department"],
  "reentrancy": {
    "enabled": true,
    "maxStackDepth": 8
  }
}
```

## Invoking the Hierarchy

```bash
# Create a department under org-001
curl -X POST http://localhost:3500/v1.0/actors/Org/org-001/method/AddDepartment \
  -d '{"name": "Engineering"}'

# Get total headcount (parent aggregates children)
curl -X POST http://localhost:3500/v1.0/actors/Org/org-001/method/GetHeadcount
```

## Summary

Actor hierarchies in Dapr enable natural modeling of domain relationships where parent actors coordinate and aggregate information from child actors. Parent-to-child invocation uses the standard actor method invocation API, keeping code portable and testable. Keep hierarchies shallow, enable reentrancy only when needed, and design child actors to be independently testable with their own state.
