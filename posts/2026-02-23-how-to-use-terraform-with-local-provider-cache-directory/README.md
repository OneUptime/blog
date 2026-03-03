# How to Use Terraform with Local Provider Cache Directory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Cache, Offline Mode, CI/CD, Performance

Description: Set up and manage a local provider cache directory in Terraform to enable faster initialization, offline operation, and shared caching.

---

Terraform providers are the plugins that allow Terraform to interact with cloud platforms, SaaS tools, and other APIs. Each provider is a separate binary that gets downloaded during `terraform init`. The AWS provider alone is over 300 MB, and most real-world projects use multiple providers.

A local provider cache directory tells Terraform to store downloaded providers in a central location and reuse them across projects. This is different from the default behavior, where every project maintains its own copy of each provider in its `.terraform` directory.

## Setting Up the Cache Directory

There are two ways to configure the cache: an environment variable and a CLI configuration file.

### Environment Variable

```bash
# Add to your shell profile
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"

# Create the directory
mkdir -p "$HOME/.terraform.d/plugin-cache"
```

### CLI Configuration File

Create or edit `~/.terraformrc` (Linux/macOS) or `%APPDATA%\terraform.rc` (Windows):

```hcl
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
```

The environment variable takes precedence over the config file if both are set.

## How the Cache Works Internally

When you run `terraform init` with a cache configured, Terraform follows this process:

1. Reads `required_providers` from your configuration
2. Checks the lock file (`.terraform.lock.hcl`) for required checksums
3. Looks in the cache directory for matching provider versions
4. If found, creates a symbolic link from `.terraform/providers/` to the cached binary
5. If not found, downloads the provider to the cache, then creates the symlink

The directory structure inside the cache mirrors the provider's registry path:

```text
~/.terraform.d/plugin-cache/
  registry.terraform.io/
    hashicorp/
      aws/
        5.30.0/
          darwin_arm64/
            terraform-provider-aws_v5.30.0_x5
        5.29.0/
          darwin_arm64/
            terraform-provider-aws_v5.29.0_x5
      random/
        3.6.0/
          darwin_arm64/
            terraform-provider-random_v3.6.0_x5
```

## Verifying Cache Usage

After setting up the cache, you can verify it is being used:

```bash
# Run init and watch the output
terraform init

# Check that symlinks point to the cache
ls -la .terraform/providers/registry.terraform.io/hashicorp/aws/5.30.0/darwin_arm64/

# Output should show something like:
# terraform-provider-aws_v5.30.0_x5 -> /Users/you/.terraform.d/plugin-cache/registry.terraform.io/hashicorp/aws/5.30.0/darwin_arm64/terraform-provider-aws_v5.30.0_x5
```

If you see symlinks pointing to your cache directory, it is working.

## Managing Cache Size

The cache grows over time because Terraform never removes old versions. Monitor and clean it periodically:

```bash
# Check total cache size
du -sh "$HOME/.terraform.d/plugin-cache"

# List all cached provider versions
find "$HOME/.terraform.d/plugin-cache" -name "terraform-provider-*" | \
  sort | while read -r f; do
    size=$(du -sh "$f" | cut -f1)
    echo "$size  $f"
  done

# Remove providers older than 90 days
find "$HOME/.terraform.d/plugin-cache" -name "terraform-provider-*" \
  -mtime +90 -delete

# Clean up empty directories after deletion
find "$HOME/.terraform.d/plugin-cache" -type d -empty -delete
```

You can also just wipe the entire cache when disk space is tight. Terraform will re-download providers as needed:

```bash
rm -rf "$HOME/.terraform.d/plugin-cache"/*
```

## Using the Cache in CI/CD Pipelines

The cache is particularly valuable in CI/CD, where you often run `terraform init` many times per day.

### Docker-based Pipelines

If your CI/CD uses Docker, mount a persistent volume as the cache:

```dockerfile
# Dockerfile for Terraform CI
FROM hashicorp/terraform:1.7

# Set up plugin cache inside the container
ENV TF_PLUGIN_CACHE_DIR="/opt/terraform-plugin-cache"
RUN mkdir -p /opt/terraform-plugin-cache
```

