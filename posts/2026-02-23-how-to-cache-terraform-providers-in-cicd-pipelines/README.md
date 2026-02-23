# How to Cache Terraform Providers in CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Caching, Performance, GitHub Actions, GitLab CI, DevOps

Description: Speed up your Terraform CI/CD pipelines by caching providers and plugins. Covers GitHub Actions cache, GitLab CI cache, S3 provider mirrors, and filesystem mirrors.

---

Every time your Terraform pipeline runs `terraform init`, it downloads provider plugins from the Terraform registry. The AWS provider alone is over 300 MB. If you are running multiple pipelines a day across several environments, that adds up to significant bandwidth usage and wasted time. Caching providers eliminates this bottleneck.

## The Problem with Provider Downloads

A fresh `terraform init` downloads every provider declared in your configuration. Here is what a typical init looks like without caching:

```
Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Finding hashicorp/random versions matching "~> 3.5"...
- Finding hashicorp/null versions matching "~> 3.2"...
- Installing hashicorp/aws v5.31.0...
- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)
- Installing hashicorp/random v3.6.0...
- Installed hashicorp/random v3.6.0 (signed by HashiCorp)

Terraform has been successfully initialized!

Time: 47 seconds
```

47 seconds might not sound bad, but multiply that by 10 pipeline runs per day across 5 environments and you are burning 40 minutes of pipeline time on downloads alone.

## GitHub Actions Caching

GitHub Actions has a built-in cache action that works well for Terraform providers:

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      # Cache the provider plugins directory
      - name: Cache Terraform providers
        uses: actions/cache@v4
        with:
          path: |
            ~/.terraform.d/plugin-cache
            .terraform/providers
          key: terraform-providers-${{ hashFiles('**/.terraform.lock.hcl') }}
          restore-keys: |
            terraform-providers-

      - name: Configure plugin cache
        run: |
          # Tell Terraform to use a plugin cache directory
          echo 'plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"' > ~/.terraformrc
          mkdir -p ~/.terraform.d/plugin-cache

      - name: Terraform Init
        run: terraform init -no-color

      - name: Terraform Plan
        run: terraform plan -no-color -out=tfplan
```

The cache key is based on the `.terraform.lock.hcl` file, which contains the exact provider versions and hashes. When the lock file changes (because you updated a provider version), the cache is invalidated and new providers are downloaded.

## GitLab CI Caching

GitLab CI has a similar caching mechanism:

```yaml
# .gitlab-ci.yml
variables:
  TF_PLUGIN_CACHE_DIR: "$CI_PROJECT_DIR/.terraform-plugin-cache"

# Cache providers across pipeline runs
cache:
  key:
    files:
      - .terraform.lock.hcl  # Cache busts when lock file changes
  paths:
    - .terraform-plugin-cache/
    - .terraform/providers/

stages:
  - plan
  - apply

plan:
  stage: plan
  image: hashicorp/terraform:1.7.0
  before_script:
    # Create the plugin cache directory
    - mkdir -p $TF_PLUGIN_CACHE_DIR
    - terraform init -no-color
  script:
    - terraform plan -no-color -out=tfplan
  artifacts:
    paths:
      - tfplan
```

## Using Terraform Plugin Cache Directory

Terraform has a built-in plugin cache feature controlled by the `TF_PLUGIN_CACHE_DIR` environment variable or the `plugin_cache_dir` setting in `.terraformrc`:

```bash
# Set via environment variable (works in any CI/CD platform)
export TF_PLUGIN_CACHE_DIR="/tmp/terraform-plugin-cache"
mkdir -p $TF_PLUGIN_CACHE_DIR

# Now terraform init will check the cache first
terraform init
```

When the cache directory contains a provider that matches the version constraint, Terraform creates a symlink to it instead of downloading a fresh copy. This works across multiple Terraform configurations in the same pipeline run.

```yaml
# GitHub Actions - Cache shared across multiple Terraform directories
- name: Setup plugin cache
  run: |
    export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
    mkdir -p $TF_PLUGIN_CACHE_DIR

    # Init networking module
    cd terraform/networking
    terraform init -no-color

    # Init compute module - reuses cached providers
    cd ../compute
    terraform init -no-color  # Much faster since AWS provider is cached
```

## Filesystem Mirror for Air-Gapped Environments

If your CI/CD runners do not have internet access, use a filesystem mirror:

```bash
# Download providers to a local directory
mkdir -p /opt/terraform/providers

