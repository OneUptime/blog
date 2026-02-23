# How to Build an Observability Platform with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Observability, Monitoring, Prometheus, Grafana, AWS, Infrastructure as Code

Description: Learn how to build a complete observability platform using Terraform with metrics, logging, tracing, and alerting for full visibility into your infrastructure and applications.

---

Observability is not just about dashboards. It is about understanding what your systems are doing, why they are doing it, and having the information you need when things go wrong. A proper observability platform combines metrics, logs, and traces into a unified view that lets you diagnose issues quickly and understand system behavior over time.

In this guide, we will build a complete observability platform on AWS using Terraform. The platform covers all three pillars of observability: metrics with Prometheus, logs with CloudWatch, and traces with X-Ray, all tied together with Grafana dashboards and alerting.

## Platform Architecture

Our observability platform includes:

- **Metrics**: Amazon Managed Service for Prometheus (AMP)
- **Logs**: CloudWatch Logs with structured logging
- **Traces**: AWS X-Ray for distributed tracing
- **Dashboards**: Amazon Managed Grafana
- **Alerting**: SNS, PagerDuty, and Slack integration
- **Data retention**: Tiered storage for cost management

## Metrics with Managed Prometheus

Amazon Managed Prometheus provides a Prometheus-compatible metrics backend without the operational overhead.

```hcl
# metrics.tf - Prometheus workspace
resource "aws_prometheus_workspace" "main" {
  alias = "${var.project_name}-metrics"

  logging_configuration {
    log_group_arn = "${aws_cloudwatch_log_group.prometheus.arn}:*"
  }

  tags = {
    Platform = "observability"
    Purpose  = "metrics"
  }
}

resource "aws_cloudwatch_log_group" "prometheus" {
  name              = "/observability/prometheus"
  retention_in_days = 30
}

# Alert manager configuration
resource "aws_prometheus_alert_manager_definition" "main" {
  workspace_id = aws_prometheus_workspace.main.id

  definition = yamlencode({
    alertmanager_config = yamlencode({
      route = {
        receiver = "default"
        group_by = ["alertname", "namespace"]
        routes = [
          {
            match = {
              severity = "critical"
            }
            receiver   = "pagerduty"
            group_wait = "10s"
          },
          {
            match = {
              severity = "warning"
            }
            receiver = "slack"
            group_wait = "5m"
          }
        ]
      }
      receivers = [
        {
          name = "default"
          sns_configs = [
            {
              topic_arn = aws_sns_topic.observability_alerts.arn
              sigv4 = {
                region = var.aws_region
              }
              message = "{{ .CommonAnnotations.summary }}"
            }
          ]
        },
        {
          name = "pagerduty"
          sns_configs = [
            {
              topic_arn = aws_sns_topic.critical_alerts.arn
              sigv4 = {
                region = var.aws_region
              }
            }
          ]
        },
        {
          name = "slack"
          sns_configs = [
            {
              topic_arn = aws_sns_topic.warning_alerts.arn
              sigv4 = {
                region = var.aws_region
              }
            }
          ]
        }
      ]
    })
  })
}

# Prometheus alerting rules
resource "aws_prometheus_rule_group_namespace" "main" {
  name         = "platform-rules"
  workspace_id = aws_prometheus_workspace.main.id

  data = yamlencode({
    groups = [
      {
        name = "infrastructure"
        rules = [
          {
            alert = "HighCPUUsage"
            expr  = "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100) > 85"
            for   = "5m"
            labels = {
              severity = "warning"
            }
            annotations = {
              summary = "High CPU usage on {{ $labels.instance }}"
              description = "CPU usage is above 85% for more than 5 minutes"
            }
          },
          {
            alert = "HighMemoryUsage"
            expr  = "(1 - node_memory_AvailableBytes / node_memory_MemoryTotal_bytes) * 100 > 90"
            for   = "5m"
            labels = {
              severity = "critical"
            }
            annotations = {
              summary = "High memory usage on {{ $labels.instance }}"
            }
          },
          {
            alert = "PodCrashLooping"
            expr  = "rate(kube_pod_container_status_restarts_total[15m]) > 0"
            for   = "5m"
            labels = {
              severity = "critical"
            }
            annotations = {
              summary = "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
            }
          }
        ]
      },
      {
        name = "application"
        rules = [
          {
            alert = "HighErrorRate"
            expr  = "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) > 0.05"
            for   = "5m"
            labels = {
              severity = "critical"
            }
            annotations = {
              summary = "Error rate above 5%"
            }
          },
          {
            alert = "HighLatency"
            expr  = "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2"
            for   = "5m"
            labels = {
              severity = "warning"
            }
            annotations = {
              summary = "P99 latency above 2 seconds"
            }
          }
        ]
      }
    ]
  })
}
```

## Centralized Logging

CloudWatch Logs collects logs from all services with consistent formatting and retention.

