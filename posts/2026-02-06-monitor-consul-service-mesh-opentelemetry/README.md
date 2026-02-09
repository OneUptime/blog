# How to Monitor Consul Service Mesh with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Consul, Service Mesh, HashiCorp, Metrics, Observability, Microservices, Monitoring

Description: Learn how to monitor HashiCorp Consul service mesh health, service discovery, and connect proxy performance using OpenTelemetry.

---

HashiCorp Consul does a lot of heavy lifting in modern infrastructure. It handles service discovery, configuration management, health checking, and, when running as a service mesh, manages the entire data plane with sidecar proxies. The problem is that Consul's internal state is complex. You have servers maintaining consensus via Raft, clients gossiping membership information, health checks running against every registered service, and Envoy sidecar proxies handling actual traffic between services. If any of these layers develops problems, your applications feel it immediately.

OpenTelemetry gives you a way to pull metrics from Consul's telemetry system and combine them with traces from the Envoy proxies, creating a complete picture of your service mesh health. This post covers both sides: Consul server and client metrics through the collector, and service mesh data plane observability through Envoy's OpenTelemetry integration.

## Consul Telemetry Architecture

Consul emits internal telemetry in StatsD, DogStatsD, or Prometheus format. For OpenTelemetry integration, the Prometheus format is the most straightforward path because the collector has a mature Prometheus receiver.

```mermaid
graph TD
    subgraph Consul Cluster
        S1[Consul Server 1 - Leader]
        S2[Consul Server 2]
        S3[Consul Server 3]
        C1[Consul Client Agent]
        C2[Consul Client Agent]
    end

    subgraph Service Mesh Data Plane
        E1[Envoy Sidecar - Service A]
        E2[Envoy Sidecar - Service B]
    end

    S1 -->|Prometheus /metrics| OC[OTel Collector]
    S2 -->|Prometheus /metrics| OC
    S3 -->|Prometheus /metrics| OC
    E1 -->|Prometheus /stats| OC
    E2 -->|Prometheus /stats| OC
    OC -->|Export| O[OneUptime]
```

Consul servers expose metrics about Raft consensus, RPC handling, catalog operations, and health check results. Consul clients expose metrics about DNS queries, service registration, and gossip protocol health. Envoy sidecars expose metrics about request routing, connection management, and upstream health.

## Enabling Consul Prometheus Metrics

First, configure Consul to expose metrics in Prometheus format. Update the Consul configuration on every server and client agent:

```json
{
  "telemetry": {
    "prometheus_retention_time": "60s",
    "disable_hostname": true
  }
}
```

The `prometheus_retention_time` setting tells Consul to keep metrics available for scraping. Setting it to 60 seconds means the Prometheus endpoint will serve metrics from the last 60 seconds of activity. The `disable_hostname` flag prevents Consul from prepending the hostname to every metric name, which keeps metric names clean and consistent across nodes.

Verify the metrics endpoint works:

```bash
# Check that Consul is exposing Prometheus metrics
# The default metrics endpoint runs on the HTTP API port
curl http://localhost:8500/v1/agent/metrics?format=prometheus

# You should see metrics like:
# consul_raft_leader 1
# consul_raft_peers 3
# consul_catalog_service_count 15
# consul_health_service_checks_critical 0
```

## Collector Configuration for Consul Metrics

Configure the OpenTelemetry Collector to scrape Prometheus metrics from all Consul servers and clients:

```yaml
# config.yaml - OpenTelemetry Collector for Consul monitoring
receivers:
  # Scrape Consul server metrics
  prometheus/consul_servers:
    config:
      scrape_configs:
        - job_name: "consul-servers"
          scrape_interval: 30s
          metrics_path: "/v1/agent/metrics"
          params:
            format: ["prometheus"]
          static_configs:
            - targets:
                - "consul-server-1.internal:8500"
                - "consul-server-2.internal:8500"
                - "consul-server-3.internal:8500"
              labels:
                consul_role: "server"

  # Scrape Consul client agent metrics
  prometheus/consul_clients:
    config:
      scrape_configs:
        - job_name: "consul-clients"
          scrape_interval: 30s
          metrics_path: "/v1/agent/metrics"
          params:
            format: ["prometheus"]
          static_configs:
            - targets:
                - "consul-client-1.internal:8500"
                - "consul-client-2.internal:8500"
              labels:
                consul_role: "client"

  # Scrape Envoy sidecar metrics for service mesh
  prometheus/envoy_sidecars:
    config:
      scrape_configs:
        - job_name: "envoy-sidecars"
          scrape_interval: 15s
          metrics_path: "/stats/prometheus"
          static_configs:
            - targets:
                - "service-a.internal:19000"
                - "service-b.internal:19000"

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  resource:
    attributes:
      - key: service.name
        value: "consul-mesh"
        action: upsert

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    metrics/consul:
      receivers:
        - prometheus/consul_servers
        - prometheus/consul_clients
      processors: [resource, batch]
      exporters: [otlp]

    metrics/envoy:
      receivers: [prometheus/envoy_sidecars]
      processors: [batch]
      exporters: [otlp]
```

The configuration uses three separate Prometheus receiver instances. Consul servers and clients are scraped every 30 seconds since their metrics change relatively slowly. Envoy sidecars are scraped every 15 seconds because traffic metrics need higher resolution to catch short-lived issues.

Note that the Envoy admin interface runs on port 19000 by default in Consul Connect deployments. The `/stats/prometheus` path returns all Envoy metrics in Prometheus format.

## Critical Consul Server Metrics

Consul server health directly affects the entire cluster. These are the metrics you need to watch.

### Raft Consensus

