# How to Use OpenTofu with Existing Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Modules, Infrastructure as Code, Code Reuse

Description: Learn how to use your existing Terraform modules with OpenTofu, including registry modules, private modules, Git-sourced modules, and handling compatibility issues.

---

Terraform modules are one of the most valuable assets in any infrastructure codebase. When migrating to OpenTofu, you do not want to rewrite them. The good news is that OpenTofu is fully compatible with Terraform modules. Public registry modules, private modules, and Git-sourced modules all work with minimal or no changes.

## How Module Compatibility Works

Modules in Terraform are just directories containing `.tf` files. There is nothing Terraform-specific about the module format itself. OpenTofu reads the same HCL syntax, supports the same resource types, and uses the same provider plugins. A module that works with Terraform will work with OpenTofu.

The only potential issues arise from:
- Module source URLs that point to Terraform-specific registries
- Modules that use features added to Terraform after the OpenTofu fork
- Version constraints that reference Terraform-specific version numbers

## Using Registry Modules

Public modules from the Terraform Registry work with OpenTofu out of the box:

```hcl
# This module source works with both Terraform and OpenTofu
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}
```

When you run `tofu init`, OpenTofu resolves registry module sources through its own registry (registry.opentofu.org), which mirrors the vast majority of modules from the Terraform Registry.

```bash
# Initialize and download modules
tofu init

# The output shows module downloads
# Downloading terraform-aws-modules/vpc/aws 5.1.0 for vpc...
```

## Using Git-Sourced Modules

Modules sourced from Git repositories work identically:

```hcl
# HTTPS source
module "networking" {
  source = "git::https://github.com/myorg/terraform-modules.git//networking?ref=v2.1.0"

  vpc_cidr = "10.0.0.0/16"
  environment = "production"
}

# SSH source
module "database" {
  source = "git::ssh://git@github.com/myorg/terraform-modules.git//database?ref=v1.5.0"

  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.large"
}
```

Git modules do not go through any registry. OpenTofu clones the repository directly, which means there are zero compatibility concerns.

## Using Local Modules

Local modules (those referenced by relative path) are completely transparent to the tool:

```hcl
# Local module reference
module "app_server" {
  source = "./modules/app-server"

  instance_type = "t3.large"
  ami_id        = data.aws_ami.ubuntu.id
  subnet_id     = module.vpc.private_subnets[0]
}
```

```bash
# Typical project structure with local modules
tree .
# .
# |-- main.tf
# |-- modules/
# |   |-- app-server/
# |   |   |-- main.tf
# |   |   |-- variables.tf
# |   |   |-- outputs.tf
# |   |-- database/
# |       |-- main.tf
# |       |-- variables.tf
# |       |-- outputs.tf
# |-- variables.tf
# |-- outputs.tf
```

## Using Private Registry Modules

If your organization hosts modules in a private Terraform registry, you need to make sure OpenTofu can access it.

### Private Registry with Terraform Enterprise

If your modules are in Terraform Enterprise, you can still reference them by configuring the CLI:

```hcl
# Module from a private registry
module "compute" {
  source  = "app.terraform.io/my-org/compute/aws"
  version = "3.0.0"

  instance_count = 3
  instance_type  = "t3.large"
}
```

For OpenTofu to access this, configure credentials:

```bash
# Create or edit ~/.terraformrc (OpenTofu reads this too)
cat > ~/.terraformrc << 'EOF'
credentials "app.terraform.io" {
  token = "your-api-token-here"
}
EOF
```

### Using Artifactory or Other Module Registries

If you host modules in JFrog Artifactory or a similar registry:

```hcl
module "networking" {
  source  = "artifactory.mycompany.com/terraform-modules/networking/aws"
  version = "2.0.0"
}
```

Configure the provider installation to point to your registry:

```hcl
# .terraformrc
provider_installation {
  network_mirror {
    url = "https://artifactory.mycompany.com/api/terraform/providers/"
  }
}
```

## Handling Module Compatibility Issues

### Provider Version Constraints

Modules often specify required provider versions. Make sure these constraints are compatible with the provider versions available from the OpenTofu registry:

```hcl
# Inside a module
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0, < 6.0"
    }
  }
}
```

If a module has overly restrictive version constraints, you may need to fork it or contact the maintainer.

### Required Terraform Version

Some modules specify a `required_version` constraint:

```hcl
terraform {
  required_version = ">= 1.3.0"
}
```

OpenTofu recognizes these constraints and maps them to its own version. OpenTofu 1.6.0 reports compatibility with Terraform ~1.6.0, so modules requiring Terraform 1.3+ will work.

However, if a module specifies something like:

```hcl
terraform {
  required_version = ">= 1.7.0"  # Might not match OpenTofu
}
```

You may need to update the constraint or fork the module.

### Features Not Yet in OpenTofu

If a module uses Terraform-specific features added after the fork (like certain import block behaviors), it will not work with OpenTofu:

```bash
# You will see an error during init or plan
# Error: Unsupported block type
# ... or similar syntax errors
```

The fix is to either:
1. Pin the module to an older version that predates the incompatible feature
2. Fork the module and remove or replace the incompatible feature
3. Wait for OpenTofu to implement the feature

## Testing Modules with OpenTofu

Before deploying to production, test your modules work correctly:

```bash
# Create a test configuration
mkdir module-test && cd module-test

cat > main.tf << 'EOF'
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "test-vpc"
  cidr = "10.0.0.0/16"
  azs  = ["us-east-1a"]
  public_subnets = ["10.0.1.0/24"]
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
EOF

# Initialize and validate
tofu init
tofu validate

# Plan (requires AWS credentials)
tofu plan
```

## Updating Module Sources for OpenTofu

If you want to be explicit about using the OpenTofu registry, you can update module sources, but it is not required:

```hcl
# Both of these work in OpenTofu:

# Standard source (recommended - works with both tools)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"
}

# OpenTofu-specific source (optional)
module "vpc" {
  source  = "registry.opentofu.org/terraform-aws-modules/vpc/aws"
  version = "5.1.0"
}
```

Sticking with the standard source format is recommended because it keeps your code compatible with both tools.

## Managing Module Versions

Use a lock file to ensure reproducible module downloads:

```bash
# The .terraform.lock.hcl file tracks provider versions
# Module versions are tracked in .terraform/modules/modules.json

# Update all modules to latest allowed versions
tofu init -upgrade

# This updates module downloads and the lock file
```

## Monorepo Modules with Multiple Stacks

If you have a monorepo with shared modules used across multiple stacks:

```bash
# Project structure
tree .
# .
# |-- modules/              # Shared modules
# |   |-- vpc/
# |   |-- eks/
# |   |-- rds/
# |-- stacks/
# |   |-- production/
# |   |   |-- main.tf      # Uses ../../modules/vpc
# |   |-- staging/
# |       |-- main.tf      # Uses ../../modules/vpc
```

This pattern works identically with OpenTofu. No changes are needed to the module references or the modules themselves.

The module ecosystem is one of OpenTofu's strongest compatibility points with Terraform. For the vast majority of modules, the transition is invisible. Just run `tofu init` and everything works.

For more on configuring OpenTofu, check out [How to Configure OpenTofu Providers](https://oneuptime.com/blog/post/configure-opentofu-providers/view).
