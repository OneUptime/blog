# How to Create OpenTelemetry Collector Configurations with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, OpenTelemetry, Monitoring, Observability, Infrastructure as Code

Description: Learn how to deploy and configure OpenTelemetry Collectors using Terraform for unified metrics, traces, and logs collection across your infrastructure.

---

The OpenTelemetry Collector is a vendor-neutral component that receives, processes, and exports telemetry data. Deploying it through Terraform with Helm and Kubernetes ensures your observability pipeline is consistent and reproducible. This guide covers deploying collectors, configuring pipelines, and connecting to various backends.

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

## Deploying the OpenTelemetry Collector

```hcl
# Create a namespace for observability
resource "kubernetes_namespace" "observability" {
  metadata {
    name = "observability"
  }
}

# Deploy the OpenTelemetry Collector using Helm
resource "helm_release" "otel_collector" {
  name       = "otel-collector"
  repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
  chart      = "opentelemetry-collector"
  version    = "0.75.0"
  namespace  = kubernetes_namespace.observability.metadata[0].name

  values = [
    yamlencode({
      mode = "deployment"

      config = {
        receivers = {
          otlp = {
            protocols = {
              grpc = { endpoint = "0.0.0.0:4317" }
              http = { endpoint = "0.0.0.0:4318" }
            }
          }
          prometheus = {
            config = {
              scrape_configs = [{
                job_name        = "otel-collector"
                scrape_interval = "30s"
                static_configs = [{
                  targets = ["localhost:8888"]
                }]
              }]
            }
          }
          hostmetrics = {
            collection_interval = "30s"
            scrapers = {
              cpu    = {}
              memory = {}
              disk   = {}
              network = {}
            }
          }
        }

        processors = {
          batch = {
            timeout        = "5s"
            send_batch_size = 1024
          }
          memory_limiter = {
            check_interval  = "1s"
            limit_mib       = 512
            spike_limit_mib = 128
          }
          attributes = {
            actions = [
              {
                key    = "environment"
                value  = var.environment
                action = "upsert"
              },
              {
                key    = "cluster"
                value  = var.cluster_name
                action = "upsert"
              }
            ]
          }
          resource = {
            attributes = [{
              key    = "service.namespace"
              value  = var.environment
              action = "upsert"
            }]
          }
        }

        exporters = {
          # Export to Prometheus
          prometheus = {
            endpoint = "0.0.0.0:8889"
          }

          # Export traces to Jaeger
          otlp = {
            endpoint = "jaeger-collector.observability.svc.cluster.local:4317"
            tls = {
              insecure = true
            }
          }

          # Export logs to Loki
          loki = {
            endpoint = "http://loki.observability.svc.cluster.local:3100/loki/api/v1/push"
          }

          # Debug exporter for troubleshooting
          logging = {
            loglevel = "info"
          }
        }

        service = {
          pipelines = {
            traces = {
              receivers  = ["otlp"]
              processors = ["memory_limiter", "batch", "attributes"]
              exporters  = ["otlp", "logging"]
            }
            metrics = {
              receivers  = ["otlp", "prometheus", "hostmetrics"]
              processors = ["memory_limiter", "batch", "resource"]
              exporters  = ["prometheus"]
            }
            logs = {
              receivers  = ["otlp"]
              processors = ["memory_limiter", "batch", "attributes"]
              exporters  = ["loki", "logging"]
            }
          }

          telemetry = {
            metrics = {
              address = "0.0.0.0:8888"
            }
          }
        }
      }

      # Resource configuration
      resources = {
        requests = {
          cpu    = "200m"
          memory = "256Mi"
        }
        limits = {
          cpu    = "500m"
          memory = "512Mi"
        }
      }

      # Service configuration
      service = {
        type = "ClusterIP"
      }

      # Ports to expose
      ports = {
        otlp = {
          enabled     = true
          containerPort = 4317
          servicePort   = 4317
          protocol      = "TCP"
        }
        otlp-http = {
          enabled     = true
          containerPort = 4318
          servicePort   = 4318
          protocol      = "TCP"
        }
        metrics = {
          enabled     = true
          containerPort = 8889
          servicePort   = 8889
          protocol      = "TCP"
        }
      }
    })
  ]
}

variable "environment" {
  type    = string
  default = "production"
}

variable "cluster_name" {
  type    = string
  default = "main"
}
```

## Deploying as a DaemonSet for Node-Level Collection

```hcl
# Deploy a DaemonSet collector for node-level metrics and logs
resource "helm_release" "otel_agent" {
  name       = "otel-agent"
  repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
  chart      = "opentelemetry-collector"
  version    = "0.75.0"
  namespace  = kubernetes_namespace.observability.metadata[0].name

  values = [
    yamlencode({
      mode = "daemonset"

      config = {
        receivers = {
          hostmetrics = {
            collection_interval = "30s"
            scrapers = {
              cpu    = {}
              memory = {}
              disk   = {}
              filesystem = {}
              network    = {}
              load       = {}
            }
          }
          filelog = {
            include          = ["/var/log/containers/*.log"]
            exclude          = ["/var/log/containers/otel-*.log"]
            start_at         = "end"
            include_file_path = true
          }
        }

        processors = {
          batch = {
            timeout = "5s"
          }
          memory_limiter = {
            check_interval  = "1s"
            limit_mib       = 256
          }
        }

        exporters = {
          otlp = {
            endpoint = "otel-collector.observability.svc.cluster.local:4317"
            tls      = { insecure = true }
          }
        }

        service = {
          pipelines = {
            metrics = {
              receivers  = ["hostmetrics"]
              processors = ["memory_limiter", "batch"]
              exporters  = ["otlp"]
            }
            logs = {
              receivers  = ["filelog"]
              processors = ["memory_limiter", "batch"]
              exporters  = ["otlp"]
            }
          }
        }
      }
    })
  ]
}
```

## Creating a ServiceMonitor for the Collector

```hcl
resource "kubernetes_manifest" "otel_service_monitor" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "otel-collector"
      namespace = kubernetes_namespace.observability.metadata[0].name
    }
    spec = {
      selector = {
        matchLabels = {
          "app.kubernetes.io/name" = "opentelemetry-collector"
        }
      }
      endpoints = [{
        port     = "metrics"
        interval = "30s"
      }]
    }
  }

  depends_on = [helm_release.otel_collector]
}
```

## Best Practices

Use a gateway deployment pattern with a central collector that receives from agent DaemonSets on each node. Always configure the memory limiter processor to prevent the collector from using excessive memory. Use the batch processor to improve export efficiency. Add environment and cluster labels through processors for consistent metadata. Start with the logging exporter enabled for debugging, then disable it in production. Use separate pipelines for metrics, traces, and logs so they can be configured independently.

For visualizing the data collected by OpenTelemetry, see our guide on [Grafana dashboards](https://oneuptime.com/blog/post/2026-02-23-how-to-create-grafana-dashboards-with-terraform/view).

## Conclusion

OpenTelemetry Collectors deployed through Terraform provide a vendor-neutral, consistent observability pipeline. By managing collector configurations as code, you ensure that telemetry collection is reproducible across clusters and environments. The flexible pipeline architecture lets you route data to any combination of backends while maintaining a single collection point for all your applications.
