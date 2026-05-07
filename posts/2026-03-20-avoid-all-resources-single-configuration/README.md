# How to Avoid Putting All Resources in a Single Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Architecture, Best Practice, Module, Infrastructure as Code

Description: Learn how to organize OpenTofu configurations by splitting resources across multiple files, modules, and state files to improve maintainability and team collaboration.

## Introduction

Putting all infrastructure resources in a single `main.tf` file or a single state file is common for beginners, but it creates significant problems at scale. Every plan must process all resources, any change risks unrelated resources, and teams cannot work independently. This post shows how to structure configurations for growth.

## Signs You Need to Split

```text
Warning signs your configuration is too monolithic:
- main.tf is more than 500 lines
- tofu state list returns more than 200 resources
- Plan takes more than 5 minutes
- Changes to one service require reviewing 20+ unrelated resources
- Two team members regularly conflict on the same file
- A single mistake can break unrelated production services
```

## Level 1: Split Into Multiple Files

Start by organizing a single state into logical files.

```text
Before (everything in main.tf):
main.tf  (2000 lines)

After (organized files):
main.tf          # root module entry point and providers
networking.tf    # VPCs, subnets, security groups
compute.tf       # EC2, ECS, Lambda
databases.tf     # RDS, ElastiCache
iam.tf           # IAM roles and policies
dns.tf           # Route53 records
variables.tf     # all input variables
outputs.tf       # all outputs
locals.tf        # shared locals
```

## Level 2: Extract Reusable Modules

Pull patterns used in multiple places into modules.

```text
modules/
├── rds-postgres/        # used in every environment
├── ecs-service/         # used for every service
├── cloudfront-s3/       # used for every static site
└── vpc/                 # used in every environment

environments/
├── dev/main.tf          # uses the modules above
├── staging/main.tf      # uses the modules above
└── prod/main.tf         # uses the modules above
```

```hcl
# environments/prod/main.tf

module "vpc" {
  source = "../../modules/vpc"
  cidr   = "10.0.0.0/16"
}

module "api_service" {
  source = "../../modules/ecs-service"
  name   = "api"
  # ...
}

module "api_database" {
  source = "../../modules/rds-postgres"
  name   = "api-db"
  # ...
}
```

## Level 3: Split State by Infrastructure Layer

Separate long-lived foundational infrastructure from frequently changed application resources.

```text
environments/prod/
├── 1-networking/          # VPC, subnets (changes: monthly)
│   └── terraform.tfstate
├── 2-cluster/             # EKS cluster (changes: quarterly)
│   └── terraform.tfstate
├── 3-shared-services/     # RDS, ElastiCache, etc. (changes: weekly)
│   └── terraform.tfstate
└── 4-applications/        # App deployments (changes: daily)
    └── terraform.tfstate
```

## Level 4: Split State by Team Ownership

Give each team their own state files.

```text
infrastructure/
├── platform/              # Platform team owns
│   ├── networking/
│   ├── kubernetes/
│   └── shared-tooling/
├── app-team/              # Application team owns
│   ├── api-service/
│   ├── frontend/
│   └── worker/
└── data-team/             # Data team owns
    ├── warehouse/
    └── pipelines/
```

## Connecting Split Configurations

Use SSM Parameter Store or similar to share values between configurations.

```hcl
# In networking config: publish outputs
resource "aws_ssm_parameter" "vpc_id" {
  name  = "/infra/prod/networking/vpc-id"
  type  = "String"
  value = aws_vpc.main.id
}

# In application config: consume outputs
data "aws_ssm_parameter" "vpc_id" {
  name = "/infra/prod/networking/vpc-id"
}

resource "aws_security_group" "app" {
  vpc_id = data.aws_ssm_parameter.vpc_id.value
}
```

## Summary

Avoid monolithic configurations by splitting resources first into logical files within a single state, then extracting reusable patterns into modules, then splitting state by infrastructure layer or team ownership. Connect split configurations through SSM parameters or similar loosely coupled mechanisms rather than `terraform_remote_state` (which creates tight coupling). The goal is each configuration having a clear scope of ownership, fitting on one screen, and being independently deployable by a team.
