# How to Use the OpenTelemetry Collector with HashiCorp Nomad Job Telemetry for Scheduling Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Nomad, Scheduling Metrics, Job Telemetry, HashiCorp

Description: Collect HashiCorp Nomad job scheduling metrics with the OpenTelemetry Collector for workload orchestration visibility.

Nomad exposes telemetry data about job scheduling, allocation placement, resource utilization, and cluster health. Collecting these metrics with the OpenTelemetry Collector gives you visibility into how well your workload scheduler is performing and helps you identify capacity issues before they affect your applications.

## Enabling Nomad Telemetry

Configure Nomad to expose Prometheus metrics. In the Nomad server and client configuration:

```hcl
# nomad.hcl
telemetry {
  prometheus_metrics    = true
  publish_allocation_metrics = true
  publish_node_metrics = true
  collection_interval  = "10s"
}
```

This exposes metrics at `/v1/metrics?format=prometheus` on the Nomad HTTP API (default port 4646).

## Key Nomad Metrics

### Scheduling Metrics
- `nomad_nomad_broker_total_ready` - Number of evaluations ready to be scheduled
- `nomad_nomad_broker_total_unacked` - Number of evaluations waiting for acknowledgment
- `nomad_nomad_worker_invoke_scheduler` - Scheduler invocation count and latency

### Allocation Metrics
- `nomad_client_allocs_running` - Number of running allocations per client
- `nomad_client_allocs_start` - Allocation start events
- `nomad_client_allocs_complete` - Allocation completion events
- `nomad_client_allocs_failed` - Allocation failure events
- `nomad_client_allocs_oom_killed` - OOM killed allocations

### Resource Utilization
- `nomad_client_allocs_cpu_total_ticks` - CPU ticks used by allocations
- `nomad_client_allocs_memory_usage` - Memory usage by allocations
- `nomad_client_host_cpu_total` - Total host CPU
- `nomad_client_host_memory_total` - Total host memory

### Cluster Health
- `nomad_raft_leader` - Whether this server is the Raft leader
- `nomad_raft_peers` - Number of Raft peers
- `nomad_serf_member_status` - Serf membership status

## Collector Configuration

```yaml
receivers:
  prometheus/nomad-servers:
    config:
      scrape_configs:
        - job_name: "nomad-servers"
          scrape_interval: 15s
          metrics_path: "/v1/metrics"
          params:
            format: ["prometheus"]
          static_configs:
            - targets:
                - "nomad-server-1:4646"
                - "nomad-server-2:4646"
                - "nomad-server-3:4646"
              labels:
                nomad_role: "server"
          # Add ACL token if Nomad ACLs are enabled
          authorization:
            credentials: "${env:NOMAD_TOKEN}"

  prometheus/nomad-clients:
    config:
      scrape_configs:
        - job_name: "nomad-clients"
          scrape_interval: 15s
          metrics_path: "/v1/metrics"
          params:
            format: ["prometheus"]
          # Use Consul to discover Nomad client nodes
          consul_sd_configs:
            - server: "consul.service.consul:8500"
              services: ["nomad-client"]
          relabel_configs:
            - source_labels: [__meta_consul_address]
              target_label: __address__
              replacement: "$1:4646"
            - source_labels: [__meta_consul_node]
              target_label: nomad_node

processors:
  resource/nomad:
    attributes:
      - key: service.name
        value: "nomad"
        action: upsert

  filter/nomad-essentials:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - "nomad_nomad_broker_.*"
          - "nomad_nomad_worker_.*"
          - "nomad_client_allocs_.*"
          - "nomad_client_host_.*"
          - "nomad_raft_.*"
          - "nomad_serf_.*"
          - "nomad_nomad_job_.*"
          - "nomad_runtime_.*"

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus/nomad-servers, prometheus/nomad-clients]
      processors: [resource/nomad, filter/nomad-essentials, batch]
      exporters: [otlp]
```

## Deploying the Collector as a Nomad Job

Run the Collector itself on Nomad:

```hcl
job "otel-nomad-metrics" {
  datacenters = ["dc1"]
  type        = "service"

  group "collector" {
    count = 1

    network {
      port "metrics" {
        static = 8888
      }
    }

    service {
      name = "otel-nomad-metrics"
      port = "metrics"
    }

    task "collector" {
      driver = "docker"

      config {
        image = "otel/opentelemetry-collector-contrib:0.96.0"
        args  = ["--config=/local/config.yaml"]
        ports = ["metrics"]
      }

      template {
        data = <<-EOF
receivers:
  prometheus/nomad:
    config:
      scrape_configs:
        - job_name: "nomad"
          scrape_interval: 15s
          metrics_path: "/v1/metrics"
          params:
            format: ["prometheus"]
          consul_sd_configs:
            - server: "{{ env "attr.unique.network.ip-address" }}:8500"
              services: ["nomad", "nomad-client"]
          relabel_configs:
            - source_labels: [__meta_consul_address]
              target_label: __address__
              replacement: "$1:4646"
            - source_labels: [__meta_consul_service]
              target_label: nomad_role

processors:
  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "{{ range service "otel-collector" }}{{ .Address }}:{{ .Port }}{{ end }}"
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [prometheus/nomad]
      processors: [batch]
      exporters: [otlp]
        EOF

        destination = "local/config.yaml"
        change_mode = "restart"
      }

      resources {
        cpu    = 200
        memory = 128
      }
    }
  }
}
```

## Alerting on Scheduling Issues

Set up alerts for Nomad scheduling problems:

```
# Critical: No Raft leader
# nomad_raft_leader == 0 on all servers

# Warning: Scheduling backlog
# nomad_nomad_broker_total_ready > 100

# Warning: Allocation failures increasing
# rate(nomad_client_allocs_failed) > 0

# Warning: OOM kills
# rate(nomad_client_allocs_oom_killed) > 0

# Warning: Node resource saturation
# nomad_client_host_cpu_total - nomad_client_allocs_cpu_total_ticks < threshold
```

## Correlating Nomad Metrics with Application Telemetry

When an application deployed on Nomad has performance issues, correlate with Nomad metrics:

- High scheduling latency might explain slow deployment rollouts
- Allocation failures indicate resource constraints or constraint violations
- OOM kills point to memory limits that need adjustment
- Node CPU saturation affects all allocations on that node

Having Nomad metrics in the same backend as your application traces and metrics makes this correlation straightforward.

Monitoring Nomad scheduling metrics with the OpenTelemetry Collector gives you visibility into the orchestration layer. You can catch scheduling bottlenecks, resource exhaustion, and cluster health issues before they cascade into application-level problems.
