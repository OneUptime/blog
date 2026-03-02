# How to Create Kubernetes ServiceAccounts with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, ServiceAccount, Security, RBAC, Infrastructure as Code

Description: How to create and configure Kubernetes ServiceAccounts with Terraform for pod identity, RBAC integration, and cloud IAM workload identity.

---

ServiceAccounts provide identity for processes running in pods. Every pod in Kubernetes runs as a ServiceAccount, and that account determines what the pod can access within the cluster and, with workload identity, in cloud services. Managing ServiceAccounts through Terraform keeps your pod identity configuration alongside your application infrastructure, making it easy to audit and replicate across environments.

This guide covers creating ServiceAccounts, binding them to RBAC roles, configuring cloud workload identity, and using them in Deployments.

## Provider Configuration

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Basic ServiceAccount

```hcl
# serviceaccount.tf - Basic ServiceAccount
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "my-app"
    namespace = "default"

    labels = {
      app        = "my-app"
      managed-by = "terraform"
    }
  }
}
```

## ServiceAccount with Image Pull Secrets

If your pods pull images from private registries, attach pull secrets to the ServiceAccount so all pods using it automatically get registry access.

```hcl
# sa_with_pull_secrets.tf
resource "kubernetes_secret" "registry" {
  metadata {
    name      = "registry-credentials"
    namespace = "default"
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        "myregistry.azurecr.io" = {
          auth = base64encode("${var.registry_user}:${var.registry_pass}")
        }
      }
    })
  }
}

resource "kubernetes_service_account" "app_with_registry" {
  metadata {
    name      = "app-with-registry"
    namespace = "default"
  }

  # All pods using this SA will automatically use these pull secrets
  image_pull_secret {
    name = kubernetes_secret.registry.metadata[0].name
  }
}
```

## ServiceAccount with RBAC Binding

The typical pattern is to create a ServiceAccount, a Role defining its permissions, and a RoleBinding connecting them.

```hcl
# sa_with_rbac.tf - ServiceAccount with specific permissions
resource "kubernetes_service_account" "monitoring_agent" {
  metadata {
    name      = "monitoring-agent"
    namespace = "monitoring"
  }
}

# Define what the monitoring agent can do
resource "kubernetes_cluster_role" "monitoring_reader" {
  metadata {
    name = "monitoring-reader"
  }

  # Read pods and nodes for discovery
  rule {
    api_groups = [""]
    resources  = ["pods", "nodes", "endpoints", "services"]
    verbs      = ["get", "list", "watch"]
  }

  # Read metrics
  rule {
    api_groups = ["metrics.k8s.io"]
    resources  = ["pods", "nodes"]
    verbs      = ["get", "list"]
  }

  # Read config maps for configuration
  rule {
    api_groups = [""]
    resources  = ["configmaps"]
    verbs      = ["get"]
  }
}

# Bind the role to the service account
resource "kubernetes_cluster_role_binding" "monitoring_agent" {
  metadata {
    name = "monitoring-agent"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.monitoring_reader.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.monitoring_agent.metadata[0].name
    namespace = "monitoring"
  }
}
```

## GKE Workload Identity

On GKE, Workload Identity lets Kubernetes ServiceAccounts act as Google Cloud IAM service accounts. This eliminates the need for service account key files.

```hcl
# workload_identity.tf - GKE Workload Identity setup

# Google Cloud service account
resource "google_service_account" "app_gsa" {
  account_id   = "my-app-gsa"
  display_name = "My App Service Account"
  project      = var.project_id
}

# Grant the GCS SA permissions in GCP
resource "google_project_iam_member" "app_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.app_gsa.email}"
}

# Kubernetes ServiceAccount with Workload Identity annotation
resource "kubernetes_service_account" "app_ksa" {
  metadata {
    name      = "my-app"
    namespace = "default"

    annotations = {
      # Link to the GCP service account
      "iam.gke.io/gcp-service-account" = google_service_account.app_gsa.email
    }
  }
}

# Allow the KSA to impersonate the GSA
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.app_gsa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/my-app]"
}
```

