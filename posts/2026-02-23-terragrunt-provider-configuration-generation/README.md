# How to Use Terragrunt for Provider Configuration Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, Provider Configuration, DevOps

Description: Learn how to use Terragrunt's generate block to automatically create provider configurations, keeping your Terraform modules clean and your multi-account setups manageable.

---

Provider configuration in Terraform is one of those things that starts simple and slowly turns into a maintenance headache. When you're deploying to a single AWS account in a single region, a hardcoded provider block is fine. But the moment you add a second environment or a second cloud region, you're duplicating provider blocks everywhere. Terragrunt's `generate` block lets you centralize provider configuration and inject it into modules at runtime, keeping your actual Terraform code provider-agnostic.

## The Problem with Hardcoded Providers

In a typical multi-environment Terraform setup, every module directory has something like this:

```hcl
# Every single module has this boilerplate
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/TerraformRole"
  }

  default_tags {
    tags = {
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}
```

Now multiply that across 40 modules and 4 environments. When you need to update the role ARN format or add a new default tag, you're editing 160 files. Terragrunt's provider generation solves this cleanly.

## Basic Provider Generation

The `generate` block in Terragrunt creates a file in the working directory before Terraform runs. Here's a root configuration that generates an AWS provider:

```hcl
# root terragrunt.hcl

locals {
  # Pull region from a region.hcl file in the directory tree
  region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  aws_region  = local.region_vars.locals.aws_region
}

# Generate provider.tf in each module directory
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  default_tags {
    tags = {
      ManagedBy = "terraform"
      Repo      = "infrastructure"
    }
  }
}
EOF
}
```

Each child module inherits this by including the root:

```hcl
# dev/us-east-1/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/vpc"
}

inputs = {
  vpc_cidr = "10.0.0.0/16"
}
```

The Terraform module itself has zero provider configuration - it just declares what providers it needs:

```hcl
# modules/vpc/versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

This keeps your modules truly reusable since they don't care about which region or account they're deployed to.

## Multi-Account Provider Generation with AssumeRole

When working with AWS Organizations or any multi-account setup, each environment typically maps to a different AWS account. The provider needs to assume a role in the target account:

```hcl
# root terragrunt.hcl

locals {
  account_vars = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  region_vars  = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  env_vars     = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  account_id  = local.account_vars.locals.account_id
  aws_region  = local.region_vars.locals.aws_region
  environment = local.env_vars.locals.environment
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  assume_role {
    role_arn     = "arn:aws:iam::${local.account_id}:role/TerraformDeployRole"
    session_name = "terragrunt-${local.environment}"
  }

  default_tags {
    tags = {
      Environment = "${local.environment}"
      ManagedBy   = "terraform"
      Account     = "${local.account_id}"
    }
  }
}
EOF
}
```

Your directory structure supports this with config files at each level:

```
infrastructure/
  terragrunt.hcl
  dev/
    account.hcl          # account_id = "111111111111"
    env.hcl              # environment = "dev"
    us-east-1/
      region.hcl         # aws_region = "us-east-1"
      vpc/
        terragrunt.hcl
      ecs/
        terragrunt.hcl
  prod/
    account.hcl          # account_id = "222222222222"
    env.hcl              # environment = "prod"
    us-east-1/
      region.hcl
      vpc/
        terragrunt.hcl
```

## Generating Multiple Providers

Some modules need access to multiple AWS regions or even multiple cloud providers. You can generate multiple provider configurations:

```hcl
# root terragrunt.hcl

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
# Primary provider for the target region
provider "aws" {
  region = "${local.aws_region}"

  assume_role {
    role_arn = "arn:aws:iam::${local.account_id}:role/TerraformRole"
  }
}

# Secondary provider for us-east-1 (needed for CloudFront, ACM, etc.)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::${local.account_id}:role/TerraformRole"
  }
}
EOF
}
```

Modules that need the aliased provider reference it as usual:

```hcl
# modules/cloudfront/main.tf
resource "aws_acm_certificate" "cert" {
  provider          = aws.us_east_1
  domain_name       = var.domain
  validation_method = "DNS"
}
```

## GCP Provider Generation

The same technique works for Google Cloud:

```hcl
# root terragrunt.hcl for GCP

locals {
  project_vars = read_terragrunt_config(find_in_parent_folders("project.hcl"))
  gcp_project  = local.project_vars.locals.project_id
  gcp_region   = local.project_vars.locals.region
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "google" {
  project = "${local.gcp_project}"
  region  = "${local.gcp_region}"
}

provider "google-beta" {
  project = "${local.gcp_project}"
  region  = "${local.gcp_region}"
}
EOF
}
```

## Azure Provider Generation

And Azure:

```hcl
# root terragrunt.hcl for Azure

locals {
  sub_vars        = read_terragrunt_config(find_in_parent_folders("subscription.hcl"))
  subscription_id = local.sub_vars.locals.subscription_id
  tenant_id       = local.sub_vars.locals.tenant_id
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "azurerm" {
  subscription_id = "${local.subscription_id}"
  tenant_id       = "${local.tenant_id}"

  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}
EOF
}
```

## Generating Required Providers Block

Beyond the provider block, you can also generate the `required_providers` block to keep Terraform version constraints consistent:

```hcl
generate "versions" {
  path      = "versions.tf"
  if_exists = "overwrite"
  contents  = <<EOF
terraform {
  required_version = ">= 1.5.0"

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
EOF
}
```

This guarantees every module uses the same provider versions, avoiding subtle version drift across environments.

## Conditional Provider Generation

Sometimes specific modules need additional providers. You can handle this by defining the base providers in the root and adding extras at the child level:

```hcl
# modules/dns/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

# Add the Cloudflare provider for this module only
generate "cloudflare_provider" {
  path      = "provider_cloudflare.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
EOF
}

terraform {
  source = "../../modules/dns"
}
```

This generates two files - `provider.tf` from the root and `provider_cloudflare.tf` from the child - which Terraform merges together.

## Debugging Generated Providers

If something looks wrong with your provider setup, check the generated files:

```bash
# Run Terragrunt and look at what it generated
cd dev/us-east-1/vpc
terragrunt plan

# Inspect the generated file in the cache
cat .terragrunt-cache/*/provider.tf
```

You can also use `terragrunt render-json` to see the fully resolved configuration before anything runs.

## Best Practices

Keep your Terraform modules completely free of provider configurations. The module should declare what it needs in `required_providers`, and Terragrunt should handle the rest. This makes modules portable across accounts, regions, and even cloud providers (if you're building multi-cloud abstractions).

Avoid putting sensitive values directly in the generated provider block. Instead, lean on environment variables (`AWS_PROFILE`, `GOOGLE_APPLICATION_CREDENTIALS`) or the cloud provider's credential chain. The `generate` block is great for region, project, and role configuration - not for secrets.

Finally, use `if_exists = "overwrite"` in most cases. The `overwrite_terragrunt` option tracks whether Terragrunt originally created the file, which can be useful during migrations but adds complexity.

## Summary

Provider configuration generation removes one of the biggest sources of boilerplate in multi-environment Terraform setups. Combined with backend generation (see our [backend configuration generation guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-backend-configuration-generation/view)), your Terraform modules stay clean and your infrastructure configuration lives in one well-organized place.