```yaml
# docker-compose.yml for CI
services:
  terraform:
    build: .
    volumes:
      - terraform-cache:/opt/terraform-plugin-cache
      - .:/workspace
    working_dir: /workspace

volumes:
  terraform-cache:
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    environment {
        TF_PLUGIN_CACHE_DIR = "${WORKSPACE}/.terraform-plugin-cache"
    }

    stages {
        stage('Init') {
            steps {
                sh 'mkdir -p $TF_PLUGIN_CACHE_DIR'
                sh 'terraform init'
            }
        }
        stage('Plan') {
            steps {
                sh 'terraform plan -out=plan.tfplan'
            }
        }
    }

    // Persist cache between builds
    post {
        always {
            stash includes: '.terraform-plugin-cache/**', name: 'plugin-cache'
        }
    }
}
```

## Setting Up a Shared Team Cache

For teams working on the same machine or sharing a network drive, a shared cache avoids redundant downloads:

```bash
# On a shared NFS mount accessible by all team members
SHARED_CACHE="/mnt/shared/terraform-plugin-cache"

# Set permissions so all team members can read and write
sudo mkdir -p "$SHARED_CACHE"
sudo chmod 1777 "$SHARED_CACHE"

# Each team member sets this in their profile
export TF_PLUGIN_CACHE_DIR="$SHARED_CACHE"
```

The sticky bit (1777) ensures users can create files but only delete their own entries. This prevents accidental cleanup by one person from breaking another's workflow.

## Cache vs Filesystem Mirror

The cache and filesystem mirror serve different purposes. Here is when to use each:

**Plugin Cache** (`plugin_cache_dir`):
- Still contacts the registry for version resolution
- Downloads new versions automatically
- Good for development machines and CI/CD

**Filesystem Mirror** (`provider_installation` block):
- No registry contact needed
- Must be manually populated
- Good for air-gapped environments and strict compliance

You can combine both:

```hcl
# ~/.terraformrc
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"

provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/hashicorp/*"]
  }

  direct {
    exclude = ["registry.terraform.io/hashicorp/*"]
  }
}
```

With this configuration, HashiCorp providers come from the local mirror (no network), while other providers are downloaded normally (with caching).

## Handling Lock File Conflicts

The `.terraform.lock.hcl` file records checksums for each platform. When using a cache, make sure the lock file includes checksums for all platforms your team uses:

```bash
# Generate lock file entries for multiple platforms
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64
```

Commit this lock file. Without it, cache validation may fail on platforms that were not originally recorded.

## Troubleshooting Common Issues

### Symlink errors on Windows

Windows does not always support symlinks by default. If you get errors, Terraform falls back to copying files instead of symlinking. This still provides the benefit of a single download but does not save disk space.

### Permission denied errors

If the cache directory has wrong permissions, Terraform cannot create or read cached providers:

```bash
# Fix permissions
chmod -R u+rw "$HOME/.terraform.d/plugin-cache"
```

### Cache corruption

If a download was interrupted, you might have a partial provider binary in the cache. Delete it and re-run init:

```bash
# Remove potentially corrupted provider
rm -rf "$HOME/.terraform.d/plugin-cache/registry.terraform.io/hashicorp/aws/5.30.0"
terraform init
```

## Measuring Cache Performance

Compare init times with and without the cache:

```bash
# Without cache
unset TF_PLUGIN_CACHE_DIR
rm -rf .terraform
time terraform init

# With cache
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
rm -rf .terraform
time terraform init
```

For a project using AWS, Azure, and Google providers, you can expect:

| Scenario | Init Time |
|----------|-----------|
| No cache, first run | 60-90 seconds |
| Cache populated | 2-5 seconds |
| Cache, different project same providers | 2-5 seconds |

## Summary

A local provider cache directory is a simple but powerful optimization. Set the `TF_PLUGIN_CACHE_DIR` environment variable, create the directory, and every `terraform init` from that point forward benefits from cached providers. In CI/CD, combine it with pipeline caching for maximum benefit. For air-gapped environments, pair it with a filesystem mirror for fully offline operation.

For monitoring the infrastructure you deploy with Terraform, [OneUptime](https://oneuptime.com) provides robust uptime monitoring and incident management that works across all major cloud providers.
