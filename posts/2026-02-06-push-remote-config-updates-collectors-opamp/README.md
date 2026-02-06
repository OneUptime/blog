# How to Push Remote Configuration Updates to Hundreds of Collectors Using OpAMP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Remote Configuration, Fleet Management

Description: Learn how to push configuration updates to hundreds of OpenTelemetry Collectors simultaneously using OpAMP remote configuration capabilities.

Updating the configuration of a single OpenTelemetry Collector is trivial. You edit a YAML file and restart the process. But when you have hundreds of collectors running across your infrastructure, that approach does not scale. You need a way to push configuration changes from a central point and have them applied everywhere. OpAMP's remote configuration feature was designed for exactly this.

## How Remote Configuration Works in OpAMP

When an OpAMP-managed collector connects to the server, it reports its current effective configuration. The server can then send a new configuration at any time through the persistent connection. The flow looks like this:

1. The server sends a `ServerToAgent` message containing the new config
2. The supervisor receives the config and writes it to disk
3. The supervisor restarts the collector with the new config
4. The collector starts up and reports its effective config back
5. The server verifies the new config is in effect

If the new configuration causes the collector to fail (for example, a syntax error or an invalid exporter endpoint), the supervisor detects the crash and reports the failure back to the server.

## Server-Side Configuration Management

On the server side, you need to track which configuration each agent should be running. Here is a simplified example of how to push configuration from a Go-based OpAMP server:

```go
package main

import (
    "github.com/open-telemetry/opamp-go/protobufs"
    "github.com/open-telemetry/opamp-go/server/types"
)

// pushConfigToAgent sends a new collector configuration to a specific agent
func pushConfigToAgent(conn types.Connection, configYAML string) error {
    // Build the remote config message
    remoteConfig := &protobufs.AgentRemoteConfig{
        Config: &protobufs.AgentConfigMap{
            ConfigMap: map[string]*protobufs.AgentConfigFile{
                // The empty string key represents the main config file
                "": {
                    Body:        []byte(configYAML),
                    ContentType: "text/yaml",
                },
            },
        },
        // Hash is used by the agent to detect config changes
        ConfigHash: computeHash(configYAML),
    }

    // Send the config to the agent
    msg := &protobufs.ServerToAgent{
        RemoteConfig: remoteConfig,
    }

    return conn.Send(context.Background(), msg)
}
```

## Pushing to the Entire Fleet

To update all collectors at once, iterate over your connected agents and push the new configuration:

```go
// agentStore holds references to all connected agents
type agentStore struct {
    mu     sync.RWMutex
    agents map[string]types.Connection // keyed by instance UID
}

// pushConfigToFleet sends config to every connected agent
func (s *agentStore) pushConfigToFleet(configYAML string) map[string]error {
    s.mu.RLock()
    defer s.mu.RUnlock()

    errors := make(map[string]error)

    for uid, conn := range s.agents {
        if err := pushConfigToAgent(conn, configYAML); err != nil {
            errors[uid] = err
            log.Printf("Failed to push config to agent %s: %v", uid, err)
        }
    }

    return errors
}
```

## Group-Based Configuration

In practice, not every collector runs the same configuration. You might have different configs for collectors receiving application traces versus those collecting infrastructure metrics. Organize your fleet into groups:

```go
// AgentGroup represents a set of agents sharing the same config
type AgentGroup struct {
    Name    string
    Config  string
    Members map[string]types.Connection
}

// pushConfigToGroup updates only agents in a specific group
func pushConfigToGroup(group *AgentGroup, newConfig string) {
    group.Config = newConfig

    for uid, conn := range group.Members {
        err := pushConfigToAgent(conn, newConfig)
        if err != nil {
            log.Printf("Failed to push to %s in group %s: %v",
                uid, group.Name, err)
        }
    }
}
```

## Example: Adding a New Exporter Across the Fleet

Suppose you want all your collectors to start sending traces to a new backend. Here is the configuration you would push:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 512

exporters:
  otlp/primary:
    endpoint: traces-primary.internal:4317
    tls:
      insecure: false
  # New exporter added to all collectors
  otlp/secondary:
    endpoint: traces-secondary.internal:4317
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary, otlp/secondary]
```

Push this configuration through your OpAMP server, and every collector in the fleet picks it up within seconds.

## Verifying Configuration Propagation

After pushing a config update, verify that all agents applied it successfully. Each agent reports its effective configuration and a status:

```go
// In your OnMessage callback
OnMessageFunc: func(conn types.Connection, msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
    if msg.EffectiveConfig != nil {
        // Compare the reported config hash with what we sent
        reportedHash := msg.EffectiveConfig.ConfigMap.ConfigMap[""].Hash
        if bytes.Equal(reportedHash, expectedHash) {
            log.Printf("Agent %s successfully applied new config", msg.InstanceUid)
        }
    }

    // Check for config application errors
    if msg.RemoteConfigStatus != nil {
        status := msg.RemoteConfigStatus.Status
        if status == protobufs.RemoteConfigStatuses_RemoteConfigStatuses_FAILED {
            log.Printf("Agent %s failed to apply config: %s",
                msg.InstanceUid,
                msg.RemoteConfigStatus.ErrorMessage)
        }
    }

    return &protobufs.ServerToAgent{}
},
```

## Practical Tips

Keep a version history of your configurations. When something goes wrong, you want to know what changed and when. Store each configuration version with a timestamp and the user who made the change.

Always test configuration changes on a small subset of collectors before rolling them out fleet-wide. OpAMP makes this easy because you can target individual agents or groups.

Set up alerts on the `RemoteConfigStatuses_FAILED` status. If a config push fails on multiple agents, you want to know immediately rather than discovering missing telemetry hours later.
