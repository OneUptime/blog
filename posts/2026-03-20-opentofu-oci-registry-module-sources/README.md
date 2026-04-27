# How to Use OCI Registry Module Sources in OpenTofu - Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Module, OCI

Description: Learn how to use OCI (Open Container Initiative) registries as module sources in OpenTofu to distribute modules using container registry infrastructure.

## Introduction

OpenTofu supports OCI (Open Container Initiative) registries as module sources using the `oci://` prefix. This allows teams to store and distribute OpenTofu modules as OCI artifacts, leveraging existing container registry infrastructure like Docker Hub, Amazon ECR, Google Artifact Registry, or Azure Container Registry.

## Syntax

```hcl
module "name" {
  source = "oci://REGISTRY/REPOSITORY?tag=TAG"
}
```

## Basic OCI Module Source

```hcl
# Fetch a module stored as an OCI artifact

module "vpc" {
  source = "oci://registry.acme-corp.com/terraform-modules/vpc?tag=v2.1.0"

  name       = "production"
  cidr_block = "10.0.0.0/16"
}
```

## Using Amazon ECR

```hcl
module "eks" {
  source = "oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/terraform-modules/eks?tag=v1.5.0"

  cluster_name    = "prod-cluster"
  cluster_version = "1.28"
}
```

## Using Google Artifact Registry

```hcl
module "gke" {
  source = "oci://us-central1-docker.pkg.dev/my-project/terraform-modules/gke?tag=v1.3.0"

  project      = var.gcp_project
  cluster_name = "prod-cluster"
}
```

## Authentication

OCI module sources use the same credential store as your container runtime:

```bash
# Docker Hub or private registry
docker login registry.acme-corp.com

# Amazon ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Google Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

## Publishing a Module as an OCI Artifact

Use the `oras` CLI (OCI Registry As Storage) to push modules:

```bash
# Install oras
brew install oras

# Package your module
zip -r vpc-module.zip ./modules/vpc/

# Push to OCI registry
oras push \
  --artifact-type=application/vnd.opentofu.modulepkg \
  registry.acme-corp.com/terraform-modules/vpc:v2.1.0 \
  vpc-module.zip:archive/zip

# Tag the latest version
oras tag registry.acme-corp.com/terraform-modules/vpc:v2.1.0 latest
```

## Version Pinning with Digest

For the highest reproducibility, pin to an immutable digest rather than a mutable tag:

```hcl
# Pin to an immutable digest
module "vpc" {
  source = "oci://registry.acme-corp.com/terraform-modules/vpc?digest=sha256:abc123def456..."
}
```

## Multiple Modules from One Registry

```hcl
locals {
  registry = "registry.acme-corp.com/terraform-modules"
}

module "networking" {
  source = "oci://${local.registry}/vpc?tag=v3.0.0"
  name   = "main"
}

module "compute" {
  source = "oci://${local.registry}/ecs?tag=v2.0.0"
  vpc_id = module.networking.vpc_id
}
```

## Important Notes

- OCI module sources are an OpenTofu-specific feature not available in Terraform.
- Use immutable digests for production deployments; tags can be overwritten.
- Ensure your container registry supports anonymous pulls or configure credentials before running `tofu init`.
- OCI registries provide content-addressable storage, making tamper detection straightforward.

## Conclusion

OCI registry module sources let teams reuse existing container registry investments for OpenTofu module distribution. They offer content-addressable storage, familiar tooling, and strong access control through registry authentication. Use digest pinning for production to guarantee bit-for-bit reproducibility.
