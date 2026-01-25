# How to Use Grafana Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Cloud, SaaS, Monitoring, Observability, Metrics, Logs, Traces, Managed Services

Description: A complete guide to getting started with Grafana Cloud, from initial setup through data ingestion and dashboard creation.

---

## What Is Grafana Cloud?

Grafana Cloud is Grafana Labs' managed observability platform. Instead of running Grafana, Prometheus, Loki, and Tempo yourself, Grafana Cloud handles the infrastructure, scaling, and maintenance. You focus on building dashboards and understanding your data.

The platform includes:
- Grafana for visualization and dashboards
- Grafana Mimir for metrics (Prometheus-compatible)
- Grafana Loki for logs
- Grafana Tempo for traces
- Grafana OnCall for incident management
- Synthetic monitoring for uptime checks

## Getting Started

### Creating an Account

Visit grafana.com and sign up for a free tier account. The free tier includes generous limits suitable for small projects and evaluation:

- 10,000 active series for metrics
- 50 GB of logs
- 50 GB of traces
- 3 users

### Understanding Your Stack

After signing up, navigate to your Cloud Portal. You will see your "stack" which represents your Grafana Cloud instance. Each stack has:

- A unique URL (e.g., `yourorg.grafana.net`)
- Dedicated endpoints for metrics, logs, and traces
- Isolated data storage
- Its own set of users and API keys

## Sending Metrics to Grafana Cloud

Grafana Cloud accepts metrics via the Prometheus remote write protocol.

### Configuring Prometheus to Remote Write

If you run Prometheus locally, add a remote write configuration:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

remote_write:
  - url: https://prometheus-prod-01-prod-us-east-0.grafana.net/api/prom/push
    basic_auth:
      username: 123456
      password: glc_eyJxxx...
    write_relabel_configs:
      # Optional: filter what gets sent
      - source_labels: [__name__]
        regex: "(up|http_.*|node_.*)"
        action: keep

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

Replace the URL and credentials with your actual stack values from the Cloud Portal.

### Using Grafana Agent

Grafana Agent is a lightweight alternative to Prometheus for sending metrics:

```yaml
# agent.yaml
metrics:
  global:
    scrape_interval: 15s
    remote_write:
      - url: https://prometheus-prod-01-prod-us-east-0.grafana.net/api/prom/push
        basic_auth:
          username: 123456
          password: ${GRAFANA_CLOUD_API_KEY}

  configs:
    - name: default
      scrape_configs:
        - job_name: node
          static_configs:
            - targets: ['localhost:9100']
              labels:
                env: production
                host: web-server-1
```

### Using Grafana Alloy

Alloy is the next-generation Grafana Agent with improved configuration:

```river
// alloy.config
prometheus.scrape "node" {
  targets = [
    {"__address__" = "localhost:9100"},
  ]
  forward_to = [prometheus.remote_write.grafana_cloud.receiver]
}

prometheus.remote_write "grafana_cloud" {
  endpoint {
    url = "https://prometheus-prod-01-prod-us-east-0.grafana.net/api/prom/push"
    basic_auth {
      username = "123456"
      password = env("GRAFANA_CLOUD_API_KEY")
    }
  }
}
```

## Sending Logs to Grafana Cloud

Grafana Cloud uses Loki for log aggregation.

### Using Promtail

Promtail is the standard log shipper for Loki:

```yaml
# promtail.yaml
server:
  http_listen_port: 9080

clients:
  - url: https://logs-prod-us-central1.grafana.net/loki/api/v1/push
    basic_auth:
      username: 123456
      password: ${GRAFANA_CLOUD_API_KEY}

positions:
  filename: /tmp/positions.yaml

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          host: web-server-1
          __path__: /var/log/*.log

  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: container
```

### Using Grafana Alloy for Logs

```river
// Collect logs from files
local.file_match "logs" {
  path_targets = [{"__path__" = "/var/log/*.log"}]
}

loki.source.file "logs" {
  targets    = local.file_match.logs.targets
  forward_to = [loki.write.grafana_cloud.receiver]
}

loki.write "grafana_cloud" {
  endpoint {
    url = "https://logs-prod-us-central1.grafana.net/loki/api/v1/push"
    basic_auth {
      username = "123456"
      password = env("GRAFANA_CLOUD_API_KEY")
    }
  }
}
```

### Direct API Push

For applications, send logs directly via HTTP:

```python
import requests
import time
import json

def send_log_to_grafana_cloud(message: str, labels: dict):
    """Send a log entry to Grafana Cloud Loki."""
    url = "https://logs-prod-us-central1.grafana.net/loki/api/v1/push"

    # Loki expects timestamps in nanoseconds
    timestamp = str(int(time.time() * 1e9))

    payload = {
        "streams": [
            {
                "stream": labels,
                "values": [[timestamp, message]]
            }
        ]
    }

    response = requests.post(
        url,
        json=payload,
        auth=('123456', 'glc_eyJxxx...')
    )
    response.raise_for_status()

# Usage
send_log_to_grafana_cloud(
    message="User login successful",
    labels={"service": "auth", "level": "info"}
)
```

