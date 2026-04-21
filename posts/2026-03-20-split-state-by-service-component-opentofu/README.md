# How to Split State by Service or Component in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, State Management, Microservice, Architecture, Best Practice

Description: Learn how to split OpenTofu state files by service or component to reduce plan time, limit blast radius, and enable parallel deployments across independent infrastructure components.

## Introduction

Large state files are slow to plan, risky to apply, and create contention when multiple teams work concurrently. Splitting state by service or component isolates changes and enables parallel deployment - changes to the networking layer don't block service deployments.

## Component-Based State Structure

```text
infrastructure/
├── prod/
│   ├── networking/       # VPC, subnets, route tables
│   ├── security/         # IAM, security groups, WAF
│   ├── data/             # Databases, caches, message queues
│   ├── services/
│   │   ├── api/          # API service ECS resources
│   │   ├── worker/       # Worker service resources
│   │   └── scheduler/    # Scheduler service resources
│   └── platform/         # ECS/EKS, ECR, service mesh
```

## Backend Configuration Per Component

```hcl
# prod/networking/backend.tf

terraform {
  backend "s3" {
    bucket = "my-company-tofu-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "tofu-state-lock"
  }
}
```

```hcl
# prod/services/api/backend.tf
terraform {
  backend "s3" {
    bucket = "my-company-tofu-state"
    key    = "prod/services/api/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "tofu-state-lock"
  }
}
```

## Cross-Component Data Sharing via Remote State

Services consume networking, security, and platform outputs through remote state data sources:

```hcl
# prod/services/api/main.tf
# Read shared outputs from separate component state files
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-company-tofu-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

data "terraform_remote_state" "platform" {
  backend = "s3"
  config = {
    bucket = "my-company-tofu-state"
    key    = "prod/platform/terraform.tfstate"
    region = "us-east-1"
  }
}

data "terraform_remote_state" "security" {
  backend = "s3"
  config = {
    bucket = "my-company-tofu-state"
    key    = "prod/security/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use networking, security, and platform outputs in the service configuration
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = data.terraform_remote_state.platform.outputs.ecs_cluster_arn
  task_definition = var.task_definition_arn
  desired_count   = var.desired_count

  network_configuration {
    subnets         = data.terraform_remote_state.networking.outputs.private_subnet_ids
    security_groups = [data.terraform_remote_state.security.outputs.api_sg_id]
  }
}
```

## Deployment Order Management

Document and enforce deployment order for initial setup:

```bash
#!/bin/bash
# deploy-prod.sh - Deploy all components in dependency order

set -e

deploy_component() {
  echo "Deploying $1..."
  tofu -chdir="prod/$1" init
  tofu -chdir="prod/$1" apply -auto-approve
}

# Order matters: networking before services
deploy_component "networking"
deploy_component "security"
deploy_component "data"
deploy_component "platform"
deploy_component "services/api"
deploy_component "services/worker"
```

## When to Split State

Guidelines for deciding when to create a new state file:

- **Split by deployment frequency**: Networking changes weekly; services deploy hourly - separate them
- **Split by team ownership**: If different teams manage different components, give them separate state
- **Split by blast radius**: Never put production databases in the same state as frequently-changing services
- **Split by plan time**: If `tofu plan` takes more than 2 minutes, consider splitting

## Conclusion

Component-based state splitting is the next level after environment splitting. The key trade-off is complexity (more state files, more remote state references) versus safety and speed (isolated changes, faster plans). A good rule of thumb: split when two components change at different frequencies, are owned by different teams, or where a misconfigured change in one should never affect the other.
