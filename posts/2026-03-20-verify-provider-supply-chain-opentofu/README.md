# How to Verify Provider Supply-Chain Safety in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Supply Chain Security, Provider Verification, Checksum, Security, Infrastructure as Code

Description: Learn how OpenTofu's dependency lock file, provider checksum verification, and signing key validation protect against supply-chain attacks on providers.

## Introduction

A compromised or tampered provider binary could silently modify your infrastructure. OpenTofu addresses this through provider checksum verification in `.terraform.lock.hcl`, GPG signing key validation, and optional provider mirrors that you control.

## The Dependency Lock File

Every `tofu init` generates or updates `.terraform.lock.hcl`, which records the exact provider version and checksums:

```hcl
# .terraform.lock.hcl - commit this file to version control

provider "registry.opentofu.org/hashicorp/aws" {
  version     = "5.40.0"
  constraints = "~> 5.0"

  hashes = [
    # h1 hash: dirhash of the extracted archive contents
    "h1:abc123def456...",
    # zh hashes: SHA256 of the zip archive, one per platform
    "zh:1234567890abcdef...",  # darwin_amd64
    "zh:abcdef1234567890...",  # linux_amd64
    "zh:fedcba9876543210...",  # windows_amd64
  ]
}
```

The lock file guarantees that every team member and CI pipeline uses the identical provider binary.

## How OpenTofu Verifies Providers

When `tofu init` downloads a provider, it:
1. Fetches the binary from the registry
2. Downloads the checksums file (`terraform-provider-<name>_<version>_SHA256SUMS`)
3. Verifies the GPG signature on the checksums file
4. Computes the sha256 of the downloaded zip and compares it

If any step fails, initialization is aborted.

## Checking Which Keys Are Trusted

Provider signing keys are published by the registry. You can inspect which key signed a provider:

```bash
# View provider signing keys for the AWS provider (returned with the package metadata)
curl -s https://registry.opentofu.org/v1/providers/hashicorp/aws/5.40.0/download/linux/amd64 | jq .signing_keys

# Verify the GPG key fingerprint matches HashiCorp's published key
# HashiCorp key fingerprint: C874 011F 0AB4 0511 0D02 1055 3436 5D94 72D7 468F
```

## Using a Private Provider Mirror for Additional Control

To prevent providers from being fetched directly from the internet, use a network mirror:

```hcl
# ~/.terraformrc or /etc/terraformrc
provider_installation {
  network_mirror {
    url            = "https://mirrors.example.com/providers/"
    include        = ["registry.opentofu.org/*/*"]
  }
  direct {
    # Only fetch providers not in the mirror directly
    exclude = ["registry.opentofu.org/*/*"]
  }
}
```

Your mirror should serve the same checksums and signatures that the official registry provides.

## Verifying Lock File Checksums Manually

```bash
# After tofu init, manually verify a provider's checksum
PROVIDER_DIR=".terraform/providers/registry.opentofu.org/hashicorp/aws/5.40.0/linux_amd64"
sha256sum "$PROVIDER_DIR/terraform-provider-aws_v5.40.0_x5"

# Compare the output against the h1 hash in .terraform.lock.hcl
```

## Forcing Checksum Verification in CI

OpenTofu automatically verifies checksums on init. For extra assurance in CI, run `tofu providers lock` with all target platforms:

```bash
# Pre-compute checksums for all deployment platforms
tofu providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64

# Commit the resulting .terraform.lock.hcl
git add .terraform.lock.hcl
git commit -m "chore: update provider lock file checksums"
```

In CI, `tofu init` will fail if the downloaded provider's checksum does not match the lock file:

```bash
# In CI - fail if lock file is inconsistent
tofu init -lockfile=readonly
```

## Conclusion

OpenTofu's lock file and GPG verification provide a strong first layer of supply-chain protection. Combining them with a controlled private mirror and CI enforcement of `-lockfile=readonly` ensures that no untrusted or tampered provider binary can run against your infrastructure.
