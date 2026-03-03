# How to Use the dependencies Block in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Dependencies, Execution Order

Description: Learn how to use the dependencies block in Terragrunt to control execution order across modules without needing to pass outputs between them.

---

Terragrunt gives you two ways to define relationships between modules: the `dependency` block (singular) and the `dependencies` block (plural). While they sound similar, they serve different purposes. The `dependencies` block is specifically for controlling execution order when you do not need to pass outputs between modules.

This post explains when and how to use the `dependencies` block effectively.

## What the dependencies Block Does

The `dependencies` block tells Terragrunt that the current module should be applied after certain other modules. It creates an ordering constraint without reading any outputs from those modules.

```hcl
# live/dev/monitoring/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

# Ensure these modules are applied before monitoring
dependencies {
  paths = ["../vpc", "../ecs", "../rds"]
}

terraform {
  source = "../../../modules/monitoring"
}

inputs = {
  # Note: we are NOT using dependency outputs here
  # The monitoring module discovers resources via tags or ARN patterns
  environment = "dev"
  region      = "us-east-1"
}
```

When you run `terragrunt run-all apply`, the monitoring module will not be applied until `vpc`, `ecs`, and `rds` have all completed.

## dependencies vs dependency

Here is the key distinction:

The **dependency** block (singular) does two things:
1. Reads outputs from another module
2. Establishes execution ordering

The **dependencies** block (plural) does one thing:
1. Establishes execution ordering only

```hcl
# Using dependency (singular) - reads outputs AND orders execution
dependency "vpc" {
  config_path = "../vpc"
}

inputs = {
  vpc_id = dependency.vpc.outputs.vpc_id  # can access outputs
}

# Using dependencies (plural) - only orders execution
dependencies {
  paths = ["../vpc"]
}

# Cannot access any outputs from the vpc module here
```

Use `dependencies` when you want to ensure a module exists before another one runs, but you do not need to wire any outputs from it.

## When to Use dependencies

There are several situations where `dependencies` is the right choice over `dependency`:

### 1. Modules That Discover Resources Dynamically

Some Terraform modules use data sources to discover resources by tags, names, or other attributes rather than receiving IDs as inputs:

```hcl
# live/dev/cloudwatch-dashboards/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

# The dashboard module discovers ALBs and ECS services by tags
# It needs them to exist, but does not need their specific IDs
dependencies {
  paths = ["../alb", "../ecs-service"]
}

terraform {
  source = "../../../modules/cloudwatch-dashboards"
}

inputs = {
  environment = "dev"
  # Resources are discovered via aws_lb and aws_ecs_service data sources
}
```

### 2. Ordering Modules That Share an External Resource

Sometimes two modules modify the same external resource (like a Route 53 hosted zone), and you need them applied in sequence to avoid conflicts:

```hcl
# live/dev/dns-app-records/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

# The base DNS module must create the hosted zone first
dependencies {
  paths = ["../dns-base"]
}

terraform {
  source = "../../../modules/dns-app-records"
}

inputs = {
  zone_name   = "dev.example.com"
  app_records = {
    api = "10.0.1.100"
    web = "10.0.1.101"
  }
}
```

### 3. IAM Roles That Must Exist Before Other Resources

IAM roles often need to exist before the resources that use them, even if the resource module looks up the role by name:

```hcl
# live/dev/ecs-service/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

# IAM roles must exist before ECS tries to assume them
dependencies {
  paths = ["../iam-roles"]
}

# We also need VPC outputs for networking
dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    private_subnet_ids = ["subnet-mock"]
  }
}

terraform {
  source = "../../../modules/ecs-service"
}

inputs = {
  subnet_ids    = dependency.vpc.outputs.private_subnet_ids
  # The task role is looked up by name in the module
  task_role_name = "ecs-task-role-dev"
}
```

Notice how this example uses both `dependencies` (for IAM ordering) and `dependency` (for VPC outputs) in the same configuration. They work together naturally.

## Combining dependency and dependencies

You can use both blocks in the same `terragrunt.hcl` file:

