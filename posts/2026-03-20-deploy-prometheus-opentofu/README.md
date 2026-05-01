# How to Deploy Prometheus with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Prometheus, Kubernetes, Monitoring, Helm, Infrastructure as Code, Observability

Description: Learn how to deploy Prometheus to Kubernetes using OpenTofu and the Helm provider for a production-ready metrics collection and alerting setup.

---

Prometheus is the industry-standard metrics collection and alerting system for cloud-native environments. Deploying it via OpenTofu with the Helm provider gives you reproducible, version-controlled Prometheus configurations that can be promoted from dev to production consistently.

## Prerequisites

This guide assumes you have a running Kubernetes 1.25+ cluster. OpenTofu will use the Helm provider to deploy the `kube-prometheus-stack` chart, which includes Prometheus, Alertmanager, and a set of pre-built dashboards.

## Provider Configuration

```hcl
# providers.tf

terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.1"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.1"
    }
  }
}

provider "helm" {
  kubernetes = {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca_cert)
    token                  = var.cluster_token
  }
}

provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.cluster_token
}
```

## Creating the Namespace

```hcl
# namespace.tf
resource "kubernetes_namespace_v1" "monitoring" {
  metadata {
    name = "monitoring"
    labels = {
      "app.kubernetes.io/managed-by" = "opentofu"
    }
  }
}
```

## Deploying the Prometheus Stack

```hcl
# prometheus.tf
resource "helm_release" "kube_prometheus_stack" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "84.4.0"
  namespace  = kubernetes_namespace_v1.monitoring.metadata[0].name

  # Wait for all pods to be ready
  wait    = true
  timeout = 600

  # Custom values - override defaults for production
  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          # Set data retention period
          retention = "30d"

          # Storage configuration using a PersistentVolumeClaim
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = var.storage_class
                resources = {
                  requests = {
                    storage = "50Gi"
                  }
                }
              }
            }
          }

          # Resource limits
          resources = {
            requests = {
              cpu    = "500m"
              memory = "2Gi"
            }
            limits = {
              cpu    = "2"
              memory = "4Gi"
            }
          }
        }
      }

      alertmanager = {
        alertmanagerSpec = {
          useExistingSecret = true
          configSecret      = kubernetes_secret_v1.alertmanager_config.metadata[0].name

          storage = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = var.storage_class
                resources = {
                  requests = {
                    storage = "10Gi"
                  }
                }
              }
            }
          }
        }
      }

      # Grafana is included in the stack - configure admin password
      grafana = {
        adminPassword = var.grafana_admin_password
        persistence = {
          enabled          = true
          storageClassName = var.storage_class
          size             = "10Gi"
        }
      }
    })
  ]
}
```

## Configuring Alertmanager Routes

```hcl
# alertmanager_config.tf
# Deploy a custom Alertmanager configuration as a Kubernetes secret
resource "kubernetes_secret_v1" "alertmanager_config" {
  metadata {
    name      = "kube-prometheus-stack-alertmanager-config"
    namespace = kubernetes_namespace_v1.monitoring.metadata[0].name
  }

  data = {
    "alertmanager.yaml" = yamlencode({
      global = {
        slack_api_url = var.slack_webhook_url
      }
      route = {
        receiver = "slack-critical"
        group_by = ["alertname", "severity"]
        routes = [
          {
            matchers = ["severity = \"critical\""]
            receiver = "pagerduty"
          }
        ]
      }
      receivers = [
        {
          name = "slack-critical"
          slack_configs = [
            {
              channel = "#alerts"
              text    = "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"
            }
          ]
        },
        {
          name = "pagerduty"
          pagerduty_configs = [
            {
              service_key = var.pagerduty_service_key
            }
          ]
        }
      ]
    })
  }
}
```

## Best Practices

- Use the `kube-prometheus-stack` chart rather than standalone Prometheus - it includes Alertmanager, node exporter, kube-state-metrics, and pre-built dashboards.
- Pin the chart version explicitly to avoid unexpected upgrades.
- Enable persistent storage for Prometheus and Alertmanager - without it, all data is lost on pod restart.
- Configure `retention` based on your storage capacity and query needs - 30 days is a common starting point.
- Use `resources` limits to prevent Prometheus from consuming all node memory during high cardinality scenarios.
