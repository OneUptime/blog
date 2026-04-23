# How to Report Bugs in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Bug Reporting, Open Source, Community, GitHub, Best Practice

Description: Learn how to write effective bug reports for OpenTofu that help maintainers reproduce and fix issues quickly.

## Introduction

A well-written bug report dramatically increases the chance of your issue being fixed quickly. Maintainers need to reproduce the problem, understand its impact, and identify the cause - all from your report. This guide shows how to write effective OpenTofu bug reports.

## Before Filing a Bug

```bash
# 1. Check if the bug is already reported

# Search GitHub issues: https://github.com/opentofu/opentofu/issues

# 2. Check your current version
tofu version

# 3. Re-test on the latest release
# Download from: https://github.com/opentofu/opentofu/releases

# 4. Check the provider version – sometimes bugs are in providers
if [ -f .terraform.lock.hcl ]; then cat .terraform.lock.hcl; fi
```

## Minimal Reproducible Example

The most important part of a bug report is a minimal config that reproduces the issue.

```hcl
# minimal_repro/main.tf – stripped down to only what's needed to show the issue

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.31.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  # Use mock credentials for bugs that don't require real AWS
  access_key                  = "mock_access_key"
  secret_key                  = "mock_secret_key"
  s3_use_path_style           = true
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3  = "http://localhost:4566"
    sts = "http://localhost:4566"  # LocalStack for full isolation
  }
}

# This is the minimal config you would attach to the bug report
variable "items" {
  default = {
    a = { name = "test", value = null }
  }
}

resource "aws_s3_bucket" "test" {
  for_each = var.items
  bucket   = each.value.name
}
```

## Collecting Debug Information

```bash
# Enable debug logging to capture the full error
TF_LOG=DEBUG tofu plan 2>&1 | tee debug.log

# Show version information, including installed providers
tofu version > version_info.txt

# Include selected provider versions from the lock file, if present
if [ -f .terraform.lock.hcl ]; then cat .terraform.lock.hcl >> version_info.txt; fi

# On macOS/Linux: capture OS info
uname -a >> version_info.txt

# If you're using a self-built OpenTofu binary, include the Go version
go version >> version_info.txt 2>/dev/null || true
```

## Bug Report Template

````markdown
## Bug Description
<!-- A clear, concise description of the bug -->

`tofu plan` returns an unexpected error for the attached minimal configuration.

## Affected Versions
- OpenTofu: 1.9.0
- Provider: hashicorp/aws 5.31.0
- OS: macOS 14.3 (arm64)

## Steps to Reproduce

1. Create the minimal configuration shown above in a new directory.
2. Run `tofu init`
3. Run `tofu plan`
4. Observe the error or unexpected behavior

## Expected Behavior
OpenTofu should behave as documented for the configuration under test.

## Actual Behavior
```text
Paste the exact error message or stack trace here.
```

## Minimal Reproducible Example
<!-- Attach or paste the full minimal config above, including provider configuration -->

## Additional Context
- If this is a regression, note the last version where it worked
- Note any conditions that make the problem appear or disappear
- Debug log attached: debug.log
````

## Where to File the Bug

- **Core OpenTofu bugs**: https://github.com/opentofu/opentofu/issues/new/choose
- **Provider bugs**: the provider's own repository (e.g., `hashicorp/terraform-provider-aws`)
- **Registry bugs**: https://github.com/opentofu/registry/issues

## Summary

Effective bug reports include the exact versions involved, a minimal reproducible configuration, the expected versus actual behavior, and debug logs. The investment in creating a good bug report pays off in faster resolution - maintainers can immediately reproduce and fix the issue rather than asking for more information.
