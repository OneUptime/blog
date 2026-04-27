# OpenTofu vs Terraform: Feature Parity and Key Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Feature Parity, Comparison, Infrastructure as Code

Description: Learn the current state of feature parity between OpenTofu and Terraform, including areas where OpenTofu has diverged with new capabilities not available in Terraform.

## Introduction

OpenTofu forked from Terraform 1.5.x in 2023. Since then, both projects have evolved independently. This guide covers where OpenTofu maintains parity with Terraform and where it has introduced unique features.

## Feature Parity

OpenTofu maintains compatibility with Terraform in all core areas:

### Provider Compatibility

OpenTofu uses the same provider plugin protocol as Terraform. Most providers work with OpenTofu without modification:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

The same configuration works in both OpenTofu and Terraform.

### HCL Syntax

All HCL syntax from Terraform 1.5 is supported in OpenTofu:
- Resources, data sources, locals, outputs, variables
- `for_each`, `count`, `dynamic` blocks
- Expressions, functions, operators
- Modules and module composition

### Backend Compatibility

OpenTofu supports the same backends as Terraform:
- AWS S3
- Azure Blob Storage
- Google Cloud Storage
- Consul
- Kubernetes
- HTTP backend

Existing state files from Terraform are compatible with OpenTofu.

## OpenTofu-Exclusive Features

### 1. Native State Encryption (OpenTofu 1.7+)

OpenTofu added client-side state encryption, a highly requested feature not in Terraform:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "passphrase" {
      passphrase = var.state_passphrase
    }

    method "aes_gcm" "default" {
      keys = key_provider.pbkdf2.passphrase
    }

    state {
      method = method.aes_gcm.default
    }

    plan {
      method = method.aes_gcm.default
    }
  }
}
```

State and plan files are encrypted before being stored, protecting sensitive values in state backends.

### 2. Provider-Defined Functions (OpenTofu 1.7+)

Providers can expose custom functions callable in HCL:

```hcl
# Use a provider-defined function

output "parsed_arn" {
  value = provider::aws::arn_parse(aws_iam_role.main.arn)
}
```

### 3. OpenTofu Registry

OpenTofu maintains its own provider and module registry at `registry.opentofu.org`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "registry.opentofu.org/hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

Most Terraform Registry providers are mirrored here.

## Areas Where Terraform Has Features OpenTofu Doesn't

### HCP Terraform Integration

Terraform has a `cloud` backend specifically for HCP Terraform (formerly Terraform Cloud):

```hcl
# Terraform-only (native HCP integration)
terraform {
  cloud {
    organization = "mycompany"
    workspaces {
      name = "production"
    }
  }
}
```

OpenTofu can connect to HCP Terraform via the `remote` backend, but without all native features.

### Stacks

HashiCorp introduced "Stacks" - a new deployment model for Terraform - as an HCP Terraform feature. This is not in OpenTofu.

## Migration from Terraform to OpenTofu

The migration process is straightforward:

### 1. Install OpenTofu

```bash
# Using tfenv-compatible tool
tofu version

# Or install directly
curl -L https://github.com/opentofu/opentofu/releases/latest/download/tofu_linux_amd64.zip \
  -o tofu.zip && unzip tofu.zip
```

### 2. Migrate State

```bash
# Re-initialize with OpenTofu (state is compatible)
tofu init

# Verify no unexpected changes
tofu plan
```

### 3. Update CI/CD

Replace `terraform` with `tofu` in your pipeline commands:

```yaml
# Before
- run: terraform init && terraform apply

# After
- run: tofu init && tofu apply
```

### 4. Update Required Version Constraint

```hcl
terraform {
  required_version = ">= 1.6.0"  # OpenTofu uses same versioning scheme
}
```

## Version Mapping

| OpenTofu Version | Terraform Parity Baseline |
|---|---|
| 1.6.x | Terraform 1.6.x |
| 1.7.x | Terraform 1.7.x + state encryption + provider-defined functions |
| 1.8.x | Terraform 1.8.x + early variable evaluation + `.tofu` files |

## Compatibility Testing

The OpenTofu team runs compatibility tests against the full Terraform provider test suite to ensure parity.

```bash
# Test your existing configurations work with OpenTofu
tofu init -upgrade
tofu validate
tofu plan
```

## Best Practices for Switching

- Run `tofu plan` after switching to verify no unexpected changes.
- Update your provider version constraints if pinned to exact Terraform-specific versions.
- Test in a non-production environment first.
- Update your `required_version` constraint to specify OpenTofu compatibility.
- Check the OpenTofu changelog for new features your team might benefit from.

## Conclusion

OpenTofu maintains strong parity with Terraform while adding unique features like native state encryption and provider-defined functions. For the vast majority of Terraform configurations, switching to OpenTofu is a drop-in replacement requiring only a binary swap. OpenTofu's roadmap continues to add features driven by community demand rather than commercial priorities.
