# How to Use the Required Providers Block in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, HCL, Infrastructure as Code, Configuration

Description: Learn how to use the required_providers block in Terraform to specify provider sources, version constraints, and local names for your infrastructure configuration.

---

Every Terraform configuration needs providers - plugins that know how to talk to cloud APIs, SaaS platforms, and other services. The `required_providers` block is where you declare which providers your configuration needs, where to download them, and which versions are acceptable.

This post covers the syntax, common patterns, and best practices for the `required_providers` block.

## Basic Syntax

The `required_providers` block lives inside the `terraform` block:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

Each entry in `required_providers` has three parts:
- **The local name** (the key, like `aws`) - how you refer to the provider in your config
- **source** - where Terraform downloads the provider from
- **version** - which versions are acceptable

## Provider Source Addresses

The `source` attribute uses a three-part format: `hostname/namespace/type`.

```hcl
terraform {
  required_providers {
    # Full source address: registry.terraform.io/hashicorp/aws
    # When hostname is omitted, it defaults to registry.terraform.io
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # Third-party provider from the public registry
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }

    # Provider from a private registry
    internal = {
      source  = "registry.example.com/myorg/internal"
      version = "1.2.0"
    }
  }
}
```

For providers in the `hashicorp` namespace on the public Terraform Registry, you can use the short form like `hashicorp/aws`. For other providers, you always need the full `namespace/type` format.

## Multiple Providers

Most real-world configurations use multiple providers:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }

    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }

    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }

    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}
```

## Version Constraints

The `version` attribute accepts several constraint formats:

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"

      # Exact version
      # version = "5.31.0"

      # Minimum version
      # version = ">= 5.0.0"

      # Pessimistic constraint - allows patch updates only
      # version = "~> 5.31.0"  # allows 5.31.x but not 5.32.0

      # Pessimistic constraint - allows minor updates
      # version = "~> 5.0"  # allows 5.x.x but not 6.0.0

      # Combined constraints
      # version = ">= 5.0.0, < 6.0.0"

      # Recommended: pessimistic constraint on the minor version
      version = "~> 5.0"
    }
  }
}
```

The `~>` operator is the most common. `~> 5.0` means "any version in the 5.x range" and `~> 5.31.0` means "any version 5.31.x". This gives you bug fixes and minor features while preventing breaking changes.

## Custom Local Names

The local name (the key in `required_providers`) is usually the same as the provider type. But you can use a different name if needed:

```hcl
terraform {
  required_providers {
    # Using a custom local name for a second AWS provider
    aws_useast = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Reference the provider by its local name
provider "aws_useast" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  provider      = aws_useast
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

This is less common than using provider aliases, but it is available when you need it.

## Required Providers in Modules

Every module should declare its required providers. This is especially important for shared modules:

```hcl
# modules/vpc/providers.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0.0"  # modules often use >= for flexibility
    }
  }
}
```

For modules, using `>=` instead of `~>` gives the calling configuration more flexibility. The root module sets the exact constraint, and child modules just state the minimum they need.

```hcl
# Root module - strict version
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31"  # specific constraint
    }
  }
}

module "vpc" {
  source = "./modules/vpc"
  # The module requires >= 4.0.0, and we are providing 5.31.x
  # This satisfies both constraints
}
```

## The Lock File

When you run `terraform init`, Terraform resolves the version constraints and records the exact versions in `.terraform.lock.hcl`:

```hcl
# .terraform.lock.hcl (auto-generated)
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.31.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:abc123...",
    "zh:def456...",
  ]
}
```

This lock file should be committed to version control. It ensures that everyone on the team uses the exact same provider versions.

```bash
# Update providers within constraints
terraform init -upgrade

# This re-resolves versions and updates the lock file
```

## Configuration Aliases in required_providers

When a module needs to accept provider configurations from the caller, you declare configuration aliases:

```hcl
# modules/multi-region/providers.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
      configuration_aliases = [aws.primary, aws.secondary]
    }
  }
}

# The module can then use both provider configurations
resource "aws_instance" "primary" {
  provider      = aws.primary
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

resource "aws_instance" "secondary" {
  provider      = aws.secondary
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

The calling module passes both configurations:

```hcl
# Root module
provider "aws" {
  alias  = "east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

module "multi_region" {
  source = "./modules/multi-region"

  providers = {
    aws.primary   = aws.east
    aws.secondary = aws.west
  }
}
```

## What Happens Without required_providers

If you use a provider without declaring it in `required_providers`, Terraform uses legacy behavior to infer the source. For HashiCorp providers, this usually works:

```hcl
# This works but is not recommended
provider "aws" {
  region = "us-east-1"
}

# Terraform infers source = "hashicorp/aws" with no version constraint
```

For third-party providers, this will fail because Terraform does not know where to find them. Always declare your providers explicitly.

## Wrapping Up

The `required_providers` block is a critical part of every Terraform configuration. It pins your provider sources and versions, ensuring reproducible builds across your team. Use `source` to specify where the provider comes from, `version` to constrain acceptable versions, and commit the generated `.terraform.lock.hcl` file to version control. For modules, use loose constraints with `>=` so the root module can control the exact version.

For more on Terraform configuration, see [How to Configure Terraform Settings in the terraform Block](https://oneuptime.com/blog/post/2026-02-23-terraform-settings-block/view) and [How to Manage Provider Versions in Terraform](https://oneuptime.com/blog/post/terraform-provider-versions/view).
