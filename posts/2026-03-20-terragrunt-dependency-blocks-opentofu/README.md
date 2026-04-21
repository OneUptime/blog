# How to Use Terragrunt dependency Blocks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Dependencies, Dependency blocks, Module Orchestration

Description: Learn how to use Terragrunt dependency blocks to pass outputs between OpenTofu modules and enforce correct deployment order in multi-module environments.

## Introduction

Terragrunt `dependency` blocks let one module consume the outputs of another without using remote state data sources. Terragrunt handles reading the output values and passing them as inputs, and also enforces correct deployment order when using `run --all`.

## Basic Dependency Block

```hcl
# environments/prod/app/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

# Declare a dependency on the networking module
dependency "networking" {
  config_path = "../networking"

  # Mock outputs to enable planning without applying networking first
  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
    public_subnet_ids  = ["subnet-mock-pub-1"]
  }

  # Only use mock outputs if the dependency hasn't been applied
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

terraform {
  source = "../../../modules/ecs-service"
}

inputs = {
  vpc_id     = dependency.networking.outputs.vpc_id
  subnet_ids = dependency.networking.outputs.private_subnet_ids
}
```

## Multiple Dependencies

```hcl
# environments/prod/services/api/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

dependency "networking" {
  config_path = "../../networking"
  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock"]
  }
}

dependency "database" {
  config_path = "../../database"
  mock_outputs = {
    endpoint      = "mock.rds.amazonaws.com"
    database_name = "appdb"
    port          = 5432
  }
}

dependency "cache" {
  config_path = "../../cache"
  mock_outputs = {
    endpoint = "mock.cache.amazonaws.com:6379"
  }
}

terraform {
  source = "../../../../modules/ecs-service"
}

inputs = {
  vpc_id     = dependency.networking.outputs.vpc_id
  subnet_ids = dependency.networking.outputs.private_subnet_ids

  environment_vars = {
    DB_HOST    = dependency.database.outputs.endpoint
    DB_NAME    = dependency.database.outputs.database_name
    CACHE_HOST = dependency.cache.outputs.endpoint
  }
}
```

## Dependency Ordering with run --all

Terragrunt automatically determines and respects dependency order:

```bash
# Terragrunt runs units in the correct order:
# 1. networking (no deps)
# 2. database (depends on networking)
# 3. cache (depends on networking)
# 4. api (depends on networking, database, cache)
# 5. worker (depends on networking, database, cache)

terragrunt run --all --working-dir environments/prod -- apply
```

## Handling Optional Dependencies

```hcl
# Conditionally access dependency output
dependency "monitoring" {
  config_path = "../monitoring"

  # Use a null mock during plan/validate before monitoring has been applied
  mock_outputs = {
    sns_topic_arn = null
  }

  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

inputs = {
  # Only use monitoring SNS topic if it exists
  alarm_actions = compact([try(dependency.monitoring.outputs.sns_topic_arn, null)])
}
```

## Cross-Environment Dependencies

```hcl
# Reference outputs from a different environment
dependency "shared_infrastructure" {
  config_path = "../../../shared/networking"

  mock_outputs = {
    transit_gateway_id = "tgw-mock"
    shared_services_vpc_cidr = "10.100.0.0/16"
  }
}

inputs = {
  transit_gateway_id = dependency.shared_infrastructure.outputs.transit_gateway_id
}
```

## Conclusion

Terragrunt dependency blocks are cleaner than remote state data sources because they don't require knowing the backend configuration of the dependency - Terragrunt handles that automatically from the dependency's `terragrunt.hcl`. Mock outputs enable planning dependent modules even when dependencies haven't been applied yet, which is critical for CI/CD pre-merge validation.
