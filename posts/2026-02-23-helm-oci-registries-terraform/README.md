# How to Use Helm with OCI Registries in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Helm, OCI, Container Registry, DevOps

Description: Learn how to use Helm charts stored in OCI-compliant container registries with Terraform, including authentication setup for ECR, ACR, GCR, and private registries.

---

Helm charts have traditionally been stored in HTTP-based chart repositories. But since Helm 3.8, OCI (Open Container Initiative) registries became the recommended way to distribute charts. Major cloud providers - AWS ECR, Azure ACR, Google Artifact Registry - all support storing Helm charts as OCI artifacts. Using these with Terraform requires a slightly different configuration than traditional chart repositories.

This guide covers how to pull and deploy Helm charts from OCI registries using Terraform, with authentication examples for the major cloud providers.

## Why OCI Registries for Helm Charts

Traditional Helm repositories use an `index.yaml` file served over HTTP. This works, but has limitations. The index file grows with every chart version, repositories need separate hosting infrastructure, and there is no standard authentication mechanism.

OCI registries solve these problems. They reuse existing container registry infrastructure, support standard authentication, provide content-addressable storage, and work with the same tooling you already use for container images.

## Basic OCI Helm Release in Terraform

The key difference when using OCI registries is the `repository` format. Instead of an HTTP URL, you use the `oci://` prefix.

```hcl
# providers.tf - configure Helm provider
terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

# Deploy a chart from an OCI registry
resource "helm_release" "nginx" {
  name       = "my-nginx"
  namespace  = "web"
  chart      = "oci://registry-1.docker.io/bitnamicharts/nginx"
  version    = "15.4.0"

  # Values work the same as with traditional repositories
  set {
    name  = "replicaCount"
    value = "2"
  }

  set {
    name  = "service.type"
    value = "ClusterIP"
  }
}
```

Notice that with OCI registries, you do not use the `repository` attribute. The full OCI URL goes in the `chart` attribute instead. This catches many people off guard the first time.

## Authenticating with AWS ECR

AWS Elastic Container Registry supports OCI Helm charts. You need to authenticate Terraform's Helm provider with ECR credentials.

```hcl
# Get an ECR authorization token
data "aws_ecr_authorization_token" "token" {}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }

  # Configure registry credentials for ECR
  registry {
    url      = "oci://${data.aws_ecr_authorization_token.token.proxy_endpoint}"
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }
}

# Deploy a chart from your private ECR repository
resource "helm_release" "app" {
  name      = "my-app"
  namespace = "production"
  chart     = "oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app-chart"
  version   = "1.2.0"

  values = [
    file("${path.module}/values/production.yaml")
  ]
}
```

ECR tokens expire after 12 hours. For long-running Terraform operations or CI pipelines, make sure the token is fresh before running `terraform apply`.

## Authenticating with Azure ACR

Azure Container Registry works similarly, but uses different credential sources.

```hcl
# Get ACR credentials from Azure
data "azurerm_container_registry" "acr" {
  name                = "myacregistry"
  resource_group_name = "my-resource-group"
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }

  # Configure registry credentials for ACR
  registry {
    url      = "oci://myacregistry.azurecr.io"
    username = data.azurerm_container_registry.acr.admin_username
    password = data.azurerm_container_registry.acr.admin_password
  }
}

# Deploy from ACR
resource "helm_release" "app" {
  name      = "my-app"
  namespace = "production"
  chart     = "oci://myacregistry.azurecr.io/helm/my-app"
  version   = "2.1.0"

  values = [
    yamlencode({
      image = {
        repository = "myacregistry.azurecr.io/my-app"
        tag        = var.image_tag
      }
    })
  ]
}
```

If you prefer not to use admin credentials, you can create a service principal with AcrPull permissions and use those credentials instead.

## Authenticating with Google Artifact Registry

Google Cloud's Artifact Registry is the successor to GCR and has full OCI support.

```hcl
# Get Google access token for authentication
data "google_client_config" "current" {}

provider "helm" {
  kubernetes {
    host                   = data.google_container_cluster.primary.endpoint
    token                  = data.google_client_config.current.access_token
    cluster_ca_certificate = base64decode(data.google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
  }

  # Configure registry credentials for Google Artifact Registry
  registry {
    url      = "oci://us-central1-docker.pkg.dev"
    username = "oauth2accesstoken"
    password = data.google_client_config.current.access_token
  }
}

# Deploy from Google Artifact Registry
resource "helm_release" "app" {
  name      = "my-app"
  namespace = "production"
  chart     = "oci://us-central1-docker.pkg.dev/my-project/my-repo/my-app-chart"
  version   = "1.0.0"

  values = [
    file("${path.module}/values/app.yaml")
  ]
}
```

