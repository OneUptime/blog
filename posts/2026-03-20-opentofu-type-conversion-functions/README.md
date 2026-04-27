# How to Use Type Conversion Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function, Type

Description: Learn how to use tobool, tonumber, tostring, tolist, tomap, toset, and type functions in OpenTofu for type conversion.

OpenTofu is strongly typed, but its type conversion functions let you explicitly convert between types when needed. The `type()` function helps you inspect what type a value has.

## tobool()

Converts a value to boolean:

```hcl
> tobool("true")
true

> tobool("false")
false

> tobool(true)
true
```

```hcl
variable "enable_logging" {
  type    = string
  default = "true"
}

resource "aws_cloudtrail" "main" {
  enable_logging = tobool(var.enable_logging)
}
```

## tonumber()

Converts a value to a number:

```hcl
> tonumber("42")
42

> tonumber("3.14")
3.14

> tonumber(42)
42
```

```hcl
variable "port" {
  type    = string
  default = "8080"
}

resource "aws_security_group_rule" "app" {
  from_port = tonumber(var.port)
  to_port   = tonumber(var.port)
  protocol  = "tcp"
  type      = "ingress"
  
  security_group_id = aws_security_group.app.id
  cidr_blocks       = ["0.0.0.0/0"]
}
```

## tostring()

Converts a value to a string:

```hcl
> tostring(42)
"42"

> tostring(true)
"true"

> tostring(3.14)
"3.14"
```

```hcl
variable "instance_count" {
  type    = number
  default = 3
}

locals {
  # Tag with numeric value as string
  count_tag = tostring(var.instance_count)
}

resource "aws_autoscaling_group" "app" {
  desired_capacity = var.instance_count
  
  tag {
    key   = "InstanceCount"
    value = local.count_tag
    propagate_at_launch = true
  }
}
```

## tolist()

Converts a set or tuple to a list:

```hcl
> tolist(toset(["c", "a", "b"]))
["a", "b", "c"]  # Sets are sorted when converted to list

> tolist(["x", "y", "z"])
["x", "y", "z"]
```

```hcl
locals {
  unique_regions = toset(var.regions)         # Remove duplicates
  sorted_regions = tolist(local.unique_regions)  # Sorted list
}
```

## tomap()

Converts an object to a map:

```hcl
> tomap({a = "1", b = "2"})
{"a" = "1", "b" = "2"}
```

```hcl
variable "environment_config" {
  type = object({
    cpu    = number
    memory = number
    count  = number
  })
}

locals {
  # Convert object to map for dynamic attribute access
  config_map = tomap(var.environment_config)
}
```

## toset()

Converts a list or tuple to a set (removes duplicates, unordered):

```hcl
> toset(["b", "a", "c", "a", "b"])
toset(["a", "b", "c"])
```

```hcl
variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-a", "subnet-b", "subnet-a"]  # Has duplicate
}

resource "aws_db_subnet_group" "main" {
  subnet_ids = toset(var.subnet_ids)
  # toset removes the duplicate "subnet-a"
}
```

## type()

Returns the type of a value (only available in the `tofu console` command, useful for debugging):

```hcl
> type("hello")
string

> type(42)
number

> type(true)
bool

> type(["a", "b"])
tuple

> type({"key" = "value"})
object

> type(toset(["a", "b"]))
set of string
```

The `type()` function is intended only for debugging in `tofu console` and cannot be used in regular configuration expressions such as `output` blocks.

## Practical: Normalizing Mixed-Type Inputs

```hcl
variable "count_or_string" {
  # May come as "3" or 3 depending on source
  type = any
}

locals {
  safe_count = tonumber(tostring(var.count_or_string))
}
```

## Conclusion

Type conversion functions handle the edges where OpenTofu's type system requires explicit conversions. Use `toset()` to deduplicate lists before `for_each`, `tonumber()` and `tobool()` to normalize string inputs from external data sources, and `type()` during debugging to understand what type a value actually has. Explicit type conversions make your configurations more robust against varied input formats.
