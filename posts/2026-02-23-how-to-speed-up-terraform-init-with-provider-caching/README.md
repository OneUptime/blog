# How to Speed Up terraform init with Provider Caching

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Performance, DevOps, CI/CD, Provider Caching

Description: Reduce terraform init execution time by caching providers locally, using filesystem mirrors, plugin caches, and optimizing CI/CD pipeline provider downloads.

---

If you have ever waited for `terraform init` to download providers on every CI/CD run, you know it can be painfully slow. The AWS provider alone is over 400 MB. When you have multiple providers and run init frequently, those download times add up to minutes of wasted pipeline time every single day.

Terraform provides several caching mechanisms that can cut `terraform init` time from minutes to seconds. This guide covers all of them, from the built-in plugin cache to filesystem mirrors to CI/CD-specific optimizations.

## Understanding What terraform init Does

When you run `terraform init`, Terraform:

1. Reads your configuration to determine required providers
2. Checks the lock file (`.terraform.lock.hcl`) for version constraints and checksums
3. Downloads provider binaries from the Terraform Registry (or configured mirrors)
4. Installs providers into the `.terraform/providers` directory
5. Initializes the backend

Steps 3 and 4 are where the time goes. The AWS provider is about 430 MB, the Azure provider is around 350 MB, and even smaller providers add up when you have several.

## Method 1: Plugin Cache Directory

The simplest optimization is Terraform's built-in plugin cache. When enabled, Terraform stores downloaded providers in a shared directory and creates symlinks (or copies) to each project's `.terraform` directory.

```bash
# Create the cache directory
mkdir -p "$HOME/.terraform.d/plugin-cache"
```

Configure it in your Terraform CLI config:

```hcl
# ~/.terraformrc (macOS/Linux) or %APPDATA%\terraform.rc (Windows)
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"

# Optional: may use symlinks for faster installs (not available on all platforms)
plugin_cache_may_break_dependency_lock_file = false
```

Or set it via environment variable:

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
```

With the plugin cache enabled, `terraform init` in a new project directory will still download each provider once, but subsequent inits (in the same project or any other project using the same provider version) will use the cached copy.

### How It Works

```text
# First init - downloads and caches
$ time terraform init
Initializing provider plugins...
- Finding hashicorp/aws versions matching "5.31.0"...
- Installing hashicorp/aws v5.31.0...
real    0m47.123s

# Second init - uses cache
$ rm -rf .terraform && time terraform init
Initializing provider plugins...
- Finding hashicorp/aws versions matching "5.31.0"...
- Using hashicorp/aws v5.31.0 from the shared cache directory
real    0m2.341s
```

That is a 20x improvement for a single provider.

## Method 2: Filesystem Mirror

A filesystem mirror is a local directory structured like the Terraform Registry. Terraform reads provider binaries directly from it without any network requests.

```hcl
# ~/.terraformrc
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/hashicorp/*"]
  }

  # Fall back to direct download for anything not in the mirror
  direct {
    exclude = ["registry.terraform.io/hashicorp/*"]
  }
}
```

Populate the mirror:

```bash
# Mirror providers from a project
cd /path/to/your/project
terraform providers mirror /opt/terraform/providers

# Mirror for multiple platforms (useful for shared CI/CD cache)
terraform providers mirror \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  /opt/terraform/providers
```

The mirror directory structure looks like:

```text
/opt/terraform/providers/
  registry.terraform.io/
    hashicorp/
      aws/
        5.31.0.json
        terraform-provider-aws_5.31.0_linux_amd64.zip
        terraform-provider-aws_5.31.0_darwin_arm64.zip
      random/
        3.6.0.json
        terraform-provider-random_3.6.0_linux_amd64.zip
```

With a filesystem mirror, `terraform init` does not make any network requests for providers, making it extremely fast even in air-gapped environments.

## Method 3: CI/CD Pipeline Caching

### GitHub Actions

```yaml
name: Terraform
on: [push]

jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      TF_PLUGIN_CACHE_DIR: ${{ github.workspace }}/.terraform-cache

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Create cache directory
        run: mkdir -p $TF_PLUGIN_CACHE_DIR

      # Cache the plugin cache directory
      - name: Cache Terraform providers
        uses: actions/cache@v4
        with:
          path: ${{ env.TF_PLUGIN_CACHE_DIR }}
          key: terraform-providers-${{ hashFiles('**/.terraform.lock.hcl') }}
          restore-keys: |
            terraform-providers-

      - name: Terraform Init
        run: terraform init
```

### GitLab CI

```yaml
variables:
  TF_PLUGIN_CACHE_DIR: "${CI_PROJECT_DIR}/.terraform-cache"