# Use terraform providers mirror to create a local mirror
cd /path/to/terraform/config
terraform providers mirror /opt/terraform/providers
```

Then configure Terraform to use the mirror:

```hcl
# .terraformrc or terraform.rc on the CI runner
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/*/*"]
  }

  # Fall back to direct download if not in the mirror
  direct {
    exclude = []
  }
}
```

In your CI/CD pipeline:

```yaml
# GitHub Actions with filesystem mirror
- name: Configure provider mirror
  run: |
    cat > ~/.terraformrc <<'EOF'
    provider_installation {
      filesystem_mirror {
        path    = "/opt/terraform/providers"
        include = ["registry.terraform.io/*/*"]
      }
    }
    EOF
```

## S3-Based Provider Mirror

For teams that want a centralized provider cache without building custom Docker images:

```bash
# Upload providers to S3
aws s3 sync /opt/terraform/providers s3://mycompany-terraform-mirrors/providers/

# In the pipeline, download the mirror before init
aws s3 sync s3://mycompany-terraform-mirrors/providers/ /tmp/provider-mirror/
```

```yaml
# Pipeline step to use S3 mirror
- name: Download provider mirror
  run: |
    aws s3 sync s3://mycompany-terraform-mirrors/providers/ /tmp/provider-mirror/ --quiet

    cat > ~/.terraformrc <<'EOF'
    provider_installation {
      filesystem_mirror {
        path    = "/tmp/provider-mirror"
        include = ["registry.terraform.io/*/*"]
      }
      direct {}
    }
    EOF

- name: Terraform Init
  run: terraform init -no-color  # Uses local mirror, falls back to registry
```

## Docker Image with Pre-Baked Providers

For the fastest possible init, build a custom Docker image with providers already installed:

```dockerfile
# Dockerfile.terraform - Custom image with pre-installed providers
FROM hashicorp/terraform:1.7.0

# Copy your Terraform config to get the lock file
COPY .terraform.lock.hcl /tmp/terraform/
COPY versions.tf /tmp/terraform/

# Create a dummy config to trigger provider download
RUN cd /tmp/terraform && \
    mkdir -p /opt/terraform/providers && \
    terraform providers mirror /opt/terraform/providers && \
    rm -rf /tmp/terraform

# Configure Terraform to use the built-in mirror
RUN cat > /root/.terraformrc <<'EOF'
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/*/*"]
  }
}
EOF
```

```yaml
# Use the custom image in GitLab CI
plan:
  stage: plan
  image: myregistry.com/terraform-with-providers:latest
  script:
    - terraform init -no-color  # Near-instant, providers are already local
    - terraform plan -no-color -out=tfplan
```

## Measuring the Impact

Track how caching improves your pipeline times:

```yaml
# GitHub Actions - Measure init time
- name: Terraform Init (timed)
  run: |
    START=$(date +%s)
    terraform init -no-color
    END=$(date +%s)
    DURATION=$((END - START))
    echo "Terraform init took ${DURATION} seconds"

    # Optionally post the metric somewhere
    echo "init_duration=${DURATION}" >> $GITHUB_OUTPUT
```

Typical improvements:

| Method | Init Time (cold) | Init Time (cached) |
|--------|-------------------|---------------------|
| No caching | 45-60s | N/A |
| CI cache action | 45-60s | 5-10s |
| Plugin cache dir | 45-60s | 3-8s |
| Filesystem mirror | N/A | 1-3s |
| Pre-baked Docker | N/A | <1s |

## Cache Invalidation

The trickiest part of caching is knowing when to invalidate. Here are the signals:

```yaml
# Cache key based on lock file hash
key: terraform-providers-${{ hashFiles('**/.terraform.lock.hcl') }}

# Add OS and Terraform version to prevent cross-platform cache hits
key: terraform-${{ runner.os }}-${{ env.TF_VERSION }}-${{ hashFiles('**/.terraform.lock.hcl') }}
```

Always include the `.terraform.lock.hcl` file in your repository. This file pins exact provider versions and checksums, making it the perfect cache key.

## Summary

Caching Terraform providers is one of the easiest wins for pipeline performance. Start with your CI platform's built-in cache action and the `TF_PLUGIN_CACHE_DIR` environment variable. For faster results, move to a filesystem mirror or pre-baked Docker image. The key is using the `.terraform.lock.hcl` file as your cache key so providers are re-downloaded only when versions change.

For more Terraform CI/CD optimization tips, check out our guide on [handling concurrent Terraform runs in CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-concurrent-terraform-runs-in-cicd/view).
