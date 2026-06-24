# How to Deploy Loki Stack on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Loki, Grafana, Promtail, Logging, OpenTofu, Helm, Observability

Description: Learn how to deploy the Grafana Loki stack on Kubernetes using OpenTofu and Helm for centralized log aggregation, querying, and visualization with Grafana.

## Overview

Grafana Loki is a log aggregation system inspired by Prometheus. Unlike Elasticsearch, Loki indexes only labels and stores log chunks in object storage, making it cost-effective for large-scale deployments. OpenTofu deploys Loki via Helm, uses Grafana Alloy to collect Kubernetes logs, and provisions Loki as a data source in an existing Grafana deployment.

## Step 1: Deploy Loki with Helm

```hcl
# main.tf - Deploy Loki via Grafana Helm chart

resource "helm_release" "loki" {
  name             = "loki"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki"
  version          = "5.47.0"
  namespace        = "monitoring"
  create_namespace = true

  values = [yamlencode({
    loki = {
      commonConfig = {
        replication_factor = 1
      }

      auth_enabled = false

      storage = {
        type = "s3"
        s3 = {
          region = "us-east-1"
        }
        bucketNames = {
          chunks = aws_s3_bucket.loki_chunks.id
          ruler  = aws_s3_bucket.loki_chunks.id
          admin  = aws_s3_bucket.loki_chunks.id
        }
      }

      # Schema configuration
      schemaConfig = {
        configs = [{
          from   = "2024-01-01"
          store  = "tsdb"
          object_store = "s3"
          schema = "v13"
          index = {
            prefix = "loki_index_"
            period = "24h"
          }
        }]
      }

      compactor = {
        working_directory   = "/var/loki/compactor"
        retention_enabled   = true
        delete_request_store = "s3"
      }

      limits_config = {
        retention_period            = "744h"  # 31 days
        ingestion_rate_mb           = 10
        ingestion_burst_size_mb     = 20
        max_query_parallelism       = 32
        max_streams_per_user        = 10000
      }
    }

    singleBinary = {
      replicas = 1

      persistence = {
        size         = "50Gi"
        storageClass = "gp3"
      }

      resources = {
        requests = { cpu = "500m", memory = "512Mi" }
        limits   = { cpu = "2000m", memory = "2Gi" }
      }
    }

    # Service account with IRSA for S3 access
    serviceAccount = {
      name = "loki"

      annotations = {
        "eks.amazonaws.com/role-arn" = aws_iam_role.loki.arn
      }
    }
  })]
}
```

## Step 2: S3 Bucket and IAM Role for Loki

```hcl
# S3 bucket for Loki log chunks
resource "aws_s3_bucket" "loki_chunks" {
  bucket = "my-cluster-loki-chunks"
}

resource "aws_s3_bucket_lifecycle_configuration" "loki" {
  bucket = aws_s3_bucket.loki_chunks.id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    # Keep the bucket lifecycle longer than Loki retention.
    filter {}

    expiration {
      days = 35
    }
  }
}

resource "aws_iam_role" "loki" {
  name = "loki"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.eks.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider}:aud" = "sts.amazonaws.com"
          "${local.oidc_provider}:sub" = "system:serviceaccount:monitoring:loki"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "loki_s3" {
  role = aws_iam_role.loki.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
      Resource = [aws_s3_bucket.loki_chunks.arn, "${aws_s3_bucket.loki_chunks.arn}/*"]
    }]
  })
}
```

## Step 3: Deploy Grafana Alloy for Log Collection

```hcl
# Alloy DaemonSet to collect pod logs from each node
resource "helm_release" "alloy" {
  name       = "alloy"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "alloy"
  version    = "1.8.0"
  namespace  = "monitoring"

  depends_on = [helm_release.loki]

  values = [yamlencode({
    controller = {
      type = "daemonset"
    }

    alloy = {
      configMap = {
        content = <<-ALLOY
          discovery.kubernetes "pod" {
            role = "pod"

            selectors {
              role  = "pod"
              field = "spec.nodeName=" + coalesce(sys.env("HOSTNAME"), constants.hostname)
            }
          }

          discovery.relabel "pod_logs" {
            targets = discovery.kubernetes.pod.targets

            rule {
              source_labels = ["__meta_kubernetes_namespace"]
              action        = "replace"
              target_label  = "namespace"
            }

            rule {
              source_labels = ["__meta_kubernetes_pod_name"]
              action        = "replace"
              target_label  = "pod"
            }

            rule {
              source_labels = ["__meta_kubernetes_pod_container_name"]
              action        = "replace"
              target_label  = "container"
            }

            rule {
              source_labels = ["__meta_kubernetes_pod_label_app_kubernetes_io_name"]
              action        = "replace"
              target_label  = "app"
            }

            rule {
              source_labels = ["__meta_kubernetes_namespace", "__meta_kubernetes_pod_container_name"]
              action        = "replace"
              target_label  = "job"
              separator     = "/"
              replacement   = "$1"
            }
          }

          loki.source.kubernetes "pod_logs" {
            targets    = discovery.relabel.pod_logs.output
            forward_to = [loki.write.default.receiver]
          }

          loki.write "default" {
            endpoint {
              url = "http://loki:3100/loki/api/v1/push"
            }
          }
        ALLOY
      }

      resources = {
        requests = { cpu = "50m", memory = "64Mi" }
        limits   = { cpu = "200m", memory = "128Mi" }
      }
    }
  })]
}
```

## Step 4: Configure Grafana Data Source

```hcl
# Add Loki as a data source in a Grafana deployment with the datasources sidecar enabled
resource "kubernetes_config_map" "loki_datasource" {
  metadata {
    name      = "loki-datasource"
    namespace = "monitoring"
    labels = {
      "grafana_datasource" = "1"
    }
  }

  data = {
    "loki-datasource.yaml" = yamlencode({
      apiVersion = 1
      datasources = [{
        name      = "Loki"
        type      = "loki"
        url       = "http://loki:3100"
        access    = "proxy"
        isDefault = false
        jsonData = {
          maxLines = 1000
        }
      }]
    })
  }
}
```

## Summary

Grafana Loki deployed with OpenTofu provides cost-efficient log aggregation using S3 as the storage backend. Grafana Alloy runs as a DaemonSet, collecting pod logs from the Kubernetes API and enriching them with Kubernetes labels. Because Loki indexes only labels instead of full log contents, index costs stay tied to label cardinality while the log payload itself is compressed in object storage, which often makes Loki cheaper than full-text indexing systems for large fleets.
