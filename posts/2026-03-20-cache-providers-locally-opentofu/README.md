# How to Cache Providers Locally for Faster Initialization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Performance, Provider Cache, Initialization, Infrastructure as Code, DevOps

Description: Learn how to configure OpenTofu's plugin cache directory to avoid re-downloading providers on every tofu init, significantly speeding up CI/CD pipelines.

## Introduction

In fresh working directories, `tofu init` downloads provider binaries from the registry unless a cache is configured. In CI/CD pipelines that run init on every PR, this download adds 30-120 seconds per run. A shared plugin cache makes init nearly instant for already-downloaded providers.

## Configuring the Plugin Cache Directory

```bash
# Set the cache directory via environment variable

export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
mkdir -p "$TF_PLUGIN_CACHE_DIR"

# Verify it is set
echo "$TF_PLUGIN_CACHE_DIR"
```

Or configure it in `~/.tofurc`:

```hcl
# ~/.tofurc
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
```

## How the Cache Works

When `tofu init` runs:
1. OpenTofu uses the configured or implied installation methods to resolve the required provider version
2. Before downloading the selected package, it checks the cache directory for that provider package
3. If found and checksum matches → uses the cached binary; if not found → downloads it and stores it in the cache for future use

## CI/CD: Persistent Cache with GitHub Actions

```yaml
# .github/workflows/infra.yml
- name: Cache OpenTofu providers
  uses: actions/cache@v4
  with:
    path: ~/.terraform.d/plugin-cache
    # Cache key based on lock file - invalidates when providers change
    key: ${{ runner.os }}-tofu-providers-${{ hashFiles('**/.terraform.lock.hcl') }}
    restore-keys: |
      ${{ runner.os }}-tofu-providers-

- name: Configure provider cache
  run: |
    mkdir -p ~/.terraform.d/plugin-cache
    echo 'plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"' > ~/.tofurc

- name: OpenTofu Init
  run: tofu init
```

## CI/CD: Persistent Cache with GitLab CI

```yaml
# .gitlab-ci.yml
variables:
  TF_PLUGIN_CACHE_DIR: "${CI_PROJECT_DIR}/.terraform.d/plugin-cache"

cache:
  key:
    files:
      - .terraform.lock.hcl
  paths:
    - .terraform.d/plugin-cache

before_script:
  - mkdir -p "$TF_PLUGIN_CACHE_DIR"

init:
  script:
    - tofu init
```

## Pre-Populating the Cache

For very fast CI, pre-populate the cache from a connected environment:

```bash
# Optional: add checksums for the platforms you use to the lock file
tofu providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64

# Create the cache directory and run init once to populate it
mkdir -p /shared/tofu-cache
TF_PLUGIN_CACHE_DIR=/shared/tofu-cache tofu init

# The cache is now ready for subsequent inits on matching platforms
```

## Cache Directory Structure

```text
~/.terraform.d/plugin-cache/
└── registry.opentofu.org/
    └── hashicorp/
        ├── aws/
        │   └── 5.40.0/
        │       └── linux_amd64/
        │           └── terraform-provider-aws_v5.40.0_x5
        └── random/
            └── 3.6.0/
                └── linux_amd64/
                    └── terraform-provider-random_v3.6.0_x5
```

## Conclusion

Configuring `TF_PLUGIN_CACHE_DIR` is one of the easiest OpenTofu optimizations. In CI/CD, combine it with a cache action keyed on the lock file to make `tofu init` nearly instantaneous on repeat runs. For monorepos with multiple configurations, a shared cache directory eliminates repeated provider downloads after the first pipeline run.
