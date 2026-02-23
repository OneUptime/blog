# How to Use Local Modules During Development in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Development, Local Modules, Workflow

Description: Learn how to use local module sources during Terraform development for faster iteration, testing, and debugging before publishing to a registry or Git repository.

---

When you are developing a new Terraform module, you do not want to push to a Git repository and re-download every time you make a change. Local module references let you iterate quickly by pointing to a directory on your filesystem. This post covers how to set up a productive local development workflow for Terraform modules.

## Local Module Source Syntax

Local modules use relative file paths as their source. Terraform recognizes a source as local if it starts with `./` or `../`.

```hcl
# Reference a module in a subdirectory of your project
module "networking" {
  source = "./modules/networking"

  vpc_cidr = "10.0.0.0/16"
  name     = "dev"
}

# Reference a module in a sibling directory
module "networking" {
  source = "../shared-modules/networking"

  vpc_cidr = "10.0.0.0/16"
  name     = "dev"
}
```

The key benefit is that changes to the module code are picked up immediately - no need to run `terraform init` again or download anything.

## Setting Up a Development Workspace

Here is a project layout that works well for local module development:

```
workspace/
  modules/                     # Module source code
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf
  environments/                # Deployment configurations
    dev/
      main.tf                  # Uses local module sources
      variables.tf
      terraform.tfvars
    staging/
      main.tf                  # Uses versioned module sources
      variables.tf
      terraform.tfvars
    production/
      main.tf                  # Uses versioned module sources
      variables.tf
      terraform.tfvars
```

## Development Environment Configuration

Your dev environment uses local paths:

```hcl
# environments/dev/main.tf
# Local modules for rapid development

module "networking" {
  source = "../../modules/networking"

  name       = "dev"
  cidr_block = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "compute" {
  source = "../../modules/compute"

  name               = "dev"
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  instance_type      = "t3.small"
  security_group_ids = [module.networking.app_sg_id]
}

module "database" {
  source = "../../modules/database"

  name       = "dev"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  multi_az   = false
}
```

Your production environment uses versioned Git sources:

```hcl
# environments/production/main.tf
# Pinned module versions for production stability

module "networking" {
  source = "git::https://github.com/myorg/terraform-modules.git//networking?ref=v2.1.0"

  name       = "production"
  cidr_block = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "compute" {
  source = "git::https://github.com/myorg/terraform-modules.git//compute?ref=v1.5.0"

  name               = "production"
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  instance_type      = "t3.xlarge"
  security_group_ids = [module.networking.app_sg_id]
}
```

## Fast Iteration Workflow

Here is the development loop for working with local modules:

```bash
# 1. Make changes to the module source
# Edit modules/networking/main.tf

# 2. No need to re-init for local modules
# Just validate and plan directly
cd environments/dev
terraform validate

# 3. Plan to see the effect of your changes
terraform plan

# 4. If it looks good, apply to your dev environment
terraform apply

# 5. Repeat steps 1-4 until the module works correctly
```

Compare this to the workflow with remote modules:

```bash
# Remote module workflow (slower)
# 1. Edit module code
# 2. Commit and push to Git
# 3. Create a new tag
# 4. Run terraform init -upgrade to download the new version
# 5. Run terraform plan
# This takes minutes per iteration instead of seconds
```

## Using Override Files for Source Switching

Terraform override files let you swap module sources without changing the main configuration. This is useful when you want to temporarily use a local version of a remote module.

```hcl
# main.tf - uses remote sources (committed to Git)
module "networking" {
  source = "git::https://github.com/myorg/terraform-modules.git//networking?ref=v2.1.0"

  name       = "staging"
  cidr_block = "10.0.0.0/16"
}
```

```hcl
# override.tf - switches to local source (NOT committed to Git)
# This file overrides the source in main.tf
module "networking" {
  source = "../../modules/networking"
}
```

Add `override.tf` to your `.gitignore` so it never gets committed:

