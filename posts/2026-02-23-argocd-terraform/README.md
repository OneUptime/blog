# How to Deploy ArgoCD with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, ArgoCD, GitOps, CI/CD, DevOps

Description: Learn how to deploy and configure ArgoCD on Kubernetes using Terraform, including SSO setup, repository connections, application definitions, and project configuration.

---

ArgoCD is the most popular GitOps tool for Kubernetes. It watches Git repositories and automatically syncs the desired state to your cluster. While this might seem like it conflicts with Terraform (both manage Kubernetes resources), they actually complement each other well. Terraform handles the platform layer - installing ArgoCD, configuring SSO, connecting repositories - while ArgoCD handles the application layer, continuously deploying workloads from Git.

This guide covers deploying ArgoCD with Terraform and configuring it for production use.

## Installing ArgoCD with Helm

The official ArgoCD Helm chart is the recommended installation method.

```hcl
# Create the ArgoCD namespace
resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"

    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Deploy ArgoCD
resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  namespace  = kubernetes_namespace.argocd.metadata[0].name
  version    = "5.55.0"

  values = [
    yamlencode({
      # High availability configuration
      controller = {
        replicas = 2
        resources = {
          requests = {
            cpu    = "250m"
            memory = "512Mi"
          }
          limits = {
            memory = "1Gi"
          }
        }
      }

      server = {
        replicas = 2

        # Ingress configuration
        ingress = {
          enabled          = true
          ingressClassName = "nginx"
          hosts            = ["argocd.${var.domain}"]
          tls = [{
            secretName = "argocd-tls"
            hosts      = ["argocd.${var.domain}"]
          }]
          annotations = {
            "cert-manager.io/cluster-issuer"                    = "letsencrypt-prod"
            "nginx.ingress.kubernetes.io/ssl-passthrough"       = "true"
            "nginx.ingress.kubernetes.io/backend-protocol"      = "HTTPS"
          }
        }

        # Extra arguments for the server
        extraArgs = [
          "--insecure"  # TLS is handled by the ingress controller
        ]
      }

      repoServer = {
        replicas = 2
        resources = {
          requests = {
            cpu    = "100m"
            memory = "256Mi"
          }
          limits = {
            memory = "512Mi"
          }
        }
      }

      # Redis for caching
      redis-ha = {
        enabled = true
      }

      # Application Set controller
      applicationSet = {
        replicas = 2
      }
    })
  ]

  wait    = true
  timeout = 600
}
```

## Setting the Admin Password

By default, ArgoCD generates a random admin password. You can set a specific one through Terraform.

```hcl
# Generate a bcrypt hash of the admin password
resource "bcrypt_hash" "argocd_password" {
  cleartext = var.argocd_admin_password
}

# Set the admin password via a Kubernetes secret
resource "kubernetes_secret" "argocd_admin" {
  metadata {
    name      = "argocd-secret"
    namespace = "argocd"

    labels = {
      "app.kubernetes.io/name"    = "argocd-secret"
      "app.kubernetes.io/part-of" = "argocd"
    }
  }

  data = {
    "admin.password"      = bcrypt_hash.argocd_password.id
    "admin.passwordMtime" = timestamp()
  }

  type = "Opaque"

  depends_on = [helm_release.argocd]

  lifecycle {
    ignore_changes = [
      data["admin.passwordMtime"]
    ]
  }
}
```

## Configuring SSO with OIDC

Production ArgoCD deployments should use SSO instead of the built-in admin account.

```hcl
resource "helm_release" "argocd" {
  # ... base config from above ...

  values = [
    yamlencode({
      configs = {
        cm = {
          # OIDC configuration for SSO
          "oidc.config" = yamlencode({
            name         = "Okta"
            issuer       = "https://company.okta.com/oauth2/default"
            clientID     = var.oidc_client_id
            clientSecret = "$oidc.clientSecret"
            requestedScopes = [
              "openid",
              "profile",
              "email",
              "groups"
            ]
          })
        }

        # RBAC configuration
        rbac = {
          "policy.default" = "role:readonly"
          "policy.csv" = <<-EOT
            # Admins can do anything
            p, role:admin, applications, *, */*, allow
            p, role:admin, clusters, *, *, allow
            p, role:admin, repositories, *, *, allow
            p, role:admin, projects, *, *, allow
            # Developers can sync apps in their namespace
            p, role:developer, applications, get, */*, allow
            p, role:developer, applications, sync, */*, allow
            # Map OIDC groups to roles
            g, platform-team, role:admin
            g, developers, role:developer
          EOT
        }

        secret = {
          extra = {
            "oidc.clientSecret" = var.oidc_client_secret
          }
        }
      }
    })
  ]
}
```

## Connecting Git Repositories

