# How to Deploy Prometheus with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Prometheus, Monitoring, Kubernetes, Infrastructure as Code

Description: Learn how to deploy Prometheus monitoring using Terraform with Helm charts on Kubernetes and configure scraping, storage, and alerting rules.

---

Prometheus is the de facto standard for metrics collection in cloud-native environments. Deploying it through Terraform with Helm charts ensures your monitoring infrastructure is consistent, reproducible, and managed as code. This guide covers deploying Prometheus on Kubernetes, configuring scrape targets, and setting up alerting rules.

## Setting Up the Providers

```hcl
terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Creating the Monitoring Namespace

```hcl
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    labels = {
      purpose = "monitoring"
    }
  }
}
```

## Deploying Prometheus with Helm

```hcl
# Deploy the kube-prometheus-stack (Prometheus, Grafana, Alertmanager)
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "55.0.0"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  # Prometheus server configuration
  set {
    name  = "prometheus.prometheusSpec.retention"
    value = "30d"
  }

  set {
    name  = "prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage"
    value = "50Gi"
  }

  set {
    name  = "prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName"
    value = "standard"
  }

  # Resource limits
  set {
    name  = "prometheus.prometheusSpec.resources.requests.memory"
    value = "2Gi"
  }

  set {
    name  = "prometheus.prometheusSpec.resources.requests.cpu"
    value = "500m"
  }

  set {
    name  = "prometheus.prometheusSpec.resources.limits.memory"
    value = "4Gi"
  }

  # Alertmanager configuration
  set {
    name  = "alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage"
    value = "10Gi"
  }

  # Grafana configuration
  set {
    name  = "grafana.adminPassword"
    value = var.grafana_password
  }

  set {
    name  = "grafana.persistence.enabled"
    value = "true"
  }

  set {
    name  = "grafana.persistence.size"
    value = "10Gi"
  }

  # Enable ServiceMonitor auto-discovery
  set {
    name  = "prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues"
    value = "false"
  }

  set {
    name  = "prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues"
    value = "false"
  }

  values = [
    yamlencode({
      # Additional scrape configs
      prometheus = {
        prometheusSpec = {
          additionalScrapeConfigs = [
            {
              job_name        = "node-exporter-external"
              scrape_interval = "30s"
              static_configs = [{
                targets = ["node-exporter.monitoring.svc.cluster.local:9100"]
              }]
            }
          ]
        }
      }

      # Alertmanager routes
      alertmanager = {
        config = {
          route = {
            receiver        = "default"
            group_by        = ["alertname", "namespace"]
            group_wait      = "30s"
            group_interval  = "5m"
            repeat_interval = "4h"
            routes = [
              {
                receiver = "critical"
                matchers = ["severity = critical"]
              }
            ]
          }
          receivers = [
            {
              name = "default"
              email_configs = [{
                to   = var.ops_email
                from = "alertmanager@company.com"
              }]
            },
            {
              name = "critical"
              pagerduty_configs = [{
                service_key = var.pagerduty_key
              }]
            }
          ]
        }
      }
    })
  ]
}

variable "grafana_password" { type = string; sensitive = true }
variable "ops_email" { type = string }
variable "pagerduty_key" { type = string; sensitive = true }
```

## Creating ServiceMonitors

```hcl
# Create a ServiceMonitor for a custom application
resource "kubernetes_manifest" "app_service_monitor" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "app-metrics"
      namespace = kubernetes_namespace.monitoring.metadata[0].name
      labels = {
        release = "prometheus"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          app = "my-application"
        }
      }
      namespaceSelector = {
        matchNames = ["default"]
      }
      endpoints = [{
        port     = "metrics"
        interval = "30s"
        path     = "/metrics"
      }]
    }
  }

  depends_on = [helm_release.prometheus]
}
```

## Custom Alerting Rules

```hcl
# Create custom PrometheusRule
resource "kubernetes_manifest" "alert_rules" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "custom-alerts"
      namespace = kubernetes_namespace.monitoring.metadata[0].name
      labels = {
        release = "prometheus"
      }
    }
    spec = {
      groups = [{
        name = "application-alerts"
        rules = [
          {
            alert = "HighErrorRate"
            expr  = "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) > 0.05"
            for   = "5m"
            labels = {
              severity = "critical"
            }
            annotations = {
              summary     = "High error rate detected"
              description = "Error rate is {{ $value | humanizePercentage }}"
            }
          },
          {
            alert = "HighLatency"
            expr  = "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1"
            for   = "5m"
            labels = {
              severity = "warning"
            }
            annotations = {
              summary = "High p95 latency detected"
            }
          }
        ]
      }]
    }
  }

  depends_on = [helm_release.prometheus]
}
```

## Best Practices

Use persistent storage for both Prometheus and Alertmanager data. Set appropriate retention periods based on your storage capacity. Use ServiceMonitors for automatic discovery of scrape targets. Define alerting rules as PrometheusRule custom resources for automatic loading. Set resource limits to prevent Prometheus from consuming all cluster resources. Use the kube-prometheus-stack chart for a batteries-included deployment.

For connecting Prometheus to Grafana dashboards, see our guide on [Grafana data sources](https://oneuptime.com/blog/post/2026-02-23-how-to-create-grafana-data-sources-with-terraform/view).

## Conclusion

Deploying Prometheus with Terraform and Helm provides a reproducible, version-controlled monitoring stack. By managing the deployment, scrape configuration, and alerting rules as code, you ensure that your monitoring infrastructure is as reliable and well-managed as the applications it monitors. The kube-prometheus-stack chart provides a comprehensive starting point that you can customize to your needs.