The Raft protocol is Consul's consensus mechanism. The most important metric is `consul_raft_leader`, which equals 1 on the leader node and 0 on followers. If no node has this set to 1, the cluster has no leader and cannot process writes.

`consul_raft_peers` should equal the number of server nodes in your cluster. If it drops below the expected count, a server has been removed from the cluster, either intentionally or because it failed.

`consul_raft_commitTime` measures how long it takes to commit a new log entry. This reflects the performance of the Raft replication process. Commit times under 50ms are healthy. Above 200ms indicates network or disk performance problems.

### Catalog and Health Checks

`consul_catalog_service_count` tracks the total number of registered services. A sudden drop might indicate a network partition where clients lost contact with servers.

`consul_health_service_checks_critical` counts services with failing health checks. This is one of the most actionable metrics because it directly maps to services that Consul will stop routing traffic to.

### RPC Performance

`consul_rpc_request` and `consul_rpc_request_error` track the volume and error rate of RPC calls between Consul agents. A spike in RPC errors often precedes broader cluster issues.

## Service Mesh Data Plane Metrics

When Consul runs as a service mesh with Connect, Envoy sidecar proxies handle all service-to-service communication. Monitoring these proxies tells you about actual traffic patterns.

### Upstream Connection Health

Envoy tracks connections to upstream services. The key metrics are:

- `envoy_cluster_upstream_cx_active` shows active connections to each upstream
- `envoy_cluster_upstream_cx_connect_fail` counts connection failures
- `envoy_cluster_upstream_rq_timeout` counts requests that timed out

A rising connection failure count means the upstream service is struggling or the network path between services has problems.

### Request Metrics

For HTTP services, Envoy provides detailed request metrics:

- `envoy_cluster_upstream_rq_total` counts total requests per upstream
- `envoy_cluster_upstream_rq_xx` breaks down responses by status code class (2xx, 4xx, 5xx)
- `envoy_cluster_upstream_rq_time` provides request latency histograms

The 5xx response rate is particularly important because it indicates server-side errors in upstream services. Unlike health check failures, which are binary, the error rate gives you a continuous signal about service health.

## Monitoring Consul DNS

Many applications use Consul's DNS interface for service discovery rather than the HTTP API. Monitoring DNS query performance is important for these deployments:

```yaml
# Additional receiver for Consul DNS metrics
receivers:
  prometheus/consul_dns:
    config:
      scrape_configs:
        - job_name: "consul-dns"
          scrape_interval: 30s
          metrics_path: "/v1/agent/metrics"
          params:
            format: ["prometheus"]
          # Use the same targets as consul_clients
          # DNS metrics come from client agents
          static_configs:
            - targets:
                - "consul-client-1.internal:8500"
                - "consul-client-2.internal:8500"
          # Only keep DNS-related metrics to reduce volume
          metric_relabel_configs:
            - source_labels: [__name__]
              regex: "consul_dns_.*"
              action: keep
```

The `consul_dns_domain_query_count` metric tracks DNS query volume, while `consul_dns_stale_queries` counts queries served from stale data. A high stale query rate means Consul clients are having trouble reaching servers for fresh data.

## Alerting on Service Mesh Health

Set up alerts that cover both the control plane (Consul servers) and the data plane (Envoy proxies):

```yaml
# Control plane alerts
- alert: ConsulNoLeader
  condition: sum(consul_raft_leader) == 0
  for: 30s
  severity: critical
  description: "No Consul server is the Raft leader"

- alert: ConsulServerDown
  condition: consul_raft_peers < expected_server_count
  for: 2m
  severity: warning
  description: "Consul cluster has fewer peers than expected"

- alert: ConsulHighCommitTime
  condition: consul_raft_commitTime > 200
  for: 5m
  severity: warning
  description: "Raft commit time is elevated"

# Data plane alerts
- alert: ConsulServiceUnhealthy
  condition: consul_health_service_checks_critical > 0
  for: 3m
  severity: warning
  description: "One or more services have critical health checks"

- alert: EnvoyUpstreamErrors
  condition: rate(envoy_cluster_upstream_rq_xx{response_code_class="5"}[5m]) > 0.05
  for: 2m
  severity: warning
  description: "Upstream 5xx error rate exceeds 5%"
```

The no-leader alert should fire quickly (30 seconds) because a leaderless cluster cannot process any write operations. The service health alert has a 3-minute grace period to avoid alerting on transient health check failures that resolve themselves.

## Scaling the Collection

In large Consul deployments with hundreds of services and thousands of Envoy sidecars, scraping every sidecar individually does not scale well. Instead, use Consul's own service discovery to dynamically find Envoy endpoints:

```yaml
receivers:
  prometheus/envoy_dynamic:
    config:
      scrape_configs:
        - job_name: "envoy-sidecars-dynamic"
          scrape_interval: 15s
          metrics_path: "/stats/prometheus"
          consul_sd_configs:
            - server: "consul-server-1.internal:8500"
              # Discover all sidecar proxy services
              services: []
              tags: ["connect-proxy"]
          relabel_configs:
            # Use the service address and admin port
            - source_labels: [__meta_consul_service_address]
              target_label: __address__
              replacement: "${1}:19000"
```

This approach uses Consul's service discovery to automatically find all sidecar proxies, eliminating the need to manually update the collector configuration when services are added or removed.

## Conclusion

Monitoring a Consul service mesh requires visibility into both the control plane and the data plane. The OpenTelemetry Collector bridges this gap by scraping Prometheus metrics from Consul servers, client agents, and Envoy sidecar proxies through a single configuration. Focus your alerting on Raft leader presence, health check failures, and upstream error rates. These three signals cover the most common failure modes in a Consul service mesh. With this monitoring in place, you can confidently manage your service mesh knowing that problems will surface before they cascade into outages.
