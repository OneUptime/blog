# How to Roll Back a Bad Collector Configuration Remotely Using OpAMP Without SSH Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Configuration Rollback, Incident Response

Description: Roll back a broken OpenTelemetry Collector configuration remotely through OpAMP when you cannot SSH into the machines running your collectors.

You pushed a configuration update to your collector fleet, and now things are broken. Maybe a typo in an exporter endpoint is causing connection errors. Maybe you accidentally removed a critical receiver. The collectors are crashing, telemetry data is being lost, and you do not have SSH access to the machines. This is the exact scenario where OpAMP's remote configuration rollback shines.

## The Problem with Manual Rollbacks

In traditional setups, fixing a bad collector config means:

1. SSH into each affected machine
2. Find the backup config file
3. Replace the current config with the backup
4. Restart the collector service
5. Repeat for every machine in the fleet

With OpAMP, you skip all of that. You push the previous known-good configuration from your server, and every connected agent picks it up automatically.

## Maintaining a Configuration History

The foundation of any rollback strategy is keeping a history of configurations. Before you can roll back, you need to know what to roll back to:

```go
// ConfigVersion represents a single configuration snapshot
type ConfigVersion struct {
    Version   int       `json:"version"`
    Config    string    `json:"config"`
    Hash      []byte    `json:"hash"`
    CreatedAt time.Time `json:"created_at"`
    CreatedBy string    `json:"created_by"`
    Group     string    `json:"group"`
}

// ConfigStore manages configuration history
type ConfigStore struct {
    mu       sync.RWMutex
    versions map[string][]ConfigVersion // keyed by group name
}

// SaveConfig stores a new configuration version
func (s *ConfigStore) SaveConfig(group, config, author string) ConfigVersion {
    s.mu.Lock()
    defer s.mu.Unlock()

    history := s.versions[group]
    nextVersion := 1
    if len(history) > 0 {
        nextVersion = history[len(history)-1].Version + 1
    }

    cv := ConfigVersion{
        Version:   nextVersion,
        Config:    config,
        Hash:      sha256Sum(config),
        CreatedAt: time.Now(),
        CreatedBy: author,
        Group:     group,
    }

    s.versions[group] = append(history, cv)
    return cv
}

// GetPreviousConfig returns the config before the current one
func (s *ConfigStore) GetPreviousConfig(group string) (ConfigVersion, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    history := s.versions[group]
    if len(history) < 2 {
        return ConfigVersion{}, false
    }

    return history[len(history)-2], true
}
```

## Implementing the Rollback Endpoint

Expose a rollback API on your OpAMP server so operators can trigger a rollback without writing code:

```go
func handleRollback(w http.ResponseWriter, r *http.Request) {
    group := r.URL.Query().Get("group")
    if group == "" {
        group = "default"
    }

    // Get the previous config
    prevConfig, found := configStore.GetPreviousConfig(group)
    if !found {
        http.Error(w, "No previous configuration found", http.StatusNotFound)
        return
    }

    // Push the previous config to all agents in this group
    agents := agentStore.GetByGroup(group)
    results := make(map[string]string)

    for _, agent := range agents {
        err := pushConfigToAgent(agent.Connection, prevConfig.Config)
        if err != nil {
            results[agent.ID] = fmt.Sprintf("failed: %v", err)
        } else {
            results[agent.ID] = "rollback pushed"
        }
    }

    // Record the rollback as a new config version for audit trail
    configStore.SaveConfig(group, prevConfig.Config, "rollback-system")

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "rolled_back_to": prevConfig.Version,
        "timestamp":      prevConfig.CreatedAt,
        "agents":         results,
    })
}
```

Trigger a rollback with a simple curl command:

```bash
# Roll back the default group to the previous configuration
curl -X POST "https://opamp-server.internal/api/rollback?group=default"
```

## Automatic Rollback on Failure Detection

You can go one step further and implement automatic rollback when the server detects that a new configuration is causing widespread failures:

```go
// MonitorConfigRollout watches agent health after a config push
func MonitorConfigRollout(
    store *AgentStore,
    group string,
    configStore *ConfigStore,
    failureThreshold float64,
) {
    // Wait for agents to apply the new config
    time.Sleep(2 * time.Minute)

    agents := store.GetByGroup(group)
    unhealthyCount := 0

    for _, agent := range agents {
        if !agent.Health.Healthy {
            unhealthyCount++
        }
    }

    failureRate := float64(unhealthyCount) / float64(len(agents))

    if failureRate > failureThreshold {
        log.Printf(
            "ALERT: %.0f%% of agents in group %s are unhealthy after config push. Auto-rolling back.",
            failureRate*100, group,
        )

        prevConfig, found := configStore.GetPreviousConfig(group)
        if !found {
            log.Printf("ERROR: Cannot auto-rollback, no previous config found")
            return
        }

        for _, agent := range agents {
            pushConfigToAgent(agent.Connection, prevConfig.Config)
        }

        log.Printf("Auto-rollback complete, pushed config version %d", prevConfig.Version)
    }
}
```

## What Happens During a Rollback

When you push the rollback config, the sequence on each agent is:

1. The supervisor receives the new (old) configuration over the WebSocket connection
2. It writes the configuration to disk, replacing the broken one
3. It sends SIGTERM to the running collector (or the crashed one gets cleaned up)
4. It starts the collector with the restored configuration
5. It waits for the health check to pass
6. It reports "healthy" back to the OpAMP server

The entire process typically takes 10 to 30 seconds per agent, depending on how long the collector takes to start up and pass its health check.

## Rollback to a Specific Version

Sometimes you do not want the immediately previous config, but a specific older version:

```bash
# Roll back to a specific version number
curl -X POST "https://opamp-server.internal/api/rollback?group=default&version=42"
```

```go
func (s *ConfigStore) GetConfigByVersion(group string, version int) (ConfigVersion, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    for _, cv := range s.versions[group] {
        if cv.Version == version {
            return cv, true
        }
    }
    return ConfigVersion{}, false
}
```

The key takeaway is that OpAMP turns configuration rollback from a manual, error-prone, machine-by-machine process into a single API call. Keep your configuration history, monitor the health of your fleet after every change, and you will always be able to recover quickly from a bad push.
