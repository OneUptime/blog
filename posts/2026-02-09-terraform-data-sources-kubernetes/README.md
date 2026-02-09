# Using Terraform Data Sources to Query Existing Kubernetes Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Sources, Kubernetes, Infrastructure as Code, Query

Description: Learn how to use Terraform data sources to query and reference existing Kubernetes resources, enabling cross-team collaboration, dynamic configuration, and integration with externally managed infrastructure.

---

Terraform data sources allow you to read information from existing infrastructure without managing it. In Kubernetes environments, this is invaluable when you need to reference resources created by other teams, external tools, or manual processes. Instead of duplicating resource definitions or hardcoding values, data sources let your Terraform configuration dynamically query the cluster and use real values. This guide covers the Kubernetes and Helm provider data sources, practical use cases, and patterns for integrating data sources into your infrastructure code.

## What Are Terraform Data Sources

A data source in Terraform is a read-only query against an existing resource. Unlike managed resources (defined with `resource` blocks), data sources do not create, update, or delete anything. They fetch data from a provider and make it available to your configuration through attributes.

The syntax is:

```hcl
data "provider_type" "name" {
  # query parameters
}
```

You then reference the result as `data.provider_type.name.attribute`.

## Setting Up the Kubernetes Provider

Before using Kubernetes data sources, configure the provider:

```hcl
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "production-cluster"
}
```

For CI/CD environments, use explicit credentials:

```hcl
provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.cluster_token
}
```

## Querying Namespaces

One of the simplest data sources is querying a namespace:

```hcl
data "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
  }
}

output "monitoring_namespace_uid" {
  value = data.kubernetes_namespace.monitoring.metadata[0].uid
}

output "monitoring_namespace_labels" {
  value = data.kubernetes_namespace.monitoring.metadata[0].labels
}
```

This is useful when you need to reference a namespace's UID or labels in other resources, for example when creating RBAC bindings that target a specific namespace.

## Reading ConfigMaps

Data sources for ConfigMaps let you read configuration values that are managed outside of Terraform:

```hcl
data "kubernetes_config_map" "cluster_info" {
  metadata {
    name      = "cluster-info"
    namespace = "kube-public"
  }
}

output "cluster_ca" {
  value = data.kubernetes_config_map.cluster_info.data["ca.crt"]
}
```

A practical use case is reading configuration from a ConfigMap populated by a GitOps tool like ArgoCD:

```hcl
data "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-environment-config"
    namespace = "production"
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    replicas = tonumber(data.kubernetes_config_map.app_config.data["replicas"])

    template {
      spec {
        container {
          name  = "app"
          image = "${data.kubernetes_config_map.app_config.data["image_repo"]}:${data.kubernetes_config_map.app_config.data["image_tag"]}"
        }
      }
    }
  }
}
```

## Reading Secrets

You can read existing Kubernetes Secrets:

```hcl
data "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "database-credentials"
    namespace = "production"
  }
}

# Use the secret data in another resource
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "production"
  }

  data = {
    DATABASE_HOST = data.kubernetes_secret.db_credentials.data["host"]
    DATABASE_PORT = data.kubernetes_secret.db_credentials.data["port"]
  }
}
```

Be cautious with secret data sources. The values are stored in the Terraform state file in plaintext. Always encrypt your state backend (S3 with KMS, Azure Blob with encryption, GCS with CMEK) when working with sensitive data.

## Querying Services

Service data sources are useful for discovering endpoints dynamically:

```hcl
data "kubernetes_service" "ingress_nginx" {
  metadata {
    name      = "ingress-nginx-controller"
    namespace = "ingress-nginx"
  }
}

output "ingress_load_balancer_ip" {
  value = data.kubernetes_service.ingress_nginx.status[0].load_balancer[0].ingress[0].ip
}
```

This is particularly valuable when you need to create DNS records pointing to a load balancer that was provisioned by a Kubernetes Service:

```hcl
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  value   = data.kubernetes_service.ingress_nginx.status[0].load_balancer[0].ingress[0].ip
  type    = "A"
  proxied = true
}
```

## Reading Service Account Tokens

For integrations that need a service account token:

```hcl
data "kubernetes_service_account" "ci_deployer" {
  metadata {
    name      = "ci-deployer"
    namespace = "ci-system"
  }
}

data "kubernetes_secret" "ci_deployer_token" {
  metadata {
    name      = data.kubernetes_service_account.ci_deployer.default_secret_name
    namespace = "ci-system"
  }
}

output "ci_deployer_token" {
  value     = data.kubernetes_secret.ci_deployer_token.data["token"]
  sensitive = true
}
```

