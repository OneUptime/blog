# How to Use required_version to Enforce OpenTofu Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Required_version, Version Constraints, Infrastructure as Code, DevOps, Team Collaboration

Description: Learn how to use the required_version constraint in your OpenTofu configuration to enforce a compatible version range and prevent accidental upgrades or downgrades.

---

The `required_version` constraint in the `terraform` block tells OpenTofu which versions are compatible with your configuration. When someone runs `tofu init` or `tofu plan` with a version that doesn't satisfy the constraint, OpenTofu immediately errors - preventing accidental infrastructure changes from version mismatches.

---

## Basic required_version Syntax

```hcl
# versions.tf - centralized version constraints

terraform {
  required_version = ">= 1.8.0"  # minimum version
}
```

---

## Version Constraint Operators

OpenTofu supports several constraint operators:

```hcl
terraform {
  # Exact version - only this version is allowed
  # required_version = "= 1.9.0"

  # Minimum version - anything 1.8.0 or newer
  # required_version = ">= 1.8.0"

  # Pessimistic constraint operator - allows only the rightmost
  # specified version component to increment
  # (~> 1.8.0 allows 1.8.x but not 1.9.0)
  # required_version = "~> 1.8.0"

  # Range constraint - between min and max
  # required_version = ">= 1.8.0, < 2.0.0"

  # Multiple constraints combined
  required_version = ">= 1.8.0, < 2.0.0"
}
```

---

## Recommended: Range Constraint

The most practical constraint allows any version in a major release range:

```hcl
# versions.tf - recommended for most projects
terraform {
  # Allow any 1.x version >= 1.8.0 but block major version upgrades
  required_version = ">= 1.8.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

---

## What Happens When the Version Doesn't Match

```bash
# If running OpenTofu 1.7.0 with required_version ">= 1.8.0":
tofu init

# Error output:
# ╷
# │ Error: Unsupported OpenTofu Core version
# │
# │   on versions.tf line 4, in terraform:
# │    4:   required_version = ">= 1.8.0"
# │
# │ This configuration does not support OpenTofu version 1.7.0. To proceed,
# │ either choose another supported OpenTofu version or update this version
# │ constraint. Version constraints are normally set for good reason, so
# │ updating the constraint may lead to other errors or unexpected behavior.
# ╵
```

---

## Place required_version in a Dedicated versions.tf

Best practice is to keep version constraints in a separate `versions.tf` file:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.8.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}
```

---

## Combine with .opentofu-version for Complete Enforcement

Use `required_version` alongside a `.opentofu-version` file for belt-and-suspenders version control:

```bash
# .opentofu-version - used by tofuenv for automatic switching
echo "1.9.0" > .opentofu-version

# versions.tf - used by OpenTofu itself as a hard block
cat >> versions.tf << 'EOF'
terraform {
  required_version = "~> 1.9.0"
}
EOF
```

The `.opentofu-version` file handles the development environment, while `required_version` acts as a CI/CD safeguard.

---

## Check Required Version in CI/CD

```yaml
# In GitHub Actions - verify version before running
- name: Check OpenTofu version
  run: |
    REQUIRED="1.9.0"
    ACTUAL=$(tofu version -json | python3 -c "import sys,json; print(json.load(sys.stdin)['terraform_version'])")
    if [ "$ACTUAL" != "$REQUIRED" ]; then
      echo "ERROR: Required $REQUIRED, got $ACTUAL"
      exit 1
    fi
    echo "Version check passed: $ACTUAL"
```

---

## Summary

`required_version` in the `terraform` block is the safest way to enforce OpenTofu version compatibility. Use `~> 1.9.0` to allow patch releases within 1.9.x, or `">= 1.8.0, < 2.0.0"` to allow a broader range. Combine with `.opentofu-version` files for development environments and rely on `required_version` as the hard block that catches any environment with a mismatched version.
