# How to Optimize Terraform Variable Processing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Performance, Configuration, HCL

Description: Reduce Terraform plan and apply times by optimizing how variables, locals, and expressions are processed in large configurations.

---

Variables in Terraform seem simple, but in large configurations with hundreds of variables, complex local transformations, and deeply nested structures, variable processing can become a meaningful chunk of your plan time. I have seen configurations where poorly structured variable handling added 30+ seconds to every plan.

This post covers how Terraform processes variables internally and what you can do to keep it fast.

## How Terraform Processes Variables

When you run `terraform plan`, Terraform goes through these steps related to variables:

1. **Parse .tfvars files and command-line inputs**: Terraform reads all variable sources and merges them
2. **Evaluate variable defaults and validation**: Default values are applied and validation blocks run
3. **Evaluate locals**: Local values are computed, potentially depending on variables and other locals
4. **Expand expressions in resources**: Resource attributes that reference variables and locals are evaluated

Each of these steps happens before any API calls. For small configurations, this is instant. For large ones with complex transformations, it adds up.

## Avoiding Complex Local Transformations

Locals are evaluated eagerly during planning. If you have locals that do heavy data transformation, they run on every plan:

```hcl
# Slow: Complex transformation on every plan
locals {
  # This flattens and transforms a large nested structure
  all_security_rules = flatten([
    for group_name, group in var.security_groups : [
      for rule in group.rules : {
        group_name = group_name
        type       = rule.type
        from_port  = rule.from_port
        to_port    = rule.to_port
        protocol   = rule.protocol
        cidr       = rule.cidr
      }
    ]
  ])

  # This creates a map from the flattened list
  security_rules_map = {
    for rule in local.all_security_rules :
    "${rule.group_name}-${rule.type}-${rule.from_port}-${rule.protocol}" => rule
  }
}
```

For a small number of security groups, this is fine. But if `var.security_groups` has 100 groups with 20 rules each, you are processing 2,000 items on every plan.

### Optimization: Pre-compute and Simplify

```hcl
# Better: Use a pre-computed map as input
variable "security_rules" {
  description = "Pre-flattened security rules map"
  type = map(object({
    group_name = string
    type       = string
    from_port  = number
    to_port    = number
    protocol   = string
    cidr       = string
  }))
}

# No transformation needed in locals
resource "aws_security_group_rule" "rules" {
  for_each = var.security_rules

  security_group_id = aws_security_group.groups[each.value.group_name].id
  type              = each.value.type
  from_port         = each.value.from_port
  to_port           = each.value.to_port
  protocol          = each.value.protocol
  cidr_blocks       = [each.value.cidr]
}
```

Move the transformation to whatever generates the tfvars file (a script, a CI/CD pipeline step, or a wrapper tool).

## Reducing Variable File Size

Large `.tfvars` files take time to parse. If your tfvars file is several hundred kilobytes, consider:

### Using JSON Instead of HCL for Large Data

Terraform can read `.tfvars.json` files. JSON parsing is faster than HCL parsing for large data structures:

```bash
# Generate tfvars as JSON
python3 generate_vars.py > terraform.tfvars.json
```

```json
{
  "instances": {
    "web-1": {"type": "t3.medium", "subnet": "private-a"},
    "web-2": {"type": "t3.medium", "subnet": "private-b"},
    "api-1": {"type": "t3.large", "subnet": "private-a"}
  }
}
```

### Splitting Large Variables

Instead of one massive variable with everything, split into focused variables:

```hcl
# Instead of one giant variable
variable "everything" {
  type = object({
    networking = object({...})
    compute    = object({...})
    database   = object({...})
  })
}

# Split into separate variables
variable "networking_config" {
  type = object({
    vpc_cidr = string
    subnets  = map(string)
  })
}

variable "compute_config" {
  type = object({
    instances = map(object({
      type   = string
      subnet = string
    }))
  })
}
```

This does not make parsing faster per se, but it makes each project (after state splitting) only load the variables it needs.

## Minimizing Variable Validation Overhead

Variable validation blocks run on every plan. Keep them simple:

