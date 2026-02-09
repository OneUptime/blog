# How to Implement Health Monitoring and Status Reporting for a Distributed Collector Fleet with OpAMP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Health Monitoring, Observability

Description: Implement health monitoring and status reporting across your distributed OpenTelemetry Collector fleet using OpAMP protocol capabilities.

When you run a fleet of OpenTelemetry Collectors, the question is never "will something go wrong?" but "when will something go wrong, and how quickly will I know about it?" OpAMP gives you built-in health monitoring that lets you track the state of every collector in your fleet from a single server.

## OpAMP Health Reporting Basics

Every OpAMP agent reports its health through the `AgentToServer` message. The health information includes:

- Whether the agent is healthy and processing data
- The last error encountered
- The component health breakdown (which receivers, processors, and exporters are healthy)
- The timestamp of the last status change

The supervisor continuously monitors the collector process and the collector's health check endpoint, then relays this information to the OpAMP server.

## Setting Up Health Checks on the Collector

First, make sure your collector configuration includes the health_check extension:

```yaml
# collector-config.yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
    path: /health

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: backend.internal:4317

service:
  extensions: [health_check]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

The supervisor polls this endpoint to determine whether the collector is actually processing data or just running as a zombie process.

## Handling Health Reports on the Server

On your OpAMP server, implement the message handler to process health reports:

```go
OnMessageFunc: func(
    conn types.Connection,
    msg *protobufs.AgentToServer,
) *protobufs.ServerToAgent {

    agentID := hex.EncodeToString(msg.InstanceUid)

    // Process health status
    if msg.Health != nil {
        healthy := msg.Health.Healthy
        lastErr := msg.Health.LastError
        startTime := msg.Health.StartTimeUnixNano

        if !healthy {
            log.Printf("ALERT: Agent %s is unhealthy: %s", agentID, lastErr)
            // Trigger your alerting system here
            alertManager.Fire(Alert{
                AgentID:  agentID,
                Severity: "critical",
                Message:  fmt.Sprintf("Collector unhealthy: %s", lastErr),
            })
        } else {
            log.Printf("Agent %s is healthy, uptime since %d",
                agentID, startTime)
        }

        // Store the health status for dashboard display
        agentStore.UpdateHealth(agentID, msg.Health)
    }

    return &protobufs.ServerToAgent{}
},
```

## Building a Fleet Health Dashboard

With health data flowing into your server, build a simple HTTP endpoint that exposes fleet health as JSON:

```go
func handleFleetHealth(w http.ResponseWriter, r *http.Request) {
    agents := agentStore.GetAll()

    type AgentStatus struct {
        ID        string    `json:"id"`
        Healthy   bool      `json:"healthy"`
        LastError string    `json:"last_error,omitempty"`
        LastSeen  time.Time `json:"last_seen"`
        Uptime    string    `json:"uptime"`
    }

    var fleet []AgentStatus
    unhealthyCount := 0

    for _, agent := range agents {
        status := AgentStatus{
            ID:       agent.ID,
            Healthy:  agent.Health.Healthy,
            LastSeen: agent.LastMessageTime,
        }

        if !agent.Health.Healthy {
            status.LastError = agent.Health.LastError
            unhealthyCount++
        }

        if agent.Health.StartTimeUnixNano > 0 {
            start := time.Unix(0, int64(agent.Health.StartTimeUnixNano))
            status.Uptime = time.Since(start).Round(time.Second).String()
        }

        fleet = append(fleet, status)
    }

    response := map[string]interface{}{
        "total_agents":    len(fleet),
        "healthy_agents":  len(fleet) - unhealthyCount,
        "unhealthy_agents": unhealthyCount,
        "agents":          fleet,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

## Detecting Disconnected Agents

An agent that stops sending messages entirely is a different problem from an agent reporting unhealthy. You need to track the last message time and flag agents that go silent:

```go
// Run this check periodically in a background goroutine
func checkForDisconnectedAgents(store *AgentStore, timeout time.Duration) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        agents := store.GetAll()
        now := time.Now()

        for _, agent := range agents {
            silentDuration := now.Sub(agent.LastMessageTime)
            if silentDuration > timeout {
                log.Printf("Agent %s has not reported in %s",
                    agent.ID, silentDuration)

                alertManager.Fire(Alert{
                    AgentID:  agent.ID,
                    Severity: "warning",
                    Message: fmt.Sprintf(
                        "Agent silent for %s", silentDuration),
                })
            }
        }
    }
}
```

## Component-Level Health

Beyond the overall healthy/unhealthy binary, OpAMP lets agents report health at the component level. This is useful for identifying partial failures, like a collector that is receiving data fine but failing to export it:

```go
if msg.Health != nil && msg.Health.ComponentHealth != nil {
    for name, component := range msg.Health.ComponentHealth {
        if !component.Healthy {
            log.Printf("Agent %s component %s unhealthy: %s",
                agentID, name, component.LastError)
        }
    }
}
```

This level of granularity helps you distinguish between a failed exporter (where data is being lost) and a failed receiver (where the collector is simply not ingesting from one source).

## Practical Monitoring Setup

Wire the health data into your existing monitoring stack. Export fleet health metrics as Prometheus metrics from your OpAMP server:

```go
var (
    agentHealthGauge = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "opamp_agent_healthy",
            Help: "Whether the agent is healthy (1) or not (0)",
        },
        []string{"agent_id", "hostname"},
    )

    fleetSizeGauge = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "opamp_fleet_size",
            Help: "Total number of connected agents",
        },
    )
)
```

This way, you get alerting on fleet health through the same system you already use for everything else. No need to build a separate alerting pipeline just for collector management.
