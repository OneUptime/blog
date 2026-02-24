# How to Create Istio Dashboards in OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, Dashboards, Visualization, Monitoring

Description: Build effective dashboards in OneUptime to visualize Istio service mesh metrics including traffic flow, latency, and error rates.

---

Dashboards turn raw Istio metrics into something you can actually understand at a glance. A well-designed dashboard tells you the health of your entire mesh in seconds and lets you drill down when something looks off. Here's how to build Istio dashboards in OneUptime that are genuinely useful.

## Dashboard Design Philosophy

Before building anything, think about who will use these dashboards and when:

- **On-call engineers** need an overview dashboard they can check during incidents
- **Service owners** need detailed views of their specific services
- **Leadership** needs high-level SLO compliance summaries

Build separate dashboards for each audience. A single dashboard that tries to do everything ends up being useful for nobody.

## Dashboard 1: Mesh Overview

This is your "is everything okay?" dashboard. It should load quickly and give you the answer in under 5 seconds.

### Row 1: Status Indicators

Create status widgets for each critical component:

- **istiod Status**: Green if running, red if down
- **Ingress Gateway Status**: Green if healthy, red if degraded
- **Overall Mesh Error Rate**: Green if < 1%, yellow if 1-5%, red if > 5%

### Row 2: Traffic Volume

A time-series chart showing total request rate across the mesh:

```
# Total mesh request rate
sum(rate(istio_requests_total[5m]))

# Broken down by response code class
sum(rate(istio_requests_total[5m])) by (response_code)
```

This gives you a quick view of traffic patterns. Sudden drops or spikes are immediately visible.

### Row 3: Error Rates

A time-series chart showing error rates:

```
# 5xx error rate as percentage
sum(rate(istio_requests_total{response_code=~"5.*"}[5m]))
/
sum(rate(istio_requests_total[5m]))
* 100

# 4xx error rate as percentage
sum(rate(istio_requests_total{response_code=~"4.*"}[5m]))
/
sum(rate(istio_requests_total[5m]))
* 100
```

Display 5xx and 4xx on the same chart with different colors. 5xx errors are your services failing. 4xx errors are usually client problems but worth tracking.

### Row 4: Latency

Show p50, p95, and p99 latency on the same chart:

```
# P50 latency
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le)
)

# P95 latency
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le)
)

# P99 latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le)
)
```

The gap between p50 and p99 tells you about tail latency. A big gap means some requests are much slower than average.

## Dashboard 2: Service Detail

Create one of these for each critical service. Use a template variable for the service name so you can switch between services.

### Service Identity

```
# Variable: service_name
# Example value: api-service.default.svc.cluster.local
```

### Row 1: Request Rate and Error Rate

```
# Inbound request rate
sum(rate(istio_requests_total{destination_service="$service_name"}[5m]))

# Inbound error rate
sum(rate(istio_requests_total{destination_service="$service_name", response_code=~"5.*"}[5m]))
/
sum(rate(istio_requests_total{destination_service="$service_name"}[5m]))
* 100
```

### Row 2: Latency Breakdown

```
# P50, P95, P99 for the specific service
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service="$service_name"}[5m])) by (le)
)

histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service="$service_name"}[5m])) by (le)
)

histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service="$service_name"}[5m])) by (le)
)
```

### Row 3: Traffic Sources

Show where traffic to this service is coming from:

```
# Request rate by source workload
sum(rate(istio_requests_total{destination_service="$service_name"}[5m])) by (source_workload)
```

Display this as a stacked bar chart or table. This helps you understand which clients are generating the most load.

### Row 4: Response Code Distribution

```
# Response codes for this service
sum(rate(istio_requests_total{destination_service="$service_name"}[5m])) by (response_code)
```

A pie chart or stacked area chart works well here. You want to see the proportion of 200s, 4xxs, and 5xxs.

### Row 5: TCP Metrics

```
# Active TCP connections
sum(istio_tcp_connections_opened_total{destination_service="$service_name"})
-
sum(istio_tcp_connections_closed_total{destination_service="$service_name"})

# TCP bytes sent and received
sum(rate(istio_tcp_sent_bytes_total{destination_service="$service_name"}[5m]))
sum(rate(istio_tcp_received_bytes_total{destination_service="$service_name"}[5m]))
```

## Dashboard 3: Control Plane Health

This dashboard monitors istiod and the mesh infrastructure.

### Row 1: istiod Resource Usage

```
# CPU usage
rate(container_cpu_usage_seconds_total{namespace="istio-system", container="discovery"}[5m])

# Memory usage
container_memory_working_set_bytes{namespace="istio-system", container="discovery"}
```

### Row 2: Configuration Push Metrics

```
# XDS push rate
sum(rate(pilot_xds_pushes[5m])) by (type)

# Push errors
sum(rate(pilot_xds_push_errors[5m]))

# Config convergence time
histogram_quantile(0.99,
  sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)
)
```

### Row 3: Connected Proxies

```
# Number of connected proxies
pilot_xds

# Proxy versions (useful during upgrades)
sum(pilot_xds) by (version)
```

During an upgrade, you'll see the version distribution shift, which helps you track progress.

### Row 4: Certificate Health

```
# Root cert expiry (should be far in the future)
citadel_server_root_cert_expiry_timestamp - time()

# Certificate signing rate
rate(citadel_server_csr_count[5m])

# Certificate signing errors
rate(citadel_server_csr_parsing_err_count[5m])
```

## Dashboard 4: Gateway Performance

If you use Istio Ingress Gateways, create a dashboard specifically for them:

### Row 1: Gateway Traffic

```
# Inbound request rate at the gateway
sum(rate(istio_requests_total{destination_service_namespace="istio-system", destination_service_name="istio-ingressgateway"}[5m]))

# Response codes at the gateway level
sum(rate(istio_requests_total{source_workload="istio-ingressgateway"}[5m])) by (response_code)
```

### Row 2: Gateway Latency

```
# Latency at the gateway (this includes routing to backend)
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{source_workload="istio-ingressgateway"}[5m])) by (le, destination_service)
)
```

### Row 3: Active Connections

```
# Active connections to the gateway
sum(envoy_server_total_connections{namespace="istio-system"})
```

## Practical Tips for Dashboard Design

**Use consistent time ranges**. Set all panels to the same time window and make it adjustable. Most of the time you'll want "last 1 hour" for incident response and "last 24 hours" for daily reviews.

**Add annotations for deployments**. If OneUptime supports event overlays, mark deployment times on your charts. This makes it trivial to correlate problems with recent changes.

**Use color consistently**. Green for good, yellow for warning, red for bad. Don't use green for high error rates just because the metric went up.

**Put the most important information at the top**. People look at the top of the page first. Put your success rate and error rate there, and detailed breakdowns further down.

**Keep queries simple**. Complex PromQL queries are hard to maintain and debug. If a query is getting complicated, consider creating a recording rule in Prometheus instead.

```yaml
# Example recording rule to simplify dashboard queries
groups:
- name: istio.rules
  rules:
  - record: istio:service:error_rate:5m
    expr: |
      sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (destination_service)
      /
      sum(rate(istio_requests_total[5m])) by (destination_service)
```

Build these dashboards incrementally. Start with the Mesh Overview, get it working and useful, then add the Service Detail dashboard for your most critical service. Expand from there based on what questions you find yourself asking during incidents.
