# How to Deploy ArgoCD on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, ArgoCD, GitOps, Kubernetes, Helm, Infrastructure as Code, CD

Description: Learn how to deploy ArgoCD on Kubernetes using OpenTofu and configure it with repositories, projects, and applications for GitOps-driven continuous delivery.

---

ArgoCD is a declarative GitOps continuous delivery tool for Kubernetes. It monitors Git repositories and automatically syncs the cluster state to match the desired state defined in Git. OpenTofu handles ArgoCD's installation and initial bootstrap configuration, while ArgoCD takes over managing everything else.

## Deploying ArgoCD with Helm

```hcl
# main.tf

terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}

provider "helm" {
  kubernetes {
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

resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"
  }
}

resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "6.6.0"
  namespace  = kubernetes_namespace.argocd.metadata[0].name

  wait    = true
  timeout = 600

  values = [
    yamlencode({
      configs = {
        params = {
          # Disable internal TLS - let ingress handle it
          "server.insecure" = true
        }

        # Configure admin password as bcrypt hash
        secret = {
          argocdServerAdminPassword = var.argocd_admin_password_bcrypt
        }
      }

      server = {
        ingress = {
          enabled          = true
          ingressClassName = "nginx"
          annotations = {
            "cert-manager.io/cluster-issuer"                = "letsencrypt-prod"
            "nginx.ingress.kubernetes.io/backend-protocol" = "HTTP"
          }
          hostname = var.argocd_hostname
          extraTls = [
            {
              secretName = "argocd-server-tls"
              hosts      = [var.argocd_hostname]
            }
          ]
        }
      }

      # Resource limits
      redis = {
        resources = {
          requests = { cpu = "100m", memory = "64Mi" }
          limits   = { cpu = "500m", memory = "256Mi" }
        }
      }
    })
  ]
}
```

## Connecting Git Repositories

```hcl
# repositories.tf
# Add a private Git repository using SSH
# Use an SSH URL such as git@github.com:org/repo.git
resource "kubernetes_secret" "repo_credentials" {
  metadata {
    name      = "repo-credentials"
    namespace = kubernetes_namespace.argocd.metadata[0].name
    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  data = {
    type          = "git"
    url           = var.git_repo_url
    sshPrivateKey = var.git_ssh_private_key
  }
}
```

## Creating ArgoCD Projects and Applications

Because `kubernetes_manifest` resolves custom resource schemas during planning, install ArgoCD first with `tofu apply -target=helm_release.argocd`, then run a full `tofu apply` after the ArgoCD CRDs exist.

```hcl
# applications.tf
# Create an ArgoCD AppProject to scope permissions
resource "kubernetes_manifest" "production_project" {
  depends_on = [helm_release.argocd]

  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "AppProject"
    metadata = {
      name      = "production"
      namespace = kubernetes_namespace.argocd.metadata[0].name
    }
    spec = {
      description = "Production applications"
      sourceRepos = [var.git_repo_url]
      destinations = [
        {
          namespace = "production"
          server    = "https://kubernetes.default.svc"
        }
      ]
      clusterResourceWhitelist = [
        { group = "", kind = "Namespace" }
      ]
    }
  }
}

# Deploy an application via ArgoCD
resource "kubernetes_manifest" "app" {
  depends_on = [kubernetes_manifest.production_project]

  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "my-app"
      namespace = kubernetes_namespace.argocd.metadata[0].name
    }
    spec = {
      project = "production"
      source = {
        repoURL        = var.git_repo_url
        targetRevision = "HEAD"
        path           = "kubernetes/production/my-app"
      }
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "production"
      }
      syncPolicy = {
        automated = {
          prune    = true   # Delete resources removed from Git
          selfHeal = true   # Fix manual changes to match Git
        }
        syncOptions = ["CreateNamespace=true"]
      }
    }
  }
}
```

## Best Practices

- Use ArgoCD Projects to create boundaries between teams - a misconfigured production Application can't accidentally deploy to another team's namespace.
- Enable `selfHeal = true` so ArgoCD automatically reconciles manual kubectl changes - this ensures Git is always the truth.
- Store the ArgoCD admin password as a bcrypt hash, not plaintext, in your OpenTofu configuration.
- Use ArgoCD's App of Apps pattern - a root Application that deploys other Applications - for managing large numbers of services.
- Regularly review sync statuses and set up Slack/webhook notifications for failed syncs.
