# How to Use OCI Registry Module Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Module, OCI

Description: Learn how to use OCI (Open Container Initiative) registry module sources in OpenTofu to distribute modules as container registry artifacts.

## Introduction

OpenTofu supports OCI (Open Container Initiative) registries as module sources. This allows you to publish and consume modules using the same container registry infrastructure you already use for Docker images, making it a natural fit for organizations with existing OCI registry infrastructure.

## Syntax

```hcl
module "example" {
  source = "oci://registry.example.com/namespace/module-name?tag=v1.0.0"
}
```

OpenTofu uses query parameters (`?tag=...` or `?digest=...`) to select a specific version, not Docker-style `:tag` suffixes. If no parameter is supplied, OpenTofu defaults to the artifact tagged `latest`.

## Examples

### Using a Private OCI Registry

```hcl
module "vpc" {
  source = "oci://registry.mycompany.com/terraform-modules/vpc?tag=v2.1.0"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}
```

### Docker Hub (Public Registry)

```hcl
module "example" {
  source = "oci://registry-1.docker.io/myorg/terraform-module"
  # Defaults to the 'latest' tag. Use ?tag=vX.Y.Z in production.
}
```

### Amazon ECR (Elastic Container Registry)

```hcl
module "infra_module" {
  source = "oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/terraform-modules/vpc?tag=v1.0.0"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}
```

### Google Artifact Registry

```hcl
module "gcp_module" {
  source = "oci://us-central1-docker.pkg.dev/my-project/terraform-modules/networking?tag=v1.2.0"

  project_id = var.project_id
  region     = "us-central1"
}
```

## Publishing Modules to OCI Registry

### Using ORAS (OCI Registry As Storage)

```bash
# Install ORAS

brew install oras  # macOS

# Package your module as a ZIP archive (OpenTofu requires zip, not tar.gz)
cd modules/vpc
zip -r ../vpc-module.zip .
cd ..

# Push to registry with the OpenTofu module package artifact type
oras push \
  --artifact-type=application/vnd.opentofu.modulepkg \
  registry.mycompany.com/terraform-modules/vpc:v1.0.0 \
  vpc-module.zip:archive/zip
```

OpenTofu requires the OCI Image Manifest's `artifactType` to be `application/vnd.opentofu.modulepkg` and the manifest to contain exactly one layer with `mediaType` set to `archive/zip`.

### Using OpenTofu's Built-In Push (Future)

OpenTofu's OCI support is evolving. Check the official docs for the latest publishing workflow.

## Authentication

OCI registries use standard Docker authentication:

```bash
# Docker Hub
docker login

# ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Google Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Private registry
docker login registry.mycompany.com
```

## Step-by-Step Usage

1. Set up an OCI registry (ECR, GCR, Docker Hub, or self-hosted).
2. Package your module and push it to the registry with a version tag.
3. Configure authentication in your CI/CD environment.
4. Reference with the `oci://` prefix.
5. Run `tofu init`.

## OCI vs Other Module Sources

| | OCI Registry | Git | S3/GCS |
|-|-------------|-----|--------|
| Authentication | Docker login | SSH/HTTPS | Cloud IAM |
| Versioning | Image tags | Git tags | Filename |
| Existing infra | Yes (if using containers) | Yes (if using Git) | AWS/GCP users |
| Content addressing | Yes | Yes | Via versioning |

## Conclusion

OCI registry module sources in OpenTofu enable using the same container registry infrastructure for distributing both application containers and infrastructure modules. For organizations already operating OCI registries (ECR, GCR, Artifact Registry), this is a natural extension that unifies module and container artifact management.
