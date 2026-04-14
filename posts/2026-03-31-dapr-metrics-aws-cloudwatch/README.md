# How to Send Dapr Metrics to AWS CloudWatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, CloudWatch, Metric, EKS

Description: Learn how to forward Dapr Prometheus metrics to AWS CloudWatch using the CloudWatch Agent with Prometheus scraping on Amazon EKS clusters.

---

## Overview

AWS CloudWatch can ingest Prometheus metrics from EKS workloads using the CloudWatch Agent or the Amazon Managed Service for Prometheus (AMP). Sending Dapr metrics to CloudWatch consolidates observability within the AWS ecosystem, enabling CloudWatch dashboards, alarms, and integration with AWS services.

## Enabling Dapr Metrics Endpoint

Enable Prometheus metrics on Dapr sidecars:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: default
spec:
  metrics:
    enabled: true
```

```yaml
annotations:
  dapr.io/config: "dapr-config"
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
```

## Configuring CloudWatch Agent for Prometheus

Install the CloudWatch Agent with Prometheus configuration:

```bash
# Create the IAM role for CloudWatch Agent
aws iam create-role \
  --role-name CloudWatchAgentRole \
  --assume-role-policy-document file://eks-trust-policy.json

aws iam attach-role-policy \
  --role-name CloudWatchAgentRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
```

Deploy the CloudWatch Agent as a DaemonSet:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cwagent-prometheus-config
  namespace: amazon-cloudwatch
data:
  prometheus-inputs.json: |
    {
      "global": {
        "scrape_interval": "30s"
      },
      "scrape_configs": [
        {
          "job_name": "dapr-sidecars",
          "kubernetes_sd_configs": [
            {
              "role": "pod"
            }
          ],
          "relabel_configs": [
            {
              "source_labels": ["__meta_kubernetes_pod_annotation_dapr_io_enabled"],
              "action": "keep",
              "regex": "true"
            },
            {
              "source_labels": ["__meta_kubernetes_pod_ip"],
              "replacement": "${1}:9090",
              "target_label": "__address__"
            },
            {
              "source_labels": ["__meta_kubernetes_pod_annotation_dapr_io_app_id"],
              "target_label": "app_id"
            }
          ],
          "metrics_path": "/metrics"
        }
      ]
    }

  cwagentconfig.json: |
    {
      "logs": {
        "metrics_collected": {
          "prometheus": {
            "prometheus_config_path": "/etc/prometheusconfig/prometheus-inputs.json",
            "emf_processor": {
              "metric_declaration": [
                {
                  "source_labels": ["job"],
                  "label_matcher": "^dapr-sidecars$",
                  "dimensions": [["app_id", "namespace"]],
                  "metric_selectors": [
                    "dapr_http_server_request_count",
                    "dapr_resiliency_activations_total"
                  ]
                }
              ]
            }
          }
        }
      }
    }
```

## Creating CloudWatch Dashboards

Build a CloudWatch dashboard for Dapr metrics via CLI:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name DaprOverview \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["ContainerInsights/Prometheus", "dapr_http_server_request_count",
             "app_id", "order-service", { "stat": "Sum", "period": 60 }]
          ],
          "title": "Dapr Request Count",
          "view": "timeSeries",
          "period": 60
        }
      },
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["ContainerInsights/Prometheus", "dapr_resiliency_activations_total",
             "app_id", "order-service", { "stat": "Sum", "period": 60 }]
          ],
          "title": "Resiliency Activations",
          "view": "timeSeries"
        }
      }
    ]
  }'
```

## Setting CloudWatch Alarms for Dapr

Create an alarm on Dapr resiliency activations:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name DaprHighResiliencyRate \
  --namespace ContainerInsights/Prometheus \
  --metric-name dapr_resiliency_activations_total \
  --dimensions Name=app_id,Value=payment-service \
  --statistic Sum \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:dapr-alerts \
  --ok-actions arn:aws:sns:us-east-1:123456789012:dapr-alerts
```

## Using Amazon Managed Service for Prometheus

For large-scale Dapr deployments, use AMP:

```bash
# Create an AMP workspace
aws amp create-workspace \
  --alias dapr-metrics \
  --region us-east-1

# Get the remote write URL
aws amp describe-workspace \
  --workspace-id ws-abc123 \
  --query "workspace.prometheusEndpoint"
```

Configure Prometheus to remote-write to AMP, then use AMG (Amazon Managed Grafana) for visualization.

## Summary

Sending Dapr metrics to AWS CloudWatch on EKS uses the CloudWatch Agent with Prometheus scraping configuration. The EMF processor converts Prometheus metrics into CloudWatch custom metrics for dashboards and alarms. For larger deployments, Amazon Managed Service for Prometheus with Amazon Managed Grafana provides a scalable alternative that keeps Dapr metrics within the AWS ecosystem.
