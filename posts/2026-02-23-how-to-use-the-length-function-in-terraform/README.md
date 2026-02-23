# How to Use the length Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the length function in Terraform to count elements in lists, maps, and strings, with practical examples for conditional logic and resource scaling.

---

The `length` function is one of the most frequently used functions in Terraform. It returns the number of elements in a list or map, or the number of characters in a string. This simple operation is the foundation for conditional resource creation, dynamic scaling, validation, and loop control.

This guide covers everything you need to know about `length`, from basic usage to advanced patterns in real-world configurations.

## What is the length Function?

The `length` function returns the size of a collection or the character count of a string.

```hcl
# Works with lists, maps, and strings
length(value)
```

For lists, it returns the number of elements. For maps, it returns the number of key-value pairs. For strings, it returns the number of Unicode characters.

## Basic Usage in Terraform Console

```hcl
# List length
> length(["a", "b", "c"])
3

# Map length
> length({name = "web", type = "t3.micro"})
2

# String length
> length("hello world")
11

# Empty collections
> length([])
0

> length({})
0

> length("")
0

# Nested lists count top-level elements
> length([["a", "b"], ["c"]])
2
```

## Conditional Resource Creation

The most common pattern with `length` is creating resources only when a collection has elements.

```hcl
variable "notification_emails" {
  type    = list(string)
  default = []
}

# Only create the SNS topic if there are email subscribers
resource "aws_sns_topic" "alerts" {
  count = length(var.notification_emails) > 0 ? 1 : 0
  name  = "alert-notifications"
}

# Create a subscription for each email
resource "aws_sns_topic_subscription" "email" {
  count = length(var.notification_emails)

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.notification_emails[count.index]
}
```

## Dynamic Resource Scaling

Use `length` to scale resources based on input list sizes.

```hcl
variable "subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Create one subnet per CIDR block
resource "aws_subnet" "app" {
  count = length(var.subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "app-subnet-${count.index + 1}"
  }
}

output "subnet_count" {
  value = "Created ${length(var.subnet_cidrs)} subnets"
}
```

## Input Validation

The `length` function is essential for validating input constraints.

```hcl
variable "project_name" {
  type        = string
  description = "Project name used for resource naming"

  # Validate string length
  validation {
    condition     = length(var.project_name) >= 3 && length(var.project_name) <= 20
    error_message = "Project name must be between 3 and 20 characters."
  }
}

variable "allowed_cidrs" {
  type        = list(string)
  description = "CIDR blocks for network access"

  # Validate list has at least one element
  validation {
    condition     = length(var.allowed_cidrs) > 0
    error_message = "At least one CIDR block must be provided."
  }

  # Validate list is not too long
  validation {
    condition     = length(var.allowed_cidrs) <= 50
    error_message = "Maximum 50 CIDR blocks allowed."
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"

  # Validate required number of tags
  validation {
    condition     = length(var.tags) >= 2
    error_message = "At least 2 tags must be provided."
  }
}
```

## Calculating CIDR Subnets

Use `length` to dynamically calculate subnet configurations.

```hcl
variable "subnet_names" {
  type    = list(string)
  default = ["web", "app", "db", "cache"]
}

locals {
  # Calculate the number of bits needed based on subnet count
  # For 4 subnets, we need 2 additional bits (2^2 = 4)
  subnet_bits = ceil(log(length(var.subnet_names), 2))

  subnets = {
    for idx, name in var.subnet_names :
    name => cidrsubnet("10.0.0.0/16", local.subnet_bits, idx)
  }
}

output "subnet_allocations" {
  value = local.subnets
  # {
  #   web   = "10.0.0.0/18"
  #   app   = "10.0.64.0/18"
  #   db    = "10.0.128.0/18"
  #   cache = "10.0.192.0/18"
  # }
}
```

## Checking for Empty vs Non-Empty

A frequent pattern is branching based on whether a collection is empty.

