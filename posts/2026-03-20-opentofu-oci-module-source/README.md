# Using OCI Registries as Module Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, OCI

Description: Learn how to use OCI (Open Container Initiative) registries as module sources in OpenTofu.

OpenTofu can source modules from OCI (Open Container Initiative) registries - the same infrastructure used for container images. This allows organizations to use existing registry infrastructure like ECR, GCR, Docker Hub, or Harbor for module distribution.

## OCI Module Source Syntax

```hcl
module "vpc" {
  source = "oci://registry.example.com/terraform-modules/vpc?tag=v2.1.0"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}
```

## Using Public OCI Registries

```hcl
# Docker Hub

module "example" {
  source = "oci://docker.io/myorg/terraform-vpc?tag=v1.0.0"
}

# GitHub Container Registry
module "vpc" {
  source = "oci://ghcr.io/myorg/terraform-vpc?tag=v1.0.0"
}

# AWS ECR
module "vpc" {
  source = "oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/terraform-modules/vpc?tag=v1.0.0"
}
```

## Authentication

```bash
# Docker Hub
docker login

# AWS ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Google Artifact Registry
gcloud auth configure-docker us-docker.pkg.dev

# GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

## Publishing a Module to OCI Registry

```bash
# Install oras (OCI Registry AS Storage)
brew install oras

# Package your module as a .zip archive
cd ./modules/vpc/
zip -r ../../vpc-module.zip .
cd ../..

# Push to OCI registry
oras push \
  --artifact-type=application/vnd.opentofu.modulepkg \
  registry.example.com/terraform-modules/vpc:v2.1.0 \
  vpc-module.zip:archive/zip

# Tag as latest
oras tag registry.example.com/terraform-modules/vpc:v2.1.0 latest
```

## Complete Example

```hcl
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

module "vpc" {
  source = "oci://ghcr.io/mycompany/terraform-aws-vpc?tag=v2.0.0"

  vpc_cidr            = "10.0.0.0/16"
  availability_zones  = ["us-east-1a", "us-east-1b", "us-east-1c"]
  environment         = var.environment
}

module "eks" {
  source = "oci://ghcr.io/mycompany/terraform-aws-eks?tag=v1.5.0"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}
```

## Conclusion

OCI module sources let organizations reuse existing container registry infrastructure for Terraform/OpenTofu modules. This is particularly valuable for organizations already using ECR, GCR, Harbor, or Docker Hub, as it eliminates the need for a separate module registry while providing familiar tooling, access control, and scanning capabilities.
