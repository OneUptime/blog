# How to Handle Complex Dependency Graphs in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Dependencies, Infrastructure as Code, DevOps

Description: Learn how to design, visualize, and manage complex dependency graphs in Terragrunt, including diamond dependencies, cross-environment references, and strategies for avoiding common pitfalls.

---

As your infrastructure grows, the dependency graph between Terragrunt modules becomes more complex. What starts as a simple VPC-to-ECS chain turns into a web of interconnected modules with diamond dependencies, cross-environment references, and ordering constraints that aren't always obvious. Understanding how Terragrunt handles these dependencies - and how to structure them well - is essential for maintaining a large infrastructure codebase.

## How Terragrunt Dependencies Work

Terragrunt has two ways to declare dependencies:

### The dependency Block

Used when you need to reference outputs from another module:

```hcl
# ecs/terragrunt.hcl
dependency "vpc" {
  config_path = "../vpc"
}

inputs = {
  vpc_id     = dependency.vpc.outputs.vpc_id
  subnet_ids = dependency.vpc.outputs.private_subnet_ids
}
```

### The dependencies Block

Used when you need ordering but don't need outputs:

```hcl
# monitoring/terragrunt.hcl
dependencies {
  paths = ["../vpc", "../ecs", "../rds"]
}
```

Both types affect the execution order during `run-all` commands.

## Visualizing the Dependency Graph

Before optimizing, visualize what you have:

```bash
# Print the dependency graph
cd infrastructure/dev
terragrunt graph-dependencies

# Output as DOT format and render to an image
terragrunt graph-dependencies | dot -Tpng -o dependency-graph.png

# Or output as text
terragrunt graph-dependencies --terragrunt-graph-root .
```

This gives you a clear picture of which modules depend on which, and where potential bottlenecks are.

## Diamond Dependencies

A diamond dependency occurs when module D depends on both B and C, which both depend on A:

```
    A (VPC)
   / \
  B   C (ECS, RDS)
   \ /
    D (Application)
```

This is perfectly fine in Terragrunt. It handles diamond dependencies correctly:

```hcl
# vpc/terragrunt.hcl - Module A (no dependencies)
terraform {
  source = "../../modules/vpc"
}

# ecs/terragrunt.hcl - Module B
dependency "vpc" {
  config_path = "../vpc"
}

# rds/terragrunt.hcl - Module C
dependency "vpc" {
  config_path = "../vpc"
}

# app/terragrunt.hcl - Module D
dependency "vpc" {
  config_path = "../vpc"
}
dependency "ecs" {
  config_path = "../ecs"
}
dependency "rds" {
  config_path = "../rds"
}

inputs = {
  vpc_id          = dependency.vpc.outputs.vpc_id
  ecs_cluster_arn = dependency.ecs.outputs.cluster_arn
  db_endpoint     = dependency.rds.outputs.endpoint
}
```

Terragrunt's execution order would be:
1. VPC (no dependencies)
2. ECS and RDS (both depend only on VPC, can run in parallel)
3. Application (waits for ECS and RDS)

## Deep Dependency Chains

Sometimes you have long chains: Network -> Security Groups -> Load Balancer -> ECS -> Application -> Monitoring

```hcl
# Execution order is linear when each module depends on the previous one
# network -> security-groups -> alb -> ecs -> app -> monitoring
```

Long chains are a performance bottleneck because nothing runs in parallel. Break them up where possible:

```
# Before (linear):
network -> security-groups -> alb -> ecs -> app -> monitoring

# After (parallelized where possible):
network -> security-groups -> alb -------> ecs -> app
                          |-> target-groups -^       |
                                                     v
network -> monitoring-vpc-endpoint -> monitoring
```

## Cross-Environment Dependencies

Sometimes a module in one environment depends on something in another:

```hcl
# staging/app/terragrunt.hcl
# The staging app uses the shared-services VPC peering connection
dependency "peering" {
  config_path = "../../shared-services/vpc-peering"
}

inputs = {
  peering_connection_id = dependency.peering.outputs.peering_connection_id
}
```

Be careful with cross-environment dependencies. They create coupling between environments and can cause `run-all` to process more modules than you expect. Use `--terragrunt-ignore-external-dependencies` when you want to run an environment in isolation:

```bash
# Only process modules within dev, ignoring dependencies on shared-services
cd infrastructure/dev
terragrunt run-all plan --terragrunt-ignore-external-dependencies
```

## Avoiding Dependency Cycles

Cycles are the most common dependency graph problem. Terragrunt will fail with an error if it detects a cycle:

```
ERRO[0000] Found a dependency cycle between modules:
  infrastructure/dev/ecs -> infrastructure/dev/rds -> infrastructure/dev/ecs
```

