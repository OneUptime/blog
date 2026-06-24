# How to Monitor Collector Agent Telemetry via OpAMP Status Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Agent Telemetry, Resource Monitoring

Description: Monitor your OpenTelemetry Collector fleet resource usage including CPU, memory, and data throughput using OpAMP agent self-telemetry reports.

Your OpenTelemetry Collectors are the backbone of your observability pipeline. If a collector starts consuming too much memory, its throughput drops, or its CPU usage spikes, you need to know about it before it starts dropping telemetry data. OpAMP includes a mechanism for the server to tell agents where to send their own telemetry.

## Agent Self-Telemetry in OpAMP

OpAMP agents advertise the `ReportsOwnMetrics` capability through the `AgentToServer` message. The server can then respond with `ConnectionSettingsOffers.own_metrics`, which tells the supervisor where to send OTLP-formatted metrics about the collector process. This gives you visibility into:

- CPU usage of each collector
- Memory (RSS) consumption
- Data points received and exported per second
- Queue sizes in exporters
- Export error rates

## Configuring the Collector to Expose Internal Metrics

First, configure the collector to expose its internal telemetry metrics via Prometheus:

```yaml
# collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  otlp/backend:
    endpoint: backend.internal:4317
    tls:
      insecure: false

service:
  telemetry:
    metrics:
      level: detailed
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend]
  extensions: [health_check]

extensions:
  health_check:
    endpoint: 0.0.0.0:13133
```

The collector now exposes its internal metrics on port 8888 for systems that scrape Prometheus metrics. When the OpAMP supervisor receives an own-metrics destination from the server, it injects an OTLP exporter for collector internal metrics instead of forwarding metrics inside the OpAMP status message.

## Supervisor Configuration for Own Metrics Reporting

Enable the `reports_own_metrics` capability in the supervisor and include `$OWN_TELEMETRY_CONFIG` in the collector config files:

```yaml
# supervisor.yaml
server:
  endpoint: wss://opamp-server.internal:4320/v1/opamp

agent:
  executable: /usr/local/bin/otelcol-contrib
  config_files:
    - $OPAMP_EXTENSION_CONFIG
    - $OWN_TELEMETRY_CONFIG
    - $REMOTE_CONFIG

storage:
  directory: /var/lib/opamp-supervisor

capabilities:
  reports_effective_config: true
  reports_health: true
  accepts_remote_config: true
  reports_own_metrics: true

telemetry:
  metrics:
    level: normal
```

## Processing Agent Metrics on the Server

On the OpAMP server side, offer an OTLP/HTTP metrics endpoint to agents that report the own-metrics capability:

```go
func handleAgentMessage(
    conn types.Connection,
    msg *protobufs.AgentToServer,
) *protobufs.ServerToAgent {

    agentID := hex.EncodeToString(msg.InstanceUid)

    response := &protobufs.ServerToAgent{}

    if msg.Capabilities&uint64(protobufs.AgentCapabilities_AgentCapabilities_ReportsOwnMetrics) != 0 {
        response.ConnectionSettings = &protobufs.ConnectionSettingsOffers{
            Hash: settingsHash(agentID),
            OwnMetrics: &protobufs.TelemetryConnectionSettings{
                DestinationEndpoint: "https://telemetry.example.com:4318/v1/metrics",
                Headers: &protobufs.Headers{
                    Headers: []*protobufs.Header{
                        {Key: "Authorization", Value: "Bearer " + tokenFor(agentID)},
                    },
                },
            },
        }
    }

    return response
}
```

Then parse the OTLP metrics that arrive at that endpoint:

```go
func processAgentMetrics(agentID string, metricsData *metricspb.MetricsData) {
    // Parse OTLP metrics from the agent's own telemetry export.
    for _, rm := range metricsData.ResourceMetrics {
        for _, sm := range rm.ScopeMetrics {
            for _, metric := range sm.Metrics {
                switch metric.Name {
                case "otelcol_process_cpu_seconds":
                    cpuSeconds := getSumValue(metric)
                    log.Printf("Agent %s CPU: %.2f seconds", agentID, cpuSeconds)
                    metricsStore.RecordCPU(agentID, cpuSeconds)

                case "otelcol_process_memory_rss":
                    memBytes := getGaugeValue(metric)
                    memMB := memBytes / 1024 / 1024
                    log.Printf("Agent %s Memory: %.0f MB", agentID, memMB)
                    metricsStore.RecordMemory(agentID, memBytes)

                case "otelcol_receiver_accepted_spans":
                    spans := getSumValue(metric)
                    log.Printf("Agent %s accepted spans: %.0f", agentID, spans)
                    metricsStore.RecordSpans(agentID, spans)

                case "otelcol_exporter_sent_spans":
                    sent := getSumValue(metric)
                    log.Printf("Agent %s exported spans: %.0f", agentID, sent)
                    metricsStore.RecordExportedSpans(agentID, sent)
                }
            }
        }
    }
}
```

