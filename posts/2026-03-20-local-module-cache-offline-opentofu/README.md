# How to Create a Local Module Cache for Offline OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module Cache, Offline, Air-Gapped, Module

Description: Learn how to create and use a local module cache for offline OpenTofu deployments, enabling module installation without internet access in restricted environments.

## Introduction

OpenTofu modules can come from the public registry, remote Git repositories, or HTTP URLs - all of which require network access to their source location. For air-gapped environments, you need to pre-download modules and make them available locally. This guide covers strategies for caching public registry modules, Git modules, and hosting internal module sources.

## Understanding How OpenTofu Caches Modules

```bash
# After tofu init, modules are cached in .terraform/modules/

ls .terraform/modules/

# modules.json tracks module sources and versions
cat .terraform/modules/modules.json

# Structure:
# {
#   "Modules": [
#     {
#       "Key": "vpc",
#       "Source": "registry.opentofu.org/terraform-aws-modules/vpc/aws",
#       "Version": "5.0.0",
#       "Dir": ".terraform/modules/vpc"
#     }
#   ]
# }
```

## Downloading Registry Modules for Offline Use

```bash
# On internet-connected machine: download and bundle modules

mkdir -p /tmp/module-cache
mkdir -p /tmp/module-download

# Create a configuration listing all needed modules
cat > /tmp/module-download/main.tf << 'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  # Required variables (use dummy values for download)
  name = "download"
  cidr = "10.0.0.0/16"
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.0.0"
  cluster_name = "download"
}
EOF

cd /tmp/module-download
tofu init

# Modules are now in .terraform/modules/
# Copy to shared cache
cp -r .terraform/modules/* /tmp/module-cache/
```

## Using Local Filesystem Module Copies

```hcl
# In your configuration: use a local filesystem copy instead of the registry

module "vpc" {
  # Instead of: source = "terraform-aws-modules/vpc/aws"
  # Absolute paths work, but OpenTofu will copy them into .terraform/modules/
  source = "/opt/opentofu/modules/terraform-aws-vpc"

  name = "production"
  cidr = "10.0.0.0/16"
  azs  = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
```

```bash
# Organize modules in a structured directory
/opt/opentofu/modules/
├── terraform-aws-vpc/          # terraform-aws-modules/vpc/aws
├── terraform-aws-eks/          # terraform-aws-modules/eks/aws
├── terraform-aws-rds/          # terraform-aws-modules/rds/aws
└── internal/
    ├── baseline-account/       # Company-internal modules
    └── observability-stack/
```

## Caching Git Modules

```bash
# For modules sourced from Git repositories

# Clone to local mirror
git clone --mirror https://github.com/terraform-aws-modules/terraform-aws-vpc.git \
  /opt/git-mirror/terraform-aws-vpc.git

# Optional: create a non-bare working tree clone from the mirror
git clone /opt/git-mirror/terraform-aws-vpc.git /opt/git-checkout/terraform-aws-vpc

# Update the mirror periodically
git -C /opt/git-mirror/terraform-aws-vpc.git remote update

# Reference the local git mirror in configs
```

```hcl
# Reference local git mirror
module "vpc" {
  source = "git::file:///opt/git-mirror/terraform-aws-vpc.git?ref=v5.0.0"
}

# Or use the non-bare local clone directly
module "vpc" {
  source = "/opt/git-checkout/terraform-aws-vpc"
}
```

## Pre-Populating the Module Cache

```bash
#!/bin/bash
# populate-module-cache.sh

set -euo pipefail

WORK_DIR="/tmp/module-cache-work"
CACHE_DIR="/opt/opentofu/module-cache"

mkdir -p "$WORK_DIR" "$CACHE_DIR"

# Create comprehensive module download config
cat > "$WORK_DIR/main.tf" << 'EOF'
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  name = "cache-download"
  cidr = "10.0.0.0/16"
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.0.0"
  cluster_name = "cache-download"
}

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.0.0"
}
EOF

cd "$WORK_DIR"
tofu init

# Copy module cache
cp -r "$WORK_DIR/.terraform/modules/"* "$CACHE_DIR/"
cp "$WORK_DIR/.terraform/modules/modules.json" "$CACHE_DIR/"

echo "Module cache populated at $CACHE_DIR"
```

## Using a Pre-Populated Module Cache

```bash
# Set the plugin cache dir for providers (different from module cache)
mkdir -p /opt/opentofu/provider-cache
export TF_PLUGIN_CACHE_DIR=/opt/opentofu/provider-cache

# For modules: set up the .terraform/modules directory before init
# by copying from the pre-populated cache

mkdir -p .terraform/modules
cp -r /opt/opentofu/module-cache/* .terraform/modules/

# Because the module tree is already present, init can skip child module installation
tofu init -get=false
```

## Internal Git Hosting (Gitea) and GitLab Module Registry

```bash
# Host the module in an internal Gitea Git repository

# Push module to internal Gitea
git clone https://github.com/terraform-aws-modules/terraform-aws-vpc.git
cd terraform-aws-vpc
git remote add internal https://gitea.internal.company.com/terraform-modules/terraform-aws-vpc.git
git push internal --tags
git push internal HEAD
```

```hcl
# Reference the module from an internal Gitea Git repository
module "vpc" {
  source = "git::https://gitea.internal.company.com/terraform-modules/terraform-aws-vpc.git?ref=v5.0.0"
}
```

## GitLab Module Registry

```bash
# Push to GitLab Terraform Module Registry

# GitLab Package Registry API
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
     --upload-file terraform-aws-vpc-5.0.0.tgz \
     "https://gitlab.company.com/api/v4/projects/123/packages/terraform/modules/vpc/aws/5.0.0/file"
```

```hcl
# Reference GitLab module registry
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

# GitLab module registry source
module "vpc" {
  source  = "gitlab.company.com/terraform-modules/vpc/aws"
  version = "5.0.0"
}
```

## Conclusion

For air-gapped module access, the simplest approach is converting registry sources to local filesystem copies. For teams, hosting modules in internal Git repositories (for example, Gitea) or a private module registry (for example, GitLab's Terraform Module Registry) provides versioning and sharing. Pre-populating the `.terraform/modules` directory before `tofu init` can avoid re-installing child modules when running `tofu init -get=false`, as long as the working directory already has the matching module tree in place.
