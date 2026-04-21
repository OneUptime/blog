# How to Use Terraform Rancher2 Provider - Rancher2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Terraform, Rancher2 Provider, Infrastructure as Code, Cloud Provisioning

Description: A comprehensive guide to the Terraform Rancher2 provider covering cluster provisioning, node pool management, catalog deployment, and secrets management.

## Introduction

The Terraform Rancher2 provider manages many Rancher v2 API-backed resources as Terraform resources. Beyond simple projects and namespaces, it supports provisioning downstream RKE2 and K3s clusters on supported infrastructure providers, managing machine configs, deploying catalog apps, and configuring monitoring-related resources.

## Provider Resources Overview

The Rancher2 provider includes resources for:
- Cluster provisioning (RKE2, K3s, EKS, AKS, GKE, and RKE1 on Rancher versions that still support it)
- Machine configs and machine pools
- Projects, namespaces, and RBAC
- Catalog apps and Helm chart deployments
- Secrets and registry credentials
- Monitoring-related apps and configuration

## Step 1: Provision an RKE2 Cluster

```hcl
# rke2-cluster.tf

# Machine config for cloud provider (example: AWS)

resource "rancher2_machine_config_v2" "worker" {
  generate_name = "worker-"
  amazonec2_config {
    ami           = "ami-0abcdef1234567890"   # Amazon Linux 2 AMI
    region        = "us-east-1"
    zone          = "a"
    instance_type = "t3.medium"
    vpc_id        = "vpc-12345678"
    subnet_id     = "subnet-12345678"
    security_group = ["kubernetes-nodes"]
  }
}

# Provision a complete RKE2 cluster
resource "rancher2_cluster_v2" "production" {
  name                         = "production"
  kubernetes_version           = "<rke2-version-supported-by-your-rancher-version>"
  cloud_credential_secret_name = rancher2_cloud_credential.aws.id

  rke_config {
    machine_pools {
      name                         = "control-plane"
      cloud_credential_secret_name = rancher2_cloud_credential.aws.id
      control_plane_role           = true
      etcd_role                    = true
      worker_role                  = false
      quantity                     = 3

      machine_config {
        kind = rancher2_machine_config_v2.worker.kind
        name = rancher2_machine_config_v2.worker.name
      }
    }

    machine_pools {
      name                         = "workers"
      cloud_credential_secret_name = rancher2_cloud_credential.aws.id
      control_plane_role           = false
      etcd_role                    = false
      worker_role                  = true
      quantity                     = 3

      machine_config {
        kind = rancher2_machine_config_v2.worker.kind
        name = rancher2_machine_config_v2.worker.name
      }
    }
  }
}
```

## Step 2: Configure Cloud Credentials

```hcl
# credentials.tf
resource "rancher2_cloud_credential" "aws" {
  name = "aws-production"
  amazonec2_credential_config {
    access_key = var.aws_access_key
    secret_key = var.aws_secret_key
  }
}
```

## Step 3: Deploy a Catalog App via Terraform

```hcl
# apps.tf

# Register the Jetstack Helm chart repository as a Rancher catalog
resource "rancher2_catalog_v2" "jetstack" {
  cluster_id = rancher2_cluster_v2.production.cluster_v1_id
  name       = "jetstack"
  url        = "https://charts.jetstack.io"
}

# Deploy cert-manager from the Jetstack catalog
resource "rancher2_app_v2" "cert_manager" {
  cluster_id    = rancher2_cluster_v2.production.cluster_v1_id
  name          = "cert-manager"
  namespace     = "cert-manager"
  repo_name     = rancher2_catalog_v2.jetstack.name
  chart_name    = "cert-manager"
  chart_version = "v1.20.2"

  values = yamlencode({
    crds = {
      enabled = true
    }
    replicaCount = 2
  })
}
```

## Step 4: Create a Registry Secret

```hcl
# registry.tf
resource "rancher2_project" "myapp" {
  name       = "myapp"
  cluster_id = rancher2_cluster_v2.production.cluster_v1_id
}

resource "rancher2_registry" "dockerhub" {
  name       = "dockerhub-credentials"
  project_id = rancher2_project.myapp.id

  registries {
    address  = "docker.io"
    username = var.dockerhub_username
    password = var.dockerhub_password
  }
}
```

## Step 5: Output Cluster Kubeconfig

```hcl
# outputs.tf
output "kubeconfig" {
  value     = rancher2_cluster_v2.production.kube_config
  sensitive = true    # Mark as sensitive to avoid accidental exposure
}
```

```bash
# Extract kubeconfig after apply
terraform output -raw kubeconfig > ~/.kube/production-config
```

## Conclusion

The Rancher2 Terraform provider covers much of the Rancher management plane as code. For large environments, organize resources into separate Terraform modules per cluster and use a CI/CD pipeline with remote state locking to safely manage concurrent applies across teams.