```hcl
variable "custom_security_groups" {
  type    = list(string)
  default = []
}

locals {
  has_custom_sgs = length(var.custom_security_groups) > 0
  is_empty       = length(var.custom_security_groups) == 0
}

resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Use custom SGs if provided, otherwise use the default one
  vpc_security_group_ids = local.has_custom_sgs ? var.custom_security_groups : [aws_security_group.default.id]
}
```

## Combining length with Other Functions

The `length` function works well in combination chains.

```hcl
locals {
  raw_list = ["a", "", "b", "", "c", "a"]

  # Count non-empty unique elements
  unique_count = length(distinct(compact(local.raw_list)))
  # compact removes "": ["a", "b", "c", "a"]
  # distinct removes duplicates: ["a", "b", "c"]
  # length counts: 3
}

variable "config_map" {
  type = map(object({
    enabled = bool
    value   = string
  }))
  default = {
    feature_a = { enabled = true, value = "on" }
    feature_b = { enabled = false, value = "off" }
    feature_c = { enabled = true, value = "on" }
  }
}

locals {
  # Count enabled features
  enabled_features = [for k, v in var.config_map : k if v.enabled]
  enabled_count    = length(local.enabled_features)
  # Result: 2
}
```

## Uniqueness Validation

The `length` function combined with `distinct` is the standard way to validate uniqueness.

```hcl
variable "instance_names" {
  type = list(string)

  validation {
    condition     = length(var.instance_names) == length(distinct(var.instance_names))
    error_message = "All instance names must be unique."
  }
}

variable "port_mappings" {
  type = list(object({
    host_port      = number
    container_port = number
  }))

  # Validate no duplicate host ports
  validation {
    condition = (
      length([for p in var.port_mappings : p.host_port]) ==
      length(distinct([for p in var.port_mappings : p.host_port]))
    )
    error_message = "Host ports must be unique across all mappings."
  }
}
```

## Real-World Scenario: Auto-Scaling Configuration

Here is a complete example using `length` for scaling decisions.

```hcl
variable "service_definitions" {
  type = map(object({
    image          = string
    cpu            = number
    memory         = number
    desired_count  = number
    health_check   = string
  }))
}

locals {
  total_services = length(var.service_definitions)

  # Scale the cluster based on total service count
  cluster_instance_count = max(
    3,
    ceil(local.total_services / 2)
  )
}

resource "aws_ecs_cluster" "main" {
  name = "app-cluster"

  setting {
    name  = "containerInsights"
    value = local.total_services > 5 ? "enabled" : "disabled"
  }
}

resource "aws_ecs_service" "services" {
  for_each = var.service_definitions

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.tasks[each.key].arn
  desired_count   = each.value.desired_count
}

output "cluster_summary" {
  value = {
    total_services         = local.total_services
    cluster_instances      = local.cluster_instance_count
    insights_enabled       = local.total_services > 5
  }
}
```

## Edge Cases

A few things to note:

- **Nested lists**: `length` counts only top-level elements. `length([["a", "b"], ["c"]])` is 2, not 3.
- **Null**: `length(null)` causes an error. Always check for null before calling `length` if the input might be null.
- **Strings with Unicode**: `length` counts Unicode characters, not bytes. `length("cafe")` is 4.

```hcl
# Nested list - counts top-level only
> length([["a", "b"], ["c"]])
2

# Use flatten first if you want the total element count
> length(flatten([["a", "b"], ["c"]]))
3
```

## Summary

The `length` function is deceptively simple but incredibly versatile. It sits at the heart of almost every Terraform pattern involving dynamic resource creation, validation, and conditional logic.

Key takeaways:

- Works on lists (element count), maps (key count), and strings (character count)
- Foundation for `count`-based resource creation
- Essential for input validation (min/max constraints, uniqueness)
- Combine with `distinct` for uniqueness checking
- Combine with `compact` and `flatten` for accurate counting after cleanup
- Handles empty collections gracefully (returns 0)

If there is one Terraform function you will use more than any other, it is `length`.
