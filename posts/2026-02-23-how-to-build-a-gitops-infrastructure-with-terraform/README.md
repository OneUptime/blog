# How to Build a GitOps Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitOps, ArgoCD, Flux, Kubernetes, CI/CD, Infrastructure as Code

Description: Learn how to build a GitOps infrastructure using Terraform with ArgoCD or Flux for automated Kubernetes deployments driven by Git repositories.

---

GitOps is the practice of using Git as the single source of truth for both infrastructure and application deployments. Instead of running kubectl commands or clicking through dashboards, you push changes to a Git repository and an automated system reconciles the desired state with the actual state. This gives you a complete audit trail, easy rollbacks, and consistent environments.

In this guide, we will build the infrastructure for a GitOps workflow using Terraform. We will set up an EKS cluster, install ArgoCD, configure the Git repositories, and wire everything together so that pushing to Git triggers automatic deployments.

## The GitOps Infrastructure Stack

Our GitOps setup includes:

- An EKS cluster as the deployment target
- ArgoCD for continuous delivery
- A Git repository structure for manifests
- Sealed Secrets for secret management
- Monitoring for the GitOps pipeline

## EKS Cluster Foundation

First, we need a Kubernetes cluster where ArgoCD will run and deploy workloads.

```hcl
# eks.tf - Kubernetes cluster for GitOps
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${var.project_name}-gitops"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Enable IRSA for pod-level IAM roles
  enable_irsa = true

  # Managed node groups
  eks_managed_node_groups = {
    # System node group for ArgoCD and platform tools
    system = {
      instance_types = ["m6i.large"]
      min_size       = 2
      max_size       = 4
      desired_size   = 2

      labels = {
        role = "system"
      }

      taints = [
        {
          key    = "CriticalAddonsOnly"
          effect = "NO_SCHEDULE"
        }
      ]
    }

    # Application node group for workloads
    application = {
      instance_types = ["m6i.xlarge"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3

      labels = {
        role = "application"
      }
    }
  }

  # Allow ArgoCD to manage all namespaces
  manage_aws_auth_configmap = true

  tags = {
    Environment = var.environment
    GitOps      = "true"
  }
}
```

## Installing ArgoCD with Helm

ArgoCD is the GitOps controller that watches your Git repository and syncs changes to the cluster.

```hcl
# argocd.tf - ArgoCD installation
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "5.51.0"
  namespace        = "argocd"
  create_namespace = true

  # Schedule on system nodes
  values = [
    yamlencode({
      global = {
        nodeSelector = {
          role = "system"
        }
        tolerations = [
          {
            key      = "CriticalAddonsOnly"
            operator = "Exists"
            effect   = "NoSchedule"
          }
        ]
      }

      server = {
        # Enable HA mode
        replicas = 2

        # Ingress configuration
        ingress = {
          enabled    = true
          ingressClassName = "alb"
          annotations = {
            "alb.ingress.kubernetes.io/scheme"       = "internal"
            "alb.ingress.kubernetes.io/target-type"   = "ip"
            "alb.ingress.kubernetes.io/listen-ports"   = "[{\"HTTPS\":443}]"
            "alb.ingress.kubernetes.io/certificate-arn" = var.acm_certificate_arn
          }
          hosts = [var.argocd_hostname]
        }

        # RBAC configuration
        config = {
          "accounts.ci"   = "apiKey"
          "resource.exclusions" = yamlencode([
            {
              apiGroups = [""]
              kinds     = ["Event"]
              clusters  = ["*"]
            }
          ])
        }
      }

      # Application controller settings
      controller = {
        replicas = 2
        metrics = {
          enabled = true
          serviceMonitor = {
            enabled = true
          }
        }
      }

      # Enable notifications
      notifications = {
        enabled = true
        argocdUrl = "https://${var.argocd_hostname}"
      }

      # Redis HA
      redis-ha = {
        enabled = true
      }
    })
  ]

  depends_on = [module.eks]
}
```

## Git Repository Structure

A well-organized repository structure is essential for GitOps. Here is a recommended layout:

```hcl
# repo.tf - Git repository setup
# Infrastructure repository for ArgoCD app definitions
resource "github_repository" "gitops_infra" {
  name        = "${var.project_name}-gitops-infra"
  description = "GitOps infrastructure manifests"
  visibility  = "private"

  template {
    owner      = var.github_org
    repository = "gitops-template"
  }
}

# Application repository for environment-specific configs
resource "github_repository" "gitops_apps" {
  name        = "${var.project_name}-gitops-apps"
  description = "Application manifests for GitOps deployment"
  visibility  = "private"

  template {
    owner      = var.github_org
    repository = "gitops-apps-template"
  }
}

# Branch protection - require PRs for production changes
resource "github_branch_protection" "main" {
  repository_id = github_repository.gitops_apps.node_id
  pattern       = "main"

  required_pull_request_reviews {
    required_approving_review_count = 1
    dismiss_stale_reviews           = true
  }

  required_status_checks {
    strict = true
    contexts = [
      "ci/validate-manifests",
      "ci/dry-run"
    ]
  }
}
```