ArgoCD needs access to your Git repositories. Configure them through Terraform.

```hcl
# Private repository using SSH key
resource "kubectl_manifest" "repo_ssh" {
  yaml_body = <<YAML
apiVersion: v1
kind: Secret
metadata:
  name: private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: git@github.com:myorg/k8s-manifests.git
  sshPrivateKey: |
    ${indent(4, var.deploy_key)}
YAML

  depends_on = [helm_release.argocd]
}

# Private repository using HTTPS token
resource "kubectl_manifest" "repo_https" {
  yaml_body = <<YAML
apiVersion: v1
kind: Secret
metadata:
  name: github-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg/helm-charts.git
  username: git
  password: ${var.github_token}
YAML

  depends_on = [helm_release.argocd]
}

# Helm chart repository
resource "kubectl_manifest" "helm_repo" {
  yaml_body = <<YAML
apiVersion: v1
kind: Secret
metadata:
  name: bitnami-charts
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: bitnami
  url: https://charts.bitnami.com/bitnami
YAML

  depends_on = [helm_release.argocd]
}
```

## Creating ArgoCD Projects

Projects provide logical grouping and access control for applications.

```hcl
# Create an ArgoCD project
resource "kubectl_manifest" "project_production" {
  yaml_body = <<YAML
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: "Production applications"
  # Only allow deploying from specific repos
  sourceRepos:
    - "git@github.com:myorg/k8s-manifests.git"
    - "https://charts.bitnami.com/bitnami"
  # Only allow deploying to specific namespaces
  destinations:
    - namespace: production
      server: https://kubernetes.default.svc
    - namespace: production-*
      server: https://kubernetes.default.svc
  # Allow specific cluster-scoped resources
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
  # Namespace-scoped resources allowed
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
  # Sync windows - only allow syncs during business hours
  syncWindows:
    - kind: allow
      schedule: "0 8-18 * * 1-5"
      duration: 10h
      applications:
        - "*"
YAML

  depends_on = [helm_release.argocd]
}
```

## Defining ArgoCD Applications

Create applications that ArgoCD will manage.

```hcl
# ArgoCD Application for a Helm chart
resource "kubectl_manifest" "app_frontend" {
  yaml_body = <<YAML
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: production
  source:
    repoURL: git@github.com:myorg/k8s-manifests.git
    targetRevision: main
    path: apps/frontend
    helm:
      valueFiles:
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
YAML

  depends_on = [
    kubectl_manifest.project_production,
    kubectl_manifest.repo_ssh,
  ]
}
```

## ApplicationSets for Multi-Cluster or Multi-Tenant

ApplicationSets generate Applications from templates. They are perfect for deploying to multiple clusters or environments.

```hcl
# Generate an Application for each environment
resource "kubectl_manifest" "appset_environments" {
  yaml_body = <<YAML
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app-environments
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: staging
            cluster: staging-cluster
            server: https://staging.k8s.example.com
          - env: production
            cluster: production-cluster
            server: https://production.k8s.example.com
  template:
    metadata:
      name: "my-app-{{env}}"
    spec:
      project: "{{env}}"
      source:
        repoURL: git@github.com:myorg/k8s-manifests.git
        targetRevision: main
        path: "apps/my-app/overlays/{{env}}"
      destination:
        server: "{{server}}"
        namespace: "my-app"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
YAML

  depends_on = [helm_release.argocd]
}
```

## Notifications

Configure ArgoCD notifications to alert on sync status changes.

```hcl
# Install ArgoCD Notifications (included in modern ArgoCD)
resource "kubectl_manifest" "notification_config" {
  yaml_body = <<YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed]
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-sync-succeeded]
  template.app-sync-failed: |
    slack:
      attachments: |
        [{
          "title": "{{.app.metadata.name}} sync failed",
          "color": "#E96D76",
          "fields": [{
            "title": "Application",
            "value": "{{.app.metadata.name}}",
            "short": true
          }]
        }]
  template.app-sync-succeeded: |
    slack:
      attachments: |
        [{
          "title": "{{.app.metadata.name}} synced successfully",
          "color": "#18BE52"
        }]
YAML

  depends_on = [helm_release.argocd]
}
```

## Best Practices

- Use Terraform for ArgoCD installation and configuration, let ArgoCD handle application deployment
- Enable HA mode with multiple replicas for production
- Configure SSO instead of relying on the admin account
- Use Projects to enforce access control and deployment targets
- Set up automated sync with self-heal to ensure drift is corrected
- Configure notifications for sync failures
- Store ArgoCD Application manifests in Git alongside the app manifests they deploy
- Use ApplicationSets for managing applications across multiple environments

For more on Kubernetes deployment tools, see our guide on [deploying Kubernetes operators with Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-operators-terraform/view).