## Pushing Charts to OCI Registries

Before you can deploy from an OCI registry, you need to push your charts there. Here is how to do it with the Helm CLI.

```bash
# Log in to your registry
helm registry login myregistry.azurecr.io

# Package the chart
helm package ./my-chart

# Push the packaged chart to the OCI registry
helm push my-chart-1.0.0.tgz oci://myregistry.azurecr.io/helm

# For ECR, log in with AWS credentials first
aws ecr get-login-password --region us-east-1 | \
  helm registry login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

helm push my-chart-1.0.0.tgz oci://123456789012.dkr.ecr.us-east-1.amazonaws.com
```

## Multiple Registry Authentication

When you pull charts from multiple OCI registries in the same Terraform configuration, define multiple `registry` blocks.

```hcl
provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }

  # Private company registry
  registry {
    url      = "oci://registry.company.com"
    username = var.registry_username
    password = var.registry_password
  }

  # AWS ECR for shared platform charts
  registry {
    url      = "oci://123456789012.dkr.ecr.us-east-1.amazonaws.com"
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }
}

# Chart from company registry
resource "helm_release" "internal_app" {
  name      = "internal-app"
  namespace = "apps"
  chart     = "oci://registry.company.com/charts/internal-app"
  version   = "3.1.0"
}

# Chart from ECR
resource "helm_release" "platform_service" {
  name      = "platform-service"
  namespace = "platform"
  chart     = "oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/platform-service"
  version   = "2.0.0"
}
```

## Handling Chart Versions

With OCI registries, version pinning works the same as traditional repositories. Always pin your chart versions to avoid surprises.

```hcl
# Pin the chart version explicitly
resource "helm_release" "redis" {
  name      = "redis"
  namespace = "cache"
  chart     = "oci://registry-1.docker.io/bitnamicharts/redis"
  version   = "18.6.1"  # Always pin this

  # You can use a variable for version to make upgrades easier
  # version = var.redis_chart_version
}
```

To find available versions in an OCI registry, use the Helm CLI:

```bash
# List available tags (versions) for a chart in an OCI registry
helm show all oci://registry-1.docker.io/bitnamicharts/redis --version 18.6.1

# For ECR, you can also use the AWS CLI
aws ecr describe-images --repository-name my-chart --region us-east-1
```

## CI/CD Integration

In CI/CD pipelines, you typically authenticate using service account credentials or short-lived tokens. Here is a pattern that works well.

```hcl
# variables.tf
variable "registry_credentials" {
  type = object({
    url      = string
    username = string
    password = string
  })
  sensitive = true
}

# main.tf
provider "helm" {
  kubernetes {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca_cert)
    token                  = var.cluster_token
  }

  registry {
    url      = var.registry_credentials.url
    username = var.registry_credentials.username
    password = var.registry_credentials.password
  }
}
```

Then in your CI pipeline:

```bash
# Pass credentials through environment variables
export TF_VAR_registry_credentials='{
  "url": "oci://123456789012.dkr.ecr.us-east-1.amazonaws.com",
  "username": "AWS",
  "password": "'$(aws ecr get-login-password)'"
}'

terraform apply
```

## Common Issues and Troubleshooting

A few things that trip people up when working with OCI charts in Terraform:

1. **Chart attribute vs repository**: With OCI, the full URL goes in `chart`, not `repository`. Setting `repository` to an OCI URL will fail.

2. **Missing oci:// prefix**: The URL must start with `oci://`. Without it, Terraform tries to treat it as an HTTP repository.

3. **Version is required**: Unlike HTTP repositories where Helm can fetch the latest version from the index, OCI registries require an explicit version.

4. **Token expiration**: Cloud provider tokens expire. In CI, always generate a fresh token before running Terraform.

5. **Registry URL format**: The URL in the `registry` block should match the prefix of your chart URLs. If your chart is at `oci://myregistry.com/charts/app`, the registry URL should be `oci://myregistry.com`.

OCI registries are the future of Helm chart distribution. Once you get the authentication wired up, the workflow with Terraform is clean and reliable. For more on managing Helm releases, see our post on [configuring Helm release values in Terraform](https://oneuptime.com/blog/post/2026-02-23-helm-release-values-terraform/view).
