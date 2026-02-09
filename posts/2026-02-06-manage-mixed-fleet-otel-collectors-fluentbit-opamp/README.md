# How to Manage a Mixed Fleet of OpenTelemetry Collectors and Fluent Bit Agents with OpAMP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Fluent Bit, Mixed Fleet

Description: Manage a heterogeneous fleet of OpenTelemetry Collectors and Fluent Bit agents from a single OpAMP server with unified configuration management.

Most real-world environments do not run a single type of telemetry agent. You might have OpenTelemetry Collectors handling traces and metrics while Fluent Bit handles log collection. OpAMP is designed to be agent-agnostic, meaning you can manage different types of agents from the same server. Here is how to set it up.

## Why a Mixed Fleet

There are good reasons to run both OpenTelemetry Collectors and Fluent Bit:

- Fluent Bit is extremely lightweight for log collection (a few MB of memory)
- OpenTelemetry Collectors excel at trace and metric processing
- Some teams already have Fluent Bit deployed and cannot migrate overnight
- Fluent Bit has mature log parsers for specific formats

With OpAMP, you do not have to choose between unified management and the best tool for each job.

## OpAMP Agent Identification

OpAMP agents identify themselves through the `AgentDescription` message. This includes identifying attributes that tell the server what type of agent is connecting:

```go
// On the server side, determine the agent type from its description
func getAgentType(desc *protobufs.AgentDescription) string {
    if desc == nil {
        return "unknown"
    }

    for _, attr := range desc.IdentifyingAttributes {
        if attr.Key == "service.name" {
            return attr.Value.GetStringValue()
        }
    }

    return "unknown"
}

// Route configuration based on agent type
func getConfigForAgent(agentType string, group string) string {
    switch agentType {
    case "otelcol-contrib":
        return configStore.GetOtelConfig(group)
    case "fluent-bit":
        return configStore.GetFluentBitConfig(group)
    default:
        log.Printf("Unknown agent type: %s", agentType)
        return ""
    }
}
```

## Setting Up the Fluent Bit OpAMP Supervisor

Fluent Bit does not natively speak OpAMP, so you need a supervisor wrapper, similar to what OpenTelemetry uses. You can use a generic OpAMP supervisor or build a thin wrapper:

```yaml
# fluent-bit-supervisor.yaml
server:
  endpoint: wss://opamp-server.internal:4320/v1/opamp

agent:
  # Path to fluent-bit binary
  executable: /usr/local/bin/fluent-bit
  # Arguments to pass (config file location)
  args:
    - "--config"
    - "/var/lib/opamp-supervisor/effective-config.conf"
  storage_dir: /var/lib/opamp-supervisor

  description:
    identifying_attributes:
      service.name: "fluent-bit"
      service.version: "3.0.0"
    non_identifying_attributes:
      os.type: "linux"
      host.name: "${HOSTNAME}"

capabilities:
  reports_effective_config: true
  reports_health: true
  accepts_remote_config: true
```

## Handling Different Configuration Formats

OpenTelemetry Collectors use YAML, while Fluent Bit uses its own configuration format (or YAML in newer versions). Your server needs to handle both:

```go
type MixedFleetManager struct {
    agentStore *AgentStore
    // Separate config stores per agent type
    otelConfigs     map[string]string // group -> YAML config
    fluentBitConfigs map[string]string // group -> Fluent Bit config
}

func (m *MixedFleetManager) onMessage(
    conn types.Connection,
    msg *protobufs.AgentToServer,
) *protobufs.ServerToAgent {

    agentID := hex.EncodeToString(msg.InstanceUid)
    agentType := getAgentType(msg.AgentDescription)

    // Store agent with its type
    agent := &Agent{
        ID:         agentID,
        Type:       agentType,
        Connection: conn,
        Health:     msg.Health,
    }
    m.agentStore.AddOrUpdate(agent)

    // Send the appropriate config based on agent type
    group := m.getAgentGroup(msg.AgentDescription)
    config := m.getConfigForType(agentType, group)

    if config != "" {
        contentType := "text/yaml"
        if agentType == "fluent-bit" {
            contentType = "text/plain"
        }

        return &protobufs.ServerToAgent{
            RemoteConfig: &protobufs.AgentRemoteConfig{
                Config: &protobufs.AgentConfigMap{
                    ConfigMap: map[string]*protobufs.AgentConfigFile{
                        "": {
                            Body:        []byte(config),
                            ContentType: contentType,
                        },
                    },
                },
            },
        }
    }

    return &protobufs.ServerToAgent{}
}
```

## Example Configurations

Here is what a paired configuration might look like for a host running both agents:

OpenTelemetry Collector config (traces and metrics):

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  prometheus:
    config:
      scrape_configs:
        - job_name: 'node-metrics'
          static_configs:
            - targets: ['localhost:9100']

processors:
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: backend.internal:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp, prometheus]
      processors: [batch]
      exporters: [otlp]
```

Fluent Bit config (logs):

```ini
# fluent-bit.conf
[SERVICE]
    Flush        5
    Log_Level    info
    Parsers_File parsers.conf

[INPUT]
    Name         tail
    Path         /var/log/app/*.log
    Tag          app.logs
    Parser       json
    Refresh_Interval 10

[INPUT]
    Name         systemd
    Tag          systemd.*
    Read_From_Tail On

[FILTER]
    Name         modify
    Match        *
    Add          hostname ${HOSTNAME}
    Add          environment production

[OUTPUT]
    Name         opentelemetry
    Match        *
    Host         localhost
    Port         4318
    Traces_uri   /v1/traces
    Logs_uri     /v1/logs
```

Notice how the Fluent Bit config forwards logs to the local OpenTelemetry Collector via OTLP. This is a common pattern: use Fluent Bit for log collection and the OTel Collector for processing and export.

## Fleet Dashboard for Mixed Agents

Expose fleet status with agent type information:

```go
func handleFleetStatus(w http.ResponseWriter, r *http.Request) {
    agents := agentStore.GetAll()

    typeCounts := make(map[string]int)
    typeHealthy := make(map[string]int)

    for _, agent := range agents {
        typeCounts[agent.Type]++
        if agent.Health != nil && agent.Health.Healthy {
            typeHealthy[agent.Type]++
        }
    }

    response := map[string]interface{}{
        "total_agents": len(agents),
        "by_type":      typeCounts,
        "healthy_by_type": typeHealthy,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

Sample response:

```json
{
  "total_agents": 150,
  "by_type": {
    "otelcol-contrib": 50,
    "fluent-bit": 100
  },
  "healthy_by_type": {
    "otelcol-contrib": 49,
    "fluent-bit": 98
  }
}
```

Managing a mixed fleet through OpAMP means you get a single pane of glass for your entire telemetry agent infrastructure, regardless of which agent software each host runs. The key is handling the different configuration formats on the server side and using agent type metadata to route the right configuration to the right agent.
