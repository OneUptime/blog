# Using the Provider Plugin Cache in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider, Cache

Description: Learn how to configure the OpenTofu provider plugin cache to avoid re-downloading providers on every tofu init.

The provider plugin cache is a local directory where OpenTofu stores downloaded providers. When you initialize a new workspace, OpenTofu reuses providers from the cache (using symbolic links where the filesystem supports them, falling back to copies otherwise) instead of downloading them again - saving time and bandwidth.

## How the Plugin Cache Works

Without cache:
```hcl
Workspace A: tofu init → downloads aws 5.38.0 (20MB)
Workspace B: tofu init → downloads aws 5.38.0 (20MB) again
Workspace C: tofu init → downloads aws 5.38.0 (20MB) again
```

With cache:
```hcl
Workspace A: tofu init → downloads aws 5.38.0 → stores in cache
Workspace B: tofu init → links from cache (instant!)
Workspace C: tofu init → links from cache (instant!)
```

## Enabling the Plugin Cache

```hcl
# ~/.tofurc (or ~/.terraformrc)

plugin_cache_dir = "/home/user/.terraform.d/plugin-cache"

# Or use the default location
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
```

Create the directory:

```bash
mkdir -p ~/.terraform.d/plugin-cache
```

## Using Environment Variables

```bash
# Set the cache directory via environment variable
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"

# Create the directory
mkdir -p "$TF_PLUGIN_CACHE_DIR"

# Now all tofu init commands use the cache
tofu init  # First time: downloads
tofu init  # Subsequent times: uses cache
```

## Shared Team Cache

For teams, a shared cache on a network share can be used, but note that the cache directory must be **writable** (OpenTofu writes new providers into it on cache misses) and that the official docs warn the plugin cache is **not concurrency-safe** - behavior with simultaneous `tofu init` calls is undefined. For air-gapped or controlled distribution to multiple users, prefer a [provider mirror](https://opentofu.org/docs/cli/config/config-file/#provider-installation) instead.

```bash
# Mount a shared NFS cache (writable, single-writer semantics)
mount nfs-server:/terraform-providers /mnt/tf-cache

# Configure OpenTofu to use it
export TF_PLUGIN_CACHE_DIR=/mnt/tf-cache
```

```hcl
# ~/.tofurc - individual config
plugin_cache_dir = "/mnt/tf-cache"
```

## Cache in Docker/CI

```dockerfile
# Dockerfile
FROM ubuntu:22.04

# OpenTofu is not in the default Ubuntu repos - use the official installer
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh && \
    chmod +x install-opentofu.sh && \
    ./install-opentofu.sh --install-method deb && \
    rm install-opentofu.sh

# Pre-cache providers in the image
COPY providers-cache/ /root/.terraform.d/plugin-cache/
ENV TF_PLUGIN_CACHE_DIR=/root/.terraform.d/plugin-cache
```

```yaml
# GitHub Actions - cache providers between runs
jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Cache Terraform providers
        uses: actions/cache@v4
        with:
          path: ~/.terraform.d/plugin-cache
          key: terraform-plugins-${{ hashFiles('**/.terraform.lock.hcl') }}
          restore-keys: |
            terraform-plugins-

      - name: Configure plugin cache
        run: |
          mkdir -p ~/.terraform.d/plugin-cache
          cat > ~/.terraformrc << 'EOF'
          plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
          EOF

      - name: Init
        run: tofu init
```

## Plugin Cache Directory Structure

```text
~/.terraform.d/plugin-cache/
└── registry.opentofu.org/
    └── hashicorp/
        ├── aws/
        │   └── 5.38.0/
        │       └── linux_amd64/
        │           └── terraform-provider-aws_v5.38.0_x5
        ├── google/
        │   └── 5.20.0/
        │       └── linux_amd64/
        │           └── terraform-provider-google_v5.20.0_x5
        └── random/
            └── 3.6.0/
                └── linux_amd64/
                    └── terraform-provider-random_v3.6.0_x5
```

## Plugin Cache vs Provider Mirror

| Feature | Plugin Cache | Provider Mirror |
|---------|-------------|-----------------|
| Purpose | Speed up init | Air-gap / control |
| Location | Local machine | Shared server |
| Scope | Single user | Whole team/org |
| Internet | Still needed (first time) | Not needed |
| Lock file | Required | Required |

## Cache Size Management

```bash
# Check cache size
du -sh ~/.terraform.d/plugin-cache/

# List cached providers
find ~/.terraform.d/plugin-cache -name "terraform-provider-*" | sort

# Clean old versions (keep only current)
find ~/.terraform.d/plugin-cache -mindepth 5 -maxdepth 5 -type d | \
  sort -t/ -k6 -V | \
  head -n -1 | \
  xargs rm -rf

# Or simply clear the entire cache
rm -rf ~/.terraform.d/plugin-cache/*
```

## Conclusion

The plugin cache is one of the simplest performance improvements for OpenTofu workflows. Configure it once with `TF_PLUGIN_CACHE_DIR` or in your `.tofurc` file and all your workspaces will share downloaded providers. In CI/CD, combine it with cache actions to avoid downloading providers on every pipeline run.

One caveat to be aware of: when providers are installed only from the cache, OpenTofu records `h1:` hashes in `.terraform.lock.hcl` but cannot record the `zh:` hashes that come from the registry, which produces an "Incomplete lock file information for providers" warning. Run `tofu providers lock -platform=linux_amd64 -platform=darwin_arm64 ...` for the platforms you need to populate the lock file fully.