cache:
  key: terraform-providers-${CI_COMMIT_REF_SLUG}
  paths:
    - .terraform-cache/
  policy: pull-push

terraform-plan:
  stage: plan
  before_script:
    - mkdir -p $TF_PLUGIN_CACHE_DIR
  script:
    - terraform init
    - terraform plan
```

### Jenkins

```groovy
pipeline {
    agent any
    environment {
        TF_PLUGIN_CACHE_DIR = "${WORKSPACE}/.terraform-cache"
    }
    stages {
        stage('Init') {
            steps {
                sh 'mkdir -p $TF_PLUGIN_CACHE_DIR'
                // Stash/unstash or use a shared volume for caching
                sh 'terraform init'
            }
        }
    }
}
```

## Method 4: Docker Image with Pre-Installed Providers

For CI/CD, build a Docker image with providers pre-installed:

```dockerfile
# Dockerfile for Terraform with cached providers
FROM hashicorp/terraform:1.7.0

# Copy provider mirror into the image
COPY provider-mirror/ /opt/terraform/providers/

# Configure Terraform to use the mirror
RUN cat <<'EOF' > /root/.terraformrc
provider_installation {
  filesystem_mirror {
    path = "/opt/terraform/providers"
  }
  direct {
    exclude = ["registry.terraform.io/*/*"]
  }
}
EOF
```

Build the image with a script that mirrors providers first:

```bash
#!/bin/bash
# build-terraform-image.sh

# Create a temp directory for mirroring
mkdir -p provider-mirror

# Mirror all providers used across projects
cd /path/to/project1 && terraform providers mirror ../provider-mirror
cd /path/to/project2 && terraform providers mirror ../provider-mirror

# Build the Docker image
docker build -t terraform-with-providers:1.7.0 .

# Clean up
rm -rf provider-mirror
```

## Method 5: Network Mirror

For teams that want a centralized caching solution, run a network mirror:

```hcl
# ~/.terraformrc
provider_installation {
  network_mirror {
    url = "https://terraform-mirror.internal.company.com/providers/"
  }
}
```

You can use tools like `terraform-registry-mirror` or a simple Nginx reverse proxy with caching:

```nginx
# Nginx config for a caching Terraform registry proxy
server {
    listen 443 ssl;
    server_name terraform-mirror.internal.company.com;

    location /providers/ {
        proxy_pass https://registry.terraform.io/;
        proxy_cache terraform_cache;
        proxy_cache_valid 200 7d;
        proxy_cache_valid 404 1m;

        # Cache large provider binaries
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_max_temp_file_size 1024m;
    }
}
```

## Measuring the Improvement

Track your init times to confirm the caching is working:

```bash
#!/bin/bash
# benchmark-init.sh

echo "=== Without cache ==="
rm -rf .terraform
unset TF_PLUGIN_CACHE_DIR
time terraform init -input=false 2>&1 | tail -5

echo ""
echo "=== With plugin cache ==="
rm -rf .terraform
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
time terraform init -input=false 2>&1 | tail -5

echo ""
echo "=== With filesystem mirror ==="
rm -rf .terraform
time terraform init -input=false 2>&1 | tail -5
```

Typical results for a project using the AWS, random, and null providers:

| Method | Time |
|--------|------|
| No cache (cold download) | 45-60 seconds |
| Plugin cache (warm) | 2-5 seconds |
| Filesystem mirror | 1-3 seconds |
| Docker with pre-installed | < 1 second |

## Combining Methods

For maximum performance, combine the plugin cache with CI/CD caching:

```bash
# In CI/CD pipeline
export TF_PLUGIN_CACHE_DIR="/cache/terraform-providers"

# First run: downloads and caches providers
terraform init

# Subsequent runs in the same pipeline or future pipelines
# with the cache restored: near-instant
terraform init
```

## Summary

Provider downloads are the biggest bottleneck in `terraform init`. The plugin cache directory is the easiest fix and works everywhere. Filesystem mirrors eliminate network requests entirely. CI/CD pipeline caching persists the cache across runs. And Docker images with pre-installed providers give you the fastest possible init time. Pick the approach that fits your workflow, and you will save minutes on every Terraform run.

For more Terraform performance tips, see [how to speed up terraform plan with targeted planning](https://oneuptime.com/blog/post/2026-02-23-how-to-speed-up-terraform-plan-with-targeted-planning/view) and [how to optimize large Terraform state files](https://oneuptime.com/blog/post/2026-02-23-how-to-optimize-large-terraform-state-files/view).
