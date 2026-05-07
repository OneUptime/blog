# How to Avoid Large Monolithic State Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, State Management, Best Practice, Architecture, Infrastructure as Code

Description: Learn how to break up large monolithic OpenTofu state files into smaller, manageable pieces to improve performance, reduce blast radius, and enable team autonomy.

## Introduction

A monolithic state file that manages hundreds or thousands of resources creates several problems: by default, every plan refreshes all resources (slow), and if your backend supports locking, an apply locks the entire state (bottleneck). A single mistake can affect unrelated resources (large blast radius), and different teams cannot work independently. The solution is state decomposition.

## Symptoms of a Monolithic State Problem

```bash
# Signs your state is too large:

# 1. tofu plan takes 10+ minutes
# 2. state file is hundreds of MB
# 3. tofu state list returns thousands of resources
# 4. Teams are blocked waiting for locks
# 5. One team's apply breaks another team's workflow

tofu state list | wc -l
# 2,500 resources - this is too many for one state file
```

## Decomposition Strategy: By Layer

Split state by infrastructure layer - foundational resources change rarely, application resources change often.

```text
Before (monolithic):
prod/
└── main.tf (VPC + K8s + apps + databases + IAM + monitoring)
    terraform.tfstate (5,000 resources)

After (layered):
prod/
├── 1-networking/     # VPC, subnets, routing (rarely changes)
│   └── terraform.tfstate
├── 2-cluster/        # EKS, node groups (changes less often)
│   └── terraform.tfstate
├── 3-databases/      # RDS, ElastiCache (moderate changes)
│   └── terraform.tfstate
└── 4-applications/   # App resources (frequent changes)
    └── terraform.tfstate
```

## Decomposition Strategy: By Team

Give each team ownership of their own state files.

```text
By team:
infrastructure/
├── platform-team/
│   ├── networking/terraform.tfstate
│   ├── cluster/terraform.tfstate
│   └── shared-services/terraform.tfstate
├── app-team/
│   ├── api-service/terraform.tfstate
│   └── frontend/terraform.tfstate
└── data-team/
    ├── data-warehouse/terraform.tfstate
    └── analytics/terraform.tfstate
```

## Sharing Values Between State Files with `terraform_remote_state`

Use the `terraform_remote_state` data source to read root module outputs from other state files.

```hcl
# In applications/main.tf
# Read networking outputs from the networking state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-tofu-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  # Use a private subnet ID from the networking state
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
  # ...
}
```

## Better: Share via SSM Parameters or Outputs

`terraform_remote_state` creates tight coupling. SSM parameters or direct variable injection are more loosely coupled.

```hcl
# In networking state: publish outputs to SSM
resource "aws_ssm_parameter" "private_subnet_ids" {
  name  = "/prod/networking/private-subnet-ids"
  type  = "StringList"
  value = join(",", aws_subnet.private[*].id)
}

# In application state: read from SSM (no state dependency)
data "aws_ssm_parameter" "private_subnet_ids" {
  name = "/prod/networking/private-subnet-ids"
}

resource "aws_instance" "app" {
  subnet_id = split(",", data.aws_ssm_parameter.private_subnet_ids.value)[0]
}
```

## Target Resource Counts

```text
Practical state file size heuristics:
- Under 100 resources: ideal
- 100-500 resources: acceptable
- 500-1000 resources: consider splitting
- Over 1000 resources: split immediately

Splitting boundaries:
- By lifecycle rate (networking changes less often than apps)
- By team ownership
- By risk domain (prod databases vs prod apps)
- By provider (AWS vs Kubernetes resources)
```

## Summary

Large monolithic state files cause slow plans, apply bottlenecks, large blast radii, and team conflicts. Split state by infrastructure layer (networking → cluster → databases → applications) or by team ownership. When possible, use SSM parameters or direct variable injection rather than `terraform_remote_state` to share values between state files - this reduces coupling and allows teams to work independently. As a practical heuristic, keep state files under 500 resources when possible to improve performance and reduce blast radius.