```hcl
# live/dev/app/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

# Read outputs from the VPC module
dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock"]
  }
}

# Read outputs from the database module
dependency "database" {
  config_path = "../rds"
  mock_outputs = {
    endpoint = "mock.db.example.com"
  }
}

# These modules must exist, but we do not need their outputs
dependencies {
  paths = [
    "../iam-roles",      # roles must be created first
    "../secrets-manager", # secrets must be stored first
    "../ecr",            # container images must be pushed first
  ]
}

terraform {
  source = "../../../modules/app"
}

inputs = {
  vpc_id            = dependency.vpc.outputs.vpc_id
  subnet_ids        = dependency.vpc.outputs.private_subnet_ids
  database_endpoint = dependency.database.outputs.endpoint
}
```

This gives you a clear separation between modules you need outputs from (use `dependency`) and modules that just need to exist first (use `dependencies`).

## How dependencies Affects run-all Commands

The `dependencies` block primarily matters when you use `run-all` commands like `terragrunt run-all plan` or `terragrunt run-all apply`. Terragrunt builds a dependency graph from all `dependency` and `dependencies` declarations, then executes modules in the correct topological order.

```text
# Example dependency graph for a dev environment:
#
# iam-roles ----+
#               |
# vpc ----------+--> ecs-service --> monitoring
#               |
# rds ----------+
# ecr ----------+
```

Running `terragrunt run-all apply` from the dev directory:

1. `iam-roles`, `vpc`, `rds`, and `ecr` can run in parallel (no dependencies)
2. `ecs-service` runs after all four complete
3. `monitoring` runs after `ecs-service` completes

For destroy operations, the order is reversed:

1. `monitoring` is destroyed first
2. `ecs-service` is destroyed next
3. `iam-roles`, `vpc`, `rds`, and `ecr` are destroyed last (in parallel)

## The paths Parameter

The `paths` parameter takes a list of relative paths to other Terragrunt module directories:

```hcl
dependencies {
  paths = [
    "../vpc",                    # relative to current terragrunt.hcl
    "../rds",
    "../../shared/iam-roles",   # can go up multiple levels
  ]
}
```

Each path must point to a directory containing a `terragrunt.hcl` file. If the directory does not exist or does not contain a Terragrunt configuration, you will get an error.

## Performance Considerations

The `dependencies` block is lighter than `dependency` because it does not need to read any remote state. It simply establishes ordering.

If you have a module that depends on 10 other modules but only needs outputs from 2 of them, use `dependency` for those 2 and `dependencies` for the other 8:

```hcl
# Only read outputs we actually need
dependency "vpc" {
  config_path = "../vpc"
}

dependency "database" {
  config_path = "../rds"
}

# The rest just need ordering
dependencies {
  paths = [
    "../iam-roles",
    "../secrets",
    "../ecr",
    "../s3-buckets",
    "../sns-topics",
    "../sqs-queues",
    "../cloudwatch-alarms",
    "../waf",
  ]
}
```

This avoids 8 unnecessary remote state reads.

## Common Patterns

### Shared Infrastructure First

```hcl
# All application modules depend on shared infrastructure
dependencies {
  paths = [
    "../../shared/vpc",
    "../../shared/iam",
    "../../shared/kms",
  ]
}
```

### Database Before Application

```hcl
# App modules wait for all data stores
dependencies {
  paths = [
    "../rds-primary",
    "../elasticache",
    "../dynamodb-tables",
  ]
}
```

### Destroy Order Safety

```hcl
# Ensure load balancer is destroyed before the target groups
# that reference it are destroyed
dependencies {
  paths = ["../alb"]
}
```

## Conclusion

The `dependencies` block is a simple but important part of Terragrunt's module orchestration. Use it when you need execution ordering without output passing. It keeps your configurations cleaner by avoiding unnecessary `dependency` blocks with `skip_outputs = true`, and it is more performant because it does not read remote state files.

The rule of thumb: if you need outputs from another module, use `dependency`. If you just need that module to exist first, use `dependencies`.

For more on how the execution graph works, see [How to Handle Terragrunt Dependencies and Execution Order](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terragrunt-dependencies-and-execution-order/view).
