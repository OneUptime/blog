# How to Use the inputs Block in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Variables, Configuration

Description: A complete guide to the inputs block in Terragrunt covering how to pass variables to Terraform modules, merge inputs from multiple sources, and use dynamic values.

---

The `inputs` block is how you pass variable values from Terragrunt to Terraform. Every key in the `inputs` map becomes a Terraform variable, just as if you had set it in a `terraform.tfvars` file or passed it with `-var`. It is one of the most commonly used blocks in any Terragrunt configuration.

## The Basics

The `inputs` block is a simple key-value map:

```hcl
# live/dev/vpc/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/vpc"
}

# These values are passed as Terraform variables
inputs = {
  vpc_cidr           = "10.0.0.0/16"
  environment        = "dev"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  enable_nat_gateway = true
  single_nat_gateway = true  # save money in dev
}
```

The corresponding Terraform module needs to declare matching variables:

```hcl
# modules/vpc/variables.tf

variable "vpc_cidr" {
  type = string
}

variable "environment" {
  type = string
}

variable "availability_zones" {
  type = list(string)
}

variable "enable_nat_gateway" {
  type = bool
}

variable "single_nat_gateway" {
  type = bool
}
```

Terragrunt converts the `inputs` map to `TF_VAR_*` environment variables internally. So `vpc_cidr = "10.0.0.0/16"` becomes `TF_VAR_vpc_cidr=10.0.0.0/16` when Terraform runs.

## Supported Value Types

The `inputs` block supports all Terraform variable types:

```hcl
inputs = {
  # String
  name = "my-application"

  # Number
  instance_count = 3

  # Boolean
  enable_logging = true

  # List
  subnet_ids = ["subnet-abc123", "subnet-def456"]

  # Map
  tags = {
    Environment = "dev"
    Team        = "platform"
  }

  # Nested object
  database_config = {
    engine         = "postgres"
    engine_version = "15.3"
    instance_class = "db.t3.medium"
    storage_gb     = 50
  }
}
```

## Merging Inputs from Parent and Child

When you use `include`, inputs from the parent and child configurations are merged. The child's values take precedence for overlapping keys.

```hcl
# Root terragrunt.hcl - common inputs for all modules
inputs = {
  aws_region  = "us-east-1"
  project     = "my-project"
  environment = "unknown"  # default, overridden by children
  tags = {
    ManagedBy = "terraform"
    Project   = "my-project"
  }
}
```

```hcl
# live/dev/app/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/app"
}

inputs = {
  environment    = "dev"          # overrides parent's "unknown"
  instance_count = 1
  instance_type  = "t3.small"
}
```

The effective inputs for this module are:

```hcl
# Merged result:
{
  aws_region     = "us-east-1"    # from parent
  project        = "my-project"   # from parent
  environment    = "dev"          # child overrides parent
  tags           = {              # from parent (not deep merged by default)
    ManagedBy = "terraform"
    Project   = "my-project"
  }
  instance_count = 1              # from child
  instance_type  = "t3.small"     # from child
}
```

Note that the merge is shallow by default. The `tags` map from the parent is used as-is because the child did not define a `tags` key. If both parent and child define `tags`, the child's entire `tags` map would replace the parent's.

To get deep merging of nested maps, set the include's `merge_strategy`:

```hcl
include "root" {
  path           = find_in_parent_folders()
  merge_strategy = "deep"
}
```

## Dynamic Inputs with Locals

You can use Terragrunt `locals` to compute values and then reference them in `inputs`:

```hcl
locals {
  # Read the environment config
  env_config = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_config.locals.environment
  account_id  = local.env_config.locals.account_id

  # Compute a name prefix
  name_prefix = "myapp-${local.environment}"
}

terraform {
  source = "../../../modules/ecs"
}

inputs = {
  cluster_name   = "${local.name_prefix}-cluster"
  environment    = local.environment
  account_id     = local.account_id
  log_group_name = "/ecs/${local.name_prefix}"
}
```

This pattern keeps your inputs clean while the computation logic lives in `locals`.

## Inputs from Dependencies

One of the most common patterns is passing outputs from one module as inputs to another:

```hcl
dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
}

dependency "database" {
  config_path = "../rds"
  mock_outputs = {
    endpoint    = "mock.db.example.com"
    db_password = "mock-password"
  }
}

terraform {
  source = "../../../modules/app"
}

inputs = {
  vpc_id            = dependency.vpc.outputs.vpc_id
  subnet_ids        = dependency.vpc.outputs.private_subnet_ids
  database_endpoint = dependency.database.outputs.endpoint
  database_password = dependency.database.outputs.db_password
}
```

