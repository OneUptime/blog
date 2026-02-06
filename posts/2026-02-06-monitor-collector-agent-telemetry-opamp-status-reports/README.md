# How to Monitor Collector Agent Telemetry (CPU, Memory, Throughput) via OpAMP Status Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Agent Telemetry, Resource Monitoring

Description: Monitor your OpenTelemetry Collector fleet resource usage including CPU, memory, and data throughput using OpAMP agent self-telemetry reports.

Your OpenTelemetry Collectors are the backbone of your observability pipeline. If a collector starts consuming too much memory, its throughput drops, or its CPU usage spikes, you need to know about it before it starts dropping telemetry data. OpAMP includes a mechanism for agents to report their own resource consumption back to the management server.

## Agent Self-Telemetry in OpAMP

OpAMP agents can report their own metrics through the `AgentToServer` message. The supervisor collects metrics about the collector process and sends them as OTLP-formatted telemetry to the server. This gives you visibility into:

- CPU usage of each collector
- Memory (RSS) consumption
- Data points received and exported per second
- Queue sizes in batch processors
- Export error rates

## Configuring the Collector to Expose Internal Metrics

First, configure the collector to expose its internal telemetry metrics via Prometheus:

```yaml
# collector-config.yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend]

extensions:
  health_check:
    endpoint: 0.0.0.0:13133
```

The collector now exposes its internal metrics on port 8888, which the supervisor can scrape and forward to the OpAMP server.

## Supervisor Configuration for Own Metrics Reporting

Enable the `reports_own_metrics` capability in the supervisor:

```yaml
# supervisor.yaml
server:
  endpoint: wss://opamp-server.internal:4320/v1/opamp

agent:
  executable: /usr/local/bin/otelcol-contrib
  storage_dir: /var/lib/opamp-supervisor

capabilities:
  reports_effective_config: true
  reports_health: true
  accepts_remote_config: true
  reports_own_metrics: true

# Configure own metrics collection
own_metrics:
  # Scrape collector internal metrics endpoint
  endpoint: http://localhost:8888/metrics
  # Report interval
  interval: 30s
```

## Processing Agent Metrics on the Server

On the server side, parse the agent metrics from incoming messages:

```go
func handleAgentMessage(
    conn types.Connection,
    msg *protobufs.AgentToServer,
) *protobufs.ServerToAgent {

    agentID := hex.EncodeToString(msg.InstanceUid)

    // Process agent's own telemetry metrics
    if msg.CustomMetrics != nil {
        processAgentMetrics(agentID, msg.CustomMetrics)
    }

    return &protobufs.ServerToAgent{}
}

func processAgentMetrics(agentID string, metricsData *protobufs.MetricData) {
    // Parse OTLP metrics from the agent
    for _, rm := range metricsData.ResourceMetrics {
        for _, sm := range rm.ScopeMetrics {
            for _, metric := range sm.Metrics {
                switch metric.Name {
                case "otelcol_process_cpu_seconds_total":
                    cpuSeconds := getGaugeValue(metric)
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

These are the most important collector metrics to monitor through OpAMP:

```go
// Define thresholds for alerting
var metricThresholds = map[string]float64{
    // Memory threshold in bytes (2 GB)
    "otelcol_process_memory_rss": 2 * 1024 * 1024 * 1024,

    // CPU usage per minute (if above 80% of one core)
    "otelcol_process_cpu_seconds_total": 0.8,

    // Dropped spans should be zero in healthy state
    "otelcol_processor_dropped_spans": 0,

    // Export failures should be near zero
    "otelcol_exporter_send_failed_spans": 0,

    // Queue capacity usage (percentage)
    "otelcol_exporter_queue_capacity": 0.8,
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
