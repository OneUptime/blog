# How to Deploy Monitoring Stack on Kubernetes with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Monitoring, Prometheus, Grafana, Loki, DevOps

Description: Learn how to deploy a complete monitoring stack on Kubernetes with Terraform, including Prometheus for metrics, Grafana for dashboards, Loki for logs, and alerting configuration.

---

Running workloads on Kubernetes without monitoring is flying blind. You need metrics to understand resource usage and application performance, logs to debug issues, and alerts to know when something breaks. The standard open-source monitoring stack - Prometheus, Grafana, and Loki - gives you all three. Deploying it through Terraform means your monitoring infrastructure is as reproducible as the workloads it watches.

This guide walks through setting up a complete monitoring stack on Kubernetes using Terraform.

## The Monitoring Stack Components

A typical monitoring stack includes:

- **Prometheus** - Collects and stores time-series metrics
- **Grafana** - Visualizes metrics and logs in dashboards
- **Alertmanager** - Routes alerts to Slack, PagerDuty, email, etc.
- **Loki** - Aggregates and queries logs (the "Prometheus for logs")
- **Promtail** - Ships logs from pods to Loki

## Deploying Prometheus and Grafana

The kube-prometheus-stack Helm chart bundles Prometheus, Grafana, Alertmanager, and a set of default dashboards and recording rules.

```hcl
# Create the monitoring namespace
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"

    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Deploy the full monitoring stack
resource "helm_release" "prometheus_stack" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "55.5.0"

  values = [
    yamlencode({
      # Prometheus configuration
      prometheus = {
        prometheusSpec = {
          # How long to keep metrics
          retention     = "30d"
          retentionSize = "45GB"

          # Resource limits
          resources = {
            requests = {
              cpu    = "500m"
              memory = "2Gi"
            }
            limits = {
              memory = "4Gi"
            }
          }

          # Persistent storage for metrics
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "50Gi"
                  }
                }
              }
            }
          }

          # Scrape all ServiceMonitors across all namespaces
          serviceMonitorSelectorNilUsesHelmValues = false
          podMonitorSelectorNilUsesHelmValues     = false
          ruleSelectorNilUsesHelmValues            = false
        }
      }

      # Grafana configuration
      grafana = {
        enabled       = true
        adminPassword = var.grafana_password

        persistence = {
          enabled          = true
          size             = "10Gi"
          storageClassName = "gp3"
        }

        # Ingress for Grafana
        ingress = {
          enabled          = true
          ingressClassName = "nginx"
          hosts            = ["grafana.${var.domain}"]
          tls = [{
            secretName = "grafana-tls"
            hosts      = ["grafana.${var.domain}"]
          }]
          annotations = {
            "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
          }
        }

        # Additional data sources
        additionalDataSources = [{
          name      = "Loki"
          type      = "loki"
          url       = "http://loki-gateway.monitoring.svc.cluster.local"
          access    = "proxy"
          isDefault = false
        }]
      }

      # Alertmanager configuration
      alertmanager = {
        alertmanagerSpec = {
          replicas = 2

          storage = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "5Gi"
                  }
                }
              }
            }
          }
        }

        config = {
          global = {
            resolve_timeout = "5m"
          }
          route = {
            group_by        = ["alertname", "namespace"]
            group_wait      = "30s"
            group_interval  = "5m"
            repeat_interval = "4h"
            receiver        = "slack"
            routes = [
              {
                match = {
                  severity = "critical"
                }
                receiver        = "pagerduty"
                repeat_interval = "1h"
              }
            ]
          }
          receivers = [
            {
              name = "slack"
              slack_configs = [{
                api_url  = var.slack_webhook_url
                channel  = "#alerts"
                title    = "{{ .GroupLabels.alertname }}"
                text     = "{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}"
              }]
            },
            {
              name = "pagerduty"
              pagerduty_configs = [{
                service_key = var.pagerduty_key
              }]
            }
          ]
        }
      }
    })
  ]

  wait    = true
  timeout = 600
}
```

## Deploying Loki for Log Aggregation

Loki is a horizontally scalable log aggregation system inspired by Prometheus.

