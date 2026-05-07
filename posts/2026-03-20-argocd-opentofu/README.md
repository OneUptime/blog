# How to Deploy and Manage ArgoCD with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, ArgoCD, Kubernetes, GitOps, Infrastructure as Code, DevOps

Description: Learn how to install ArgoCD on a Kubernetes cluster using OpenTofu and configure it to sync applications from a Git repository.

---

ArgoCD is a declarative, GitOps continuous delivery tool for Kubernetes. OpenTofu can bootstrap an ArgoCD installation and configure Application resources so your cluster state continuously reconciles with Git.

---

## Install ArgoCD with the Helm Provider

```hcl
# versions.tf

terraform {
  required_providers {
    helm = {
      source  = "opentofu/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "opentofu/kubernetes"
      version = "~> 2.25"
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

```hcl
# argocd.tf
resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"
  }
}

resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  namespace  = kubernetes_namespace.argocd.metadata[0].name
  version    = "6.7.3"

  set {
    name  = "server.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "configs.params.server\\.insecure"
    value = "true"
  }
}
```

---

## Create an ArgoCD Application Resource

Apply the Helm release first so the Argo CD `Application` CRD exists before OpenTofu plans this resource.

```hcl
resource "kubernetes_manifest" "argocd_app" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "my-app"
      namespace = "argocd"
    }
    spec = {
      project = "default"
      source = {
        repoURL        = "https://github.com/myorg/my-k8s-config"
        targetRevision = "HEAD"
        path           = "manifests/production"
      }
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "production"
      }
      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }
        syncOptions = ["CreateNamespace=true"]
      }
    }
  }
}
```

---

## Retrieve the ArgoCD Admin Password

```bash
# First install ArgoCD so the Application CRD exists
tofu apply -target=helm_release.argocd

# Then apply the Application resource and any remaining changes
tofu apply

# Get initial admin password
kubectl get secret argocd-initial-admin-secret \
  -n argocd \
  -o jsonpath='{.data.password}' | base64 -d

# Port-forward to access the UI over HTTP because server.insecure=true
kubectl port-forward svc/argocd-server -n argocd 8080:80
# Open http://localhost:8080, login with admin / <password>
```

---

## Register a Private Git Repository

```hcl
resource "kubernetes_secret" "argocd_repo" {
  metadata {
    name      = "my-private-repo"
    namespace = "argocd"
    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  data = {
    type          = "git"
    url           = "https://github.com/myorg/private-config"
    username      = var.github_username
    password      = var.github_token
  }
}
```

---

## Summary

Use the Helm provider to install ArgoCD into a Kubernetes cluster, then declare `Application` resources with `kubernetes_manifest` after the Argo CD CRDs exist to define what Git paths to sync. Set `syncPolicy.automated` with `prune` and `selfHeal` for fully automated GitOps reconciliation. Store repository credentials in Kubernetes secrets labelled with `argocd.argoproj.io/secret-type: repository`.
