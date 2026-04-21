# How to Use tofu get to Download Modules - Tofu Download Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Module

Description: Learn how to use tofu get to download and install OpenTofu modules from the registry, GitHub, and other sources without running a full init.

## Introduction

`tofu get` downloads and installs the modules referenced in your OpenTofu configuration. While `tofu init` also installs modules (along with providers and backend setup), `tofu get` is useful when you only need to update modules without reinitializing the entire backend.

## Basic Usage

```bash
# Download all modules referenced in the configuration

tofu get

# Output:
# - networking in .terraform/modules/networking
# - networking.subnets in registry.opentofu.org/terraform-aws-modules/vpc/aws
```

## Module Sources

OpenTofu modules can come from various sources:

### OpenTofu Registry

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"
}
```

### GitHub

```hcl
module "security" {
  source = "github.com/my-org/terraform-modules//security?ref=v2.0.0"
}
```

### Local Path

```hcl
module "networking" {
  source = "./modules/networking"
}
```

### S3 Bucket

```hcl
module "shared" {
  source = "s3::https://s3.amazonaws.com/my-modules/networking.zip"
}
```

## Upgrading Modules

```bash
# Download the latest allowed versions of modules
tofu get -update

# Similar module-upgrade behavior during init; also upgrades providers
tofu init -upgrade
```

## Verifying Module Downloads

```bash
# After tofu get, modules are in .terraform/modules/
ls .terraform/modules/

# View the module manifest to see source metadata and registry module versions
cat .terraform/modules/modules.json | python3 -m json.tool
```

## When tofu get vs tofu init

```bash
# Use tofu get when:
# - You've added a new module and just want to download it
# - You want to update module versions without touching the backend

# Use tofu init when:
# - First time initializing a project
# - Adding or changing providers
# - Changing backend configuration
# - Full initialization is needed
```

## Module Locking

Unlike providers, module versions are not locked in `.terraform.lock.hcl`. Pin module versions explicitly:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.2.0"  # Exact version pin for reproducibility
}
```

## Modules with Authentication

For private module registries:

```bash
# Configure credentials in .terraformrc or .tofurc for the registry hostname
cat > ~/.tofurc << 'EOF'
credentials "app.terraform.io" {
  token = "your-api-token"
}
EOF

tofu get  # Will use the token for matching registry hosts
```

## Conclusion

`tofu get` provides a quick way to download and update modules without a full `tofu init`. Use it during development when iterating on module configurations. For production pipelines, rely on `tofu init` which handles all initialization including modules, providers, and backend configuration in a single command.
