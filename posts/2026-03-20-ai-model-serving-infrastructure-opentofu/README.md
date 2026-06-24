# How to Create AI Model Serving Infrastructure with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Machine Learning, Model Serving, Kubernetes, MLOps, Infrastructure as Code

Description: Learn how to build production-grade AI model serving infrastructure on Kubernetes using OpenTofu, including load balancing, auto-scaling, and monitoring.

## Introduction

Production ML model serving requires more than a single container. You need load balancing, horizontal scaling, health checks, GPU node pools, and supporting cluster add-ons. OpenTofu provisions the core serving infrastructure on Kubernetes.

## GPU Node Pool (EKS)

```hcl
resource "aws_eks_node_group" "gpu" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "gpu-serving"
  node_role_arn   = aws_iam_role.node.arn
  ami_type        = "AL2023_x86_64_NVIDIA"

  instance_types = ["g4dn.xlarge"]  # NVIDIA T4 GPU
  capacity_type  = "ON_DEMAND"

  scaling_config {
    desired_size = 2
    max_size     = 5
    min_size     = 1
  }

  subnet_ids = var.private_subnet_ids

  # Required taint so only GPU workloads schedule here
  taint {
    key    = "nvidia.com/gpu"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  labels = {
    "node-type" = "gpu-serving"
  }
}
```

On EKS AL2023 NVIDIA AMIs, install the NVIDIA Kubernetes device plugin separately so Kubernetes advertises `nvidia.com/gpu` resources to the scheduler.

## Model Serving Deployment

```hcl
resource "kubernetes_deployment_v1" "model_server" {
  metadata {
    name      = "${var.model_name}-server"
    namespace = kubernetes_namespace_v1.ml.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app     = "${var.model_name}-server"
        version = var.model_version
      }
    }

    template {
      metadata {
        labels = {
          app     = "${var.model_name}-server"
          version = var.model_version
        }
      }

      spec {
        container {
          name  = "model-server"
          image = "${var.ecr_repo}/${var.model_name}:${var.model_version}"

          port {
            container_port = 8080
            name           = "http"
          }

          resources {
            limits = {
              cpu               = "4"
              memory            = "8Gi"
              "nvidia.com/gpu"  = "1"
            }
            requests = {
              cpu              = "2"
              memory           = "4Gi"
              "nvidia.com/gpu" = "1"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 60
            period_seconds        = 30
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }
        }

        # Tolerate the GPU taint
        toleration {
          key      = "nvidia.com/gpu"
          operator = "Equal"
          value    = "true"
          effect   = "NoSchedule"
        }

        node_selector = {
          "node-type" = "gpu-serving"
        }
      }
    }
  }
}
```

## Service and HPA

This example assumes Metrics Server is installed for CPU metrics and Cluster Autoscaler can grow the node group between `min_size` and `max_size`.

```hcl
resource "kubernetes_service_v1" "model_server" {
  metadata {
    name      = "${var.model_name}-server"
    namespace = kubernetes_namespace_v1.ml.metadata[0].name
  }

  spec {
    selector = {
      app = "${var.model_name}-server"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
    }

    type = "ClusterIP"
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "model_server" {
  metadata {
    name      = "${var.model_name}-server-hpa"
    namespace = kubernetes_namespace_v1.ml.metadata[0].name
  }

  spec {
    min_replicas = 1
    max_replicas = 5

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment_v1.model_server.metadata[0].name
    }

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }
  }
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Production AI model serving requires GPU node pools, health-checked deployments, HPA for scaling, and supporting cluster add-ons for GPU scheduling and metrics collection. OpenTofu manages the Kubernetes-based serving foundation - from GPU node groups to HPA configurations - giving you reproducible model serving infrastructure.
