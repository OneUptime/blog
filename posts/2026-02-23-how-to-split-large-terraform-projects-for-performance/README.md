# How to Split Large Terraform Projects for Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Performance, State Management, Infrastructure as Code, DevOps

Description: A practical guide to splitting large Terraform projects into smaller, faster components without losing cross-project references.

---

There comes a point in every growing Terraform project where plan and apply times become painful. What used to take 30 seconds now takes 10 minutes. Developers avoid making changes because the feedback loop is too slow. The root cause is almost always the same: too many resources in a single state file.

Splitting a large Terraform project into smaller, focused projects is the most effective way to restore performance. But doing it wrong can create a tangled mess of dependencies. This guide covers how to split projects cleanly.

## When to Split

Not every project needs splitting. Here are signs that yours does:

- `terraform plan` takes more than 2-3 minutes
- Your state file is larger than 10 MB
- You have more than 200-300 resources in a single state
- Different team members work on different parts of the infrastructure but block each other
- A change to a single security group triggers a plan that touches everything

If any of these apply, it is time to split.

## Choosing Split Boundaries

The most important decision is where to draw the lines. Good boundaries follow these principles:

**Split by lifecycle**: Resources that change together should stay together. Your networking layer (VPCs, subnets, route tables) changes rarely. Your application layer (EC2 instances, containers, load balancers) changes frequently. These should be separate projects.

**Split by team ownership**: If one team manages databases and another manages compute, give each team their own Terraform project. This reduces merge conflicts and allows independent deployment.

**Split by blast radius**: Separate critical infrastructure from experimental resources. A mistake in your dev environment project should not risk your production databases.

Here is a typical split for a medium-sized AWS setup:

```text
infrastructure/
  networking/        # VPCs, subnets, route tables, NAT gateways
  security/          # IAM roles, security groups, KMS keys
  data/              # RDS, ElastiCache, S3 buckets
  compute/           # EC2, ECS, Lambda
  monitoring/        # CloudWatch, SNS topics
  dns/               # Route 53 zones and records
```

## Moving Resources Between State Files

Once you have decided on boundaries, you need to move resources from the monolithic state to the new project states. Terraform provides `terraform state mv` for this.

```bash
# Step 1: Pull the current state locally
terraform state pull > monolith.tfstate

# Step 2: Move networking resources to a new state
terraform state mv \
  -state=monolith.tfstate \
  -state-out=networking.tfstate \
  aws_vpc.main aws_vpc.main

terraform state mv \
  -state=monolith.tfstate \
  -state-out=networking.tfstate \
  aws_subnet.private aws_subnet.private

terraform state mv \
  -state=monolith.tfstate \
  -state-out=networking.tfstate \
  aws_subnet.public aws_subnet.public
```

For bulk moves, write a script:

```bash
#!/bin/bash
# move-networking.sh
# Moves all networking resources to the networking state file

RESOURCES=(
  "aws_vpc.main"
  "aws_subnet.private[0]"
  "aws_subnet.private[1]"
  "aws_subnet.public[0]"
  "aws_subnet.public[1]"
  "aws_internet_gateway.main"
  "aws_nat_gateway.main"
  "aws_route_table.private"
  "aws_route_table.public"
)

for resource in "${RESOURCES[@]}"; do
  echo "Moving $resource..."
  terraform state mv \
    -state=monolith.tfstate \
    -state-out=networking.tfstate \
    "$resource" "$resource"
done
```

After moving, push the new state to your backend:

```bash
# In the networking project directory
terraform state push networking.tfstate
```

## Connecting Projects with Remote State

After splitting, projects need to reference each other. The standard way is `terraform_remote_state`:

```hcl
# In compute/main.tf
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]

  vpc_security_group_ids = [
    data.terraform_remote_state.networking.outputs.app_security_group_id
  ]
}
```

In the networking project, you must explicitly export the values other projects need:

```hcl
# In networking/outputs.tf
output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "app_security_group_id" {
  value = aws_security_group.app.id
}
```

## Alternative: Using SSM Parameter Store

`terraform_remote_state` has a drawback: it exposes the entire state of the source project to the consuming project. An alternative is writing outputs to a shared store like AWS SSM Parameter Store:

```hcl
# In networking/ssm.tf
resource "aws_ssm_parameter" "vpc_id" {
  name  = "/terraform/networking/vpc_id"
  type  = "String"
  value = aws_vpc.main.id
}

resource "aws_ssm_parameter" "private_subnet_ids" {
  name  = "/terraform/networking/private_subnet_ids"
  type  = "StringList"
  value = join(",", aws_subnet.private[*].id)
}
```

```hcl
# In compute/data.tf
data "aws_ssm_parameter" "vpc_id" {
  name = "/terraform/networking/vpc_id"
}

data "aws_ssm_parameter" "private_subnet_ids" {
  name = "/terraform/networking/private_subnet_ids"
}

locals {
  vpc_id             = data.aws_ssm_parameter.vpc_id.value
  private_subnet_ids = split(",", data.aws_ssm_parameter.private_subnet_ids.value)
}
```

This approach provides better isolation between projects. Each project only sees the specific values it needs, not the full state.

## Establishing a Dependency Order

When projects depend on each other, you need a clear order for applies:

```text
1. networking (no dependencies)
2. security (depends on networking)
3. data (depends on networking, security)
4. compute (depends on networking, security, data)
5. monitoring (depends on compute)
6. dns (depends on compute)
```

Document this order and enforce it in your CI/CD pipeline:

```yaml
# GitHub Actions workflow
jobs:
  networking:
    runs-on: ubuntu-latest
    steps:
      - run: cd networking && terraform apply -auto-approve

  security:
    needs: networking
    runs-on: ubuntu-latest
    steps:
      - run: cd security && terraform apply -auto-approve

  data:
    needs: [networking, security]
    runs-on: ubuntu-latest
    steps:
      - run: cd data && terraform apply -auto-approve

  compute:
    needs: [networking, security, data]
    runs-on: ubuntu-latest
    steps:
      - run: cd compute && terraform apply -auto-approve
```

## Performance Impact

Here are real numbers from a project I split. The original monolith had about 800 resources:

| Metric | Before Split | After Split (per project) |
|--------|-------------|--------------------------|
| Plan time | 8 minutes | 30-90 seconds |
| Apply time | 15 minutes | 1-3 minutes |
| State file size | 25 MB | 2-5 MB |
| Resources per state | 800 | 80-200 |

The total time to plan all projects sequentially is longer than planning the monolith. But in practice, you rarely need to plan all projects at once. Most changes affect only one project, so the effective feedback loop is much shorter.

## Common Mistakes to Avoid

**Splitting too fine**: Do not create a separate project for every resource. Aim for 5-10 projects, not 50. Too many projects create coordination overhead that outweighs the performance gains.

**Circular dependencies**: If project A needs an output from project B, and project B needs an output from project A, you have a circular dependency. Restructure so dependencies flow in one direction.

**Forgetting to update the monolith**: After moving resources to new states, delete the corresponding configuration from the original project. Otherwise, the next plan on the monolith will try to destroy those resources.

## Summary

Splitting a large Terraform project is the single most impactful thing you can do for performance. Choose boundaries based on lifecycle, ownership, and blast radius. Move resources carefully using `terraform state mv`. Connect projects with remote state or a shared parameter store. The result is faster feedback loops, safer deployments, and happier engineers.

For monitoring the infrastructure you manage across these split Terraform projects, check out [OneUptime](https://oneuptime.com) for unified observability across all your services.
