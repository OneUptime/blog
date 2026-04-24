# How to Deploy Prometheus Stack with Helm and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, Alertmanager, OpenTofu, Helm, Monitoring, Observability

Description: Learn how to deploy the kube-prometheus-stack on Kubernetes using OpenTofu and Helm for full-cluster monitoring with Prometheus, Alertmanager, and pre-built Grafana dashboards.

## Overview

The kube-prometheus-stack Helm chart deploys Prometheus Operator, Prometheus, Alertmanager, Grafana, and a full set of Kubernetes monitoring rules in a single chart. OpenTofu manages the deployment and configuration declaratively.

## Step 1: Deploy kube-prometheus-stack with Helm

```hcl
# main.tf - Deploy Prometheus Stack via Helm

resource "random_password" "grafana_admin" {
  length  = 24
  special = false
}

resource "helm_release" "prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = "83.6.0"
  namespace        = "monitoring"
  create_namespace = true

  # Increase timeout for large chart with many CRDs
  timeout = 600

  values = [yamlencode({
    # Prometheus configuration
    prometheus = {
      prometheusSpec = {
        retention          = "30d"
        retentionSize      = "50GB"
        replicas           = 2

        # Storage
        storageSpec = {
          volumeClaimTemplate = {
            spec = {
              storageClassName = "gp3"
              accessModes      = ["ReadWriteOnce"]
              resources = {
                requests = { storage = "50Gi" }
              }
            }
          }
        }

        # Scrape all ServiceMonitors and PodMonitors cluster-wide
        serviceMonitorSelectorNilUsesHelmValues  = false
        podMonitorSelectorNilUsesHelmValues       = false
        ruleSelectorNilUsesHelmValues             = false

        resources = {
          requests = { memory = "512Mi", cpu = "250m" }
          limits   = { memory = "2Gi", cpu = "2000m" }
        }
      }
    }

    # Alertmanager configuration
    alertmanager = {
      alertmanagerSpec = {
        replicas = 2
        storage = {
          volumeClaimTemplate = {
            spec = {
              storageClassName = "gp3"
              resources = {
                requests = { storage = "10Gi" }
              }
            }
          }
        }
      }

      config = {
        global = {
          smtp_from         = "alerts@example.com"
          smtp_smarthost    = "smtp.example.com:587"
        }

        route = {
          group_by        = ["alertname", "cluster", "service"]
          group_wait      = "10s"
          group_interval  = "10m"
          repeat_interval = "12h"
          receiver        = "default"

          routes = [{
            matchers = ["severity = \"critical\""]
            receiver = "pagerduty"
          }]
        }

        receivers = [
          {
            name = "default"
            slack_configs = [{
              api_url  = var.slack_webhook_url
              channel  = "#alerts"
              title    = "{{ .GroupLabels.alertname }}"
              text     = "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
            }]
          },
          {
            name = "pagerduty"
            pagerduty_configs = [{
              routing_key = var.pagerduty_key
              severity    = "{{ .CommonLabels.severity }}"
            }]
          }
        ]
      }
    }

    # Grafana configuration
    grafana = {
      adminPassword = random_password.grafana_admin.result

      persistence = {
        enabled          = true
        size             = "10Gi"
        storageClassName = "gp3"
      }

      ingress = {
        enabled          = true
        ingressClassName = "nginx"
        hosts            = ["grafana.example.com"]
        annotations = {
          "cert-manager.io/cluster-issuer" = "letsencrypt-production"
        }
        tls = [{ secretName = "grafana-tls", hosts = ["grafana.example.com"] }]
      }

      # Additional data sources
      additionalDataSources = [{
        name    = "Loki"
        type    = "loki"
        url     = "http://loki:3100"
        access  = "proxy"
      }]
    }

    # Node exporter on all nodes
    nodeExporter = {
      enabled = true
    }

    # kube-state-metrics
    kubeStateMetrics = {
      enabled = true
    }
  })]
}
```

## Step 2: Create Custom PrometheusRule

Apply Step 1 first so the Prometheus Operator CRDs already exist in the cluster. Then add the following resource and run `tofu apply` again. The `kubernetes_manifest` resource validates CRD schemas during planning, so it cannot create a `PrometheusRule` in the same initial apply that installs `kube-prometheus-stack`.

```hcl
# rules.tf - apply after the initial kube-prometheus-stack deployment
resource "kubernetes_manifest" "custom_alert_rule" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "app-alerts"
      namespace = "monitoring"
      labels = {
        "release" = "kube-prometheus-stack"
      }
    }
    spec = {
      groups = [{
        name = "app.rules"
        rules = [
          {
            alert = "HighErrorRate"
            expr  = "rate(http_requests_total{status=~\"5..\"}[5m]) > 0.1"
            for   = "5m"
            labels = { severity = "critical" }
            annotations = {
              summary     = "High error rate on {{ $labels.service }}"
              description = "Error rate is {{ $value }} req/s"
            }
          }
        ]
      }]
    }
  }
}
```

## Summary

The kube-prometheus-stack deployed with OpenTofu provides complete Kubernetes monitoring out of the box. Prometheus Operator manages Prometheus configuration through Kubernetes custom resources, ServiceMonitors auto-discover scrape targets, and pre-built alerting rules cover common failure scenarios. The stack's integration with Grafana provides dashboards for every Kubernetes component from day one.
