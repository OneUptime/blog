# How to Use OCI Registry Support Introduced in OpenTofu 1.10

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OCI Registry, OpenTofu 1.10, Module, Infrastructure as Code

Description: Learn how to use OCI registry support introduced in OpenTofu 1.10 to store and distribute OpenTofu modules and providers via container registries.

## Introduction

OpenTofu 1.10 added support for OCI (Open Container Initiative) registries as a source for modules and providers. This allows teams to use container registries like AWS ECR, GitHub Container Registry, or any OCI-compliant registry to host and distribute OpenTofu modules privately, without needing a dedicated Terraform registry.

## Using an OCI Module Source

Reference a module stored in an OCI registry using the `oci://` scheme.

```hcl
module "vpc" {
  source  = "oci://ghcr.io/my-org/opentofu-modules/vpc?tag=v1.2.0"
}

module "eks" {
  source  = "oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/opentofu-modules/eks?tag=v2.0.1"
}
```

## Publishing a Module to an OCI Registry

Package your module as an OCI artifact and push it to a registry.

```bash
# Install the oras CLI tool for OCI artifact management

brew install oras

# Package module files as an OCI artifact (a zip archive is required)
cd ./modules/vpc && zip -r ../../vpc-module.zip . && cd -

# Push to GitHub Container Registry
oras push ghcr.io/my-org/opentofu-modules/vpc:v1.2.0 \
  --artifact-type application/vnd.opentofu.modulepkg \
  vpc-module.zip:archive/zip

# Push to AWS ECR
aws ecr create-repository --repository-name opentofu-modules/vpc
oras push 123456789012.dkr.ecr.us-east-1.amazonaws.com/opentofu-modules/vpc:v1.2.0 \
  --artifact-type application/vnd.opentofu.modulepkg \
  vpc-module.zip:archive/zip
```

## Authentication for Private OCI Registries

Configure authentication using standard Docker credentials or environment variables.

```bash
# Log in to AWS ECR (credentials are picked up automatically by OpenTofu)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Log in to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# OpenTofu reads from ~/.docker/config.json automatically
tofu init
```

## Using OCI Modules in CI/CD

Configure ECR authentication in a GitHub Actions workflow.

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - name: Login to ECR for OpenTofu modules
        run: |
          aws ecr get-login-password --region us-east-1 | \
            docker login --username AWS --password-stdin \
            123456789012.dkr.ecr.us-east-1.amazonaws.com

      - name: OpenTofu init and apply
        run: |
          tofu init
          tofu apply -auto-approve
```

## Version Pinning with OCI Modules

Pin to a specific digest for reproducible builds.

```hcl
# Pin to a specific tag
module "vpc" {
  source = "oci://ghcr.io/my-org/opentofu-modules/vpc?tag=v1.2.0"
}

# Pin to an immutable digest for maximum reproducibility
module "vpc" {
  source = "oci://ghcr.io/my-org/opentofu-modules/vpc?digest=sha256:abc123def456..."
}
```

## Advantages Over Git Sources

OCI registries offer several advantages for module distribution.

```text
Git source:     git::https://github.com/org/module.git?ref=v1.2.0
OCI source:     oci://ghcr.io/org/modules/vpc?tag=v1.2.0

Benefits of OCI:
- Built-in versioning and tagging
- Content addressable (digest pinning)
- Access control via registry permissions
- Works with existing container infrastructure
- No need to expose Git repositories
- Faster downloads via layer caching
```

## Summary

OCI registry support in OpenTofu 1.10 enables organizations to distribute modules through the same container registry infrastructure they already use for Docker images. This is particularly valuable for air-gapped environments, organizations with strict access controls, or teams that want to leverage ECR or GHCR without running a separate module registry. Combine digest pinning with registry immutability policies for fully reproducible infrastructure deployments.
