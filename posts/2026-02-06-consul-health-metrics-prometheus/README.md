# How to Monitor HashiCorp Consul Service Health and Mesh Metrics with the Collector Prometheus Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Consul, Prometheus, Service Mesh, Health Monitoring

Description: Monitor HashiCorp Consul service health checks and service mesh metrics by scraping its Prometheus endpoint with the OTel Collector.

HashiCorp Consul exposes a rich set of Prometheus metrics covering service health, Raft consensus, Envoy sidecar proxy performance, and KV store operations. Scraping these with the OpenTelemetry Collector gives you a unified view of your Consul cluster health alongside your application telemetry.

## Enabling Consul Telemetry

First, configure Consul to expose Prometheus metrics. In your Consul server configuration:

```json
{
  "telemetry": {
    "prometheus_retention_time": "60s",
    "disable_hostname": true
  }
}
```

This enables the `/v1/agent/metrics?format=prometheus` endpoint on each Consul agent.

## Scraping Consul Metrics

Configure the OpenTelemetry Collector's Prometheus receiver to scrape Consul:

```yaml
receivers:
  prometheus/consul:
    config:
      scrape_configs:
        - job_name: "consul-servers"
          scrape_interval: 15s
          metrics_path: "/v1/agent/metrics"
          params:
            format: ["prometheus"]
          static_configs:
            - targets:
                - "consul-server-1:8500"
                - "consul-server-2:8500"
                - "consul-server-3:8500"
              labels:
                consul_role: "server"

        - job_name: "consul-clients"
          scrape_interval: 30s
          metrics_path: "/v1/agent/metrics"
          params:
            format: ["prometheus"]
          static_configs:
            - targets:
                - "consul-client-1:8500"
                - "consul-client-2:8500"
              labels:
                consul_role: "client"
```

## Key Metrics to Monitor

### Raft Consensus Metrics

These indicate the health of the Consul server cluster:

```yaml
# Key Raft metrics to watch:
# consul_raft_leader_lastContact - Time since the leader last contacted followers
# consul_raft_state_candidate - Number of Raft state transitions to candidate
# consul_raft_state_leader - Number of Raft state transitions to leader
# consul_raft_commitTime - Time to commit a new entry to the Raft log
# consul_raft_applied_index - Raft applied index, should match commit index
```

### Service Health Metrics

```yaml
# consul_health_service_status - Health status of each registered service
# consul_catalog_services - Number of services in the catalog
# consul_catalog_service_node_healthy - Number of healthy nodes per service
# consul_health_node_status - Health status of each node
```

### Service Mesh (Connect) Metrics

```yaml
# consul_connect_intentions_match - Intention check latency
# consul_connect_ca_leaf_cert_request - Leaf certificate request count
# consul_connect_ca_root_cert_rotation - Root certificate rotation count
```

## Complete Collector Configuration

```yaml
receivers:
  prometheus/consul:
    config:
      scrape_configs:
        - job_name: "consul-servers"
          scrape_interval: 15s
          metrics_path: "/v1/agent/metrics"
          params:
            format: ["prometheus"]
          static_configs:
            - targets:
                - "consul-server-1:8500"
                - "consul-server-2:8500"
                - "consul-server-3:8500"
          # Add ACL token if Consul has ACLs enabled
          authorization:
            credentials: "${env:CONSUL_HTTP_TOKEN}"

processors:
  # Add resource attributes for Consul cluster identification
  resource/consul:
    attributes:
      - key: service.name
        value: "consul"
        action: upsert
      - key: consul.datacenter
        value: "dc1"
        action: upsert

  # Filter to keep only the most important metrics
  filter/consul-essentials:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - "consul_raft_.*"
          - "consul_health_.*"
          - "consul_catalog_.*"
          - "consul_connect_.*"
          - "consul_serf_.*"
          - "consul_rpc_.*"
          - "consul_kvs_.*"

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus/consul]
      processors: [resource/consul, filter/consul-essentials, batch]
      exporters: [otlp]
```

## Using Consul Service Discovery

Instead of hardcoding Consul server addresses, use the Prometheus receiver's Consul service discovery:

```yaml
receivers:
  prometheus/consul-sd:
    config:
      scrape_configs:
        - job_name: "consul-agents"
          scrape_interval: 15s
          metrics_path: "/v1/agent/metrics"
          params:
            format: ["prometheus"]
          consul_sd_configs:
            - server: "consul.service.consul:8500"
              services: []
              # Discover all Consul agents
              tags: []
          relabel_configs:
            # Use the Consul node address for scraping
            - source_labels: [__meta_consul_address]
              target_label: __address__
              replacement: "$1:8500"
            - source_labels: [__meta_consul_node]
              target_label: consul_node
            - source_labels: [__meta_consul_dc]
              target_label: consul_datacenter
```

## Monitoring Envoy Sidecar Metrics

If you are using Consul Connect with Envoy sidecars, each sidecar exposes metrics on port 19000 by default:

```yaml
receivers:
  prometheus/envoy-sidecars:
    config:
      scrape_configs:
        - job_name: "consul-envoy-sidecars"
          scrape_interval: 15s
          consul_sd_configs:
            - server: "consul.service.consul:8500"
              services: []
          relabel_configs:
            # Target the Envoy admin port
            - source_labels: [__meta_consul_address]
              target_label: __address__
              replacement: "$1:19000"
            - source_labels: [__meta_consul_service]
              target_label: service_name
          metrics_path: "/stats/prometheus"
```

Key Envoy metrics to watch:

- `envoy_cluster_upstream_cx_total` - Total upstream connections
- `envoy_cluster_upstream_rq_total` - Total upstream requests
- `envoy_cluster_upstream_rq_time` - Upstream request duration
- `envoy_http_downstream_rq_total` - Total downstream requests

## Alerting Rules

Set up alerts for critical Consul health issues:

```yaml
# These can be configured in your alerting backend
# Raft leader loss - no leader for more than 15 seconds
# consul_raft_leader_lastContact > 15000ms

# Service health degradation
# consul_health_service_status{status="critical"} > 0

# Autopilot cluster health
# consul_autopilot_healthy == 0
```

Monitoring Consul with the OpenTelemetry Collector gives you visibility into your service mesh and service discovery infrastructure using the same observability pipeline as your applications. You can correlate application performance issues with Consul health events in a single backend.
