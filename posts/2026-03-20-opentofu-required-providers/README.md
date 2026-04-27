# Declaring Required Providers in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider

Description: Learn how to properly declare required providers in OpenTofu with correct sources, version constraints, and best practices.

The `required_providers` block is how you tell OpenTofu which providers your configuration needs, where to find them, and which versions are compatible. Getting this right is essential for reproducible deployments.

## Basic required_providers Declaration

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Provider Source Addresses

Every provider has a source address in the format `hostname/namespace/type`:

```hcl
terraform {
  required_providers {
    # Public registry providers (hostname defaults to registry.opentofu.org)
    aws = {
      source  = "hashicorp/aws"           # registry.opentofu.org/hashicorp/aws
      version = "~> 5.0"
    }

    google = {
      source  = "hashicorp/google"
      version = ">= 5.0, < 6.0"
    }

    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }

    # Third-party providers
    datadog = {
      source  = "datadog/datadog"
      version = "~> 3.0"
    }

    # Self-hosted registry
    custom = {
      source  = "registry.example.com/myorg/custom"
      version = ">= 1.0"
    }
  }
}
```

## Version Constraint Syntax

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      # Exact version
      version = "5.38.0"
    }

    google = {
      source = "hashicorp/google"
      # Pessimistic constraint - allow patch and minor updates (>=5.0.0, <6.0.0)
      version = "~> 5.0"
    }

    azurerm = {
      source = "hashicorp/azurerm"
      # Range constraint
      version = ">= 3.90.0, < 4.0.0"
    }

    kubernetes = {
      source = "hashicorp/kubernetes"
      # Minimum version only (least restrictive - use carefully)
      version = ">= 2.20"
    }
  }
}
```

## Multiple Providers in Complex Configurations

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    # Infrastructure providers
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # Kubernetes provider - configured after cluster creation
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }

    # DNS provider
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }

    # Secrets management
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.23"
    }

    # Utility providers
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }

    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }

    time = {
      source  = "hashicorp/time"
      version = "~> 0.10"
    }
  }
}
```

## Configuring Declared Providers

```hcl
# Declare requirements

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy   = "opentofu"
      Environment = var.environment
      Team        = var.team
    }
  }
}
```

## Provider Requirements in Modules

Modules should declare their provider requirements:

```hcl
# modules/vpc/versions.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"  # Modules use minimum versions, not exact
    }
  }
}
```

OpenTofu treats version constraints from the root module and any child modules as equal, so the selected provider version must satisfy all of them. If the constraints cannot be reconciled, `tofu init` fails.

## Initializing Providers

```bash
# Download declared providers
tofu init

# Upgrade providers to newest allowed version
tofu init -upgrade

# Show installed provider versions
tofu providers

# Show the lock file
cat .terraform.lock.hcl
```

## Provider Dependency Lock File

```hcl
# .terraform.lock.hcl (commit this file!)
provider "registry.opentofu.org/hashicorp/aws" {
  version     = "5.38.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:...",
    "zh:...",
  ]
}

provider "registry.opentofu.org/hashicorp/random" {
  version     = "3.6.0"
  constraints = "~> 3.6"
  hashes = [
    "h1:...",
    "zh:...",
  ]
}
```

## Conclusion

Properly declaring `required_providers` with accurate source addresses and version constraints is the foundation of reliable OpenTofu configurations. Use pessimistic constraints (`~>`) for flexibility while preventing major breaking changes, always commit your lock file, and declare provider requirements in modules even when they inherit providers from root.
