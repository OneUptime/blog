# How to Use Terragrunt include for DRY Configuration with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Include, DRY, Configuration Inheritance

Description: Learn how to use Terragrunt include blocks to inherit configuration from parent and shared files, eliminating repetition across hundreds of module configurations.

## Introduction

Terragrunt `include` blocks pull in configuration from other HCL files, merging supported settings such as inputs, generate blocks, and remote_state settings into the current module. Locals are not merged, but they can be referenced from an exposed include. This creates a parent-child hierarchy where shared config lives once at the root and all child modules inherit it automatically.

## Basic include Block

```hcl
# environments/prod/networking/terragrunt.hcl

# Include the root config (backend, provider, common tags)

include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/vpc"
}

inputs = {
  name       = "prod-vpc"
  cidr_block = "10.0.0.0/16"
}
```

The `find_in_parent_folders("root.hcl")` function walks up the directory tree from the current `terragrunt.hcl` file until it finds the first parent `root.hcl` file.

## Multiple includes

```hcl
# environments/prod/services/api/terragrunt.hcl

# Root config: backend + provider
include "root" {
  path = find_in_parent_folders("root.hcl")
}

# Shared ECS service config
include "envcommon" {
  path   = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/ecs-service.hcl"
  expose = true
}

terraform {
  source = "../../../../modules/ecs-service"
}

# Override or extend the envcommon inputs
inputs = merge(
  include.envcommon.inputs,
  {
    service_name  = "api"
    cpu           = 1024
    memory        = 2048
    desired_count = 3
    image         = "123456789012.dkr.ecr.us-east-1.amazonaws.com/api:latest"
  }
)
```

## The expose Attribute

When `expose = true`, the included config's locals, inputs, and other values become accessible via the `include.<label>` reference:

```hcl
include "common" {
  path   = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/rds.hcl"
  expose = true
}

# Access locals from the included config
locals {
  # Use the included config's locals
  db_family = include.common.locals.db_family
}

inputs = merge(
  include.common.inputs,
  {
    # Override specific values
    instance_class = "db.r6g.2xlarge"
  }
)
```

## Shared _envcommon Configuration

```hcl
# _envcommon/rds.hcl
locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  env         = local.env_vars.locals
  db_family   = "postgres15"
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}//modules/database"
}

inputs = {
  engine         = "postgres"
  engine_version = "15.4"
  db_family      = local.db_family
  instance_class = local.env.db_class
  storage_type   = "gp3"
  multi_az       = local.env.environment == "prod"
  backup_retention_period = local.env.environment == "prod" ? 30 : 7
}
```

```hcl
# environments/prod/database/terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "envcommon" {
  path   = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/rds.hcl"
  expose = true
}

# Only override what's different from envcommon defaults
inputs = merge(
  include.envcommon.inputs,
  {
    identifier     = "prod-primary"
    instance_class = "db.r6g.2xlarge"
    allocated_storage = 500
  }
)
```

## Include Merge Strategy

Terragrunt merges included configurations with the following rules:

```hcl
# Parent root.hcl
inputs = {
  environment = "prod"
  tags = { ManagedBy = "OpenTofu" }
}
```

```hcl
# Child terragrunt.hcl
include "root" {
  path   = find_in_parent_folders("root.hcl")
  # merge_strategy defaults to "shallow"
  merge_strategy = "deep"
}

inputs = {
  name = "my-resource"
  # parent's inputs are merged in, child overrides parent
}
```

Available merge strategies:
- `no_merge` - included config is not merged into the child
- `shallow` - child top-level keys override parent (default)
- `deep` - deep recursive merge, child wins on conflicts

## Dynamic include Path

```hcl
# Dynamically select the envcommon file based on a variable
locals {
  env_vars     = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  service_type = local.env_vars.locals.service_type  # "ecs" or "lambda"
}

include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "service_common" {
  path   = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/${local.service_type}-service.hcl"
  expose = true
}
```

## Conclusion

Terragrunt `include` blocks with `_envcommon` patterns enable a two-level DRY hierarchy: root config handles backend and providers once for the entire repo, while envcommon files handle module-type-specific defaults. Child modules only specify what's unique to them, dramatically reducing configuration drift across environments.
