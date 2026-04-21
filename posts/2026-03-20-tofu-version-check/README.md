# How to Use tofu version to Check Your Version - Tofu Check

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use tofu version to check your OpenTofu version, understand version output, and manage version requirements in team environments.

## Introduction

`tofu version` displays the current OpenTofu version and the versions of installed providers. It's useful for debugging, compatibility checks, CI/CD pipelines, and ensuring your team is using consistent versions.

## Basic Usage

```bash
# Check OpenTofu version

tofu version

# Output:
# OpenTofu v1.8.0
# on linux_amd64
# + provider registry.opentofu.org/hashicorp/aws v5.40.0
# + provider registry.opentofu.org/hashicorp/random v3.6.0
```

## JSON Output

```bash
# Machine-readable JSON output
tofu version -json

# Output:
# {
#   "terraform_version": "1.8.0",
#   "platform": "linux_amd64",
#   "provider_selections": {
#     "registry.opentofu.org/hashicorp/aws": "5.40.0",
#     "registry.opentofu.org/hashicorp/random": "3.6.0"
#   }
# }
```

## Version in CI/CD

```bash
# Check version in CI pipeline
tofu version

# Verify minimum version
TOFU_VERSION=$(tofu version -json | jq -r '.terraform_version')
REQUIRED="1.7.0"

if [ "$(printf '%s\n' "$REQUIRED" "$TOFU_VERSION" | sort -V | head -n1)" = "$REQUIRED" ]; then
  echo "OpenTofu $TOFU_VERSION meets minimum requirement $REQUIRED"
else
  echo "OpenTofu $TOFU_VERSION is below minimum requirement $REQUIRED"
  exit 1
fi
```

## Version Constraints in Configuration

```hcl
terraform {
  required_version = ">= 1.7.0"  # Minimum version

  # Or pin exactly
  # required_version = "1.8.0"

  # Or range
  # required_version = ">= 1.7.0, < 2.0.0"
}
```

## Managing Versions with tenv

```bash
# Install tenv for OpenTofu version management
brew install tenv  # macOS

# Install and use a specific OpenTofu version
tenv tofu install 1.8.0
tenv tofu use 1.8.0

# Set version in project directory
echo "1.8.0" > .opentofu-version
```

## Team Version Consistency

```yaml
# Enforce version in your CI pipeline
- name: Check OpenTofu Version
  run: |
    VERSION=$(tofu version -json | jq -r '.terraform_version')
    EXPECTED="1.8.0"
    if [ "$VERSION" != "$EXPECTED" ]; then
      echo "Expected OpenTofu $EXPECTED, got $VERSION"
      exit 1
    fi
```

## Conclusion

`tofu version` is a simple but important command for version visibility and compatibility validation. Use `required_version` constraints in your configuration to ensure team members and CI/CD pipelines use compatible versions. The JSON output format makes it easy to integrate version checking into automated pipelines.
