# How to Deploy Grafana with Helm and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Grafana, Monitoring, OpenTofu, Helm, Dashboard, Observability

Description: Learn how to deploy Grafana on Kubernetes using OpenTofu and Helm with persistent storage, OIDC authentication, pre-provisioned dashboards, and multiple data sources.

## Overview

Grafana provides visualization for metrics, logs, and traces. OpenTofu deploys Grafana via the Grafana community Helm chart with production-ready configuration including OIDC SSO, pre-provisioned dashboards via ConfigMaps, and multiple data source connections.

## Step 1: Deploy Grafana with Helm

```hcl
# main.tf - Deploy Grafana via the Grafana community Helm chart

resource "random_password" "grafana_admin" {
  length  = 24
  special = false
}

resource "helm_release" "grafana" {
  name             = "grafana"
  repository       = "https://grafana-community.github.io/helm-charts"
  chart            = "grafana"
  version          = "12.3.0"
  namespace        = "monitoring"
  create_namespace = true

  values = [yamlencode({
    # Multiple replicas require a shared MySQL or Postgres database for HA.
    replicas = 1

    # Admin credentials
    adminUser     = "admin"
    adminPassword = random_password.grafana_admin.result

    persistence = {
      enabled      = true
      size         = "10Gi"
      storageClass = "gp3"
    }

    # Grafana configuration
    grafana_ini = {
      server = {
        domain   = "grafana.example.com"
        root_url = "https://grafana.example.com"
      }

      # OIDC Authentication (e.g., Azure AD with groups claim configured)
      "auth.generic_oauth" = {
        enabled               = true
        name                  = "Azure AD"
        allow_sign_up         = true
        client_id             = var.oidc_client_id
        client_secret         = var.oidc_client_secret
        scopes                = "openid email profile"
        auth_url              = "https://login.microsoftonline.com/${var.tenant_id}/oauth2/v2.0/authorize"
        token_url             = "https://login.microsoftonline.com/${var.tenant_id}/oauth2/v2.0/token"
        api_url               = "https://graph.microsoft.com/oidc/userinfo"
        role_attribute_path   = "contains(groups[*], '${var.grafana_admin_group_id}') && 'Admin' || 'Viewer'"
      }

      users = {
        auto_assign_org_role = "Viewer"
      }

      unified_alerting = {
        enabled = true
      }
    }

    # Pre-configure data sources
    datasources = {
      "datasources.yaml" = {
        apiVersion = 1
        datasources = [
          {
            name      = "Prometheus"
            type      = "prometheus"
            url       = "http://kube-prometheus-stack-prometheus.monitoring:9090"
            access    = "proxy"
            isDefault = true
          },
          {
            name   = "Loki"
            type   = "loki"
            url    = "http://loki:3100"
            access = "proxy"
          },
          {
            name   = "Tempo"
            type   = "tempo"
            url    = "http://tempo:3100"
            access = "proxy"
          }
        ]
      }
    }

    # Configure a dashboard provider for imported dashboards
    dashboardProviders = {
      "dashboardproviders.yaml" = {
        apiVersion = 1
        providers = [{
          name            = "default"
          orgId           = 1
          folder          = "Kubernetes"
          type            = "file"
          disableDeletion = true
          options = {
            path = "/var/lib/grafana/dashboards/default"
          }
        }]
      }
    }

    # Watch labeled ConfigMaps for custom dashboards
    sidecar = {
      dashboards = {
        enabled = true
        label   = "grafana_dashboard"
        provider = {
          folder = "Kubernetes"
        }
      }
    }

    # Download community dashboards by ID
    dashboards = {
      default = {
        kubernetes-cluster = {
          gnetId    = 7249
          revision  = 1
          datasource = "Prometheus"
        }
        nginx-ingress = {
          gnetId    = 9614
          revision  = 1
          datasource = "Prometheus"
        }
      }
    }

    # Ingress
    ingress = {
      enabled          = true
      ingressClassName = "nginx"
      hosts            = ["grafana.example.com"]
      annotations = {
        "cert-manager.io/cluster-issuer"              = "letsencrypt-production"
        "nginx.ingress.kubernetes.io/ssl-redirect"    = "true"
      }
      tls = [{ secretName = "grafana-tls", hosts = ["grafana.example.com"] }]
    }

    resources = {
      requests = { cpu = "100m", memory = "128Mi" }
      limits   = { cpu = "500m", memory = "512Mi" }
    }
  })]
}
```

## Step 2: Provision Custom Dashboards via ConfigMap

```hcl
# Deploy a custom dashboard from a JSON file
resource "kubernetes_config_map" "custom_dashboard" {
  metadata {
    name      = "app-dashboard"
    namespace = "monitoring"
    labels = {
      "grafana_dashboard" = "1"  # Sidecar picks up this label
    }
  }

  data = {
    "app-dashboard.json" = file("${path.module}/dashboards/app-dashboard.json")
  }
}
```

## Summary

Grafana deployed with OpenTofu provides centralized visualization for metrics from Prometheus, logs from Loki, and traces from Tempo. OIDC authentication with role mapping from Azure AD or Okta groups, when the IdP includes group claims, eliminates local user management. Pre-provisioned dashboards via ConfigMaps ensure consistent monitoring views across environments from the moment Grafana starts.
