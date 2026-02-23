# How to Use Required Providers Block in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Required Providers, Configuration, Infrastructure as Code, DevOps

Description: Learn how to use the required_providers block in Terraform to declare provider dependencies with explicit sources, version constraints, and organizational standards for reproducible infrastructure.

---

The `required_providers` block is where you declare which providers your Terraform configuration needs, where to find them, and which versions are acceptable. Without it, Terraform relies on implicit detection from resource prefixes, which can lead to ambiguity, wrong provider sources, and version inconsistencies across team members.

This guide covers the syntax, version constraint options, and organizational patterns for managing `required_providers` effectively.

## Basic Syntax

The `required_providers` block goes inside the `terraform` block:

```hcl
# versions.tf - Provider requirements
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

Each entry maps a local provider name to its source address and version constraint:

- **Local name** (e.g., `aws`): How you reference this provider in your configuration.
- **source**: The full address in the form `namespace/type` (short for `registry.terraform.io/namespace/type`).
- **version**: A version constraint string.

## Why required_providers Is Important

Without `required_providers`, Terraform guesses which provider to use based on resource prefixes:

```hcl
# Without required_providers, Terraform assumes:
# - aws_instance needs "hashicorp/aws"
# - google_compute_instance needs "hashicorp/google"
# This works for official providers but fails for:
# - Community providers with non-standard names
# - Custom providers from private registries
# - Providers that share resource type prefixes
```

Explicit declaration removes ambiguity:

```hcl
terraform {
  required_providers {
    # Without this, Terraform would not know where to find these
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }

    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }

    # Custom provider from a private registry
    internal = {
      source  = "app.terraform.io/myorg/internal"
      version = "~> 1.0"
    }
  }
}
```

## Version Constraint Syntax

Terraform uses a constraint syntax similar to other package managers:

```hcl
terraform {
  required_providers {
    # Exact version
    aws = {
      source  = "hashicorp/aws"
      version = "5.30.0"
    }

    # Greater than or equal to
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }

    # Pessimistic constraint (allows 5.x.x but not 6.0.0)
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.0"
    }

    # Pessimistic constraint on minor version (allows 5.30.x)
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25.0"
    }

    # Range constraint
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.0, < 4.0.0"
    }

    # Multiple constraints (all must be satisfied)
    vault = {
      source  = "hashicorp/vault"
      version = ">= 3.20.0, != 3.21.0, < 4.0.0"
    }
  }
}
```

The `~>` (pessimistic) operator is the most commonly used:

| Constraint | Allows | Does Not Allow |
|-----------|--------|----------------|
| `~> 5.0` | 5.0.0 through 5.99.99 | 6.0.0+ |
| `~> 5.30` | 5.30.0 through 5.99.99 | 6.0.0+ |
| `~> 5.30.0` | 5.30.0 through 5.30.99 | 5.31.0+ |
| `>= 5.0, < 6.0` | Same as `~> 5.0` | 6.0.0+ |

## required_providers in Modules

Modules declare their own provider requirements. The calling module must satisfy those requirements:

```hcl
# modules/vpc/versions.tf - Module's provider requirements
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0.0"
      # Use a wide constraint in modules to maximize compatibility
    }
  }
}
```

```hcl
# root module - versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
      # Root module uses a tighter constraint
      # Must satisfy both its own and the module's requirements
    }
  }
}

module "vpc" {
  source = "./modules/vpc"
  # The root module's aws provider (v5.30.x) satisfies
  # the module's requirement (>= 4.0.0)
}
```

### Handling Provider Name Differences

Sometimes a module uses a different local name for a provider:

```hcl
# A module that uses "mycloud" as the local name for AWS
# modules/special/versions.tf
terraform {
  required_providers {
    mycloud = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

```hcl
# Root module must map its provider to the module's expected name
module "special" {
  source = "./modules/special"

  providers = {
    mycloud = aws  # Map root's "aws" to module's "mycloud"
  }
}
```

## Multiple Providers Configuration

When your configuration uses multiple providers:

```hcl
# versions.tf - All provider requirements in one place
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }

    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }

    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
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

## Private Registry Providers

For providers hosted in a private registry:

```hcl
terraform {
  required_providers {
    # Terraform Cloud private registry
    internal = {
      source  = "app.terraform.io/myorg/internal"
      version = "~> 1.0"
    }

    # Self-hosted registry
    custom = {
      source  = "registry.company.com/myorg/custom"
      version = "~> 2.0"
    }
  }
}
```

Configure credentials for private registries in your CLI configuration:

```hcl
# ~/.terraformrc
credentials "app.terraform.io" {
  token = "your-terraform-cloud-token"
}

credentials "registry.company.com" {
  token = "your-private-registry-token"
}
```

## Organizational Standards

For organizations, define provider version requirements centrally:

```hcl
# shared/versions.tf - Organization standard provider versions
# All teams should copy or reference this file

terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }

    # Approved providers list
    # Only these providers are approved for use in production
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }

    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.35"
    }
  }
}
```

Enforce compliance with a CI/CD check:

```bash
#!/bin/bash
# check-providers.sh - Verify provider sources match organizational standards

set -euo pipefail

APPROVED_SOURCES=(
  "hashicorp/aws"
  "hashicorp/azurerm"
  "hashicorp/google"
  "hashicorp/kubernetes"
  "hashicorp/helm"
  "hashicorp/random"
  "hashicorp/null"
  "hashicorp/tls"
  "DataDog/datadog"
  "cloudflare/cloudflare"
)

# Extract provider sources from configuration
USED_SOURCES=$(terraform providers -json 2>/dev/null | \
  jq -r '.providers[].provider.source // empty' | sort -u)

for source in $USED_SOURCES; do
  APPROVED=false
  for approved in "${APPROVED_SOURCES[@]}"; do
    if [ "$source" = "registry.terraform.io/$approved" ]; then
      APPROVED=true
      break
    fi
  done

  if [ "$APPROVED" = false ]; then
    echo "ERROR: Unapproved provider source: $source"
    exit 1
  fi
done

echo "All provider sources are approved."
```

## Debugging Provider Issues

```bash
# List providers used by current configuration
terraform providers

# Show detailed provider requirements including modules
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64

# Check which version was actually installed
ls .terraform/providers/registry.terraform.io/hashicorp/aws/

# Re-download providers
rm -rf .terraform/providers
terraform init
```

## Best Practices

1. **Always declare `required_providers` explicitly.** Never rely on implicit detection from resource prefixes.
2. **Use `~>` constraints** for a good balance between stability and updates. `~> 5.0` allows minor updates, `~> 5.30.0` allows only patches.
3. **Use wide constraints in modules** (`>= 4.0`) and tight constraints in root modules (`~> 5.30`) so modules are reusable.
4. **Keep all provider requirements in a single file** (usually `versions.tf`) for easy discovery.
5. **Include `required_version`** alongside `required_providers` to prevent running with incompatible Terraform versions.
6. **Maintain an approved providers list** for your organization to prevent use of unmaintained or untrusted providers.
7. **Always include the `source` attribute.** It removes ambiguity about where the provider comes from.

The `required_providers` block is a small piece of configuration with outsized impact on the reliability and reproducibility of your Terraform workflows. Declare your providers explicitly, constrain their versions appropriately, and you avoid a whole class of "works on my machine" issues.
