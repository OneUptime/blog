# How to Use the dependency Block in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Dependencies, Module Orchestration

Description: Learn how to use the dependency block in Terragrunt to pass outputs between modules and manage cross-module relationships in your infrastructure.

---

When you break your infrastructure into separate Terraform modules - one for networking, one for databases, one for compute, and so on - those modules often need to reference each other's outputs. The VPC module creates a VPC ID that the ECS module needs. The database module creates a connection string that the application module needs.

In plain Terraform, you handle this with `terraform_remote_state` data sources or by passing values through a CI/CD pipeline. Terragrunt gives you a cleaner mechanism: the `dependency` block.

## What the dependency Block Does

The `dependency` block lets one Terragrunt module read the outputs of another Terragrunt module. When you run `terragrunt apply`, it first ensures the dependency has been applied, reads its outputs, and makes them available as variables in your configuration.

Here is a basic example:

```hcl
# live/dev/app/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

# Declare a dependency on the VPC module
dependency "vpc" {
  config_path = "../vpc"
}

terraform {
  source = "../../../modules/app"
}

inputs = {
  # Use the VPC module's outputs
  vpc_id     = dependency.vpc.outputs.vpc_id
  subnet_ids = dependency.vpc.outputs.private_subnet_ids
}
```

The `config_path` points to the directory containing the dependency's `terragrunt.hcl` file. The path is relative to the current `terragrunt.hcl` file.

After Terragrunt resolves the dependency, you access its outputs through `dependency.<name>.outputs.<output_name>`.

## How It Works Under the Hood

When Terragrunt encounters a `dependency` block, it does the following:

1. Locates the dependency's `terragrunt.hcl` at the specified `config_path`
2. Determines where the dependency's Terraform state is stored
3. Reads the state file to extract outputs
4. Makes those outputs available as `dependency.<name>.outputs`

This means the dependency must have already been applied at least once. If the state file does not exist or the output is missing, Terragrunt will error out (unless you configure mock outputs, which we will cover shortly).

## Multiple Dependencies

You can declare as many dependencies as you need:

```hcl
# live/dev/app/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

# Depend on the VPC module
dependency "vpc" {
  config_path = "../vpc"
}

# Depend on the RDS module
dependency "database" {
  config_path = "../rds"
}

# Depend on the security group module
dependency "sg" {
  config_path = "../security-groups"
}

terraform {
  source = "../../../modules/app"
}

inputs = {
  vpc_id            = dependency.vpc.outputs.vpc_id
  subnet_ids        = dependency.vpc.outputs.private_subnet_ids
  database_endpoint = dependency.database.outputs.endpoint
  database_port     = dependency.database.outputs.port
  security_group_id = dependency.sg.outputs.app_sg_id
}
```

Each dependency is resolved independently, and their outputs are all available in the `inputs` block.

## Mock Outputs

There is a chicken-and-egg problem with dependencies. When you run `terragrunt plan` on a module for the first time, the dependency might not have been applied yet. Without state, there are no outputs to read.

Mock outputs solve this by providing placeholder values for planning:

```hcl
dependency "vpc" {
  config_path = "../vpc"

  # Mock outputs used when the dependency has not been applied yet
  mock_outputs = {
    vpc_id             = "vpc-mock-id"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
}
```

With mocks, `terragrunt plan` works even before the VPC exists. The plan will show the mock values, but that is fine for validation purposes.

You can also control when mocks are used:

```hcl
dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id             = "vpc-mock-id"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }

  # Only allow mocks during plan commands, not apply
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}
```

This ensures that `terragrunt apply` will fail if the dependency has not been applied, rather than silently using mock values.

## Mock Outputs Merge Strategy

If the dependency has been partially applied and only some outputs exist, you can merge mocks with real outputs:

```hcl
dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id             = "vpc-mock-id"
    private_subnet_ids = ["subnet-mock-1"]
    public_subnet_ids  = ["subnet-mock-2"]
  }

  # Merge mock outputs with real outputs
  # Real outputs take precedence over mocks
  mock_outputs_merge_strategy_with_state = "shallow"
}
```

With `shallow` merge, any outputs that exist in the real state will be used, and mocks fill in the gaps.

## Dependency with skip_outputs

Sometimes you need to declare a dependency purely for ordering purposes - you want module A to be applied before module B, but you do not actually need any outputs from A.

```hcl
dependency "iam" {
  config_path  = "../iam-roles"
  skip_outputs = true  # do not bother reading outputs
}
```

With `skip_outputs = true`, Terragrunt will still ensure the dependency is applied first during `run-all` commands, but it will not attempt to read the state file. This is faster and avoids errors when the dependency does not have any relevant outputs.

## Real-World Example: Three-Tier Application

Here is a practical example of a three-tier application with dependencies flowing through the layers.

VPC module (no dependencies):

```hcl
# live/dev/vpc/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/vpc"
}

inputs = {
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
}
```

Database module (depends on VPC):

```hcl
# live/dev/rds/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

terraform {
  source = "../../../modules/rds"
}

inputs = {
  vpc_id     = dependency.vpc.outputs.vpc_id
  subnet_ids = dependency.vpc.outputs.private_subnet_ids
  db_name    = "myapp"
  engine     = "postgres"
}
```

Application module (depends on both VPC and database):

```hcl
# live/dev/app/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

dependency "database" {
  config_path = "../rds"

  mock_outputs = {
    endpoint = "mock-db.example.com:5432"
    port     = 5432
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

terraform {
  source = "../../../modules/app"
}

inputs = {
  vpc_id            = dependency.vpc.outputs.vpc_id
  subnet_ids        = dependency.vpc.outputs.private_subnet_ids
  database_endpoint = dependency.database.outputs.endpoint
  database_port     = dependency.database.outputs.port
}
```

When you run `terragrunt run-all apply` from the `live/dev` directory, Terragrunt will:

1. Apply `vpc` first (no dependencies)
2. Apply `rds` second (depends on `vpc`)
3. Apply `app` third (depends on both `vpc` and `rds`)

## dependency vs dependencies

Do not confuse the `dependency` block with the `dependencies` block. They serve different purposes:

- **dependency** (singular): Reads outputs from another module and makes them available as variables. Also implies execution ordering.
- **dependencies** (plural): Only defines execution ordering without reading outputs.

```hcl
# dependency - reads outputs AND defines ordering
dependency "vpc" {
  config_path = "../vpc"
}
# Can use: dependency.vpc.outputs.vpc_id

# dependencies - only defines ordering
dependencies {
  paths = ["../vpc"]
}
# Cannot read outputs from here
```

Use `dependency` when you need outputs. Use `dependencies` when you only need ordering. For more details, see [How to Use the dependencies Block in Terragrunt](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-dependencies-block-in-terragrunt/view).

## Troubleshooting

**"Could not find output" error**: The output name in `dependency.vpc.outputs.vpc_id` must exactly match the output name defined in the Terraform module. Check your module's `outputs.tf` file.

**State file not found**: The dependency must have been applied at least once. Use mock outputs for initial planning, then apply in the correct order.

**Slow dependency resolution**: Each dependency requires reading a remote state file. If you have many dependencies, consider whether you really need all of them or if some can use `skip_outputs`.

## Conclusion

The `dependency` block is how Terragrunt modules share data. It replaces the need for `terraform_remote_state` data sources and gives you a clean, declarative way to wire outputs from one module into inputs of another. Combined with mock outputs, it works smoothly even during initial project setup when not all modules have been applied yet.

For understanding how dependencies affect execution order in multi-module commands, see [How to Handle Terragrunt Dependencies and Execution Order](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terragrunt-dependencies-and-execution-order/view).