## Key Metrics to Track

These are the most important collector metrics to monitor through OpAMP-managed own telemetry:

```go
// Define thresholds for alerting
var metricThresholds = map[string]float64{
    // Memory threshold in bytes (2 GB)
    "otelcol_process_memory_rss": 2 * 1024 * 1024 * 1024,

    // CPU rate over one minute (if above 80% of one core)
    "rate(otelcol_process_cpu_seconds[1m])": 0.8,

    // Refused spans should be zero in healthy state
    "otelcol_receiver_refused_spans": 0,

    // Export failures should be near zero
    "otelcol_exporter_send_failed_spans": 0,

    // Queue usage ratio: otelcol_exporter_queue_size / otelcol_exporter_queue_capacity
    "otelcol_exporter_queue_usage_ratio": 0.8,
}

func checkThresholds(agentID string, metricName string, value float64) {
    threshold, exists := metricThresholds[metricName]
    if !exists {
        return
    }

    if value > threshold {
        log.Printf("THRESHOLD BREACH: Agent %s metric %s = %.2f (threshold: %.2f)",
            agentID, metricName, value, threshold)

        alertManager.Fire(Alert{
            AgentID:  agentID,
            Metric:   metricName,
            Value:    value,
            Threshold: threshold,
            Severity: "warning",
        })
    }
}
```

## Building a Fleet Resource Dashboard

Aggregate metrics across the fleet to spot patterns:

```go
func handleFleetMetrics(w http.ResponseWriter, r *http.Request) {
    agents := metricsStore.GetAllLatest()

    if len(agents) == 0 {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
            "fleet_summary": map[string]interface{}{
                "total_agents": 0,
            },
            "agents": []map[string]interface{}{},
        })
        return
    }

    var totalMemoryMB float64
    var totalCPU float64
    var totalSpansPerSec float64
    var agentMetrics []map[string]interface{}

    for _, agent := range agents {
        memMB := agent.MemoryBytes / 1024 / 1024
        totalMemoryMB += memMB
        totalCPU += agent.CPUPercent
        totalSpansPerSec += agent.SpansPerSecond

        agentMetrics = append(agentMetrics, map[string]interface{}{
            "agent_id":        agent.ID,
            "hostname":        agent.Hostname,
            "memory_mb":       memMB,
            "cpu_percent":     agent.CPUPercent,
            "spans_per_sec":   agent.SpansPerSecond,
            "dropped_spans":   agent.DroppedSpans,
            "export_errors":   agent.ExportErrors,
        })
    }

    response := map[string]interface{}{
        "fleet_summary": map[string]interface{}{
            "total_agents":       len(agents),
            "total_memory_mb":    totalMemoryMB,
            "avg_memory_mb":      totalMemoryMB / float64(len(agents)),
            "total_cpu_percent":  totalCPU,
            "total_spans_per_sec": totalSpansPerSec,
        },
        "agents": agentMetrics,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

## Reacting to Resource Issues

When you detect a collector consuming too many resources, OpAMP lets you respond automatically. For example, if a collector's memory exceeds a threshold, you could push a configuration with more aggressive batching or reduce the number of active pipelines:

```go
func handleHighMemoryAgent(agentID string, conn types.Connection) {
    // Push a lighter configuration to reduce memory pressure
    lightConfig := generateLightweightConfig(agentID)
    err := pushConfigToAgent(conn, lightConfig)
    if err != nil {
        log.Printf("Failed to push lightweight config to %s: %v", agentID, err)
    } else {
        log.Printf("Pushed lightweight config to %s to reduce memory pressure", agentID)
    }
}
```

Monitoring your collectors through OpAMP gives you a complete picture of your observability pipeline's health. You are not just monitoring your applications anymore; you are monitoring the system that monitors your applications. That is the kind of operational maturity that prevents data loss and blind spots.
