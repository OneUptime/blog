# How to Implement Canary Configuration Rollouts Across Collector Fleets with OpAMP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Canary Deployment, Configuration Management

Description: Implement canary-style configuration rollouts for your OpenTelemetry Collector fleet using OpAMP to catch problems before they hit production.

Pushing a configuration change to your entire collector fleet at once is risky. A bad config can take down all your collectors simultaneously, creating a complete observability blackout. Canary rollouts let you test changes on a small subset first, verify they work, and then gradually roll them out to the rest of the fleet.

## The Canary Rollout Strategy

The idea is borrowed from canary deployments in application delivery. Instead of updating all collectors at once, you split the rollout into phases:

1. Push the new config to 1-2 collectors (the canaries)
2. Monitor the canary collectors for a defined period
3. If healthy, expand to 10% of the fleet
4. Monitor again
5. If still healthy, roll out to the remaining 90%
6. If any phase fails, automatically roll back

## Defining Fleet Groups

First, organize your agents into groups. Tag agents when they connect based on metadata like environment, region, or role:

```go
type AgentGroup struct {
    Name    string
    Agents  map[string]*Agent
    Config  *ConfigVersion
}

type FleetManager struct {
    mu     sync.RWMutex
    groups map[string]*AgentGroup
}

// AssignAgentToGroup places an agent into a group based on its labels
func (fm *FleetManager) AssignAgentToGroup(agent *Agent) {
    fm.mu.Lock()
    defer fm.mu.Unlock()

    // Determine group from agent description labels
    groupName := "default"
    if desc := agent.AgentDescription; desc != nil {
        for _, attr := range desc.IdentifyingAttributes {
            if attr.Key == "service.environment" {
                groupName = attr.Value.GetStringValue()
            }
        }
    }

    group, exists := fm.groups[groupName]
    if !exists {
        group = &AgentGroup{
            Name:   groupName,
            Agents: make(map[string]*Agent),
        }
        fm.groups[groupName] = group
    }

    group.Agents[agent.ID] = agent
}
```

## Implementing the Canary Rollout Engine

The rollout engine manages the phased deployment:

```go
type RolloutPhase struct {
    Name       string
    Percentage float64
    Duration   time.Duration
}

type RolloutPlan struct {
    Phases []RolloutPhase
    Config string
    Group  string
}

// DefaultRolloutPlan defines a standard canary rollout
func DefaultRolloutPlan(config string, group string) *RolloutPlan {
    return &RolloutPlan{
        Config: config,
        Group:  group,
        Phases: []RolloutPhase{
            {Name: "canary", Percentage: 0.02, Duration: 5 * time.Minute},
            {Name: "early-adopters", Percentage: 0.10, Duration: 5 * time.Minute},
            {Name: "majority", Percentage: 0.50, Duration: 3 * time.Minute},
            {Name: "full", Percentage: 1.0, Duration: 0},
        },
    }
}
```

## Executing the Rollout

```go
func (fm *FleetManager) ExecuteRollout(plan *RolloutPlan) error {
    group := fm.groups[plan.Group]
    agents := fm.getAgentList(group)
    previousConfig := group.Config

    for _, phase := range plan.Phases {
        targetCount := int(float64(len(agents)) * phase.Percentage)
        if targetCount < 1 {
            targetCount = 1
        }

        log.Printf("Rollout phase '%s': updating %d/%d agents",
            phase.Name, targetCount, len(agents))

        // Push config to the target agents for this phase
        phaseAgents := agents[:targetCount]
        for _, agent := range phaseAgents {
            err := pushConfigToAgent(agent.Connection, plan.Config)
            if err != nil {
                log.Printf("Failed to push to agent %s: %v", agent.ID, err)
            }
        }

        // Wait for the observation period
        if phase.Duration > 0 {
            log.Printf("Waiting %s for observation...", phase.Duration)
            time.Sleep(phase.Duration)

            // Check health of updated agents
            unhealthy := 0
            for _, agent := range phaseAgents {
                // Refresh agent health from store
                current := fm.agentStore.Get(agent.ID)
                if current == nil || !current.Health.Healthy {
                    unhealthy++
                }
            }

            failureRate := float64(unhealthy) / float64(len(phaseAgents))
            if failureRate > 0.1 {
                log.Printf("Phase '%s' failed: %.0f%% unhealthy. Rolling back.",
                    phase.Name, failureRate*100)

                // Roll back all updated agents
                for _, agent := range phaseAgents {
                    pushConfigToAgent(agent.Connection, previousConfig.Config)
                }

                return fmt.Errorf("rollout aborted at phase %s: %.0f%% failure rate",
                    phase.Name, failureRate*100)
            }

            log.Printf("Phase '%s' passed health check", phase.Name)
        }
    }

    log.Printf("Rollout complete: all agents updated")
    return nil
}
```

## Exposing the Rollout API

Create an HTTP endpoint to trigger canary rollouts:

```go
func handleCanaryRollout(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Group  string `json:"group"`
        Config string `json:"config"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    plan := DefaultRolloutPlan(req.Config, req.Group)

    // Run the rollout in a background goroutine
    go func() {
        err := fleetManager.ExecuteRollout(plan)
        if err != nil {
            log.Printf("Rollout failed: %v", err)
            // Send notification to Slack, PagerDuty, etc.
            notifier.Send(fmt.Sprintf("Collector config rollout failed: %v", err))
        }
    }()

    w.WriteHeader(http.StatusAccepted)
    json.NewEncoder(w).Encode(map[string]string{
        "status": "rollout started",
        "group":  req.Group,
    })
}
```

Trigger a canary rollout:

```bash
curl -X POST https://opamp-server.internal/api/rollout \
  -H "Content-Type: application/json" \
  -d '{
    "group": "production",
    "config": "receivers:\n  otlp:\n    protocols:\n      grpc:\n        endpoint: 0.0.0.0:4317\n..."
  }'
```

## Monitoring Rollout Progress

Track the state of each rollout so operators can see what is happening:

```go
type RolloutStatus struct {
    ID           string     `json:"id"`
    Group        string     `json:"group"`
    CurrentPhase string     `json:"current_phase"`
    StartedAt    time.Time  `json:"started_at"`
    UpdatedAgents int       `json:"updated_agents"`
    TotalAgents   int       `json:"total_agents"`
    Status       string     `json:"status"` // "in_progress", "completed", "rolled_back"
}
```

The canary approach protects your observability pipeline from configuration mistakes. By testing changes on a few collectors first and automatically rolling back on failure, you can make frequent configuration changes with confidence. The alternative - pushing to everyone and hoping for the best - is a recipe for outages.
