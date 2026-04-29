# How to Manage Hundreds of Resources Efficiently in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Performance, Large Scale, State Management, Infrastructure as Code, Best Practice

Description: Learn practical techniques for managing hundreds of cloud resources in OpenTofu efficiently, including for_each patterns, state partitioning, and targeted operations.

## Introduction

Managing 100+ resources in OpenTofu without deliberate structure leads to fragile configurations, long plan times, and large blast radii. This guide covers the patterns that keep large configurations maintainable and fast.

## Pattern 1: Use for_each Instead of count for Named Resources

```hcl
# AVOID - count index-based naming causes resource churn when items are removed
variable "ci_users_list" {
  type    = list(string)
  default = ["alice", "bob", "charlie"]
}

resource "aws_iam_user" "ci_users_count" {
  count = length(var.ci_users_list)
  name  = var.ci_users_list[count.index]
}

# PREFER - for_each keys are stable; removing one user doesn't shift others
variable "ci_users_set" {
  type    = set(string)
  default = ["alice", "bob", "charlie"]
}

resource "aws_iam_user" "ci_users_each" {
  for_each = var.ci_users_set
  name     = each.key
}
```

## Pattern 2: Centralized Variable Files for Resource Definitions

```hcl
# variables.tf
variable "instances" {
  type = map(object({
    instance_type = string
    subnet        = string
    environment   = string
  }))
  default = {
    "web-prod-1" = { instance_type = "t3.medium", subnet = "private", environment = "prod" }
    "web-prod-2" = { instance_type = "t3.medium", subnet = "private", environment = "prod" }
    "api-prod-1" = { instance_type = "t3.small",  subnet = "private", environment = "prod" }
  }
}

resource "aws_instance" "fleet" {
  for_each      = var.instances
  ami           = data.aws_ami.amazon_linux.id
  instance_type = each.value.instance_type
  subnet_id     = local.subnets[each.value.subnet]
  tags          = { Name = each.key, Environment = each.value.environment }
}
```

## Pattern 3: Use Targeted Operations Sparingly

```bash
# Use targeting only for exceptional cases, such as troubleshooting or recovery
tofu plan -target=aws_instance.fleet
tofu apply -target=aws_instance.fleet

# Apply a whole module when needed
tofu apply -target=module.networking

# Always follow targeted operations with a full plan
tofu plan   # No -target - full configuration
```

## Pattern 4: State Lists for Auditing

```bash
# Count resources by type, including resources inside modules
tofu state list | awk -F. '{
  i = 1
  while ($i == "module") i += 2
  if ($i == "data") i++
  print $i
}' | sort | uniq -c | sort -rn | head -20

# Find all resources of a specific type, including resources inside modules
tofu state list | awk -F. '{
  i = 1
  while ($i == "module") i += 2
  if ($i == "aws_instance") print $0
}'

# Check a specific resource
tofu state show 'aws_instance.fleet["web-prod-1"]'
```

## Pattern 5: Outputs for Cross-Configuration Sharing

```hcl
# Export maps instead of individual outputs for large resource sets
output "instance_ids" {
  value = { for k, v in aws_instance.fleet : k => v.id }
}

output "instance_private_ips" {
  value = { for k, v in aws_instance.fleet : k => v.private_ip }
}
```

## Pattern 6: Use Modules to Group Related Resources

```hcl
# Instead of 50 top-level EC2 resources, group them in a module
module "web_tier" {
  source          = "./modules/ec2-fleet"
  fleet_config    = var.web_instances
  security_groups = [module.security.web_sg_id]
}

module "api_tier" {
  source          = "./modules/ec2-fleet"
  fleet_config    = var.api_instances
  security_groups = [module.security.api_sg_id]
}
```

## Pattern 7: Lifecycle Rules for Stability

```hcl
resource "aws_instance" "fleet" {
  for_each = var.instances

  lifecycle {
    # Ignore AMI changes in OpenTofu and handle image rollouts separately
    ignore_changes = [ami]
    # Create replacement instances before destroying old ones
    create_before_destroy = true
  }
}
```

## Conclusion

Managing hundreds of resources efficiently requires: stable `for_each` keys instead of positional `count`, centralized variable maps for resource definitions, modules for grouping related resources, and targeted operations reserved for exceptional cases. Regular `tofu state list` audits keep state clean and reveal opportunities to further split configurations.