```hcl
# Deploy Loki
resource "helm_release" "loki" {
  name       = "loki"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "loki"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "5.41.0"

  values = [
    yamlencode({
      # Simple scalable mode for medium clusters
      deploymentMode = "SimpleScalable"

      loki = {
        auth_enabled = false

        # Store logs in S3 for cost-effective long-term storage
        storage = {
          type = "s3"
          s3 = {
            region     = var.aws_region
            bucketnames = var.loki_bucket_name
          }
        }

        # Schema configuration
        schemaConfig = {
          configs = [{
            from         = "2024-01-01"
            store        = "tsdb"
            object_store = "s3"
            schema       = "v13"
            index = {
              prefix = "index_"
              period = "24h"
            }
          }]
        }

        limits_config = {
          retention_period = "30d"
          max_query_series = 5000
        }
      }

      # Write path
      write = {
        replicas = 2
        resources = {
          requests = {
            cpu    = "200m"
            memory = "256Mi"
          }
          limits = {
            memory = "512Mi"
          }
        }
      }

      # Read path
      read = {
        replicas = 2
        resources = {
          requests = {
            cpu    = "200m"
            memory = "256Mi"
          }
          limits = {
            memory = "512Mi"
          }
        }
      }

      # Gateway
      gateway = {
        replicas = 1
      }
    })
  ]

  depends_on = [kubernetes_namespace.monitoring]
}

# Deploy Promtail to ship logs to Loki
resource "helm_release" "promtail" {
  name       = "promtail"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "promtail"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "6.15.0"

  values = [
    yamlencode({
      config = {
        clients = [{
          url = "http://loki-gateway.monitoring.svc.cluster.local/loki/api/v1/push"
        }]
      }

      resources = {
        requests = {
          cpu    = "50m"
          memory = "64Mi"
        }
        limits = {
          memory = "128Mi"
        }
      }
    })
  ]

  depends_on = [helm_release.loki]
}
```

## Creating Custom ServiceMonitors

Tell Prometheus what to scrape by creating ServiceMonitor resources.

```hcl
# ServiceMonitor for your application
resource "kubectl_manifest" "app_service_monitor" {
  yaml_body = <<YAML
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app
  namespace: monitoring
  labels:
    app: my-app
spec:
  namespaceSelector:
    matchNames:
      - production
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
      scrapeTimeout: 10s
YAML

  depends_on = [helm_release.prometheus_stack]
}
```

## Custom Alerting Rules

Define alerting rules as PrometheusRule custom resources.

```hcl
# Custom alerting rules
resource "kubectl_manifest" "app_alerts" {
  yaml_body = <<YAML
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: app-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: app.rules
      rules:
        # High error rate alert
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m])) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate detected"
            description: "Error rate is above 5% for the last 5 minutes"

        # Pod restart alert
        - alert: PodRestarting
          expr: |
            increase(kube_pod_container_status_restarts_total[1h]) > 5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.pod }} restarting frequently"
            description: "Pod has restarted more than 5 times in the last hour"

        # High memory usage
        - alert: HighMemoryUsage
          expr: |
            container_memory_working_set_bytes{container!=""}
            /
            container_spec_memory_limit_bytes{container!=""} > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Container using >90% of memory limit"
            description: "{{ $labels.container }} in {{ $labels.pod }} is using {{ $value | humanizePercentage }} of its memory limit"
YAML

  depends_on = [helm_release.prometheus_stack]
}
```

## Grafana Dashboards as Code

Store Grafana dashboards in ConfigMaps so they are automatically imported.

```hcl
# Create a ConfigMap with a Grafana dashboard
resource "kubernetes_config_map" "grafana_dashboard" {
  metadata {
    name      = "app-dashboard"
    namespace = "monitoring"

    labels = {
      # This label tells the Grafana sidecar to import it
      grafana_dashboard = "1"
    }
  }

  data = {
    "app-dashboard.json" = file("${path.module}/dashboards/app.json")
  }
}
```

## Node Exporter and kube-state-metrics

The kube-prometheus-stack chart includes these by default. They provide node-level metrics and Kubernetes object metrics.

```hcl
# These are enabled by default in kube-prometheus-stack
# but you can customize them:
resource "helm_release" "prometheus_stack" {
  # ... previous config ...

  values = [
    yamlencode({
      # Node exporter runs on every node
      nodeExporter = {
        enabled = true
        resources = {
          requests = {
            cpu    = "50m"
            memory = "32Mi"
          }
          limits = {
            memory = "64Mi"
          }
        }
      }

      # kube-state-metrics tracks Kubernetes object states
      kube-state-metrics = {
        resources = {
          requests = {
            cpu    = "50m"
            memory = "64Mi"
          }
          limits = {
            memory = "128Mi"
          }
        }
      }
    })
  ]
}
```

## Best Practices

- Set appropriate retention periods based on your storage budget
- Use persistent volumes for Prometheus and Alertmanager to survive restarts
- Scrape all namespaces by setting `serviceMonitorSelectorNilUsesHelmValues = false`
- Create alerts for both infrastructure (node, pod) and application metrics
- Use recording rules for frequently-used expensive queries
- Store Grafana dashboards in version control as JSON
- Ship logs to object storage (S3, GCS) for cost-effective long-term retention
- Set resource limits on all monitoring components to prevent them from starving your workloads

For more on Kubernetes infrastructure management, check out our guide on [deploying cluster autoscaler with Terraform](https://oneuptime.com/blog/post/2026-02-23-cluster-autoscaler-terraform/view).