## EKS IRSA (IAM Roles for Service Accounts)

On EKS, the equivalent of Workload Identity is IRSA.

```hcl
# irsa.tf - EKS IAM Roles for Service Accounts

# IAM role for the pod
resource "aws_iam_role" "app_role" {
  name = "my-app-eks-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.oidc_provider}:sub" = "system:serviceaccount:default:my-app"
            "${var.oidc_provider}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Attach policies to the role
resource "aws_iam_role_policy_attachment" "app_s3_read" {
  role       = aws_iam_role.app_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

# Kubernetes ServiceAccount with IRSA annotation
resource "kubernetes_service_account" "app_eks" {
  metadata {
    name      = "my-app"
    namespace = "default"

    annotations = {
      # Link to the AWS IAM role
      "eks.amazonaws.com/role-arn" = aws_iam_role.app_role.arn
    }
  }
}
```

## Using ServiceAccounts in Deployments

Reference the ServiceAccount in your pod spec.

```hcl
# deployment.tf - Deployment using a specific ServiceAccount
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "default"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        # Run pods with the specified ServiceAccount
        service_account_name = kubernetes_service_account.app_ksa.metadata[0].name

        # Disable auto-mounting of the service account token if not needed
        # automount_service_account_token = false

        container {
          name  = "app"
          image = "myregistry.io/app:latest"

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
    }
  }
}
```

## Creating Multiple ServiceAccounts

```hcl
# multi_sa.tf - ServiceAccounts for multiple services
variable "services" {
  type = map(object({
    namespace   = string
    pull_secret = optional(string)
    annotations = optional(map(string), {})
  }))
  default = {
    "api-server" = {
      namespace = "backend"
    }
    "worker" = {
      namespace   = "backend"
      pull_secret = "registry-creds"
    }
    "frontend" = {
      namespace = "frontend"
      annotations = {
        "iam.gke.io/gcp-service-account" = "frontend@project.iam.gserviceaccount.com"
      }
    }
  }
}

resource "kubernetes_service_account" "services" {
  for_each = var.services

  metadata {
    name        = each.key
    namespace   = each.value.namespace
    annotations = each.value.annotations

    labels = {
      app        = each.key
      managed-by = "terraform"
    }
  }

  dynamic "image_pull_secret" {
    for_each = each.value.pull_secret != null ? [each.value.pull_secret] : []
    content {
      name = image_pull_secret.value
    }
  }
}
```

## Disabling Default ServiceAccount Token Mount

For security-conscious setups, disable the automatic mounting of ServiceAccount tokens when the pod does not need Kubernetes API access.

```hcl
# secure_sa.tf - ServiceAccount without auto-mounted token
resource "kubernetes_service_account" "restricted" {
  metadata {
    name      = "restricted-app"
    namespace = "production"
  }

  automount_service_account_token = false
}
```

Pods using this ServiceAccount will not have the API token mounted at `/var/run/secrets/kubernetes.io/serviceaccount/`. This reduces the attack surface if the pod is compromised.

## Monitoring ServiceAccount Usage

Track which ServiceAccounts are active and what they are doing through Kubernetes audit logs. Watch for ServiceAccounts making unexpected API calls, which could indicate a compromised pod. [OneUptime](https://oneuptime.com) can monitor your applications and alert you to anomalous behavior that might indicate security issues.

## Summary

Kubernetes ServiceAccounts are fundamental to pod identity and security. With Terraform, you can manage them alongside RBAC bindings, cloud workload identity (GKE Workload Identity or EKS IRSA), and image pull secrets. The key practices are: create dedicated ServiceAccounts for each application instead of using `default`, bind the minimum required permissions through RBAC, use workload identity for cloud access instead of static credentials, and disable token auto-mounting when pods do not need Kubernetes API access.

For more on RBAC, see [Kubernetes RBAC Roles and Bindings with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-rbac-roles-and-bindings-with-terraform/view).
