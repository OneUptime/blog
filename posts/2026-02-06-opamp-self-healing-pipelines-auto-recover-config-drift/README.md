# How to Set Up OpAMP-Based Self-Healing Pipelines That Auto-Recover from Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Self-Healing, Configuration Drift

Description: Build self-healing OpenTelemetry pipelines using OpAMP that automatically detect and correct configuration drift across your collector fleet.

Configuration drift is when the actual state of a system diverges from the desired state. In the context of OpenTelemetry Collectors, drift can happen when someone manually edits a config file on a host, when a deployment script partially fails, or when a collector restarts with a stale config after a disk issue. OpAMP provides the building blocks to detect and automatically correct this drift.

## What Configuration Drift Looks Like

Here are common scenarios that cause drift in collector fleets:

- An operator SSH-es into a machine and edits the collector config to debug an issue, then forgets to revert
- A rolling deployment updates 90 out of 100 collectors before failing
- A collector restarts after a host reboot and loads an old config from disk instead of fetching the latest from the server
- A supervisor crash causes the collector to keep running with a previous configuration

In all these cases, some collectors end up running a different configuration than what the server intends.

## How OpAMP Detects Drift

OpAMP agents can report their effective configuration to the server when the `ReportsEffectiveConfig` capability is enabled and the effective configuration changes. The server compares a hash of the reported config map against the expected config hash. If they do not match, drift has occurred:

```go
type DriftDetector struct {
    expectedConfigs map[string][]byte // agentID -> expected config hash
    mu              sync.RWMutex
}

func (d *DriftDetector) CheckDrift(
    agentID string,
    reportedConfig *protobufs.EffectiveConfig,
) bool {
    d.mu.RLock()
    expectedHash, exists := d.expectedConfigs[agentID]
    d.mu.RUnlock()

    if !exists {
        // No expected config registered, cannot check
        return false
    }

    if reportedConfig == nil || reportedConfig.ConfigMap == nil {
        // Agent is not reporting config, possible issue
        return true
    }

    reportedHash, err := hashConfigMap(reportedConfig.ConfigMap)
    if err != nil {
        return true
    }

    // Compare hashes
    drifted := !bytes.Equal(reportedHash, expectedHash)

    if drifted {
        log.Printf("DRIFT DETECTED: Agent %s config hash mismatch. "+
            "Expected: %x, Got: %x", agentID,
            expectedHash[:8], reportedHash[:8])
    }

    return drifted
}

func hashConfigMap(configMap *protobufs.AgentConfigMap) ([]byte, error) {
    if configMap == nil || len(configMap.ConfigMap) == 0 {
        return nil, fmt.Errorf("empty config map")
    }

    h := sha256.New()
    names := make([]string, 0, len(configMap.ConfigMap))
    for name := range configMap.ConfigMap {
        names = append(names, name)
    }
    sort.Strings(names)

    for _, name := range names {
        file := configMap.ConfigMap[name]
        if file == nil {
            continue
        }
        h.Write([]byte(name))
        h.Write([]byte{0})
        h.Write([]byte(file.ContentType))
        h.Write([]byte{0})
        h.Write(file.Body)
        h.Write([]byte{0})
    }

    return h.Sum(nil), nil
}
```

## Automatic Drift Correction

When drift is detected, the server can offer the correct configuration back to the agent if the agent advertised the `AcceptsRemoteConfig` capability:

```go
func (s *OpAMPServer) handleDriftCorrection(
    agentID string,
    conn types.Connection,
    msg *protobufs.AgentToServer,
) {
    if msg.EffectiveConfig == nil || !hasCapability(
        msg.Capabilities,
        protobufs.AgentCapabilities_AgentCapabilities_AcceptsRemoteConfig,
    ) {
        return
    }

    if s.driftDetector.CheckDrift(agentID, msg.EffectiveConfig) {
        log.Printf("Correcting drift on agent %s", agentID)

        // Get the desired configuration for this agent
        group := s.agentStore.GetGroup(agentID)
        desiredConfig := s.configStore.GetCurrentConfig(group)

        // Offer the correct configuration
        err := pushConfigToAgent(conn, desiredConfig)
        if err != nil {
            log.Printf("Failed to correct drift on agent %s: %v", agentID, err)
            // Record the failure for alerting
            s.driftMetrics.RecordCorrectionFailure(agentID)
        } else {
            log.Printf("Drift correction pushed to agent %s", agentID)
            s.driftMetrics.RecordCorrectionSuccess(agentID)
        }
    }
}

func hasCapability(capabilities uint64, capability protobufs.AgentCapabilities) bool {
    return capabilities&uint64(capability) != 0
}
```