## Sending Traces to Grafana Cloud

Grafana Cloud uses Tempo for trace storage.

### OpenTelemetry Configuration

Configure the OpenTelemetry Collector to send traces:

```yaml
# otel-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  otlp:
    endpoint: tempo-prod-us-central1.grafana.net:443
    headers:
      authorization: Basic <base64-encoded-credentials>

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp]
```

### Application Instrumentation

Using Python with OpenTelemetry:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configure the tracer
resource = Resource.create({"service.name": "my-service"})
provider = TracerProvider(resource=resource)

# Configure export to Grafana Cloud
exporter = OTLPSpanExporter(
    endpoint="tempo-prod-us-central1.grafana.net:443",
    headers={
        "authorization": "Basic <base64-encoded-credentials>"
    }
)

provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

# Create traces
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("main-operation"):
    with tracer.start_as_current_span("sub-operation"):
        # Your code here
        pass
```

## Creating Dashboards

Once data flows into Grafana Cloud, build dashboards in the hosted Grafana instance.

### Accessing Your Grafana Instance

Navigate to your stack URL (e.g., `yourorg.grafana.net`) and log in. The interface is identical to self-hosted Grafana with a few cloud-specific additions.

### Pre-Built Dashboards

Grafana Cloud offers integration dashboards for common scenarios:

1. Go to Connections > Add new connection
2. Search for your technology (e.g., "Kubernetes", "MySQL", "Node.js")
3. Follow the setup wizard to install agents and dashboards

### Building Custom Dashboards

The dashboard building experience matches self-hosted Grafana:

```promql
# Example: Request rate by service
sum(rate(http_requests_total[5m])) by (service)

# Example: Error rate percentage
100 * sum(rate(http_requests_total{status=~"5.."}[5m]))
    / sum(rate(http_requests_total[5m]))

# Example: P99 latency
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))
```

## Alerting Configuration

Grafana Cloud includes Grafana Alerting for notification management.

### Creating Alert Rules

```yaml
# Alert rule for high error rate
groups:
  - name: service-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          / sum(rate(http_requests_total[5m])) by (service)
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }}"
```

### Configuring Notification Channels

1. Go to Alerting > Contact points
2. Add a new contact point (Slack, PagerDuty, email, etc.)
3. Configure notification policies to route alerts

## Usage Monitoring

Track your Grafana Cloud usage to avoid surprises.

### Viewing Usage Statistics

Navigate to Administration > Usage & Billing to see:

- Active series count
- Log volume ingested
- Trace spans received
- User count

### Setting Up Usage Alerts

Create alerts for usage thresholds:

```promql
# Alert when approaching series limit
grafanacloud_instance_active_series > 9000
```

## Best Practices

### Label Management

Careful labeling keeps costs under control:

```yaml
# Good: Bounded cardinality
labels:
  service: api
  env: production
  region: us-east-1

# Bad: High cardinality (avoid)
labels:
  user_id: abc123  # Creates series per user
  request_id: xyz  # Creates series per request
```

### Retention Planning

Grafana Cloud retains data based on your plan:

- Free tier: 14 days for metrics, 14 days for logs
- Pro tier: 13 months for metrics, 30 days for logs
- Custom retention available on enterprise plans

Plan your queries and dashboards accordingly.

### Multi-Region Considerations

Choose the Grafana Cloud region closest to your infrastructure:

- US (us-central-1)
- EU (eu-west-1)
- Australia (ap-southeast-1)

This reduces latency for data ingestion and queries.

## Migration from Self-Hosted

Moving from self-hosted Grafana to Grafana Cloud involves:

### Dashboard Export/Import

```bash
# Export dashboards from self-hosted
curl -H "Authorization: Bearer $SELF_HOSTED_TOKEN" \
     https://grafana.internal/api/dashboards/uid/abc123 \
     > dashboard.json

# Import to Grafana Cloud
curl -X POST \
     -H "Authorization: Bearer $CLOUD_TOKEN" \
     -H "Content-Type: application/json" \
     -d @dashboard.json \
     https://yourorg.grafana.net/api/dashboards/db
```

### Data Source Reconfiguration

Grafana Cloud data sources use built-in endpoints. Update dashboard data source references to point to the cloud versions.

## Conclusion

Grafana Cloud removes the operational burden of running observability infrastructure. Start with the free tier to evaluate, scale up as your needs grow, and let Grafana Labs handle the infrastructure while you focus on understanding your systems. The combination of managed Mimir, Loki, and Tempo provides a complete observability solution without the complexity of self-hosting.
