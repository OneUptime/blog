# How to Handle Terraform Provider Initialization Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Initialization, Performance, CI/CD

Description: Speed up Terraform provider initialization by reducing download times, caching plugins, and optimizing multi-provider configurations.

---

Provider initialization is the first thing that happens when you run `terraform init`, and for many projects it is the slowest part of the setup process. Downloading the AWS provider takes around 15 seconds on a fast connection. Add Azure, Google Cloud, and a few utility providers, and init can take over a minute before you even get to planning.

This post covers the full set of techniques for making provider initialization fast.

## What Happens During terraform init

When you run `terraform init`, Terraform:

1. Reads the `required_providers` block to determine which providers are needed
2. Reads `.terraform.lock.hcl` if it exists to get exact version and checksum requirements
3. Contacts the Terraform registry to resolve version constraints
4. Downloads provider binaries that are not already present
5. Verifies checksums against the lock file
6. Stores providers in `.terraform/providers/`

Steps 3 and 4 are the slow ones. The registry lookup requires network calls, and the downloads can be hundreds of megabytes.

## Measuring Init Time

Start by measuring your baseline:

```bash
# Clean init (worst case)
rm -rf .terraform .terraform.lock.hcl
time terraform init

# Subsequent init (providers already downloaded)
time terraform init

# Init with only lock file changes
time terraform init -upgrade
```

Typical numbers for a project with AWS, random, and null providers:

| Scenario | Time |
|----------|------|
| Clean init, no cache | 20-45 seconds |
| Init with providers cached | 2-5 seconds |
| Init with providers in .terraform | < 1 second |

## Provider Plugin Cache

The most impactful optimization. Set up a shared cache so providers are downloaded once:

```bash
# Add to ~/.bashrc or ~/.zshrc
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
mkdir -p "$TF_PLUGIN_CACHE_DIR"
```

With the cache, init creates symlinks to cached providers instead of downloading them:

```bash
# First project: downloads providers to cache (~20 seconds)
cd project-a && terraform init

# Second project: symlinks from cache (~2 seconds)
cd ../project-b && terraform init
```

## Reducing the Number of Providers

Each provider adds init overhead. Audit your providers regularly:

```bash
# List all providers used in your configuration
terraform providers

# Example output:
# Providers required by configuration:
# .
# -- provider[registry.terraform.io/hashicorp/aws]
# -- provider[registry.terraform.io/hashicorp/random]
# -- provider[registry.terraform.io/hashicorp/null]
# -- provider[registry.terraform.io/hashicorp/template]
```

Common providers to remove:

- **null_resource**: Often used as a workaround. With Terraform 1.4+, use `terraform_data` instead (built-in, no provider needed)
- **template**: Deprecated since Terraform 0.12. Use `templatefile()` function instead
- **external**: Consider if the logic can be moved to a local-exec provisioner or a custom module

```hcl
# Before: Using template provider (adds init overhead)
data "template_file" "user_data" {
  template = file("userdata.tpl")
  vars = {
    env = var.environment
  }
}

# After: Using built-in function (no provider needed)
locals {
  user_data = templatefile("userdata.tpl", {
    env = var.environment
  })
}
```

## Pre-downloading Providers

For CI/CD, pre-download providers as a build step:

```bash
# Create a providers mirror directory
terraform providers mirror /opt/terraform/providers

# Configure Terraform to use the mirror
cat > ~/.terraformrc <<EOF
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/*/*"]
  }
  direct {
    exclude = ["registry.terraform.io/*/*"]
  }
}
EOF

# Now terraform init uses the local mirror (no network calls)
terraform init
```

### Docker Image with Pre-installed Providers

```dockerfile
FROM hashicorp/terraform:1.7

# Copy your terraform files
COPY *.tf /workspace/
WORKDIR /workspace

# Pre-download providers during image build
RUN terraform init -backend=false

# Now init in CI only needs to configure the backend
# Providers are already in .terraform/providers/
```

## Optimizing Lock File Handling

The `.terraform.lock.hcl` file records checksums for each provider on each platform. If your lock file has checksums for platforms you do not use, init still validates them:

```bash
# Generate lock file for only the platforms you use
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64

# If you only run on Linux CI
terraform providers lock -platform=linux_amd64
```

A smaller lock file means fewer checksums to verify.

## Handling Multiple Provider Versions

When you have multiple projects using different provider versions, the cache stores each version separately. This is correct behavior but means the cache grows:

```bash
# Check cache size and contents
du -sh "$HOME/.terraform.d/plugin-cache"
ls -la "$HOME/.terraform.d/plugin-cache/registry.terraform.io/hashicorp/aws/"
```

Standardize provider versions across projects where possible:

```hcl
# All projects use the same version
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.30.0"  # Exact version, same across projects
    }
  }
}
```

This means the cache only needs one copy of each provider.

## Parallel Provider Downloads

Terraform downloads providers sequentially during init. If you need multiple large providers, this adds up:

```text
AWS provider:     [====== 15s ======]
Azure provider:            [====== 12s ======]
Google provider:                     [====== 10s ======]
Total:            [=============== 37s ===============]
```

There is no built-in way to parallelize this. However, you can work around it by pre-downloading with multiple processes:

```bash
#!/bin/bash
# parallel-download.sh
# Pre-populate cache with parallel downloads

CACHE_DIR="$HOME/.terraform.d/plugin-cache"
PLATFORM="linux_amd64"

# Download providers in parallel
download_provider() {
  local provider=$1
  local version=$2
  echo "Downloading $provider v$version..."
  # Create a temporary tf config for this provider
  local tmpdir=$(mktemp -d)
  cat > "$tmpdir/main.tf" <<EOF
terraform {
  required_providers {
    $(echo $provider | cut -d/ -f2) = {
      source  = "$provider"
      version = "$version"
    }
  }
}
EOF
  cd "$tmpdir"
  TF_PLUGIN_CACHE_DIR="$CACHE_DIR" terraform init -input=false > /dev/null 2>&1
  rm -rf "$tmpdir"
  echo "Done: $provider v$version"
}

# Run downloads in parallel
download_provider "hashicorp/aws" "5.30.0" &
download_provider "hashicorp/azurerm" "3.85.0" &
download_provider "hashicorp/google" "5.12.0" &

wait
echo "All providers cached."
```

## Init Without Backend

During development, you can skip backend configuration to speed up init:

```bash
# Skip backend configuration (local state only)
terraform init -backend=false
```

This is useful when you just want to validate syntax or check plan output during development. It skips the backend initialization step entirely.

## Measuring Init Performance Over Time

Track init times to catch regressions:

```bash
#!/bin/bash
# track-init-time.sh

start=$(date +%s)
terraform init -input=false > /dev/null 2>&1
end=$(date +%s)

echo "$(date +%Y-%m-%d),$(( end - start ))" >> init-times.csv
```

If init time suddenly increases, check if someone added a new provider or changed version constraints.

## Summary

Provider initialization performance comes down to avoiding redundant downloads. Set up a plugin cache, remove unused providers, standardize versions across projects, and pre-download providers in CI/CD. These changes make `terraform init` nearly instant for most scenarios, turning a bottleneck into a non-issue.

For monitoring the infrastructure managed by your Terraform providers, [OneUptime](https://oneuptime.com) offers cross-provider observability and alerting that works with AWS, Azure, GCP, and more.
