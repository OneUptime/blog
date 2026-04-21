# How to Split Infrastructure into Smaller Configurations for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Performance, Configuration Split, State Management, Infrastructure as Code, Best Practice

Description: Learn how to split a large monolithic OpenTofu configuration into smaller, independently-managed configurations that plan and apply faster.

## Introduction

A single OpenTofu configuration managing 500+ resources quickly becomes a bottleneck: plans take 20+ minutes, applies carry high risk, and teams step on each other's changes. Splitting along domain boundaries solves all three problems.

## Identifying Split Points

Good split points have these characteristics:
- Resources with the same lifecycle (rarely-changing infrastructure vs frequently-deployed apps)
- Resources owned by the same team
- Resources that don't need frequent coordination with other groups
- Resources with clear input/output contracts

```text
networking/      → VPC, subnets, internet gateways, NAT (changes quarterly)
security/        → Security groups, IAM roles, KMS keys (changes weekly)
data/            → RDS, ElastiCache, S3 buckets (changes monthly)
compute/         → EKS, Auto Scaling Groups (changes weekly)
platform/        → ECS clusters, ALBs (changes weekly)
services/        → ECS tasks, Lambda, App Config (changes daily)
```

## Creating the Directory Structure

```bash
mkdir -p infrastructure/{networking,security,data,compute,platform,services}

# Each directory gets its own backend configuration

for dir in networking security data compute platform services; do
  cat > "infrastructure/$dir/backend.tf" <<EOF
terraform {
  backend "s3" {
    bucket = "my-opentofu-state"
    key    = "${dir}/tofu.tfstate"
    region = "us-east-1"
  }
}
EOF
done
```

## Exporting Data Between Configurations

The `networking` configuration exports its outputs:

```hcl
# networking/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

The `compute` configuration reads them:

```hcl
# compute/main.tf
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-opentofu-state"
    key    = "networking/tofu.tfstate"
    region = "us-east-1"
  }
}

resource "aws_eks_cluster" "main" {
  name     = "prod-eks"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
  }
}
```

## Migrating Resources from a Monolith

```bash
# 1. Identify resources to move from the monolith
cd /path/to/monolith
tofu state list | grep "aws_vpc\|aws_subnet\|aws_route_table"

# 2. Back up the source state and initialize the new config without its remote backend
tofu state pull > /tmp/monolith.tfstate
cd /path/to/infrastructure/networking/
tofu init -backend=false

# 3. Move state entries into a new local state file
tofu state mv \
  -state=/tmp/monolith.tfstate \
  -state-out=./terraform.tfstate \
  aws_vpc.main aws_vpc.main

# 4. Move all networking resources
for resource in aws_subnet.private aws_subnet.public aws_internet_gateway.main; do
  tofu state mv \
    -state=/tmp/monolith.tfstate \
    -state-out=./terraform.tfstate \
    "$resource" "$resource"
done

# 5. Push the updated monolith state and migrate the new local state to S3
cd /path/to/monolith
tofu state push /tmp/monolith.tfstate

cd /path/to/infrastructure/networking/
tofu init -migrate-state

# 6. Verify
tofu state list
tofu plan   # Should show no changes
```

## Performance Impact

| Configuration | Resources | Plan Time Before | Plan Time After |
|---|---|---|---|
| Monolith | 500 | 25 minutes | - |
| networking | 50 | - | 1 minute |
| security | 40 | - | 45 seconds |
| data | 30 | - | 40 seconds |
| compute | 80 | - | 2 minutes |
| platform | 50 | - | 1.5 minutes |
| services | 250 | - | 4 minutes |

## Conclusion

Splitting a monolithic configuration into domain-specific configurations is the most impactful long-term performance improvement for large OpenTofu projects. Use `terraform_remote_state` data sources to share outputs, `tofu state mv` to migrate without destroying resources, and a consistent directory and backend naming convention to keep the split maintainable.
