# How to Use Terragrunt with Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Terraform Modules, Infrastructure as Code, DevOps

Description: Learn how to use Terragrunt to manage Terraform modules effectively, covering source configuration, versioning, local development, and module composition patterns.

---

Terraform modules are the building blocks of infrastructure code, and Terragrunt makes working with them significantly easier. Instead of duplicating module calls across environments, Terragrunt lets you reference a module once and pass different inputs per environment. This post covers the different ways to source modules, how to version them, and patterns for composing modules together.

## The Basic Pattern

In plain Terraform, you use a module by calling it in a `.tf` file:

```hcl
# Plain Terraform - you'd copy this for every environment
module "vpc" {
  source = "git::https://github.com/org/modules.git//vpc?ref=v1.2.0"

  vpc_cidr    = "10.0.0.0/16"
  environment = "dev"
  region      = "us-east-1"
}
```

With Terragrunt, the module source goes in `terragrunt.hcl`, and the inputs are separate:

```hcl
# dev/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "git::https://github.com/org/modules.git//vpc?ref=v1.2.0"
}

inputs = {
  vpc_cidr    = "10.0.0.0/16"
  environment = "dev"
  region      = "us-east-1"
}
```

The Terraform module itself doesn't change at all. It still has its `variables.tf`, `main.tf`, and `outputs.tf`. Terragrunt just provides a different way to call it.

## Module Source Types

Terragrunt supports all the same source types as Terraform, plus some extras.

### Git Repository

```hcl
terraform {
  # HTTPS
  source = "git::https://github.com/org/terraform-modules.git//networking/vpc?ref=v2.1.0"

  # SSH
  source = "git::ssh://git@github.com/org/terraform-modules.git//networking/vpc?ref=v2.1.0"

  # Short form for GitHub
  source = "github.com/org/terraform-modules//networking/vpc?ref=v2.1.0"
}
```

### Terraform Registry

```hcl
terraform {
  source = "tfr:///hashicorp/consul/aws?version=0.1.0"
}
```

### Local Path

```hcl
terraform {
  # Relative to the terragrunt.hcl file
  source = "../../modules/vpc"
}
```

### S3 Bucket

```hcl
terraform {
  source = "s3::https://s3-eu-west-1.amazonaws.com/my-modules/vpc.zip"
}
```

## Using Local Modules During Development

When you're actively developing a module, using git references is slow because Terragrunt downloads the source every time. Use local paths instead:

```hcl
# For development - fast, uses local files
terraform {
  source = "${get_repo_root()}/modules/vpc"
}
```

The `get_repo_root()` function returns the root of the git repository, making paths portable across developers' machines.

A common pattern is using a local variable to toggle between local and remote sources:

```hcl
locals {
  # Set to true during development
  use_local_modules = true

  module_source = local.use_local_modules ? (
    "${get_repo_root()}/modules/vpc"
  ) : (
    "git::https://github.com/org/modules.git//vpc?ref=v1.2.0"
  )
}

terraform {
  source = local.module_source
}
```

## Passing Inputs to Modules

Terragrunt's `inputs` block maps directly to Terraform variables:

```hcl
# dev/vpc/terragrunt.hcl
inputs = {
  # These match variable names in the Terraform module
  vpc_cidr         = "10.0.0.0/16"
  environment      = "dev"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  enable_nat_gateway = true
  single_nat_gateway = true    # Save costs in dev

  tags = {
    Team    = "platform"
    Project = "core-infrastructure"
  }
}
```

You can also merge inputs from parent configurations:

```hcl
# root terragrunt.hcl
inputs = {
  # These apply to ALL modules
  managed_by = "terragrunt"
  owner      = "platform-team"
}
```

```hcl
# dev/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

# These merge with root inputs
inputs = {
  vpc_cidr    = "10.0.0.0/16"
  environment = "dev"
}
```

The child's inputs merge with (and override) the root's inputs.

## Module Dependencies