## ArgoCD Application Definitions

ArgoCD Applications tell ArgoCD what to deploy and where to deploy it. The "App of Apps" pattern lets you manage all applications through a single root application.

```hcl
# apps.tf - ArgoCD application definitions
# Root application that manages all other applications
resource "kubectl_manifest" "app_of_apps" {
  yaml_body = yamlencode({
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "root-app"
      namespace = "argocd"
      finalizers = ["resources-finalizer.argocd.argoproj.io"]
    }
    spec = {
      project = "default"
      source = {
        repoURL        = github_repository.gitops_infra.http_clone_url
        targetRevision = "main"
        path           = "apps"
      }
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "argocd"
      }
      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }
        syncOptions = [
          "CreateNamespace=true"
        ]
      }
    }
  })

  depends_on = [helm_release.argocd]
}

# ArgoCD project for production workloads
resource "kubectl_manifest" "production_project" {
  yaml_body = yamlencode({
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "AppProject"
    metadata = {
      name      = "production"
      namespace = "argocd"
    }
    spec = {
      description = "Production workloads"
      sourceRepos = [
        github_repository.gitops_apps.http_clone_url
      ]
      destinations = [
        {
          server    = "https://kubernetes.default.svc"
          namespace = "production"
        }
      ]
      # Only allow specific resource types
      clusterResourceWhitelist = [
        {
          group = ""
          kind  = "Namespace"
        }
      ]
      # Deny certain resources in production
      namespaceResourceBlacklist = [
        {
          group = ""
          kind  = "ResourceQuota"
        }
      ]
    }
  })

  depends_on = [helm_release.argocd]
}
```

## Sealed Secrets for Secret Management

You cannot store plain secrets in Git. Sealed Secrets encrypts them so they can only be decrypted by the controller running in your cluster.

```hcl
# sealed-secrets.tf - Secret management for GitOps
resource "helm_release" "sealed_secrets" {
  name             = "sealed-secrets"
  repository       = "https://bitnami-labs.github.io/sealed-secrets"
  chart            = "sealed-secrets"
  version          = "2.13.0"
  namespace        = "kube-system"

  set {
    name  = "nodeSelector.role"
    value = "system"
  }

  depends_on = [module.eks]
}

# Backup the sealed secrets key to AWS Secrets Manager
resource "aws_secretsmanager_secret" "sealed_secrets_key" {
  name                    = "${var.project_name}/sealed-secrets-key"
  description             = "Backup of sealed secrets encryption key"
  recovery_window_in_days = 30
}
```

## Notification Integration

Set up ArgoCD notifications so your team knows when deployments happen or fail.

```hcl
# notifications.tf - Deployment notifications
resource "kubectl_manifest" "notification_config" {
  yaml_body = yamlencode({
    apiVersion = "v1"
    kind       = "ConfigMap"
    metadata = {
      name      = "argocd-notifications-cm"
      namespace = "argocd"
    }
    data = {
      "service.slack" = yamlencode({
        token = "$slack-token"
      })
      "template.app-sync-succeeded" = yamlencode({
        message = "Application {{.app.metadata.name}} has been synced successfully."
        slack = {
          attachments = yamlencode([
            {
              title  = "{{.app.metadata.name}}"
              color  = "#18be52"
              fields = [
                { title = "Sync Status", value = "{{.app.status.sync.status}}", short = true },
                { title = "Repository", value = "{{.app.spec.source.repoURL}}", short = true }
              ]
            }
          ])
        }
      })
      "trigger.on-sync-succeeded" = yamlencode([
        { when = "app.status.sync.status == 'Synced'", send = ["app-sync-succeeded"] }
      ])
    }
  })

  depends_on = [helm_release.argocd]
}
```

## Monitoring the GitOps Pipeline

```hcl
# monitoring.tf - GitOps pipeline monitoring
resource "helm_release" "argocd_metrics" {
  name       = "argocd-metrics"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus"
  namespace  = "monitoring"

  values = [
    yamlencode({
      serviceMonitors = {
        argocd = {
          enabled = true
          selector = {
            matchLabels = {
              "app.kubernetes.io/part-of" = "argocd"
            }
          }
        }
      }
    })
  ]
}
```

## Summary

A GitOps infrastructure built with Terraform gives you the best of both worlds: Terraform manages the cluster and platform tooling, while ArgoCD manages application deployments through Git.

The workflow is simple: developers push application manifest changes to Git, ArgoCD detects the change, and it automatically syncs the cluster to match. Rollbacks are just a `git revert` away.

For monitoring your GitOps pipeline and the applications it deploys, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) provides a unified view of your infrastructure health and can alert you when sync operations fail or applications become unhealthy.

Start with a single cluster and a few applications, then expand to multi-cluster GitOps as your needs grow.