```
# .gitignore
override.tf
*_override.tf
```

After creating the override file, you need to re-initialize:

```bash
# Terraform picks up the override automatically
terraform init
terraform plan
```

## Testing Local Modules

Create a test directory for each module that exercises its features:

```hcl
# modules/networking/tests/main.tf
# This is a minimal configuration to test the networking module

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Use local state for testing
  backend "local" {}
}

provider "aws" {
  region = "us-east-1"
}

module "test" {
  source = "../"

  name       = "test-${random_id.suffix.hex}"
  cidr_block = "10.99.0.0/16"

  availability_zones   = ["us-east-1a", "us-east-1b"]
  public_subnet_cidrs  = ["10.99.1.0/24", "10.99.2.0/24"]
  private_subnet_cidrs = ["10.99.11.0/24", "10.99.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

resource "random_id" "suffix" {
  byte_length = 4
}

# Verify outputs
output "vpc_id" {
  value = module.test.vpc_id
}

output "public_subnet_count" {
  value = length(module.test.public_subnet_ids)
}
```

```bash
# Run the test
cd modules/networking/tests
terraform init
terraform plan
terraform apply -auto-approve

# Verify everything works
terraform output

# Clean up
terraform destroy -auto-approve
```

## Using Terraform Test Framework

Terraform 1.6 introduced a native test framework that works well with local modules:

```hcl
# modules/networking/tests/basic.tftest.hcl

# Variables for the test
variables {
  name       = "test"
  cidr_block = "10.99.0.0/16"
  availability_zones   = ["us-east-1a", "us-east-1b"]
  public_subnet_cidrs  = ["10.99.1.0/24", "10.99.2.0/24"]
  private_subnet_cidrs = ["10.99.11.0/24", "10.99.12.0/24"]
}

# Run a plan-only test
run "verify_vpc_created" {
  command = plan

  assert {
    condition     = aws_vpc.this.cidr_block == "10.99.0.0/16"
    error_message = "VPC CIDR block does not match expected value"
  }
}

run "verify_subnet_count" {
  command = plan

  assert {
    condition     = length(aws_subnet.public) == 2
    error_message = "Expected 2 public subnets"
  }

  assert {
    condition     = length(aws_subnet.private) == 2
    error_message = "Expected 2 private subnets"
  }
}
```

```bash
# Run the tests
cd modules/networking
terraform test
```

## Symlinks for Shared Modules

When working with a monorepo, symlinks can help you share modules across different configurations:

```bash
# Create a symlink to shared modules
cd environments/dev
ln -s ../../modules modules

# Now you can use ./modules/networking as the source
```

However, be cautious with symlinks - they can cause confusion on different operating systems and some CI/CD systems do not handle them well.

## Transitioning from Local to Remote

When your module is ready for release, the transition is straightforward:

```bash
# 1. Push the module to a Git repository
cd modules/networking
git init
git add .
git commit -m "Initial networking module"
git remote add origin git@github.com:myorg/terraform-aws-networking.git
git push -u origin main
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# 2. Update the source in non-dev environments
# In environments/staging/main.tf, change:
#   source = "../../modules/networking"
# To:
#   source = "git::https://github.com/myorg/terraform-aws-networking.git?ref=v1.0.0"

# 3. Re-initialize
cd environments/staging
terraform init
```

## Conclusion

Local modules are the fastest way to develop and test Terraform modules. Use them in your development environment, leverage override files for temporary source switching, and transition to versioned remote sources when the module is ready for production. The development loop of edit-validate-plan-apply takes seconds with local modules, which makes a huge difference when you are iterating on module design.

For related topics, see our posts on [how to use the terraform get command to download modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-terraform-get-command-to-download-modules/view) and [how to version Terraform modules with Git tags](https://oneuptime.com/blog/post/2026-02-23-how-to-version-terraform-modules-with-git-tags/view).
