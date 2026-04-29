# How to Authenticate the Kubernetes Provider with Kubeconfig in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, IaC, kubeconfig, Authentication

Description: Learn how to authenticate OpenTofu's Kubernetes provider using kubeconfig files, including context selection, multi-cluster management, and OIDC authentication.

## Introduction

Kubeconfig is the standard way to store Kubernetes cluster credentials. OpenTofu's Kubernetes provider can use kubeconfig files directly, making it easy to leverage existing cluster access configurations.

## Step 1: Basic Kubeconfig Authentication

```hcl
provider "kubernetes" {
  config_path = pathexpand("~/.kube/config")

  # Use the current context from the kubeconfig if not specified
  # config_context = "my-context"
}
```

## Step 2: Specify a Context

```hcl
# List contexts with: kubectl config get-contexts

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "prod-cluster-admin@prod-cluster"
}
```

## Step 3: Use Environment Variable

```bash
export KUBE_CONFIG_PATH=~/.kube/config
export KUBE_CTX=my-cluster-context
```

```hcl
provider "kubernetes" {
  # Automatically uses KUBE_CONFIG_PATH and KUBE_CTX env vars
}
```

## Step 4: Multi-Cluster with Multiple Kubeconfig Files

```hcl
provider "kubernetes" {
  alias = "cluster_a"
  config_paths = [
    "~/.kube/config",
    "~/.kube/cluster-a-config"
  ]
  config_context = "cluster-a"
}

provider "kubernetes" {
  alias          = "cluster_b"
  config_path    = "~/.kube/cluster-b-config"
  config_context = "cluster-b"
}
```

## Step 5: OIDC Authentication

```hcl
provider "kubernetes" {
  host = "https://k8s-api.example.com"

  exec {
    api_version = "client.authentication.k8s.io/v1"
    command     = "kubectl"
    args        = ["oidc-login", "get-token",
      "--oidc-issuer-url=https://accounts.google.com",
      "--oidc-client-id=my-client-id"
    ]
  }
}
```

## Step 6: AWS EKS Authentication Plugin

```hcl
provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_certificate)

  exec {
    api_version = "client.authentication.k8s.io/v1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", var.cluster_name]
    env = {
      AWS_PROFILE = "production"
    }
  }
}
```

## Conclusion

You have learned multiple methods for authenticating the Kubernetes provider in OpenTofu using kubeconfig files. For CI/CD pipelines, prefer dynamic token authentication using cloud provider data sources rather than static kubeconfig files. Always use the minimum permissions necessary for OpenTofu operations.
