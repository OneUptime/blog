# How to Check Which OpenTofu Version You Are Running

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Version Management, Troubleshooting, Infrastructure as Code, DevOps

Description: A guide to checking the current OpenTofu version and understanding version information for troubleshooting.

## Introduction

Knowing which version of OpenTofu you are running is essential for troubleshooting, ensuring compatibility with providers and modules, and verifying that your environment matches project requirements.

## Basic Version Check

```bash
# Display the current OpenTofu version

tofu version

# Example output:
# OpenTofu v1.9.0
# on linux_amd64
```

## Version with JSON Output

```bash
# Get version information as JSON (useful for scripting)
tofu version -json

# Output:
# {
#   "terraform_version": "1.9.0",
#   "platform": "linux_amd64",
#   "provider_selections": {}
# }
```

## Extract Version Number Only

```bash
# Extract just the version number
tofu version | head -1 | awk '{print $2}'
# v1.9.0

# Without the 'v' prefix
tofu version | head -1 | awk '{print $2}' | sed 's/v//'
# 1.9.0

# Using JSON output
tofu version -json | jq -r '.terraform_version'
# 1.9.0
```

## Check Binary Location

```bash
# Find where the tofu command resolves
command -v tofu
# /usr/local/bin/tofu (manual install)
# /usr/bin/tofu (package manager)
# /opt/homebrew/bin/tofu (Homebrew on macOS)
# /home/user/.tofuenv/bin/tofu (tofuenv shim)
# /home/user/.asdf/shims/tofu (asdf shim)

# Show all tofu commands on your PATH
type -a tofu

# Check the resolved command metadata
ls -la "$(command -v tofu)"
file "$(command -v tofu)"
```

## Check Version with tofuenv

```bash
# Check which version tofuenv is currently using
tofuenv version-name

# List all installed versions (* = current)
tofuenv list
# * 1.9.0 (set by /home/user/project/.opentofu-version)
#   1.8.5
#   1.7.3
```

## Check Version with asdf

```bash
# Check current version in asdf
asdf current opentofu
# opentofu         1.9.0   /home/user/project/.tool-versions

# List all installed
asdf list opentofu
#   1.8.5
# * 1.9.0
```

## Check Version in CI/CD Output

```bash
# In CI/CD pipelines, always output version for debugging
echo "=== Environment Information ==="
echo "OpenTofu version: $(tofu version | head -1)"
echo "OS: $(uname -s) $(uname -m)"
echo "Working directory: $(pwd)"
echo "==============================="
```

## Checking Provider Versions

```bash
# If a dependency lock file is present (for example after tofu init),
# tofu version can also show provider versions
tofu version

# Output includes providers:
# OpenTofu v1.9.0
# on linux_amd64
# + provider registry.opentofu.org/hashicorp/aws v5.30.0
# + provider registry.opentofu.org/hashicorp/random v3.6.0
```

## Version in Terraform Blocks

```hcl
# Check if your version satisfies constraints
terraform {
  required_version = ">= 1.9.0"
}
```

```bash
# OpenTofu returns an error if the running version doesn't match
# Error: Incompatible module
# This module is not compatible with OpenTofu v1.8.5.
```

## Script to Check Exact Version Match

```bash
#!/usr/bin/env bash
# check-tofu-version.sh

EXPECTED_VERSION="${1:-1.9.0}"
CURRENT_VERSION=$(tofu version -json | jq -r '.terraform_version')

echo "Expected: $EXPECTED_VERSION"
echo "Current:  $CURRENT_VERSION"

if [ "$CURRENT_VERSION" = "$EXPECTED_VERSION" ]; then
  echo "Exact version check PASSED"
  exit 0
else
  echo "Exact version check FAILED"
  echo "Please install OpenTofu $EXPECTED_VERSION"
  exit 1
fi
```

## Conclusion

Checking your OpenTofu version is a fundamental part of infrastructure development. The `tofu version` command provides clear version information in both human-readable and JSON formats. Understanding your installed version, its location, and how it was installed helps with troubleshooting version mismatch issues across team members and CI/CD pipelines.
