# How the OpenTofu Provider Registry Protocol Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provider Registry, Protocol, Internal, Infrastructure as Code

Description: Learn how the OpenTofu provider registry protocol works - how providers are discovered, downloaded, and verified, and how to set up network mirrors for air-gapped environments.

## Introduction

When you run `tofu init`, OpenTofu uses the provider registry protocol to discover, version, and download providers. Understanding this protocol explains how provider installation works, how to set up mirrors, and how to debug `tofu init` failures.

## Provider Source Address Format

```text
[<HOSTNAME>/]<NAMESPACE>/<TYPE>

Examples:
  hashicorp/aws                              # Short form (resolved to registry.opentofu.org)
  registry.opentofu.org/hashicorp/aws        # Explicit registry
  registry.terraform.io/hashicorp/aws        # Explicit third-party registry
  my-registry.example.com/my-org/custom-provider  # Private registry
```

## Service Discovery

```bash
# OpenTofu first discovers the registry's API endpoints

curl -s https://registry.opentofu.org/.well-known/terraform.json | jq .

# Response:
{
  "modules.v1": "/v1/modules/",
  "providers.v1": "/v1/providers/"
}
```

## Provider Versions API

```bash
# Show a few available versions for a provider
curl -s "https://registry.opentofu.org/v1/providers/hashicorp/aws/versions" | jq '.versions[:3]'

# Sample response:
[
  {"version": "6.42.0", "protocols": ["5.0"], "platforms": [...]},
  {"version": "6.41.0", "protocols": ["5.0"], "platforms": [...]},
  {"version": "6.40.0", "protocols": ["5.0"], "platforms": [...]}
]
```

## Provider Download API

```bash
# Get download URL for a specific version and platform
curl -s "https://registry.opentofu.org/v1/providers/hashicorp/aws/5.31.0/download/linux/amd64" | jq .

# Sample response:
{
  "protocols": ["5.0"],
  "os": "linux",
  "arch": "amd64",
  "filename": "terraform-provider-aws_5.31.0_linux_amd64.zip",
  "download_url": "https://github.com/opentofu/terraform-provider-aws/releases/download/v5.31.0/terraform-provider-aws_5.31.0_linux_amd64.zip",
  "shasums_url": "https://github.com/opentofu/terraform-provider-aws/releases/download/v5.31.0/terraform-provider-aws_5.31.0_SHA256SUMS",
  "shasums_signature_url": "https://github.com/opentofu/terraform-provider-aws/releases/download/v5.31.0/terraform-provider-aws_5.31.0_SHA256SUMS.sig",
  "shasum": "849ab0cc98401f25d700abe64b1e42046b3b73e88fda8331beb2ec6a6f00015a",
  "signing_keys": {
    "gpg_public_keys": [...]
  }
}
```

## Provider Installation Directory

```bash
# Providers are stored in .terraform/providers/
ls .terraform/providers/registry.opentofu.org/hashicorp/aws/5.31.0/linux_amd64/
# terraform-provider-aws_v5.31.0_x5

# Global cache directory (shared across projects)
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
ls $TF_PLUGIN_CACHE_DIR/registry.opentofu.org/hashicorp/aws/
```

## Setting Up a Network Mirror

For air-gapped or accelerated environments:

```hcl
# ~/.tofurc
provider_installation {
  network_mirror {
    url     = "https://my-internal-mirror.example.com/providers/"
    include = ["registry.opentofu.org/*/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/*/*"]
  }
}
```

The network mirror must implement the provider network mirror protocol:

```bash
# Relative to the configured base URL:
# {hostname}/{namespace}/{type}/index.json  - list versions
# {hostname}/{namespace}/{type}/{version}.json - platform downloads

# index.json
{
  "versions": {
    "5.31.0": {},
    "5.30.0": {}
  }
}

# 5.31.0.json
{
  "archives": {
    "linux_amd64": {
      "url": "terraform-provider-aws_5.31.0_linux_amd64.zip",
      "hashes": ["h1:abc123...", "zh:def456..."]
    }
  }
}
```

## Setting Up a Filesystem Mirror

```bash
# Download providers required by the current configuration to a local directory
tofu providers mirror /opt/tofu-provider-mirror

# Directory structure:
# /opt/tofu-provider-mirror/
#   registry.opentofu.org/
#     hashicorp/
#       aws/
#         index.json
#         5.31.0.json
#         terraform-provider-aws_5.31.0_linux_amd64.zip
```

```hcl
# ~/.tofurc - use filesystem mirror
provider_installation {
  filesystem_mirror {
    path    = "/opt/tofu-provider-mirror"
    include = ["registry.opentofu.org/*/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/*/*"]
  }
}
```

## Lock File and Verification

After `tofu init`, the lock file records provider hashes:

```hcl
# .terraform.lock.hcl
provider "registry.opentofu.org/hashicorp/aws" {
  version     = "5.31.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:hash-of-zip-contents...",
    "zh:sha256-of-zip-file...",
  ]
}
```

```bash
# Refuse lock file changes and verify packages against recorded checksums
tofu init -lockfile=readonly

# Lock providers for multiple platforms
tofu providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  registry.opentofu.org/hashicorp/aws
```

## Conclusion

The OpenTofu provider registry protocol is a REST API that enables service discovery, version listing, platform-specific downloads, and cryptographic verification. For air-gapped environments, implement a network mirror or use `tofu providers mirror` to populate a filesystem mirror. The `.terraform.lock.hcl` file records provider hashes for supply chain verification - always commit it to version control and use `-lockfile=readonly` in CI to enforce it.
