# How to Set Up Terraform Documentation Standards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Documentation, Best Practices, Team Collaboration, Infrastructure as Code

Description: Create Terraform documentation standards that keep infrastructure knowledge accessible and up to date as your team and codebase grow over time.

---

Terraform code without documentation is a ticking time bomb. Today, the engineer who wrote it understands every nuance. Six months from now, when that engineer is on a different team or has left the company, everyone else is left guessing why the database has a specific instance size or why the security group allows traffic from a mysterious CIDR block.

Documentation standards ensure that Terraform code carries its context with it. When done right, documentation answers the questions that code alone cannot: why was this decision made, what are the constraints, and how should this be operated?

## What Needs Documentation

Terraform documentation spans several levels:

1. Inline code comments explaining decisions
2. Variable and output descriptions
3. Module README files
4. Architecture decision records
5. Operational runbooks
6. State and dependency diagrams

Each level serves a different audience and purpose.

## Inline Code Documentation Standards

Comments in Terraform should explain why, not what. The code already shows what is happening:

```hcl
# BAD: Restating the code
# Create a t3.large instance
resource "aws_instance" "api" {
  instance_type = "t3.large"
}

# GOOD: Explaining the reasoning
# t3.large selected based on load testing results from PERF-2024-Q4.
# The API service requires 8GB RAM for in-memory caching.
# Revisit if caching moves to ElastiCache (planned Q2 2026).
resource "aws_instance" "api" {
  instance_type = "t3.large"
}
```

Define when comments are required:

```hcl
# Comment Standards:
# 1. ALWAYS comment non-obvious configuration choices

# Using gp3 instead of gp2: 20% cost reduction at same IOPS.
# Benchmarked in INFRA-4521.
resource "aws_ebs_volume" "data" {
  type = "gp3"
  size = 500
  iops = 3000  # Default baseline, sufficient for current workload
}

# 2. ALWAYS comment security-related decisions

# Port 8443 exposed for internal mTLS communication only.
# External traffic is blocked by the ALB security group.
# Approved in security review SEC-2025-089.
resource "aws_security_group_rule" "internal_tls" {
  type        = "ingress"
  from_port   = 8443
  to_port     = 8443
  protocol    = "tcp"
  cidr_blocks = ["10.0.0.0/8"]
  security_group_id = aws_security_group.app.id
}

# 3. ALWAYS comment workarounds and temporary configurations

# WORKAROUND: Force new deployment when task definition changes.
# This is needed because the ECS service does not detect task
# definition updates automatically with the current provider version.
# Remove when upgrading to AWS provider >= 5.35.
# Tracking: INFRA-5678
resource "aws_ecs_service" "api" {
  force_new_deployment = true
  # ...
}

# 4. ALWAYS comment resource dependencies that are not obvious

# This depends on the NAT gateway being available, which itself
# depends on the EIP. Terraform handles this through the implicit
# dependency chain: route_table -> nat_gateway -> eip.
resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}
```

## Variable and Output Documentation

Every variable and output must have a meaningful description:

```hcl
# Variable documentation standards

# BAD: Unhelpful description
variable "size" {
  type        = number
  description = "The size."
}

# GOOD: Describes purpose, constraints, and impact
variable "database_storage_gb" {
  type        = number
  description = "Allocated storage for the RDS instance in gigabytes. Minimum 20GB for production workloads. Storage auto-scaling is enabled and will expand up to 2x this value. Cost: approximately $0.115/GB/month for gp3."
  default     = 100

  validation {
    condition     = var.database_storage_gb >= 20
    error_message = "Database storage must be at least 20GB for production workloads."
  }
}

# Output documentation standards

# BAD: Generic description
output "endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "The endpoint."
}

# GOOD: Describes format and usage
output "database_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "The connection endpoint for the RDS instance in host:port format. Use this value in application database connection strings. Example: mydb.abc123.us-east-1.rds.amazonaws.com:5432"
}
```

## Module README Standards

Every module needs a comprehensive README. Use terraform-docs to generate part of it automatically:

```markdown
# Networking Module

## Overview
Creates a VPC with public and private subnets across multiple
availability zones, along with NAT gateways, route tables, and
VPC flow logs.

## Architecture
This module creates the following resources:
- 1 VPC
- N public subnets (one per AZ)
- N private subnets (one per AZ)
- N NAT gateways (one per AZ for high availability)
- Internet gateway
- Route tables for public and private subnets
- VPC flow logs to CloudWatch

## Usage

### Basic Example
```hcl
module "networking" {
  source = "./modules/networking"