Common causes of cycles:
- Module A creates a security group that module B references, and module B creates an endpoint that module A references
- Mutual DNS dependencies
- IAM roles that reference each other

### Solution: Extract the Shared Resource

```
# Before (cycle):
ecs <-> rds

# After (no cycle):
security-groups -> ecs
security-groups -> rds
```

```hcl
# security-groups/terragrunt.hcl
dependency "vpc" {
  config_path = "../vpc"
}
# Creates security groups for both ECS and RDS

# ecs/terragrunt.hcl
dependency "security_groups" {
  config_path = "../security-groups"
}

# rds/terragrunt.hcl
dependency "security_groups" {
  config_path = "../security-groups"
}
```

### Solution: Use Data Sources Instead of Dependencies

Sometimes you can replace a dependency with a Terraform data source:

```hcl
# Instead of depending on the ECS module for its security group ID,
# look it up with a data source in the RDS module
data "aws_security_group" "ecs" {
  tags = {
    Name = "ecs-cluster-sg"
  }
}
```

This removes the Terragrunt dependency at the cost of a slightly less explicit relationship.

## Dependency-Free Design Patterns

### Pattern 1: Shared Data Module

Create a module that stores configuration as SSM parameters or in a DynamoDB table:

```hcl
# shared-config/main.tf
resource "aws_ssm_parameter" "vpc_id" {
  name  = "/${var.environment}/vpc/id"
  type  = "String"
  value = var.vpc_id
}

# Other modules read from SSM instead of using Terragrunt dependencies
data "aws_ssm_parameter" "vpc_id" {
  name = "/${var.environment}/vpc/id"
}
```

This decouples modules at the Terragrunt level while maintaining the data flow.

### Pattern 2: Output Aggregation

Create a "hub" module that collects outputs from foundational modules:

```hcl
# outputs/terragrunt.hcl
dependency "vpc" {
  config_path = "../vpc"
}
dependency "security_groups" {
  config_path = "../security-groups"
}
dependency "kms" {
  config_path = "../kms"
}

# This module just aggregates outputs
# Other modules depend on this single module instead of many
```

This simplifies the graph from a many-to-many relationship to a hub-and-spoke pattern.

## Performance Optimization for Large Graphs

### Tuning Parallelism

```bash
# Default parallelism processes modules as fast as the graph allows
terragrunt run-all apply

# Limit parallelism if you hit API rate limits
terragrunt run-all apply --terragrunt-parallelism 3
```

### Using Mock Outputs to Speed Up Plans

Mock outputs prevent Terragrunt from running `terraform output` on dependency modules during plan:

```hcl
dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id     = "vpc-mock"
    subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}
```

### Targeting Subgraphs

Instead of running the entire graph, target specific subtrees:

```bash
# Only run modules in the networking layer
terragrunt run-all plan \
  --terragrunt-include-dir "dev/vpc" \
  --terragrunt-include-dir "dev/subnets" \
  --terragrunt-include-dir "dev/security-groups"
```

## Dependency Ordering for Destroy

Destroy operations reverse the dependency order. Module D (which depends on A, B, C) is destroyed first, then B and C, then A. Terragrunt handles this automatically:

```bash
# Destroys in reverse dependency order
terragrunt run-all destroy --terragrunt-non-interactive
```

If you need to destroy a single module that other modules depend on, Terragrunt will warn you. You can force it:

```bash
# Destroy just the VPC (dangerous if other modules reference it)
cd dev/vpc
terragrunt destroy
```

## Documenting Your Dependency Graph

For large projects, maintain documentation alongside your code:

```hcl
# dev/app/terragrunt.hcl

# Dependencies:
# - VPC: network configuration and subnet IDs
# - ECS: cluster ARN for service deployment
# - RDS: database endpoint for connection string
# - ALB: target group for load balancing

dependency "vpc" {
  config_path = "../vpc"
  # ...
}
```

Generate a dependency document automatically:

```bash
#!/bin/bash
# scripts/generate-dependency-docs.sh
echo "# Infrastructure Dependencies"
echo ""
echo '```mermaid'
echo "graph TD"
terragrunt graph-dependencies 2>/dev/null | while read line; do
  echo "  $line"
done
echo '```'
```

## Summary

Complex dependency graphs are manageable when you follow a few principles: visualize the graph regularly, break cycles by extracting shared resources, use mock outputs to speed up plans, and keep the graph as shallow as possible. Diamond dependencies work fine, but deep linear chains should be restructured for parallelism. For more on dependency-related features, see our guides on [mock outputs](https://oneuptime.com/blog/post/2026-02-23-terragrunt-mock-outputs/view) and [selective execution](https://oneuptime.com/blog/post/2026-02-23-terragrunt-skip-flag-selective-execution/view).