## Querying Persistent Volumes

When storage is provisioned externally and you need to reference it:

```hcl
data "kubernetes_persistent_volume_claim" "data" {
  metadata {
    name      = "data-postgres-0"
    namespace = "database"
  }
}

output "pvc_storage_class" {
  value = data.kubernetes_persistent_volume_claim.data.spec[0].storage_class_name
}

output "pvc_capacity" {
  value = data.kubernetes_persistent_volume_claim.data.spec[0].resources[0].requests.storage
}
```

## Using Data Sources with the Helm Provider

The Helm provider does not have traditional data sources for reading installed releases, but you can combine Kubernetes data sources with Helm releases effectively:

```hcl
# Read the values from an existing Helm release's ConfigMap
data "kubernetes_config_map" "prometheus_config" {
  metadata {
    name      = "prometheus-server"
    namespace = "monitoring"
  }
}

# Use discovered values in your own Helm release
resource "helm_release" "grafana" {
  name       = "grafana"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "grafana"
  namespace  = "monitoring"

  set {
    name  = "datasources.datasources\\.yaml.datasources[0].url"
    value = "http://prometheus-server.monitoring.svc.cluster.local:80"
  }
}
```

## Conditional Logic with Data Sources

Use data sources with `try()` and conditional expressions for resilient configurations:

```hcl
data "kubernetes_namespace" "istio_system" {
  metadata {
    name = "istio-system"
  }
}

locals {
  istio_installed = try(data.kubernetes_namespace.istio_system.metadata[0].name, "") != ""
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
    annotations = local.istio_installed ? {
      "sidecar.istio.io/inject" = "true"
    } : {}
  }
  # ...
}
```

Note that this pattern requires the namespace to exist when `terraform plan` runs. If the namespace might not exist, consider using a variable instead of a data source.

## Cross-Module Data Sharing

Data sources enable loose coupling between Terraform modules managed by different teams:

```hcl
# Team A manages the cluster and outputs nothing
# Team B queries the cluster state directly

# networking/main.tf (Team A)
resource "kubernetes_namespace" "networking" {
  metadata {
    name = "networking"
    labels = {
      "managed-by" = "team-a"
      "environment" = "production"
    }
  }
}

# application/main.tf (Team B)
data "kubernetes_namespace" "networking" {
  metadata {
    name = "networking"
  }
}

# Team B uses labels from Team A's namespace
locals {
  environment = data.kubernetes_namespace.networking.metadata[0].labels["environment"]
}
```

## Querying All Resources of a Type

Terraform's Kubernetes provider does not support listing all resources of a type natively. For bulk queries, use the `kubernetes_resources` data source (available in newer provider versions) or combine with the `external` data source:

```hcl
data "external" "namespaces" {
  program = ["bash", "-c", <<-EOT
    kubectl get namespaces -l environment=production -o json | \
    jq '{namespaces: [.items[].metadata.name] | join(",")}'
  EOT
  ]
}

locals {
  production_namespaces = split(",", data.external.namespaces.result["namespaces"])
}
```

This uses kubectl as a bridge for queries that the Terraform provider does not natively support.

## Best Practices

**Pin provider versions.** Data source schemas change between provider versions. Pin to a specific minor version to avoid breaking changes.

**Handle missing resources gracefully.** If a data source targets a resource that might not exist, your `terraform plan` will fail. Use variables with defaults as fallbacks, or ensure prerequisites are met before running Terraform.

**Minimize secret exposure.** Every data source value ends up in the Terraform state. Use remote state backends with encryption and restrict access to state files. Avoid reading secrets unless absolutely necessary.

**Use data sources for discovery, not configuration.** Data sources are best for discovering dynamic values like load balancer IPs, auto-generated names, and UIDs. For configuration values that you control, use Terraform variables or tfvars files.

## Conclusion

Terraform data sources for Kubernetes bridge the gap between Terraform-managed and externally-managed infrastructure. They enable dynamic configuration, cross-team collaboration, and integration with resources provisioned by operators, Helm charts, or manual processes. Use them thoughtfully to keep your Terraform configurations flexible and loosely coupled, while being mindful of the security implications of storing queried values in state.
