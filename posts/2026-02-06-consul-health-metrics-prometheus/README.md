# How to Monitor HashiCorp Consul Service Health and Mesh Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Consul, Prometheus, Service Mesh, Health Monitoring

Description: Monitor HashiCorp Consul service health checks and service mesh metrics by scraping its Prometheus endpoint with the OTel Collector.

HashiCorp Consul exposes a rich set of Prometheus metrics covering agent health, Raft consensus, Envoy sidecar proxy performance, and KV store operations. Scraping these with the OpenTelemetry Collector gives you a unified view of your Consul cluster health alongside your application telemetry.

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
# consul_raft_state_candidate - Number of elections started by a server
# consul_raft_state_leader - Number of times a server became leader
# consul_raft_commitTime - Time to commit a new entry to the Raft log
# consul_raft_last_index - Latest Raft log index known to the server
```

### Service and Catalog Metrics

```yaml
# Consul's agent telemetry endpoint does not emit per-service health status gauges.
# Use Consul service discovery labels such as __meta_consul_health when scraping
# registered services, or a dedicated consul_exporter, for service health status.

# consul_catalog_service_query - Catalog queries for a service
# consul_catalog_service_not_found - Catalog queries where a service was not found
# consul_client_api_catalog_services - Requests to list services from the catalog
# consul_memberlist_node_instances - Number of nodes by memberlist state
```

### Service Mesh (Connect) Metrics

```yaml
# consul_intention_apply - Time to apply service mesh intention changes
# consul_mesh_active_root_ca_expiry - Seconds until the active mesh root CA expires
# consul_mesh_active_signing_ca_expiry - Seconds until the active mesh signing CA expires
# consul_leaf_certs_cert_expiry - Seconds until cached service leaf certificates expire
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
          - "consul_catalog_.*"
          - "consul_client_.*"
          - "consul_intention_.*"
          - "consul_mesh_.*"
          - "consul_leaf_certs_.*"
          - "consul_serf_.*"
          - "consul_memberlist_.*"
          - "consul_members_.*"
          - "consul_rpc_.*"
          - "consul_kvs_.*"
          - "consul_autopilot_.*"

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

Instead of hardcoding Consul server addresses, use the Prometheus receiver's Consul service discovery for catalog-registered Consul targets:

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
              services: ["consul"]
          relabel_configs:
            # Use the Consul node address for scraping
            - source_labels: [__meta_consul_address]
              target_label: __address__
              replacement: "$$1:8500"
            - source_labels: [__meta_consul_node]
              target_label: consul_node
            - source_labels: [__meta_consul_dc]
              target_label: consul_datacenter
```

## Monitoring Envoy Sidecar Metrics

If you are using Consul Connect with Envoy sidecars, configure the proxy's `envoy_prometheus_bind_addr` to expose Prometheus metrics, then scrape that listener. For example, if sidecars expose metrics on port 20200:

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
            # Target the configured Envoy Prometheus metrics port
            - source_labels: [__meta_consul_address]
              target_label: __address__
              replacement: "$$1:20200"
            - source_labels: [__meta_consul_service]
              target_label: service_name
          metrics_path: "/metrics"
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
# Raft leader contact latency - average above 200ms over 5 minutes
# rate(consul_raft_leader_lastContact_sum[5m]) / rate(consul_raft_leader_lastContact_count[5m]) > 200

# Service health degradation
# Use __meta_consul_health labels from Consul service discovery, or consul_exporter
# health gauges, for per-service health status alerts.

# Autopilot cluster health
# consul_autopilot_healthy == 0
```

Monitoring Consul with the OpenTelemetry Collector gives you visibility into your service mesh and service discovery infrastructure using the same observability pipeline as your applications. You can correlate application performance issues with Consul health events in a single backend.
