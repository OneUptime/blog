# How to Use tofu init to Initialize a Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI

Description: Learn how to use tofu init to initialize an OpenTofu working directory, download providers and modules, and configure backends.

## Introduction

`tofu init` is the first command you run in any OpenTofu project. It prepares the working directory by downloading required providers, fetching modules, and configuring the backend. You must run it before any `plan`, `apply`, or other commands. It is safe to run repeatedly - it is idempotent.

## Basic Usage

```bash
cd my-infrastructure
tofu init

# Output:

# Initializing the backend...
# Initializing provider plugins...
# - Finding hashicorp/aws versions matching "~> 5.0"...
# - Installing hashicorp/aws v5.31.0...
# OpenTofu has been successfully initialized!
```

## What init Does

1. Initializes the backend (local or remote)
2. Downloads providers listed in `required_providers`
3. Downloads modules referenced in the configuration
4. Creates `.terraform/` directory with cached providers and modules
5. Creates or updates `.terraform.lock.hcl` with provider checksums

## Reinitializing After Changes

Run `tofu init` again when you:
- Add a new provider
- Add a new module source
- Change the backend configuration
- Pull someone else's changes that include new providers

```bash
tofu init
# OpenTofu detects new providers and downloads them
```

## Upgrading Providers

```bash
# Upgrade all providers to the latest allowed version
tofu init -upgrade

# Updates .terraform.lock.hcl with new checksums
```

## Backend Configuration at Init

```bash
# Supply backend config for partial configuration
tofu init \
  -backend-config="bucket=acme-tofu-state" \
  -backend-config="key=production/terraform.tfstate" \
  -backend-config="region=us-east-1"
```

## Reconfiguring an Existing Backend

```bash
# Use -reconfigure to change backend settings without migrating state
tofu init -reconfigure -backend-config=backends/new.hcl
```

## Migrating State to a New Backend

```bash
# Migrate existing state to the newly configured backend
tofu init -migrate-state
```

## Offline / Air-Gapped Init

```bash
# Use a local filesystem mirror
export TF_CLI_CONFIG_FILE=".tofurc"

# .tofurc
# provider_installation {
#   filesystem_mirror {
#     path = "/opt/tofu-providers"
#   }
# }

tofu init
```

## Plugin Cache

```bash
# Set a shared provider cache directory to avoid re-downloading
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
mkdir -p "$TF_PLUGIN_CACHE_DIR"

tofu init  # Uses cached providers when available
```

## Skipping the Backend

```bash
# Initialize only providers/modules, skip backend configuration
tofu init -backend=false
```

Useful for local testing or when you only need to validate configuration.

## CI/CD Usage

```bash
# Typical CI/CD init pattern (-input=false makes it non-interactive)
tofu init \
  -input=false \
  -backend-config="key=${ENVIRONMENT}/terraform.tfstate"
```

## Conclusion

`tofu init` must run before any other OpenTofu command. It downloads providers and modules, configures the backend, and sets up the `.terraform/` directory. Use `-upgrade` to refresh provider versions, `-migrate-state` when changing backends, and `TF_PLUGIN_CACHE_DIR` in CI/CD to avoid repeated downloads. Running `tofu init` is always safe - it will not modify your infrastructure.
