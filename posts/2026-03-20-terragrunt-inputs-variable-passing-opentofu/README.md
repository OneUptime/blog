# How to Use Terragrunt inputs for Variable Passing with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Input, Variable, DRY Configuration

Description: Learn how to use Terragrunt inputs blocks to pass environment-specific variable values to OpenTofu modules without creating tfvars files in every module directory.

## Introduction

Terragrunt's `inputs` attribute passes values to OpenTofu module variables, eliminating the need for separate `.tfvars` files per environment. Values can come from Terragrunt locals, dependency outputs, environment variables, and function calls.

## Basic inputs Attribute

```hcl
# environments/prod/networking/terragrunt.hcl

include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/vpc"
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  env      = local.env_vars.locals
}

inputs = {
  # Map terragrunt locals to module variables
  name                 = "prod-vpc"
  cidr_block           = local.env.vpc_cidr
  environment          = local.env.environment
  availability_zones   = local.env.availability_zones
  public_subnet_cidrs  = local.env.public_cidrs
  private_subnet_cidrs = local.env.private_cidrs
  enable_nat_gateway   = true
  single_nat_gateway   = false  # HA: one NAT per AZ
}
```

## Inputs from Multiple Sources

```hcl
# environments/prod/services/api/terragrunt.hcl

dependency "networking" {
  config_path = "../../networking"
}

dependency "database" {
  config_path = "../../database"
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  env      = local.env_vars.locals

  # Compute derived values
  image_tag = get_env("IMAGE_TAG", "latest")
  ecr_url   = "${local.env.account_id}.dkr.ecr.${local.env.aws_region}.amazonaws.com"
}

inputs = {
  # Service configuration
  service_name   = "api"
  environment    = local.env.environment
  image          = "${local.ecr_url}/api:${local.image_tag}"
  desired_count  = local.env.environment == "prod" ? 3 : 1

  # From networking dependency
  vpc_id     = dependency.networking.outputs.vpc_id
  subnet_ids = dependency.networking.outputs.private_subnet_ids

  # From database dependency
  db_endpoint = dependency.database.outputs.endpoint
  db_name     = dependency.database.outputs.database_name

  # Computed environment variables for the container
  container_env_vars = {
    ENVIRONMENT = local.env.environment
    DB_HOST     = dependency.database.outputs.endpoint
    DB_PORT     = "5432"
    LOG_LEVEL   = local.env.environment == "prod" ? "INFO" : "DEBUG"
  }
}
```

## Environment-Specific Input Files

Use the `_envcommon` pattern for shared module inputs:

```hcl
# _envcommon/ecs-service.hcl
# Shared inputs applied to all ECS service modules

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

inputs = {
  cluster_name     = "main-${local.env_vars.locals.environment}"
  task_role_arn    = "arn:aws:iam::${local.env_vars.locals.account_id}:role/ecs-task-role"
  execution_role_arn = "arn:aws:iam::${local.env_vars.locals.account_id}:role/ecs-execution-role"
  log_retention_days = local.env_vars.locals.environment == "prod" ? 90 : 14
}
```

```hcl
# environments/prod/services/api/terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}

# Include shared ECS inputs
include "envcommon" {
  path   = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/ecs-service.hcl"
  expose = true
}

# Service-specific inputs override shared ones
inputs = merge(
  include.envcommon.inputs,
  {
    service_name = "api"
    cpu          = 1024
    memory       = 2048
    desired_count = 3
  }
)
```

## Dynamic inputs from External Data

```hcl
# Read inputs from a JSON file for complex configurations
locals {
  service_config = jsondecode(file("${get_terragrunt_dir()}/service-config.json"))
}

inputs = {
  service_name   = local.service_config.name
  container_port = local.service_config.port
  health_check   = local.service_config.health_check
  environment_variables = local.service_config.env_vars
}
```

## Conclusion

Terragrunt `inputs` eliminate the `*.tfvars` file proliferation that comes with managing many environments. By combining locals, dependency outputs, and external data reads, you can construct any variable value without hard-coding it in the module or maintaining separate variable files per directory. The `merge()` pattern with shared envcommon inputs avoids repetition across similar service modules.
