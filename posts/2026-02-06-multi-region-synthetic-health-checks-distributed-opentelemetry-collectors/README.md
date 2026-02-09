# How to Set Up Multi-Region Synthetic Health Checks Using Distributed OpenTelemetry Collectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Synthetic Monitoring, Multi-Region, Health Checks

Description: Deploy OpenTelemetry Collectors across multiple regions to run synthetic health checks and detect regional availability issues.

If your users are spread across the globe, monitoring your application from a single location gives you an incomplete picture. A service that responds fine from US-East might be unreachable from Asia-Pacific due to DNS issues, routing problems, or regional outages. Synthetic health checks from multiple regions solve this problem by actively probing your endpoints and reporting back timing and status data.

OpenTelemetry Collectors can serve as lightweight synthetic probing agents when configured with the right receivers and processors. In this post, we will set up collectors in multiple regions that run HTTP checks against your services and report the results as OpenTelemetry metrics to a central backend.

## Architecture Overview

The setup is straightforward. You deploy an OpenTelemetry Collector in each region you care about. Each collector runs the `httpcheck` receiver, which periodically hits your endpoints and generates metrics about response time, status codes, and errors. All collectors export their metrics to a single central backend.

```
[Collector: US-East]  ----\
[Collector: EU-West]  ------> [Central OTLP Backend]
[Collector: AP-South] ----/
```

Each collector tags its metrics with its region, so you can compare performance across locations.

## Collector Configuration

Here is the configuration for a collector running in one region. You would deploy this same config to each region, changing only the region attribute:

```yaml
# otel-collector-synthetic.yaml
receivers:
  # HTTP check receiver probes endpoints on a schedule
  httpcheck:
    targets:
      - endpoint: https://api.example.com/health
        method: GET
      - endpoint: https://api.example.com/v2/status
        method: GET
      - endpoint: https://www.example.com
        method: GET
    collection_interval: 60s

processors:
  # Tag every metric with the region this collector runs in
  attributes:
    actions:
      - key: probe.region
        value: "us-east-1"
        action: upsert
      - key: probe.collector_id
        value: "synthetic-us-east-1"
        action: upsert

  # Add resource-level attributes
  resource:
    attributes:
      - key: service.name
        value: "synthetic-monitor"
        action: upsert
      - key: deployment.region
        value: "us-east-1"
        action: upsert

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "https://central-otel-backend.example.com:4317"
    tls:
      insecure: false
    headers:
      # Auth token for the central backend
      Authorization: "Bearer ${env:OTEL_AUTH_TOKEN}"

service:
  pipelines:
    metrics:
      receivers: [httpcheck]
      processors: [attributes, resource, batch]
      exporters: [otlp]
```

The `httpcheck` receiver generates several useful metrics:
- `httpcheck.status` - 1 for up, 0 for down
- `httpcheck.duration` - response time in milliseconds
- `httpcheck.error` - count of failed checks

## Deploying Across Regions with Terraform

Here is a Terraform snippet that deploys the collector to multiple AWS regions using ECS Fargate. This keeps costs low since each collector is a tiny container:

```hcl
# main.tf
variable "regions" {
  default = ["us-east-1", "eu-west-1", "ap-south-1"]
}

module "synthetic_collector" {
  source   = "./modules/ecs-collector"
  for_each = toset(var.regions)

  region              = each.value
  collector_image     = "otel/opentelemetry-collector-contrib:0.96.0"
  config_template     = file("${path.module}/otel-collector-synthetic.yaml")
  # Substitute the region into the config
  config_vars = {
    region = each.value
  }
  cpu    = 256
  memory = 512
  # Run in a public subnet so it can reach external endpoints
  subnet_ids = var.public_subnet_ids[each.value]
}
```

For the config templating, use a sed replacement or envsubst to swap the region value at deploy time:

```bash
# deploy.sh - Deploy collector to a specific region
#!/bin/bash
REGION=$1

# Replace the region placeholder in the config
sed "s/us-east-1/${REGION}/g" otel-collector-synthetic.yaml > /tmp/config-${REGION}.yaml

# Deploy to ECS in the target region
aws ecs update-service \
  --region "${REGION}" \
  --cluster synthetic-monitoring \
  --service otel-collector \
  --force-new-deployment
```

## Building a Regional Comparison Dashboard

Once all collectors report to the central backend, you can build queries that compare regions. Here are some useful PromQL queries:

```promql
# Response time by region for the health endpoint
httpcheck_duration{http_url="https://api.example.com/health"}

# Average response time per region over 10 minutes
avg by (probe_region) (
  avg_over_time(httpcheck_duration{http_url="https://api.example.com/health"}[10m])
)

# Availability percentage per region (1 = up, 0 = down)
avg by (probe_region) (
  avg_over_time(httpcheck_status{http_url="https://api.example.com/health"}[1h])
) * 100
```

## Alerting on Regional Outages

You want to alert when a specific region cannot reach your service, but not when it is just a single probe failure. Here is an alert rule that requires sustained failure:

```yaml
# alerts.yaml
groups:
  - name: synthetic-regional
    rules:
      - alert: RegionalEndpointDown
        # Endpoint has been down for 5 minutes from a specific region
        expr: httpcheck_status == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.http_url }} unreachable from {{ $labels.probe_region }}"

      - alert: RegionalLatencySpike
        # Response time exceeds 2 seconds from any region
        expr: httpcheck_duration > 2000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency to {{ $labels.http_url }} from {{ $labels.probe_region }}"
```

## Practical Tips

Keep the probe interval reasonable. Running checks every 10 seconds from 5 regions means 30 requests per minute per endpoint. That can add up if you monitor many endpoints. A 60-second interval is usually a good starting point.

Use dedicated, small instances or serverless containers for the collectors. They do not need much compute, and you want them to be lightweight and cheap since they are deployed in every region.

Make sure the probing collectors have stable, predictable network paths. Avoid running them in shared environments where noisy neighbors could affect your latency measurements.

## Wrapping Up

Distributed OpenTelemetry Collectors make a practical foundation for multi-region synthetic monitoring. Each collector acts as a probe, generating standardized metrics that flow into your existing observability stack. You get regional visibility into endpoint availability and performance without bolting on yet another monitoring tool.