## Inputs from Environment Variables

You can pull values from environment variables using the `get_env` function:

```hcl
inputs = {
  # Read from environment variable with a default fallback
  docker_image_tag = get_env("DOCKER_IMAGE_TAG", "latest")
  deploy_user      = get_env("USER", "unknown")

  # Required environment variable (no default means it will error if missing)
  api_key = get_env("API_KEY")
}
```

This is useful in CI/CD pipelines where values like image tags come from the build environment.

## Inputs from Files

You can read values from external files:

```hcl
locals {
  # Read a JSON configuration file
  app_config = jsondecode(file("${get_terragrunt_dir()}/config.json"))

  # Read a YAML configuration file
  secrets_config = yamldecode(file("${get_terragrunt_dir()}/secrets.yaml"))
}

inputs = {
  app_port     = local.app_config.port
  app_replicas = local.app_config.replicas
  db_password  = local.secrets_config.database_password
}
```

## Inputs with Conditional Logic

Terragrunt supports HCL conditional expressions in inputs:

```hcl
locals {
  env_config  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_config.locals.environment
  is_prod     = local.environment == "prod"
}

inputs = {
  # Different values based on environment
  instance_type  = local.is_prod ? "m5.xlarge" : "t3.small"
  instance_count = local.is_prod ? 3 : 1
  multi_az       = local.is_prod ? true : false

  # Enable features only in production
  enable_deletion_protection = local.is_prod
  enable_backup              = local.is_prod
  backup_retention_days      = local.is_prod ? 30 : 7
}
```

## Common Pattern: Layered Inputs

A production setup often layers inputs from multiple sources:

```hcl
# Root terragrunt.hcl - global defaults
inputs = {
  project   = "my-project"
  team      = "platform"
  cost_code = "ENG-001"
}
```

```hcl
# live/dev/env.hcl - environment defaults
locals {
  environment = "dev"
  account_id  = "111111111111"
}
```

```hcl
# live/dev/app/terragrunt.hcl - module-specific inputs

include "root" {
  path           = find_in_parent_folders()
  merge_strategy = "deep"
}

locals {
  env_config  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_config.locals.environment
}

dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id     = "vpc-mock"
    subnet_ids = ["subnet-mock"]
  }
}

terraform {
  source = "../../../modules/app"
}

# Final inputs combine: root defaults + env settings + dependency outputs + module values
inputs = {
  environment = local.environment                    # from env.hcl
  vpc_id      = dependency.vpc.outputs.vpc_id        # from dependency
  subnet_ids  = dependency.vpc.outputs.subnet_ids    # from dependency
  app_name    = "web-api"                            # module-specific
  app_port    = 8080                                 # module-specific
}
```

## Debugging Inputs

To see the final resolved inputs, use `terragrunt render-json`:

```bash
# Show the fully rendered configuration including merged inputs
cd live/dev/app
terragrunt render-json
```

This outputs the complete resolved configuration, making it easy to verify that inputs are being merged correctly.

You can also check what TF_VAR environment variables Terragrunt passes to Terraform:

```bash
# Show all TF_VAR_ environment variables
terragrunt apply 2>&1 | grep TF_VAR
```

## Things to Watch Out For

**Type mismatches**: If your Terraform variable expects a `list(string)` and you pass a single string in inputs, Terraform will error. Make sure types match.

**Unused inputs**: If you pass an input that does not have a corresponding Terraform variable, Terraform will warn about it. This is not fatal, but it is noisy.

**Sensitive values**: Inputs are stored as environment variables during the Terraform run. Be careful with sensitive values - they may show up in process listings. Consider using Terraform's `sensitive` variable flag.

**Shallow merge default**: Remember that parent and child inputs are shallow merged by default. If both define a map, the child's entire map replaces the parent's. Use `merge_strategy = "deep"` on the include block if you need nested merging.

## Conclusion

The `inputs` block is the primary way to pass configuration values from Terragrunt to Terraform. Combined with locals, dependency outputs, environment variables, and parent-child merging, it gives you flexible control over how each module is configured.

Start simple with static values, then layer in dynamic values from dependencies and environment configurations as your project grows. The ability to merge inputs across include levels is what makes Terragrunt configurations composable and DRY.

For more on the functions you can use within inputs, see [How to Use Terragrunt Functions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-functions/view).