When one module needs outputs from another, use the `dependency` block:

```hcl
# dev/ecs/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../modules/ecs-cluster"
}

# Declare dependencies on other Terragrunt modules
dependency "vpc" {
  config_path = "../vpc"
}

dependency "alb" {
  config_path = "../alb"
}

inputs = {
  # Use outputs from dependencies
  vpc_id          = dependency.vpc.outputs.vpc_id
  private_subnets = dependency.vpc.outputs.private_subnet_ids
  alb_target_group_arn = dependency.alb.outputs.target_group_arn

  cluster_name = "dev-app"
  instance_type = "t3.medium"
}
```

Terragrunt automatically determines the correct apply order based on these dependencies.

## Module Composition with Multiple Includes

Terragrunt supports composing configurations from multiple sources. This is powerful for creating reusable "environment templates":

```hcl
# _envcommon/vpc.hcl - shared VPC configuration template
terraform {
  source = "${get_repo_root()}/modules/vpc"
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

inputs = {
  environment        = local.env_vars.locals.environment
  enable_dns_support = true
  enable_dns_hostnames = true
}
```

```hcl
# dev/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

include "vpc_common" {
  path   = "${get_repo_root()}/_envcommon/vpc.hcl"
  expose = true
}

# Override or add environment-specific inputs
inputs = {
  vpc_cidr           = "10.0.0.0/16"
  single_nat_gateway = true
}
```

```hcl
# prod/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

include "vpc_common" {
  path   = "${get_repo_root()}/_envcommon/vpc.hcl"
  expose = true
}

# Production overrides
inputs = {
  vpc_cidr           = "10.1.0.0/16"
  single_nat_gateway = false    # HA in production
}
```

## Working with Module Outputs

To access outputs from a Terragrunt-managed module in another module, use the `dependency` block as shown above. But you can also read outputs directly:

```bash
# Get outputs from a specific module
cd dev/vpc
terragrunt output

# Get a specific output
terragrunt output vpc_id

# Get outputs as JSON
terragrunt output -json
```

## Wrapping Modules with Extra Files

Sometimes you need to add extra Terraform files to a module without modifying the module itself. Terragrunt's `generate` block handles this:

```hcl
terraform {
  source = "tfr:///terraform-aws-modules/vpc/aws?version=5.0.0"
}

# Add a data source that the module doesn't include
generate "extra_data" {
  path      = "data.tf"
  if_exists = "overwrite"
  contents  = <<EOF
data "aws_availability_zones" "available" {
  state = "available"
}
EOF
}

inputs = {
  azs = ["us-east-1a", "us-east-1b", "us-east-1c"]
  # ...
}
```

## Testing Module Changes

When you update a module, test it in a lower environment first:

```bash
# Plan the module change in dev
cd dev/vpc
terragrunt plan

# If the plan looks good, apply to dev
terragrunt apply

# Then promote to staging
cd ../../staging/vpc
terragrunt plan
terragrunt apply
```

With `run-all`, you can see the impact across all modules that use the updated module:

```bash
# Plan all modules in dev to see cascading effects
cd dev
terragrunt run-all plan
```

## Keeping Modules Small and Focused

A best practice is keeping Terraform modules focused on a single concern. Terragrunt makes this practical by handling the wiring between modules:

```
modules/
  vpc/               # Just VPC, subnets, route tables
  security-groups/   # Just security groups
  rds/               # Just RDS instances
  ecs/               # Just ECS cluster and services
```

Each Terragrunt module references one Terraform module and uses `dependency` blocks to connect them. This gives you fine-grained control over what gets planned and applied, and it makes state files smaller and faster to work with.

## Summary

Terragrunt doesn't replace Terraform modules - it makes them easier to manage across environments. The key patterns are: source modules from git with version tags for production, use local paths during development, wire modules together with `dependency` blocks, and use `include` with shared configuration templates to reduce duplication. For version management strategies, see our [module versioning guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-module-versioning/view).
