# How to Handle Terraform Plan Complexity Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Planning, Complexity, Performance, Troubleshooting

Description: Diagnose and resolve Terraform plan complexity issues that cause slow planning, excessive changes, and difficult-to-review plan output.

---

Terraform plan complexity goes beyond simple resource count. A plan can be complex because of deep module nesting, heavy use of dynamic blocks, extensive conditional logic, or data transformations that produce cascading changes. When plans become too complex, they are slow to generate, hard to review, and risky to apply.

This post covers how to identify and reduce plan complexity.

## What Makes a Plan Complex

Plan complexity comes from several sources:

1. **Resource count**: More resources means more to refresh, compare, and render
2. **Attribute count**: Resources with many attributes (like IAM policies) generate larger diffs
3. **Cascading changes**: One change triggers many downstream changes
4. **Dynamic blocks**: Generating resource configurations at plan time
5. **Conditional logic**: Complex `count` and `for_each` expressions
6. **Data source evaluation**: Each data source requires API calls during planning

You can get a rough measure of complexity:

```bash
# Count resources
terraform state list | wc -l

# Count data sources
grep -r "^data " *.tf | wc -l

# Count dynamic blocks
grep -r "dynamic" *.tf | wc -l

# Count conditional expressions
grep -rE "count.*\?|for_each.*\?" *.tf | wc -l
```

## Cascading Change Problems

The most frustrating complexity issue is when changing one variable causes Terraform to plan changes for dozens of unrelated resources.

### Example: Shared Tags

```hcl
# Changing this variable affects every resource that uses it
variable "environment" {
  default = "production"
}

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    UpdatedAt   = timestamp()  # Changes EVERY plan!
  }
}
```

The `timestamp()` function returns a new value on every plan, causing every resource that uses `common_tags` to show a change. Fix it:

```hcl
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    # Remove timestamp - use deployment tracking outside of Terraform
  }
}
```

### Example: AMI Changes

```hcl
# This data source returns a different AMI when a new one is published
data "aws_ami" "latest" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-*"]
  }
}

# Every instance using this AMI shows a change
resource "aws_instance" "web" {
  count         = 10
  ami           = data.aws_ami.latest.id
  instance_type = "t3.medium"
}
```

Pin the AMI to avoid unexpected cascading changes:

```hcl
variable "ami_id" {
  default = "ami-0123456789abcdef0"  # Pin to a specific AMI
}
```

## Reducing Dynamic Block Complexity

Dynamic blocks generate resource configuration at plan time. Complex dynamic blocks increase planning time:

```hcl
# Complex: Multiple nested dynamic blocks
resource "aws_security_group" "complex" {
  name_prefix = "complex-"

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }

  dynamic "egress" {
    for_each = var.egress_rules
    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
    }
  }
}
```

If you have 50 ingress rules and 20 egress rules, this generates 70 sub-blocks during planning. For simpler cases, use individual resources:

```hcl
# Simpler: Individual resources for each rule
resource "aws_security_group" "simple" {
  name_prefix = "simple-"
}

resource "aws_security_group_rule" "ingress" {
  for_each = var.ingress_rules

  security_group_id = aws_security_group.simple.id
  type              = "ingress"
  from_port         = each.value.from_port
  to_port           = each.value.to_port
  protocol          = each.value.protocol
  cidr_blocks       = each.value.cidr_blocks
}
```

Each approach has tradeoffs. Dynamic blocks keep everything in one resource but increase plan complexity. Separate resources are simpler individually but increase resource count.

## Simplifying Conditional Logic

Complex conditional expressions make plans harder to predict:

```hcl
# Hard to reason about
resource "aws_instance" "server" {
  count = var.enable_server && var.environment != "dev" ? (var.high_availability ? 3 : 1) : 0

  ami           = var.ami_id
  instance_type = var.environment == "production" ? "t3.large" : (var.environment == "staging" ? "t3.medium" : "t3.small")
}
```

Break it down:

```hcl
locals {
  # Clear, readable conditions
  create_server = var.enable_server && var.environment != "dev"
  server_count  = local.create_server ? (var.high_availability ? 3 : 1) : 0

  instance_types = {
    production = "t3.large"
    staging    = "t3.medium"
    dev        = "t3.small"
  }
}

resource "aws_instance" "server" {
  count = local.server_count

  ami           = var.ami_id
  instance_type = local.instance_types[var.environment]
}
```

This does not change plan performance directly, but it makes the plan output much easier to review, which is a major factor in overall workflow speed.

## Dealing with Large Plan Output

When a plan has hundreds of changes, reviewing it is impractical. Filter the output:

```bash
# Save the plan
terraform plan -out=plan.tfplan -no-color > plan.txt 2>&1

# Count changes by type
echo "Changes summary:"
grep -E "will be (created|updated|destroyed)" plan.txt | \
  sed 's/.*# //' | sed 's/ will be.*//' | \
  sed 's/\[.*\]/[*]/' | sort | uniq -c | sort -rn

# Show only destructive changes
echo "Destructive changes:"
grep "will be destroyed" plan.txt
```

### Using JSON Plan for Analysis

```bash
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan | jq '
  .resource_changes |
  group_by(.change.actions[0]) |
  map({action: .[0].change.actions[0], count: length}) |
  sort_by(-.count)
'
```

Output:

```json
[
  {"action": "no-op", "count": 480},
  {"action": "update", "count": 15},
  {"action": "create", "count": 5}
]
```

This immediately tells you the scope of changes without reading through hundreds of lines.

## Flattening Module Nesting

Deeply nested modules increase plan complexity because each layer adds to the dependency graph:

```text
# Deep nesting - each layer adds overhead
module "app" ->
  module "service" ->
    module "container" ->
      module "networking" ->
        resource "aws_lb"
```

Flatten to reduce depth:

```text
# Flatter structure - faster planning
module "app_service"
module "app_container"
module "app_networking"
```

## Plan Complexity Metrics

Track these metrics to monitor plan complexity over time:

```bash
#!/bin/bash
# plan-complexity.sh

terraform plan -out=plan.tfplan -no-color > /dev/null 2>&1

# Extract metrics from JSON plan
terraform show -json plan.tfplan > plan.json

total=$(cat plan.json | jq '.resource_changes | length')
creates=$(cat plan.json | jq '[.resource_changes[] | select(.change.actions == ["create"])] | length')
updates=$(cat plan.json | jq '[.resource_changes[] | select(.change.actions == ["update"])] | length')
deletes=$(cat plan.json | jq '[.resource_changes[] | select(.change.actions == ["delete"])] | length')
noops=$(cat plan.json | jq '[.resource_changes[] | select(.change.actions == ["no-op"])] | length')

echo "Plan Complexity Report"
echo "====================="
echo "Total resources: $total"
echo "Creates: $creates"
echo "Updates: $updates"
echo "Deletes: $deletes"
echo "No-ops: $noops"
echo "Change ratio: $(( (creates + updates + deletes) * 100 / total ))%"

rm plan.json plan.tfplan
```

If the change ratio is high when you have made a small code change, you likely have a cascading change problem.

## Summary

Plan complexity issues manifest as slow plans, excessive changes, and unreadable output. The key strategies for reducing complexity are: eliminate cascading changes by removing dynamic values from shared variables, simplify conditional logic with clear locals, flatten module nesting, pin data source values, and use JSON plan output for analysis. Reducing plan complexity makes your Terraform workflow faster and your changes safer.

For monitoring the infrastructure behind your Terraform plans, [OneUptime](https://oneuptime.com) provides real-time observability and alerting that helps you understand the impact of infrastructure changes.
