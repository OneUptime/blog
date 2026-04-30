# How to Deploy Flux CD with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Flux CD, GitOps, Kubernetes, Helm, Infrastructure as Code, CD

Description: Learn how to deploy Flux CD to Kubernetes using OpenTofu to enable GitOps-driven continuous delivery where your Git repository is the single source of truth.

---

Flux CD is a GitOps operator for Kubernetes that automatically synchronizes cluster state with configurations stored in Git. When combined with OpenTofu for infrastructure provisioning, you get end-to-end automation from infrastructure creation to application deployment.

## How Flux Works

```mermaid
graph LR
    A[Git Repository<br/>HelmReleases/Kustomizations] -->|Pull| B[Flux Controllers]
    B -->|Apply| C[Kubernetes Cluster]
    D[OpenTofu] -->|Bootstraps| B
    D -->|Creates| E[Cluster Infrastructure]
```

## Installing Flux with the Helm Provider

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

## Deploying the Flux Operator

Install the operator chart first, then apply the `FluxInstance` in a second OpenTofu run. The `kubernetes_manifest` resource needs the Flux Operator CRD schema to exist at plan time.

```hcl
# flux.tf
resource "kubernetes_namespace" "flux_system" {
  metadata {
    name = "flux-system"
    labels = {
      "app.kubernetes.io/managed-by" = "opentofu"
    }
  }
}

resource "helm_release" "flux_operator" {
  name       = "flux-operator"
  repository = "oci://ghcr.io/controlplaneio-fluxcd/charts"
  chart      = "flux-operator"
  version    = "0.48.0"
  namespace  = kubernetes_namespace.flux_system.metadata[0].name

  wait    = true
  timeout = 300
}

# Apply this after a first OpenTofu run has installed the Flux Operator CRDs.
# Create a FluxInstance to configure Flux
resource "kubernetes_manifest" "flux_instance" {
  depends_on = [helm_release.flux_operator]

  manifest = {
    apiVersion = "fluxcd.controlplane.io/v1"
    kind       = "FluxInstance"
    metadata = {
      name      = "flux"
      namespace = kubernetes_namespace.flux_system.metadata[0].name
    }
    spec = {
      distribution = {
        version  = "2.x"
        registry = "ghcr.io/fluxcd"
      }
      components = [
        "source-controller",
        "kustomize-controller",
        "helm-controller",
        "notification-controller",
      ]
      cluster = {
        type        = "kubernetes"
        multitenant = false
      }
      # Bootstrap from a Git repository
      sync = {
        kind       = "GitRepository"
        url        = var.flux_git_repository_url
        ref        = "refs/heads/main"
        path       = "clusters/production"
        pullSecret = kubernetes_secret.flux_git_auth.metadata[0].name
      }
    }
  }
}
```

## Creating Git Authentication Secret

```hcl
# git_auth.tf
# Create a Kubernetes secret with the SSH private key and known_hosts entries for Git access
resource "kubernetes_secret" "flux_git_auth" {
  metadata {
    name      = "flux-git-auth"
    namespace = kubernetes_namespace.flux_system.metadata[0].name
  }

  data = {
    # SSH private key for Git access
    "identity"    = var.git_ssh_private_key
    "known_hosts" = var.git_known_hosts
  }

  type = "Opaque"
}
```

## Configuring Flux Notifications

Apply the notification resources only after the `FluxInstance` has installed Flux's notification CRDs.

```hcl
# notifications.tf
# Create a Kubernetes secret with the Slack bot token
resource "kubernetes_secret" "slack_bot_token" {
  metadata {
    name      = "slack-bot-token"
    namespace = kubernetes_namespace.flux_system.metadata[0].name
  }

  data = {
    token = var.slack_bot_token
  }

  type = "Opaque"
}

# Apply this after Flux has installed the notification-controller CRDs.
# Create a Slack notification provider
resource "kubernetes_manifest" "slack_provider" {
  depends_on = [kubernetes_manifest.flux_instance]

  manifest = {
    apiVersion = "notification.toolkit.fluxcd.io/v1beta3"
    kind       = "Provider"
    metadata = {
      name      = "slack"
      namespace = kubernetes_namespace.flux_system.metadata[0].name
    }
    spec = {
      type      = "slack"
      address   = "https://slack.com/api/chat.postMessage"
      channel   = "deployments"
      secretRef = {
        name = kubernetes_secret.slack_bot_token.metadata[0].name
      }
    }
  }
}

# Alert on Flux reconciliation failures
resource "kubernetes_manifest" "reconciliation_alert" {
  depends_on = [kubernetes_manifest.slack_provider]

  manifest = {
    apiVersion = "notification.toolkit.fluxcd.io/v1beta3"
    kind       = "Alert"
    metadata = {
      name      = "reconciliation-failures"
      namespace = kubernetes_namespace.flux_system.metadata[0].name
    }
    spec = {
      providerRef = {
        name = "slack"
      }
      eventSeverity = "error"
      eventSources = [
        {
          kind = "GitRepository"
          name = "*"
        },
        {
          kind = "HelmRelease"
          name = "*"
        }
      ]
    }
  }
}
```

## Best Practices

- Store the manifests referenced by `sync.path` in the same Git repository Flux reconciles so cluster state remains declarative and auditable.
- Use a Git authentication method supported by Flux, such as SSH keys or HTTPS tokens, and manage those credentials securely.
- Enable Flux notifications so your team knows when reconciliation fails - silent failures are the worst kind.
- Use Kustomize overlays or HelmRelease values to manage environment-specific configuration within the Git repo.
- Set resource limits on Flux controllers to prevent them from consuming excessive cluster resources.