  vpc_cidr          = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  environment       = "production"
  name_prefix       = "myapp"
}
```

### With Custom Subnet Sizing
```hcl
module "networking" {
  source = "./modules/networking"

  vpc_cidr              = "10.0.0.0/16"
  public_subnet_cidrs   = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs  = ["10.0.10.0/24", "10.0.11.0/24"]
  environment           = "production"
  name_prefix           = "myapp"
}
```

## Requirements
| Name | Version |
|------|---------|
| terraform | >= 1.7.0 |
| aws | ~> 5.31.0 |

## Inputs
<!-- Generated by terraform-docs -->

## Outputs
<!-- Generated by terraform-docs -->

## Known Limitations
- NAT gateways are created per AZ; for cost savings in
  non-production, set `single_nat_gateway = true`
- VPC peering is not managed by this module; use the
  vpc-peering module instead

## Related Modules
- [vpc-peering](../vpc-peering) - Manages VPC peering connections
- [transit-gateway](../transit-gateway) - Manages transit gateway
```text

### Automating README Generation

```yaml
# .github/workflows/docs.yml
name: Generate Documentation

on:
  pull_request:
    paths:
      - 'modules/**'

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate terraform-docs
        uses: terraform-docs/gh-actions@v1.2.0
        with:
          working-dir: modules/
          output-file: README.md
          output-method: inject
          git-push: true
```

## Architecture Decision Records

For significant infrastructure decisions, maintain ADRs:

```markdown
# ADR-003: Use Multi-AZ NAT Gateways in Production

## Status
Accepted

## Context
We need to decide whether to use a single NAT gateway or
one per availability zone for our production VPC.

## Decision
We will use one NAT gateway per AZ in production environments.
Non-production environments will use a single NAT gateway to
save costs.

## Consequences
- Production: Higher availability, approximately $100/month
  additional cost per AZ
- Staging/Dev: Single point of failure for outbound internet
  access, but acceptable given lower SLA requirements
- Implementation: The networking module's `single_nat_gateway`
  variable controls this behavior

## References
- AWS documentation on NAT gateway high availability
- Cost analysis: INFRA-3456
```

Store ADRs alongside the Terraform code they relate to:

```text
modules/
  networking/
    docs/
      adr/
        001-vpc-cidr-allocation.md
        002-flow-log-retention.md
        003-multi-az-nat-gateways.md
    main.tf
    variables.tf
    outputs.tf
    README.md
```

## Enforcing Documentation Standards

Create automated checks that prevent undocumented code from being merged:

```yaml
# .github/workflows/doc-check.yml
name: Documentation Check

on:
  pull_request:
    paths:
      - 'modules/**'
      - 'environments/**'

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Variable Descriptions
        run: |
          # Find variables without descriptions
          MISSING=$(grep -rn 'variable "' modules/ | while read line; do
            file=$(echo "$line" | cut -d: -f1)
            # Check if description exists in the variable block
            var_name=$(echo "$line" | grep -oP 'variable "\K[^"]+')
            if ! grep -A5 "variable \"$var_name\"" "$file" | grep -q 'description'; then
              echo "$file: variable $var_name missing description"
            fi
          done)

          if [ -n "$MISSING" ]; then
            echo "Variables missing descriptions:"
            echo "$MISSING"
            exit 1
          fi

      - name: Check Module READMEs
        run: |
          for module_dir in modules/*/; do
            if [ ! -f "$module_dir/README.md" ]; then
              echo "Missing README.md in $module_dir"
              exit 1
            fi
          done
```

## Keeping Documentation Current

Documentation rots faster than code. Build processes to keep it fresh:

1. Include documentation updates in your PR checklist
2. Run quarterly documentation reviews alongside code reviews
3. Use terraform-docs to auto-generate interface documentation
4. Link documentation to tickets and ADRs so context is preserved

For more on sharing Terraform knowledge across your organization, see our guide on [handling Terraform knowledge sharing in teams](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-knowledge-sharing-in-teams/view).

Good documentation is an investment that pays compound interest. Every hour spent documenting a decision today saves multiple hours of investigation later. Set clear standards, automate what you can, and make documentation a first-class part of your Terraform development process.
