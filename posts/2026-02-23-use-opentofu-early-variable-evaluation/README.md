# How to Use OpenTofu Early Variable Evaluation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Variables, Infrastructure as Code, Configuration

Description: Learn how to use OpenTofu's early variable and locals evaluation feature to use variables in backend configurations, module sources, and other places where Terraform requires hardcoded values.

---

One of the most requested features in the Terraform ecosystem has been the ability to use variables in backend configuration and module sources. Terraform requires these values to be hardcoded or passed via command-line flags, which leads to workarounds like wrapper scripts and Terragrunt. OpenTofu solved this with early variable and locals evaluation. This guide explains what it is, how it works, and how to use it.

## The Problem This Solves

In Terraform, you cannot do this:

```hcl
# THIS DOES NOT WORK IN TERRAFORM
variable "environment" {
  type = string
}

terraform {
  backend "s3" {
    bucket = "state-${var.environment}"  # Error!
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
```

Terraform throws an error: "Variables may not be used here." The same restriction applies to module sources:

```hcl
# THIS ALSO DOES NOT WORK IN TERRAFORM
variable "module_version" {
  type = string
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = var.module_version  # Error!
}
```

These limitations force teams to use partial backend configuration with `-backend-config` flags, Terragrunt, or code generation. OpenTofu's early variable evaluation removes these restrictions.

## How Early Evaluation Works

OpenTofu evaluates variables and locals in a special early phase, before backend initialization and module downloads. During this phase, OpenTofu:

1. Reads variable definitions and their defaults
2. Reads variable values from `.tfvars` files and environment variables
3. Evaluates locals that depend only on variables and other locals
4. Uses these resolved values in backend config, module sources, and encryption config

The key constraint is that early-evaluated expressions can only reference variables and locals. They cannot reference resources, data sources, or other runtime values.

## Using Variables in Backend Configuration

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Deployment environment (staging, production)"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

# backend.tf
terraform {
  backend "s3" {
    bucket         = "myorg-state-${var.environment}"
    key            = "${var.environment}/terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = "opentofu-locks"
    encrypt        = true
  }
}
```

```bash
# Pass the variable at runtime
tofu init -var="environment=staging"

# Or set it via environment variable
export TF_VAR_environment="staging"
tofu init

# Or use a .tfvars file
echo 'environment = "staging"' > staging.tfvars
tofu init -var-file=staging.tfvars
```

This eliminates the need for `-backend-config` flags and partial backend configuration entirely.

## Using Locals in Backend Configuration

You can also use locals that combine variables:

```hcl
variable "project" {
  type    = string
  default = "myapp"
}

variable "environment" {
  type = string
}

variable "region" {
  type    = string
  default = "us-east-1"
}

locals {
  state_bucket = "${var.project}-opentofu-state-${var.region}"
  state_key    = "${var.environment}/${var.project}/terraform.tfstate"
}

terraform {
  backend "s3" {
    bucket         = local.state_bucket
    key            = local.state_key
    region         = var.region
    dynamodb_table = "${var.project}-locks"
    encrypt        = true
  }
}
```

## Using Variables in Module Sources

Pin module versions dynamically:

```hcl
variable "vpc_module_version" {
  type    = string
  default = "5.4.0"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = var.vpc_module_version

  name = "production"
  cidr = "10.0.0.0/16"
}
```

Use a variable to switch between module sources:

```hcl
variable "use_local_modules" {
  type    = bool
  default = false
}

locals {
  vpc_source = var.use_local_modules ? "./modules/vpc" : "terraform-aws-modules/vpc/aws"
}

module "vpc" {
  source = local.vpc_source

  name = "production"
  cidr = "10.0.0.0/16"
}
```

```bash
# Use local modules during development
tofu init -var="use_local_modules=true"

# Use registry modules in production
tofu init -var="use_local_modules=false"
```

## Using Variables in Encryption Configuration

Early evaluation also applies to the encryption block:

```hcl
variable "kms_key_id" {
  type      = string
  sensitive = true
}

