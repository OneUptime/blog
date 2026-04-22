# How to Share Data Between States Using Remote State in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Remote State, State Management, Data Source, Cross-Stack

Description: Learn how to use terraform_remote_state data sources in OpenTofu to read outputs from one state file and use them as inputs in another, enabling loose coupling between state files.

## Introduction

`terraform_remote_state` lets you read the root module outputs of one OpenTofu state file as a data source in another. This enables loose coupling between infrastructure components - the networking stack exposes VPC IDs and subnet IDs, and all other stacks consume them without tight code dependencies. The consuming stack still needs access to the full source state snapshot, so avoid using this pattern for states that contain sensitive data you do not want shared.

## Defining Outputs for Remote State Consumption

The consuming state reads your root module outputs, so export everything that other stacks might need:

```hcl
# networking/outputs.tf

output "vpc_id" {
  description = "ID of the main VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# Export as an object for easy consumption
output "networking" {
  description = "Complete networking configuration for consumption by other stacks"
  value = {
    vpc_id             = aws_vpc.main.id
    vpc_cidr           = aws_vpc.main.cidr_block
    private_subnet_ids = aws_subnet.private[*].id
    public_subnet_ids  = aws_subnet.public[*].id
    availability_zones = aws_subnet.private[*].availability_zone
  }
}
```

## Reading Remote State in a Consuming Stack

```hcl
# services/api/main.tf
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket  = "my-company-tofu-state"
    key     = "prod/networking/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

data "terraform_remote_state" "data_layer" {
  backend = "s3"
  config = {
    bucket = "my-company-tofu-state"
    key    = "prod/data/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the networking outputs
resource "aws_ecs_task_definition" "api" {
  family       = "api"
  network_mode = "awsvpc"
  container_definitions = jsonencode([{
    name = "api"
    image = "${var.ecr_url}:${var.image_tag}"
    environment = [
      {
        name  = "DB_HOST"
        # Read database endpoint from the data layer state
        value = data.terraform_remote_state.data_layer.outputs.db_endpoint
      }
    ]
  }])
}

resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.api.arn
  network_configuration {
    # Read subnet IDs from networking state
    subnets = data.terraform_remote_state.networking.outputs.private_subnet_ids
  }
}
```

## Helper Variables for Remote State Configs

Avoid repeating backend configs with a locals block:

```hcl
locals {
  state_backend = {
    bucket  = "my-company-tofu-state"
    region  = "us-east-1"
    encrypt = true
  }
}

data "terraform_remote_state" "networking" {
  backend = "s3"
  config  = merge(local.state_backend, {
    key = "${var.environment}/networking/terraform.tfstate"
  })
}

data "terraform_remote_state" "security" {
  backend = "s3"
  config  = merge(local.state_backend, {
    key = "${var.environment}/security/terraform.tfstate"
  })
}
```

## Workspace-Aware Remote State

When using workspaces, select the workspace to read:

```hcl
data "terraform_remote_state" "networking" {
  backend   = "s3"
  workspace = terraform.workspace
  config = {
    bucket = "my-company-tofu-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Conclusion

Remote state is a common mechanism for cross-stack data sharing in OpenTofu. Export rich output objects from foundation stacks (not just individual IDs), use a consistent backend config pattern to avoid repetition, and document what each state file exports in its outputs.tf. For sensitive or separately controlled data, publish values to a dedicated store instead. This creates a self-describing infrastructure where stacks can be composed without reading each other's source code.