```hcl
# logging.tf - Centralized logging infrastructure
# Log groups organized by service
resource "aws_cloudwatch_log_group" "services" {
  for_each = var.services

  name              = "/services/${each.key}"
  retention_in_days = var.environment == "production" ? 90 : 30
  kms_key_id        = aws_kms_key.observability.arn

  tags = {
    Service = each.key
    Platform = "observability"
  }
}

# Log subscription for real-time processing
resource "aws_cloudwatch_log_subscription_filter" "to_opensearch" {
  for_each = var.services

  name            = "${each.key}-to-opensearch"
  log_group_name  = aws_cloudwatch_log_group.services[each.key].name
  filter_pattern  = ""
  destination_arn = aws_lambda_function.log_processor.arn
}

# Lambda function to process and forward logs
resource "aws_lambda_function" "log_processor" {
  filename      = "log_processor.zip"
  function_name = "observability-log-processor"
  role          = aws_iam_role.log_processor.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 256

  environment {
    variables = {
      OPENSEARCH_ENDPOINT = aws_opensearch_domain.logs.endpoint
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.log_processor.id]
  }
}

# OpenSearch for log search and analysis
resource "aws_opensearch_domain" "logs" {
  domain_name    = "${var.project_name}-logs"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type            = "r6g.large.search"
    instance_count           = 3
    zone_awareness_enabled   = true
    dedicated_master_enabled = true
    dedicated_master_type    = "m6g.large.search"
    dedicated_master_count   = 3

    zone_awareness_config {
      availability_zone_count = 3
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 500
    volume_type = "gp3"
    throughput  = 250
    iops        = 3000
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.observability.arn
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  vpc_options {
    subnet_ids         = slice(var.private_subnet_ids, 0, 3)
    security_group_ids = [aws_security_group.opensearch.id]
  }

  # Index lifecycle management via advanced options
  advanced_options = {
    "rest.action.multi.allow_explicit_index" = "true"
  }

  tags = {
    Platform = "observability"
    Purpose  = "logs"
  }
}
```

## Distributed Tracing

X-Ray provides distributed tracing to follow requests across services.

```hcl
# tracing.tf - Distributed tracing with X-Ray
resource "aws_xray_group" "services" {
  for_each = var.service_groups

  group_name        = each.key
  filter_expression = each.value.filter

  insights_configuration {
    insights_enabled          = true
    notifications_enabled     = true
  }
}

resource "aws_xray_sampling_rule" "default" {
  rule_name      = "default-sampling"
  priority       = 9999
  version        = 1
  reservoir_size = 5
  fixed_rate     = 0.05 # Sample 5% of requests
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
}

# Higher sampling for critical services
resource "aws_xray_sampling_rule" "critical_services" {
  rule_name      = "critical-services"
  priority       = 100
  version        = 1
  reservoir_size = 10
  fixed_rate     = 0.2 # Sample 20% of requests
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "payment-*"
  resource_arn   = "*"
}
```

## Grafana Dashboards

Amazon Managed Grafana provides a dashboard layer that ties metrics, logs, and traces together.

```hcl
# dashboards.tf - Managed Grafana
resource "aws_grafana_workspace" "main" {
  name                     = "${var.project_name}-observability"
  account_access_type      = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type          = "SERVICE_MANAGED"
  role_arn                 = aws_iam_role.grafana.arn

  data_sources = [
    "PROMETHEUS",
    "CLOUDWATCH",
    "XRAY"
  ]

  notification_destinations = ["SNS"]

  configuration = jsonencode({
    plugins = {
      pluginAdminEnabled = true
    }
    unifiedAlerting = {
      enabled = true
    }
  })

  tags = {
    Platform = "observability"
  }
}

# Grafana data source for Prometheus
resource "aws_grafana_workspace_configuration" "prometheus" {
  workspace_id = aws_grafana_workspace.main.id

  configuration = jsonencode({
    datasources = [
      {
        name      = "Prometheus"
        type      = "prometheus"
        url       = aws_prometheus_workspace.main.prometheus_endpoint
        isDefault = true
        jsonData = {
          httpMethod    = "POST"
          sigV4Auth     = true
          sigV4AuthType = "default"
          sigV4Region   = var.aws_region
        }
      }
    ]
  })
}
```

## Alerting Infrastructure

```hcl
# alerting.tf - Multi-channel alerting
resource "aws_sns_topic" "critical_alerts" {
  name = "observability-critical-alerts"

  tags = {
    Severity = "critical"
  }
}

resource "aws_sns_topic" "warning_alerts" {
  name = "observability-warning-alerts"

  tags = {
    Severity = "warning"
  }
}

resource "aws_sns_topic" "observability_alerts" {
  name = "observability-general-alerts"
}

# Email subscription for critical alerts
resource "aws_sns_topic_subscription" "critical_email" {
  for_each = toset(var.oncall_emails)

  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}
```

## Summary

A complete observability platform built with Terraform combines metrics (Prometheus), logs (CloudWatch + OpenSearch), and traces (X-Ray) with dashboards (Grafana) and alerting (SNS). Each component is configured through code, making the entire platform reproducible and auditable.

The most important aspect is connecting these components. A single alert should link to the relevant dashboard, which should link to the relevant logs and traces. This reduces mean time to resolution when incidents happen.

For a managed observability solution that works out of the box, [OneUptime](https://oneuptime.com) provides uptime monitoring, incident management, status pages, and alerting in a single platform, reducing the complexity of running your own observability stack.
