# How to Fix 'Error: Provider Not Found' in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Provider, Error, Infrastructure as Code, Debugging

Description: Learn the common causes of the 'Error: Provider Not Found' error in OpenTofu and how to resolve them by running init, checking registry addresses, and fixing lock files.

## Introduction

The "Error: Provider Not Found" error means OpenTofu cannot locate the provider plugin binary it needs. This can happen after cloning a repository, switching machines, or when provider configurations contain typos.

## Common Error Messages

```text
Error: Required providers are not installed
  The following providers are required by this configuration but are not installed:
  - hashicorp/aws

Error: Failed to query available provider packages
  Could not retrieve the list of available versions for provider hashicorp/aws:
  could not connect to registry.opentofu.org: dial tcp: ...

Error: Provider "registry.opentofu.org/hashicorp/random" not found
```

## Fix 1: Run tofu init

The most common cause is simply that `tofu init` has not been run yet, or the working directory still has a stale `.terraform` directory from an earlier initialization:

```bash
# Download all required providers

tofu init

# If .terraform exists from a previous run, clear it first
rm -rf .terraform
tofu init
```

## Fix 2: Check the Provider Source Address

Typos in the `source` attribute cause the registry to return a 404:

```hcl
# WRONG - incorrect namespace
terraform {
  required_providers {
    aws = {
      source = "amazon/aws"   # Should be hashicorp/aws
    }
  }
}

# CORRECT
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Fix 3: Network / Firewall Issues

If the registry is unreachable, test connectivity and set up a local mirror:

```bash
# Test registry connectivity
curl -sSf https://registry.opentofu.org/v1/providers/hashicorp/aws/versions >/dev/null

# If blocked, configure a mirror in ~/.tofurc
cat > ~/.tofurc <<'EOF'
provider_installation {
  network_mirror {
    url     = "https://your-internal-mirror.example.com/providers/"
    include = ["registry.opentofu.org/*/*"]
  }
}
EOF
```

## Fix 4: Missing Provider in required_providers

If a provider is not declared in `required_providers`, OpenTofu falls back to an implied source address of `hashicorp/<LOCAL NAME>`, which can install the wrong provider or fail for third-party providers:

```hcl
# Always declare all providers explicitly
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}
```

## Fix 5: Plugin Cache Issues

A corrupted plugin cache can cause providers to appear missing:

```bash
# Clear the plugin cache
rm -rf ~/.terraform.d/plugin-cache

# Reinitialize
tofu init

# Or specify a fresh cache directory
mkdir -p /tmp/tofu-cache
export TF_PLUGIN_CACHE_DIR=/tmp/tofu-cache
tofu init
```

## Fix 6: Lock File Conflicts

If the lock file's selected version or recorded checksums no longer match what `tofu init` is trying to install:

```bash
# Delete the lock file and re-resolve
rm .terraform.lock.hcl
tofu init

# Or upgrade to the latest allowed version
tofu init -upgrade
```

## Prevention: Always Commit the Lock File

```bash
# Commit the lock file so all team members use the same provider versions
git add .terraform.lock.hcl
git commit -m "chore: update provider lock file"
```

## Conclusion

"Provider Not Found" errors almost always fall into one of these categories: missing `tofu init`, wrong source address, network problems, or a corrupted cache. Start with `tofu init`, check the source address in `required_providers`, and clear the plugin cache if re-init does not resolve the issue.