## Periodic Drift Scanning

Besides checking on each message, run a periodic scan over the latest reported state to keep drift metrics current and retry correction for agents that are still connected:

```go
func (s *OpAMPServer) startDriftScanner(interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    for range ticker.C {
        agents := s.agentStore.GetAll()
        driftedCount := 0

        for _, agent := range agents {
            if agent.EffectiveConfig == "" {
                continue
            }

            group := s.agentStore.GetGroup(agent.ID)
            desiredConfig := s.configStore.GetCurrentConfig(group)
            desiredHash := sha256Sum([]byte(desiredConfig))
            actualHash := sha256Sum([]byte(agent.EffectiveConfig))

            if !bytes.Equal(desiredHash, actualHash) {
                driftedCount++
                log.Printf("Drift scan: agent %s has drifted config", agent.ID)

                // Auto-correct
                err := pushConfigToAgent(agent.Connection, desiredConfig)
                if err != nil {
                    log.Printf("Drift correction failed for %s: %v",
                        agent.ID, err)
                }
            }
        }

        log.Printf("Drift scan complete: %d/%d agents drifted",
            driftedCount, len(agents))

        // Update Prometheus metrics
        driftGauge.Set(float64(driftedCount))
    }
}
```

## Self-Healing Pipeline Architecture

The complete self-healing system looks like this:

```go
func main() {
    srv := NewOpAMPServer()

    // Start the drift scanner every 5 minutes
    go srv.startDriftScanner(5 * time.Minute)

    // Start the health checker
    go srv.startHealthChecker(30 * time.Second)

    // Start the reconnection monitor
    go srv.startReconnectionHandler()

    srv.Start()
}

// startHealthChecker monitors agent health and takes corrective action
func (s *OpAMPServer) startHealthChecker(interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    for range ticker.C {
        agents := s.agentStore.GetAll()

        for _, agent := range agents {
            if agent.Health != nil && !agent.Health.Healthy {
                // Agent is unhealthy, check how long it has been down
                downtime := time.Since(agent.LastHealthyTime)

                if downtime > 2*time.Minute {
                    log.Printf("Agent %s unhealthy for %s, attempting recovery",
                        agent.ID, downtime)

                    // Try pushing a known-good config
                    s.attemptRecovery(agent)
                }
            }
        }
    }
}

// attemptRecovery tries to bring an unhealthy agent back
func (s *OpAMPServer) attemptRecovery(agent *Agent) {
    group := s.agentStore.GetGroup(agent.ID)

    // First try: push the current desired config
    desiredConfig := s.configStore.GetCurrentConfig(group)
    err := pushConfigToAgent(agent.Connection, desiredConfig)
    if err != nil {
        log.Printf("Recovery attempt 1 failed for %s: %v", agent.ID, err)

        // Second try: push the last known working config
        lastGoodConfig := s.configStore.GetLastWorkingConfig(group)
        if lastGoodConfig != "" {
            err = pushConfigToAgent(agent.Connection, lastGoodConfig)
            if err != nil {
                log.Printf("Recovery attempt 2 failed for %s: %v",
                    agent.ID, err)
            }
        }
    }
}
```

## Tracking the "Last Known Good" Configuration

Keep track of which configuration was last verified as working:

```go
// When an agent reports healthy after a config change, mark that config as "known good"
func (s *OpAMPServer) onAgentHealthy(agentID string) {
    agent := s.agentStore.Get(agentID)
    if agent == nil || agent.EffectiveConfig == "" {
        return
    }

    group := s.agentStore.GetGroup(agentID)
    s.configStore.MarkAsWorking(group, agent.EffectiveConfig)
}
```

## Drift Metrics and Alerting

Export drift metrics so you can track configuration consistency over time:

```go
var (
    driftGauge = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "opamp_config_drifted_agents",
        Help: "Number of agents with drifted configuration",
    })
    driftCorrections = prometheus.NewCounterVec(prometheus.CounterOpts{
        Name: "opamp_drift_corrections_total",
        Help: "Total number of drift corrections attempted",
    }, []string{"result"})
)
```

Set up an alert rule:

```yaml
# prometheus-rules.yaml

groups:
  - name: opamp-drift
    rules:
      - alert: HighConfigDrift
        expr: opamp_config_drifted_agents > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "{{ $value }} agents have drifted configurations"
```

Self-healing pipelines remove an entire class of operational problems. Instead of discovering missing telemetry and then hunting for the cause, the system detects and corrects drift automatically when remote configuration is enabled and accepted by the agent. Your collectors can converge to the desired state, and you get alerted only when automatic correction fails.
