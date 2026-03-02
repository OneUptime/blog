# How to Pass Provider Configurations to Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Provider, Multi-Region, Multi-Account, Infrastructure as Code

Description: A practical guide to passing provider configurations to Terraform modules, covering implicit inheritance, explicit passing, configuration_aliases, and real-world multi-region patterns.

---

Provider configuration in Terraform modules can be confusing because it works differently depending on whether you use aliased providers, whether the module declares its own provider requirements, and whether you are calling the module from the root or from another module. This guide clears up the mechanics and shows you the right approach for each scenario.

## The Two Ways Providers Reach Modules

There are exactly two ways a module gets its provider configuration:

1. **Implicit inheritance** - The module automatically gets the default (non-aliased) provider from its parent
2. **Explicit passing** - The caller uses the `providers` argument to map specific provider configurations to the module

Understanding when each applies is the key to getting provider configuration right.

## Implicit Inheritance (The Default)

When you do not specify a `providers` argument, the module inherits the default provider from the calling module:

```hcl
# Root module configures a default AWS provider
provider "aws" {
  region = "us-east-1"
}

# This module inherits the default aws provider automatically
module "vpc" {
  source = "./modules/vpc"
  cidr   = "10.0.0.0/16"
}
```

Inside the `vpc` module, any `aws_*` resource uses the inherited provider. No additional configuration needed.

Implicit inheritance only works for the default (non-aliased) provider. If you only have aliased providers:

```hcl
# Only aliased providers - no default
provider "aws" {
  alias  = "east"
  region = "us-east-1"
}

# This module has no aws provider to inherit!
module "vpc" {
  source = "./modules/vpc"  # Will fail - no default aws provider
  cidr   = "10.0.0.0/16"
}
```

## Explicit Passing with the providers Argument

When you need to control which provider a module uses, pass it explicitly:

```hcl
provider "aws" {
  alias  = "east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

# Explicitly pass the east provider as the module's default aws provider
module "vpc_east" {
  source = "./modules/vpc"

  providers = {
    aws = aws.east
  }

  cidr = "10.0.0.0/16"
}

# Same module, different provider
module "vpc_west" {
  source = "./modules/vpc"

  providers = {
    aws = aws.west
  }

  cidr = "10.1.0.0/16"
}
```

## Declaring Provider Requirements in Modules

Modules should declare which providers they need in their `versions.tf`:

```hcl
# modules/vpc/versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

This tells Terraform which provider package the module needs and which versions are compatible. It does not create a provider configuration - that is the caller's job.

## Using configuration_aliases

When a module needs multiple configurations of the same provider, it declares this with `configuration_aliases`:

```hcl
# modules/cross-region-backup/versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
      # This module needs both a default aws provider and an aws.backup provider
      configuration_aliases = [aws.backup]
    }
  }
}
```

```hcl
# modules/cross-region-backup/main.tf

# Primary region resources use the default provider
resource "aws_s3_bucket" "source" {
  bucket = "${var.name}-source"
}

# Backup region resources use the aliased provider
resource "aws_s3_bucket" "backup" {
  provider = aws.backup
  bucket   = "${var.name}-backup"
}
```

The caller provides both:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "dr_region"
  region = "us-west-2"
}

module "backup" {
  source = "./modules/cross-region-backup"

  providers = {
    aws        = aws            # Default provider for the module
    aws.backup = aws.dr_region  # Aliased provider for the module
  }

  name = "application-data"
}
```

## Why Modules Should Not Define provider Blocks

A common mistake is putting `provider` blocks inside a module:

```hcl
# BAD - Do not do this inside a module
provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "this" {
  cidr_block = var.cidr
}
```

This creates problems:
- The module becomes hardcoded to a specific region
- You cannot use the module for multi-region deployments
- Provider configurations inside modules cannot be overridden by the caller
- It causes issues with `terraform destroy` if the provider configuration depends on resources

The correct approach is to always let the caller configure providers:

```hcl
# GOOD - Module only declares what it needs, not how it is configured
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

resource "aws_vpc" "this" {
  cidr_block = var.cidr
}
```

## Passing Providers Through Nested Modules

