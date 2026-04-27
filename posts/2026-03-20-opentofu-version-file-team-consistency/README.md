# How to Use .opentofu-version File for Team Version Consistency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Team Workflows, Version Management, tofuenv, Infrastructure as Code, DevOps

Description: A guide to using the .opentofu-version file to ensure all team members use the same OpenTofu version across a project.

## Introduction

The `.opentofu-version` file is a simple text file that tells tofuenv which OpenTofu version to use in a specific directory. Committing this file to your repository ensures every team member automatically uses the correct version, eliminating version mismatch issues.

## Creating the .opentofu-version File

```bash
# Navigate to your project root

cd /path/to/your/project

# Create the version file with exact version
echo "1.9.0" > .opentofu-version

# Verify the file
cat .opentofu-version
# 1.9.0

# Add to version control
git add .opentofu-version
git commit -m "Pin OpenTofu version to 1.9.0"
```

## tofuenv and .opentofu-version Interaction

```bash
# When you run any tofu command, tofuenv reads .opentofu-version
cd /path/to/your/project
tofu version
# OpenTofu v1.9.0 (specified by .opentofu-version)

# If version is not installed, tofuenv shows an error
# Install it first:
tofuenv install  # reads .opentofu-version and installs 1.9.0
```

## Version Resolution Priority

tofuenv checks for versions in this order:

```bash
# 1. TOFUENV_TOFU_VERSION environment variable (highest priority)
TOFUENV_TOFU_VERSION=1.8.5 tofu version

# 2. .opentofu-version in current directory
cat ./.opentofu-version

# 3. .opentofu-version in parent directories (walks up)
# If not in current dir, tofuenv checks parent directories

# 4. .opentofu-version in your home directory
cat ~/.opentofu-version

# 5. ${TOFUENV_CONFIG_DIR}/version (global default, typically ~/.tofuenv/version)
cat ~/.tofuenv/version
```

## Complete Team Setup Workflow

```bash
# Developer workflow after cloning a project
git clone https://github.com/your-org/infrastructure.git
cd infrastructure

# .opentofu-version is in the repo
cat .opentofu-version
# 1.9.0

# Install the pinned version
tofuenv install

# tofuenv automatically uses the pinned version
tofu version
# OpenTofu v1.9.0
```

## Pairing with required_version

```hcl
# versions.tf
terraform {
  # Must match .opentofu-version
  required_version = "= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}
```

```bash
# The .opentofu-version ensures tofuenv uses 1.9.0
# required_version ensures OpenTofu itself rejects other versions
# Together, they create a robust version lock
```

## CI/CD Integration

```yaml
# .github/workflows/terraform.yml
name: Infrastructure CI

on: [push, pull_request]

jobs:
  tofu:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Read version from .opentofu-version
        id: version
        run: echo "TOFU_VERSION=$(cat .opentofu-version)" >> $GITHUB_OUTPUT

      - name: Set up OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: ${{ steps.version.outputs.TOFU_VERSION }}

      - name: Init and Validate
        run: |
          tofu init
          tofu validate
```

## Makefile Integration

```makefile
# Makefile - Read version from .opentofu-version
TOFU_VERSION := $(shell cat .opentofu-version 2>/dev/null || echo "latest")

.PHONY: check-version
check-version:
	@echo "Required version: $(TOFU_VERSION)"
	@ACTUAL=$$(tofu version | head -1 | awk '{print $$2}' | sed 's/v//'); \
	if [ "$$ACTUAL" != "$(TOFU_VERSION)" ]; then \
		echo "Wrong version. Run: tofuenv install && tofuenv use"; \
		exit 1; \
	fi
	@echo "Version check passed!"

.PHONY: init
init: check-version
	tofu init
```

## Conclusion

The `.opentofu-version` file is a lightweight, effective way to ensure version consistency across a team. When combined with `required_version` constraints in HCL, it creates a two-layer version enforcement system: tofuenv ensures the right binary is used locally, while OpenTofu itself rejects incompatible versions at runtime. This eliminates an entire class of environment-related bugs in infrastructure teams.
