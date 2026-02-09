# Using the Terraform Helm Provider to Deploy Charts with Custom Values
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Terraform, Helm, Provider, Kubernetes, Configuration
Description: Learn how to use the Terraform Helm provider to deploy Helm charts with custom values files, overrides, and dynamic configuration for Kubernetes workloads.
---

Managing Kubernetes deployments through Helm charts is already a powerful approach, but combining it with Terraform takes your infrastructure automation to the next level. The Terraform Helm provider allows you to treat Helm releases as declarative infrastructure resources, complete with state tracking, dependency management, and plan-based workflows. In this post, we will explore how to configure the Helm provider, deploy charts with custom values files, and handle advanced override scenarios.

## Why Use Terraform with Helm

Helm on its own is a solid package manager for Kubernetes, but it lacks the broader infrastructure orchestration that Terraform provides. When you use the Terraform Helm provider, you gain several advantages. First, your Helm releases become part of your overall Terraform state, meaning you can manage cloud resources, DNS records, databases, and Kubernetes workloads in a single plan. Second, Terraform's dependency graph ensures that resources are created in the correct order. Third, you get drift detection and the ability to preview changes before applying them.

## Configuring the Helm Provider

To get started, you need to configure both the Kubernetes and Helm providers in your Terraform configuration. The Helm provider relies on a valid Kubernetes connection.

```hcl
terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster-context"
}

provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = "my-cluster-context"
  }
}
```

For production environments, you will often connect to cloud-managed clusters using provider-specific authentication. Here is an example for AWS EKS:

```hcl
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = var.cluster_name
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}
```

## Deploying a Helm Chart with Custom Values

The `helm_release` resource is the core building block. Here is a basic example that deploys NGINX Ingress Controller with custom values:

```hcl
resource "helm_release" "nginx_ingress" {
  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = "4.9.0"
  namespace  = "ingress-system"

  create_namespace = true

  set {
    name  = "controller.replicaCount"
    value = "3"
  }

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "controller.metrics.enabled"
    value = "true"
  }
}
```

The `set` blocks allow you to override individual values from the chart's defaults. This works well for simple overrides, but it becomes unwieldy when you have many values to configure.

## Using Custom Values Files

For complex configurations, a values file is far more manageable. You can reference external YAML files using the `values` argument:

```hcl
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "55.5.0"
  namespace  = "monitoring"

  create_namespace = true

  values = [
    file("${path.module}/values/prometheus-base.yaml"),
    file("${path.module}/values/prometheus-${var.environment}.yaml")
  ]
}
```

The values list is merged in order, meaning later entries override earlier ones. This pattern is extremely useful for environment-specific configuration. Your base values file might look like this:

```yaml
# values/prometheus-base.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    resources:
      requests:
        memory: 2Gi
        cpu: 500m
      limits:
        memory: 4Gi
        cpu: "2"
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3
          resources:
            requests:
              storage: 50Gi

grafana:
  enabled: true
  adminPassword: ${grafana_admin_password}
  persistence:
    enabled: true
    size: 10Gi

alertmanager:
  alertmanagerSpec:
    retention: 120h
```

And your production overlay:

```yaml
# values/prometheus-production.yaml
prometheus:
  prometheusSpec:
    retention: 30d
    replicas: 2
    resources:
      requests:
        memory: 8Gi
        cpu: "2"
      limits:
        memory: 16Gi
        cpu: "4"
    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 200Gi
```

## Dynamic Values with templatefile

When your values files need to reference Terraform variables or computed values, you can use the `templatefile` function:

```hcl
resource "helm_release" "app" {
  name      = "my-application"
  chart     = "${path.module}/charts/my-app"
  namespace = var.namespace

  values = [
    templatefile("${path.module}/values/app.yaml.tpl", {
      image_tag          = var.image_tag
      replica_count      = var.environment == "production" ? 3 : 1
      database_host      = aws_rds_cluster.main.endpoint
      redis_host         = aws_elasticache_cluster.main.cache_nodes[0].address
      domain_name        = var.domain_name
      enable_autoscaling = var.environment == "production"
    })
  ]
}
```

