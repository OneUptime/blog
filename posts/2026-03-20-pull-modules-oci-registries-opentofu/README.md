# How to Pull Modules from OCI Registries with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OCI Registry, Module Source, Container, Infrastructure

Description: Learn how to configure OpenTofu to pull modules directly from OCI-compatible registries using the oci:: source prefix for version-controlled module distribution.

## Introduction

OpenTofu 1.10+ supports the `oci://` source address for modules, allowing modules to be pulled directly from OCI registries. This enables teams to distribute modules through existing container registry infrastructure without running a separate module registry server. Authentication can reuse Docker-style auth configuration, making it easy to integrate with private registries.

## Basic OCI Module Source

```hcl
# Reference a module stored in an OCI registry

module "vpc" {
  source  = "oci://registry.internal.company.com/mycompany/module-vpc?tag=1.2.0"

  name            = "production"
  cidr            = "10.0.0.0/16"
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}
```

## Authentication for Private OCI Registries

```bash
# For GitHub Container Registry (GHCR)
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

# For AWS ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# For Azure Container Registry
az acr login --name mycompanyregistry

# OpenTofu can read Docker-style auth files such as ~/.docker/config.json
# If your Docker config uses a credential helper, configure it explicitly
```

```hcl
# ~/.tofurc (or ~/.terraformrc) - explicit credentials for an OCI registry
oci_credentials "registry.internal.company.com" {
  username = "your-username"
  password = "your-password"
}
```

## Version Pinning and Constraints

```hcl
# Pin to exact version (recommended for production)
module "database" {
  source = "oci://ghcr.io/myorg/module-rds?tag=3.1.2"

  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.t4g.medium"
}

# Use a major version tag (set up by your push workflow)
module "security_groups" {
  source = "oci://ghcr.io/myorg/module-security-groups?tag=2"

  vpc_id = module.vpc.vpc_id
}

# Note: OCI sources don't support version constraints like "~> 1.0"
# You must reference a specific tag or digest
```

## Using Digests for Immutable References

```hcl
# Reference by digest for fully immutable module references
# (immune to tag mutation)

module "vpc" {
  source = "oci://registry.internal.company.com/mycompany/module-vpc?digest=sha256:abc123def456..."

  name = "production"
  cidr = "10.0.0.0/16"
}
```

```bash
# Get the digest of a specific tag
oras manifest fetch --descriptor \
  registry.internal.company.com/mycompany/module-vpc:1.2.0 | \
  jq -r '.digest'
# Output: sha256:abc123def456...
```

## Pulling from GitHub Container Registry

```hcl
# Public modules from GHCR (no authentication needed)
module "vpc" {
  source = "oci://ghcr.io/myorg/module-vpc?tag=1.0.0"

  name = "production"
  cidr = "10.0.0.0/16"
}

# Private modules from GHCR (requires authentication)
module "internal_baseline" {
  source = "oci://ghcr.io/mycompany/module-account-baseline?tag=2.1.0"
}
```

```bash
# For local use, authenticate to GHCR with a personal access token (classic)
# that has at least read:packages
export GHCR_TOKEN="ghp_yourPersonalAccessToken"
echo "$GHCR_TOKEN" | docker login ghcr.io -u myuser --password-stdin
```

## Module Version Discovery

```bash
# List all available tags for a module in OCI
oras repo tags registry.internal.company.com/mycompany/module-vpc

# Output:
# 1
# 1.0
# 1.0.0
# 1.1
# 1.1.0
# 1.2
# 1.2.0
# latest

# Inspect module contents before using
mkdir -p /tmp/module-preview
oras pull registry.internal.company.com/mycompany/module-vpc:1.2.0 \
  --output /tmp/module-preview/
unzip -l /tmp/module-preview/*.zip
```

## CI/CD Pipeline Usage

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read

    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR for module access
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - uses: opentofu/setup-opentofu@v2

      - name: Tofu Init (pulls OCI modules)
        run: tofu init

      - name: Tofu Plan
        run: tofu plan -out=plan.tfplan
```

## Caching OCI Modules in CI

```yaml
# Cache pulled modules to avoid repeated OCI pulls
# OpenTofu caches modules in .terraform/modules/ after init

# GitHub Actions cache
- name: Cache OpenTofu modules
  uses: actions/cache@v4
  with:
    path: .terraform/modules
    key: tf-modules-${{ hashFiles('**/*.tf') }}
    restore-keys: |
      tf-modules-

- name: OpenTofu Init
  run: tofu init
  # On cache hit, modules are already in .terraform/modules/
  # tofu init will skip OCI pulls for cached modules
```

## Mixing OCI and Registry Module Sources

```hcl
# Mix OCI modules with registry and local modules
module "vpc" {
  # Internal module from OCI
  source = "oci://registry.internal.company.com/mycompany/module-vpc?tag=2.0.0"
  name   = "production"
  cidr   = "10.0.0.0/16"
}

module "eks" {
  # Public registry module
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"
  cluster_name = "production"
}

module "custom_app" {
  # Local module
  source = "./modules/custom-app"
}
```

## Conclusion

Pulling modules from OCI registries uses the `oci://` source address with a registry hostname, repository path, and optional `tag` or `digest` query argument. Authentication can reuse Docker-style auth configuration, and Docker credential helpers are supported when configured explicitly. Cache the `.terraform/modules/` directory in CI pipelines to avoid repeated OCI pulls. Use digests instead of tags for production deployments where immutability matters - a digest always refers to the exact same artifact, even if the tag is later updated.