When you have nested modules (A calls B calls C), providers need to be explicitly passed at each level if you are using the `providers` argument:

```hcl
# Root module
provider "aws" {
  alias  = "production"
  region = "us-east-1"
}

# Root calls Module A
module "infrastructure" {
  source = "./modules/infrastructure"

  providers = {
    aws = aws.production
  }
}

# modules/infrastructure/main.tf - Module A calls Module B
module "networking" {
  source = "./modules/networking"

  # Must pass provider through - it does not auto-inherit
  # when the parent received it via explicit providers argument
  providers = {
    aws = aws
  }
}
```

Actually, there is a nuance here. If Module A itself does not use `configuration_aliases` and receives the default `aws` provider, then Module B inherits it implicitly. The explicit pass-through is needed when Module A has aliased providers.

## Real-World Pattern: Multi-Account with Assumed Roles

```hcl
# providers.tf - Configure providers for different AWS accounts

provider "aws" {
  region = "us-east-1"
  alias  = "management"
  # Uses the current credentials (management account)
}

provider "aws" {
  region = "us-east-1"
  alias  = "workload_dev"

  assume_role {
    role_arn     = "arn:aws:iam::111111111111:role/TerraformDeployRole"
    session_name = "terraform-dev"
  }
}

provider "aws" {
  region = "us-east-1"
  alias  = "workload_prod"

  assume_role {
    role_arn     = "arn:aws:iam::222222222222:role/TerraformDeployRole"
    session_name = "terraform-prod"
  }
}

provider "aws" {
  region = "us-east-1"
  alias  = "security"

  assume_role {
    role_arn     = "arn:aws:iam::333333333333:role/TerraformDeployRole"
    session_name = "terraform-security"
  }
}

# main.tf - Deploy modules to different accounts

module "dev_vpc" {
  source    = "./modules/vpc"
  providers = { aws = aws.workload_dev }

  cidr        = "10.0.0.0/16"
  environment = "dev"
}

module "prod_vpc" {
  source    = "./modules/vpc"
  providers = { aws = aws.workload_prod }

  cidr        = "10.1.0.0/16"
  environment = "prod"
}

module "security_hub" {
  source    = "./modules/security-monitoring"
  providers = { aws = aws.security }

  monitored_accounts = ["111111111111", "222222222222"]
}

# Cross-account module that needs both management and workload providers
module "account_baseline" {
  source = "./modules/account-baseline"

  providers = {
    aws            = aws.workload_prod
    aws.management = aws.management
  }

  account_name = "production"
}
```

## Provider Configuration for for_each Modules

When using `for_each` with modules, all instances share the same provider configuration:

```hcl
provider "aws" {
  alias  = "target"
  region = "us-east-1"
}

# All instances of this module use the same provider
module "services" {
  source   = "./modules/ecs-service"
  for_each = var.services

  providers = {
    aws = aws.target
  }

  service_name = each.key
  image        = each.value.image
}
```

You cannot dynamically change the provider per instance of `for_each`. If you need different providers for different instances, you need separate module blocks.

## Debugging Provider Issues

When a module is not using the provider you expect, check:

1. Does the module have a `provider` block inside it? That overrides any passed provider.
2. Are you passing the provider explicitly? If yes, is the key name correct?
3. Is the module nested? Providers might not be flowing through intermediate modules.

Use `terraform providers` to see which providers are configured:

```bash
# Show provider requirements for the entire configuration
terraform providers
```

## Summary

Passing provider configurations to modules is how you enable multi-region, multi-account, and multi-cloud Terraform deployments. Modules should declare their provider requirements with `required_providers` but never define `provider` blocks. The default (non-aliased) provider is inherited implicitly. Aliased providers must be passed explicitly using the `providers` argument. When a module needs multiple configurations of the same provider, declare `configuration_aliases`. And when nesting modules that use explicit providers, make sure to pass them through each level.

For the `providers` argument syntax details, see [How to Use the providers Argument in Module Blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-providers-argument-in-module-blocks/view). For module composition, check out [How to Chain Module Outputs to Other Module Inputs](https://oneuptime.com/blog/post/2026-02-23-how-to-chain-module-outputs-to-other-module-inputs/view).