The template file uses standard Terraform template syntax:

```yaml
# values/app.yaml.tpl
image:
  tag: "${image_tag}"

replicaCount: ${replica_count}

config:
  databaseHost: "${database_host}"
  redisHost: "${redis_host}"

ingress:
  enabled: true
  hosts:
    - host: "${domain_name}"
      paths:
        - path: /
          pathType: Prefix

autoscaling:
  enabled: ${enable_autoscaling}
  minReplicas: ${replica_count}
  maxReplicas: ${replica_count * 3}
  targetCPUUtilizationPercentage: 70
```

## Combining set and values for Sensitive Data

For sensitive values like passwords and API keys, you should avoid putting them in plain-text files. Use the `set_sensitive` block instead:

```hcl
resource "helm_release" "app" {
  name      = "my-application"
  chart     = "${path.module}/charts/my-app"
  namespace = var.namespace

  values = [
    file("${path.module}/values/app.yaml")
  ]

  set_sensitive {
    name  = "secrets.databasePassword"
    value = var.database_password
  }

  set_sensitive {
    name  = "secrets.apiKey"
    value = data.aws_secretsmanager_secret_version.api_key.secret_string
  }
}
```

Values set with `set_sensitive` will be masked in Terraform plan output and logs, providing an additional layer of security.

## Managing Chart Repositories

If you use private Helm repositories, you can configure repository credentials directly in the provider or on individual releases:

```hcl
resource "helm_release" "internal_app" {
  name       = "internal-app"
  repository = "https://charts.internal.company.com"
  chart      = "my-internal-chart"
  version    = "2.1.0"
  namespace  = "apps"

  repository_username = var.helm_repo_username
  repository_password = var.helm_repo_password
}
```

For OCI-based registries, which are becoming the standard for Helm chart distribution:

```hcl
resource "helm_release" "app_from_oci" {
  name      = "my-oci-app"
  chart     = "oci://registry.example.com/charts/my-app"
  version   = "1.5.0"
  namespace = "apps"
}
```

## Handling Timeouts and Wait Conditions

Production Helm deployments often need careful timeout and wait configuration:

```hcl
resource "helm_release" "database" {
  name      = "postgresql"
  repository = "https://charts.bitnami.com/bitnami"
  chart     = "postgresql"
  version   = "14.0.0"
  namespace = "databases"

  timeout         = 600
  wait            = true
  wait_for_jobs   = true
  atomic          = true
  cleanup_on_fail = true

  values = [
    file("${path.module}/values/postgresql.yaml")
  ]
}
```

Setting `atomic = true` ensures that if the release fails, Terraform will automatically roll back to the previous version. The `cleanup_on_fail` flag removes any new resources created during the failed release.

## Post-Render Processing with Kustomize

The Helm provider supports post-rendering, which lets you apply Kustomize patches or other transformations to the rendered manifests before they are applied:

```hcl
resource "helm_release" "app" {
  name      = "my-application"
  chart     = "${path.module}/charts/my-app"
  namespace = var.namespace

  postrender {
    binary_path = "kustomize"
    args        = ["build", "${path.module}/kustomize/overlays/${var.environment}"]
  }
}
```

This is particularly powerful when you need to add labels, annotations, or patches that are not exposed through the chart's values.

## Best Practices

When working with the Terraform Helm provider, keep these guidelines in mind. Always pin chart versions to prevent unexpected upgrades. Use separate values files per environment rather than complex conditional logic in HCL. Store your values files in version control alongside your Terraform code. Use `set_sensitive` for any credentials or tokens. Enable `atomic` mode for critical deployments to get automatic rollback on failure. Finally, consider using `terraform plan` output to review the exact changes that will be applied to your Helm releases before executing them.

The Terraform Helm provider bridges the gap between infrastructure provisioning and application deployment, giving you a unified workflow for managing your entire Kubernetes stack. By leveraging custom values files, template functions, and sensitive value handling, you can build robust and secure deployment pipelines that scale across multiple environments and teams.