```hcl
# Expensive: Complex validation with regex on large strings
variable "config_json" {
  type = string
  validation {
    condition     = can(jsondecode(var.config_json))
    error_message = "Must be valid JSON."
  }
}

# Better: Validate at the input layer, not in Terraform
variable "config" {
  type = map(string)
  # No validation needed - the type constraint handles it
}
```

For variables that require complex validation, consider validating in a pre-processing step outside of Terraform.

## Optimizing for_each with Variables

When using `for_each` with a variable, the entire variable is evaluated to build the instance map. Minimize what goes into `for_each`:

```hcl
# Slow: for_each on a complex object, only using the keys
variable "services" {
  type = map(object({
    image        = string
    cpu          = number
    memory       = number
    port         = number
    health_check = object({...})
    scaling      = object({...})
    # ... many more fields
  }))
}

resource "aws_ecs_service" "services" {
  for_each = var.services  # Entire complex map is processed for indexing
  name     = each.key
  # ...
}
```

```hcl
# Faster approach if you can restructure
# Use a simple map for for_each, reference details separately
variable "service_names" {
  type = set(string)
}

variable "service_configs" {
  type = map(object({
    image  = string
    cpu    = number
    memory = number
  }))
}

resource "aws_ecs_service" "services" {
  for_each = var.service_names  # Simple set, fast indexing
  name     = each.key
  # Reference config from separate variable
  # ...
}
```

## Using Locals Efficiently

### Avoid Redundant Locals

Every local is evaluated on every plan. Remove ones that are not used:

```hcl
locals {
  # Used by multiple resources - good
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Only used once - just inline it
  # vpc_name = "${var.project}-${var.environment}-vpc"
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-vpc"  # Inline instead of a local
  })
}
```

### Avoid Chains of Dependent Locals

Long chains of locals that depend on each other create serial evaluation:

```hcl
locals {
  # Each depends on the previous - evaluated serially
  raw_data    = yamldecode(file("config.yaml"))
  filtered    = { for k, v in local.raw_data : k => v if v.enabled }
  transformed = { for k, v in local.filtered : k => merge(v, { name = k }) }
  final       = { for k, v in local.transformed : k => merge(v, { tags = local.common_tags }) }
}
```

Combine these into fewer steps:

```hcl
locals {
  services = {
    for k, v in yamldecode(file("config.yaml")) : k => merge(v, {
      name = k
      tags = local.common_tags
    }) if v.enabled
  }
}
```

## Measuring Variable Processing Time

Unfortunately, Terraform does not break down timing by phase. But you can estimate variable processing time by comparing plans with and without variables:

```bash
# Full plan (includes variable processing + API calls)
time terraform plan -refresh=false > /dev/null

# Plan with minimal variables (comment out most resources)
# Compare times to estimate variable processing overhead
```

You can also use Terraform's trace logging:

```bash
export TF_LOG=TRACE
terraform plan -refresh=false 2>&1 | grep -i "eval\|variable\|local"
```

## Caching Computed Variables

If variables require computation that does not change between runs, cache the result:

```bash
#!/bin/bash
# generate-vars.sh
# Generate computed variables and cache them

CACHE_FILE=".terraform-vars-cache.json"
CACHE_KEY=$(md5sum config.yaml | cut -d' ' -f1)

if [ -f "$CACHE_FILE" ] && grep -q "$CACHE_KEY" "$CACHE_FILE.key" 2>/dev/null; then
  echo "Using cached variables"
else
  echo "Generating variables..."
  python3 compute_vars.py config.yaml > "$CACHE_FILE"
  echo "$CACHE_KEY" > "$CACHE_FILE.key"
fi

# Use the cached variables
terraform plan -var-file="$CACHE_FILE"
```

## Summary

Variable processing is rarely the biggest bottleneck in Terraform, but for large configurations with complex transformations, it can add meaningful time to every plan. Keep locals simple, avoid unnecessary transformations, use JSON for large variable files, and move complex computation outside of Terraform. These optimizations compound with every plan run across your team.

For monitoring the infrastructure deployed through your Terraform configurations, [OneUptime](https://oneuptime.com) provides real-time observability and alerting across all your cloud resources.