terraform {
  encryption {
    key_provider "aws_kms" "main" {
      kms_key_id = var.kms_key_id
      key_spec   = "AES_256"
      region     = var.aws_region
    }

    method "aes_gcm" "main" {
      keys = key_provider.aws_kms.main
    }

    state {
      method = method.aes_gcm.main
    }
  }
}
```

## Real-World Patterns

### Multi-Environment Backend

```hcl
# variables.tf
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

# locals.tf
locals {
  env_config = {
    dev = {
      state_bucket = "myorg-dev-state"
      lock_table   = "dev-locks"
      region       = "us-east-1"
    }
    staging = {
      state_bucket = "myorg-staging-state"
      lock_table   = "staging-locks"
      region       = "us-east-1"
    }
    production = {
      state_bucket = "myorg-prod-state"
      lock_table   = "prod-locks"
      region       = "us-east-1"
    }
  }

  current_env = local.env_config[var.environment]
}

# backend.tf
terraform {
  backend "s3" {
    bucket         = local.current_env.state_bucket
    key            = "infrastructure/terraform.tfstate"
    region         = local.current_env.region
    dynamodb_table = local.current_env.lock_table
    encrypt        = true
  }
}
```

```bash
# Deploy to staging
tofu init -var="environment=staging"
tofu plan -var="environment=staging"
tofu apply -var="environment=staging"

# Deploy to production
tofu init -var="environment=production"
tofu plan -var="environment=production"
tofu apply -var="environment=production"
```

### Git Branch-Based Module Versions

```hcl
variable "module_ref" {
  type        = string
  default     = "main"
  description = "Git ref for module source"
}

module "app" {
  source = "git::https://github.com/myorg/terraform-modules.git//app?ref=${var.module_ref}"

  app_name = "myapp"
}
```

```bash
# Use the main branch in production
tofu init -var="module_ref=v2.1.0"

# Use a feature branch for testing
tofu init -var="module_ref=feature/new-ecs-task"
```

### Account-Specific Configuration

```hcl
variable "aws_account_id" {
  type = string
}

variable "environment" {
  type = string
}

locals {
  assume_role_arn = "arn:aws:iam::${var.aws_account_id}:role/OpenTofuRole"
}

terraform {
  backend "s3" {
    bucket   = "central-state-${var.environment}"
    key      = "account-${var.aws_account_id}/terraform.tfstate"
    region   = "us-east-1"
    role_arn = local.assume_role_arn
  }
}
```

## Limitations of Early Evaluation

Early evaluation has constraints you need to understand:

**Only variables and locals are available.** You cannot reference resources, data sources, or provider-generated values in backend or module source blocks.

```hcl
# THIS STILL DOES NOT WORK
data "aws_ssm_parameter" "bucket_name" {
  name = "/config/state-bucket"
}

terraform {
  backend "s3" {
    bucket = data.aws_ssm_parameter.bucket_name.value  # Error!
  }
}
```

**Locals can only reference variables and other locals.** A local that references a resource will not be available during early evaluation.

```hcl
# This works (references only variables)
locals {
  bucket_name = "${var.project}-state"
}

# This does NOT work for early evaluation (references a resource)
locals {
  instance_ip = aws_instance.web.public_ip  # Not available early
}
```

**Variable validation runs during early evaluation.** Make sure validation rules only use values available at that point.

## Migration from Partial Backend Config

If you were using `-backend-config` flags before:

```bash
# Before (Terraform or OpenTofu without early eval)
tofu init \
  -backend-config="bucket=myorg-staging-state" \
  -backend-config="key=app/terraform.tfstate"

# After (OpenTofu with early eval)
tofu init -var="environment=staging"
```

Update your CI/CD pipeline accordingly:

```yaml
# Before
- run: tofu init -backend-config="bucket=${{ env.STATE_BUCKET }}" -backend-config="key=${{ env.STATE_KEY }}"

# After
- run: tofu init -var="environment=${{ env.ENVIRONMENT }}"
```

Early variable evaluation is one of those features that seems small but changes how you structure your entire project. It removes the need for wrapper tools, code generation, and awkward `-backend-config` flags. If you are already using OpenTofu, there is no reason not to take advantage of it.

For more OpenTofu-specific features, see [How to Use OpenTofu Provider-Defined Functions](https://oneuptime.com/blog/post/use-opentofu-provider-defined-functions/view).
