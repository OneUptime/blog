# How to Avoid Overly Complex Expressions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Best Practice, HCL, Readability, Infrastructure as Code

Description: Learn how to simplify overly complex OpenTofu expressions by breaking them down into named locals and applying the principle of readable code.

## Introduction

OpenTofu's HCL supports sophisticated expressions - nested conditionals, complex for expressions, and chained function calls. While powerful, complex expressions in resource arguments are difficult to read, test, and debug. Breaking them down into named locals is the key to maintainable configurations.

## The Problem: Complex Inline Expressions

Complex expressions embedded directly in resource arguments.

```hcl
# BAD: Nearly impossible to understand at a glance

resource "aws_instance" "web" {
  ami           = data.aws_ami.web.id
  instance_type = var.environment == "prod" ? (var.high_traffic ? "m5.xlarge" : "m5.large") : (var.environment == "staging" ? "t3.large" : "t3.micro")

  subnet_id = element([for s in data.aws_subnet.private : s.id if s.availability_zone == "${var.region}${var.az_letter}"], 0)

  tags = merge(
    {for k, v in var.tags : k => v if !contains(["temporary", "test"], lower(v))},
    {Name = "${var.prefix}-${var.environment}-web-${formatdate("YYYYMMDD", timestamp())}"}
  )
}
```

## The Fix: Extract Logic into Locals

Named locals make each computation readable and debuggable.

```hcl
# GOOD: Each computation has a clear name and purpose
locals {
  # Instance sizing: clear decision tree
  is_production = var.environment == "prod"
  is_staging    = var.environment == "staging"

  instance_type = local.is_production && var.high_traffic ? "m5.xlarge" :
                  local.is_production                      ? "m5.large"  :
                  local.is_staging                         ? "t3.large"  :
                                                             "t3.micro"

  # Subnet selection: clear intent
  target_az     = "${var.region}${var.az_letter}"
  subnet_id     = one([for s in data.aws_subnet.private : s.id
                       if s.availability_zone == local.target_az])

  # Tags: build once, use everywhere
  filtered_tags = {for k, v in var.tags : k => v
                   if !contains(["temporary", "test"], lower(v))}

  resource_name = "${var.prefix}-${var.environment}-web"

  resource_tags = merge(local.filtered_tags, {
    Name = local.resource_name
  })
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.web.id
  instance_type = local.instance_type   # clear: "what instance type"
  subnet_id     = local.subnet_id       # clear: "which subnet"
  tags          = local.resource_tags   # clear: "what tags"
}
```

## Simplifying for Expressions

Complex for expressions deserve their own locals with descriptive names.

```hcl
# BAD: Dense one-liner
resource "aws_security_group_rule" "ingress" {
  for_each    = {for idx, port in var.allowed_ports : tostring(port) => port if port > 0 && port <= 65535}
}

# GOOD: Clear and validated
locals {
  valid_ports = {
    for port in var.allowed_ports :
    tostring(port) => port
    if port > 0 && port <= 65535
  }
}

resource "aws_security_group_rule" "ingress" {
  for_each = local.valid_ports
}
```

## Simplifying Conditional Resources

Use locals to clarify conditional resource creation.

```hcl
# BAD: What does this condition mean?
resource "aws_shield_protection" "main" {
  count = var.environment == "prod" && var.enable_shield && !var.shield_managed_externally ? 1 : 0
}

# GOOD: Named boolean makes the intent clear
locals {
  should_enable_shield = (
    var.environment == "prod" &&
    var.enable_shield &&
    !var.shield_managed_externally
  )
}

resource "aws_shield_protection" "main" {
  count = local.should_enable_shield ? 1 : 0
  # Or with OpenTofu 1.11+:
  # lifecycle {
  #   enabled = local.should_enable_shield
  # }
}
```

## The Rule of Thumb

```text
If an expression is longer than one line, extract it to a local.
If you need to explain an expression in a comment, name it as a local.
If you use the same expression twice, always make it a local.

Good names for locals:
- Describe WHAT the value represents, not HOW it's computed
- Use_underscores_for_readability
- Prefer specificity: "database_subnet_ids" over "subnet_ids"
```

## Summary

Overly complex inline expressions make configurations hard to review, debug, and maintain. Extract complex logic into descriptively named locals. Each local should express a single clear concept - "which instance type," "which subnet," "should this resource be enabled." Named locals also make testing easier because you can check intermediate values with `tofu console`, and the resource block itself reads like a clear declaration of intent rather than a puzzle to decode.
