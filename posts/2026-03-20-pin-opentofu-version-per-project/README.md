# How to Pin an OpenTofu Version Per Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Version Pinning, Project Management, Infrastructure as Code, DevOps

Description: A guide to pinning a specific OpenTofu version for individual projects to ensure consistency across team members and CI/CD pipelines.

## Introduction

Pinning an OpenTofu version per project ensures that all team members, CI/CD pipelines, and deployment environments use identical tool versions. This eliminates version mismatch bugs and ensures reproducible infrastructure deployments.

## Method 1: Using .opentofu-version with tofuenv

```bash
# Navigate to your project directory

cd /path/to/your/project

# Create the version file
echo "1.9.0" > .opentofu-version

# Commit it to version control
git add .opentofu-version
git commit -m "Pin OpenTofu version to 1.9.0"

# tofuenv automatically reads this when you run tofu commands
tofu version  # Will show 1.9.0 when using tofuenv
```

## Method 2: Using .tool-versions with asdf

```bash
# In your project directory
cd /path/to/your/project

# Set the local version
asdf set opentofu 1.9.0

# This creates/updates .tool-versions
cat .tool-versions
# opentofu 1.9.0

# Commit to version control
git add .tool-versions
git commit -m "Pin OpenTofu version to 1.9.0 using asdf"
```

## Method 3: Using required_version in HCL

```hcl
# main.tf or versions.tf
terraform {
  # Pinned to exact version
  required_version = "= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

```bash
# If someone tries to run with a different version, they get:
# Error: Unsupported OpenTofu Core version
# This configuration does not support OpenTofu version 1.8.5.
```

## Method 4: Docker-based Version Pinning

```dockerfile
# Dockerfile.tofu - Pin the exact version in a container
FROM alpine:3.19

ARG TOFU_VERSION=1.9.0

RUN apk add --no-cache curl unzip \
    && curl -fsSL "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip" -o tofu.zip \
    && unzip tofu.zip \
    && mv tofu /usr/local/bin/ \
    && rm tofu.zip \
    && tofu version

WORKDIR /workspace
ENTRYPOINT ["tofu"]
```

```bash
# Build the pinned image
docker build -t project-tofu:1.9.0 -f Dockerfile.tofu .

# Use in scripts
docker run --rm -v $(pwd):/workspace project-tofu:1.9.0 plan
```

## Recommended Project Structure

```text
my-infrastructure/
├── .opentofu-version      # tofuenv version pin
├── .tool-versions         # asdf version pin
├── versions.tf            # HCL version constraints
├── main.tf
├── variables.tf
├── outputs.tf
└── .gitignore
```

```hcl
# versions.tf - Centralized version constraints
terraform {
  required_version = ">= 1.9.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
```

## Enforcing Versions in CI/CD

```yaml
# .github/workflows/tofu.yml
name: OpenTofu

on: [push, pull_request]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.9.0"  # Exact version pin

      - name: Verify version
        run: tofu version

      - name: Init
        run: tofu init
```

## Handling Version Constraints for Teams

```bash
# Document version requirements in README
# Or use a script to check version before running

# check-version.sh
#!/bin/bash
REQUIRED="1.9.0"
CURRENT=$(tofu version | head -1 | awk '{print $2}' | sed 's/v//')

if [ "$CURRENT" != "$REQUIRED" ]; then
  echo "ERROR: OpenTofu $REQUIRED required, but $CURRENT is installed"
  echo "Run: tofuenv install $REQUIRED && tofuenv use $REQUIRED"
  exit 1
fi

echo "OpenTofu version check passed: $CURRENT"
```

## Conclusion

Pinning OpenTofu versions per project is a best practice that prevents version-related issues in team environments and CI/CD pipelines. Using a combination of `.opentofu-version`, `required_version` constraints, and CI/CD version specifications ensures complete version consistency from development through production deployment.
