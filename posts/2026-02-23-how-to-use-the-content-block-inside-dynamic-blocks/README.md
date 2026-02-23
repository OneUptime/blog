# How to Use the content Block Inside Dynamic Blocks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, HCL, Content Block, Infrastructure as Code

Description: A detailed look at the content block inside Terraform dynamic blocks, including how to access iterator values, handle attributes, and work with nested structures.

---

Every dynamic block in Terraform has a `content` block inside it. This is where you define the attributes and nested blocks that make up each generated block. While the concept is simple, there are several patterns and gotchas worth understanding.

## The Basics of the content Block

The `content` block is the template that gets repeated for each item in the `for_each` collection. Here is the basic structure:

```hcl
resource "aws_security_group" "example" {
  name   = "example"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    # The content block defines what each generated ingress block looks like
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
}
```

The `content` block is mandatory inside every dynamic block. Without it, Terraform does not know what to put inside the generated blocks.

## Accessing Iterator Values

Inside the content block, you access the current item through the iterator. By default, the iterator name matches the dynamic block's label:

```hcl
# For a dynamic block labeled "ingress", the iterator is "ingress"
dynamic "ingress" {
  for_each = var.rules
  content {
    # ingress.key - the key/index of the current item
    # ingress.value - the value of the current item
    from_port = ingress.value.port
  }
}
```

When `for_each` receives a list, `ingress.key` is the numeric index (0, 1, 2...). When it receives a map, `ingress.key` is the map key.

```hcl
variable "rules_map" {
  type = map(object({
    port     = number
    protocol = string
    cidrs    = list(string)
  }))
  default = {
    "https" = { port = 443, protocol = "tcp", cidrs = ["0.0.0.0/0"] }
    "ssh"   = { port = 22,  protocol = "tcp", cidrs = ["10.0.0.0/8"] }
  }
}

resource "aws_security_group" "map_example" {
  name   = "map-example"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.rules_map
    content {
      # ingress.key is "https" or "ssh"
      description = "Rule: ${ingress.key}"
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidrs
    }
  }
}
```

## Using a Custom Iterator Name

When the default iterator name would be confusing - especially with nested dynamic blocks - use the `iterator` argument:

```hcl
dynamic "ingress" {
  for_each = var.rules
  iterator = rule  # Custom iterator name

  content {
    # Now use "rule" instead of "ingress"
    from_port   = rule.value.from_port
    to_port     = rule.value.to_port
    protocol    = rule.value.protocol
    cidr_blocks = rule.value.cidr_blocks
    description = "Rule ${rule.key}"
  }
}
```

This is especially important when nesting dynamic blocks, because the inner block's default iterator might shadow the outer one.

## Static and Dynamic Attributes Together

The content block can mix static (hardcoded) values with dynamic (iterator-derived) values:

```hcl
dynamic "ingress" {
  for_each = var.app_ports
  content {
    # Dynamic attributes from the iterator
    from_port   = ingress.value
    to_port     = ingress.value

    # Static attributes - same for every generated block
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "App port ${ingress.value}"
  }
}
```

This is useful when you only need to vary one or two attributes across the generated blocks.

## Computed Attributes in content

You can use any Terraform expression inside the content block, not just simple references:

```hcl
variable "services" {
  type = list(object({
    name = string
    port = number
    public = bool
  }))
}

dynamic "ingress" {
  for_each = var.services
  content {
    from_port   = ingress.value.port
    to_port     = ingress.value.port
    protocol    = "tcp"

    # Computed: public services get 0.0.0.0/0, private get internal CIDR
    cidr_blocks = ingress.value.public ? ["0.0.0.0/0"] : ["10.0.0.0/8"]

    # Computed: description includes the service name
    description = "${ingress.value.name} (${ingress.value.public ? "public" : "internal"})"
  }
}
```

## Referencing Other Resources Inside content

Content blocks can reference other Terraform resources and data sources:

```hcl
data "aws_subnet" "selected" {
  for_each = toset(var.subnet_names)
  filter {
    name   = "tag:Name"
    values = [each.value]
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  dynamic "network_interface" {
    for_each = var.subnet_names
    content {
      device_index         = network_interface.key
      # Reference a data source using the iterator value
      subnet_id            = data.aws_subnet.selected[network_interface.value].id
      delete_on_termination = true
    }
  }
}
```

## Nested Blocks Inside content

The content block can contain both attributes and nested blocks, including other dynamic blocks:

```hcl
resource "aws_autoscaling_group" "example" {
  name                = "example"
  max_size            = 5
  min_size            = 1
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.example.id
    version = "$Latest"
  }

  # Each tag is a dynamic block
  dynamic "tag" {
    for_each = var.asg_tags
    content {
      key                 = tag.value.key
      value               = tag.value.value
      propagate_at_launch = tag.value.propagate

      # Note: ASG tags do not have nested blocks,
      # but if they did, you could put another dynamic block here
    }
  }
}
```

## Handling Null Values in content

When an iterator value might be null, handle it explicitly to avoid errors:

```hcl
variable "rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = optional(list(string))
    security_groups = optional(list(string))
    description = optional(string)
  }))
}

dynamic "ingress" {
  for_each = var.rules
  content {
    from_port       = ingress.value.port
    to_port         = ingress.value.port
    protocol        = ingress.value.protocol

    # Handle potentially null values
    cidr_blocks     = ingress.value.cidr_blocks != null ? ingress.value.cidr_blocks : []
    security_groups = ingress.value.security_groups != null ? ingress.value.security_groups : []
    description     = coalesce(ingress.value.description, "Managed by Terraform")
  }
}
```

The `coalesce()` function returns the first non-null, non-empty-string argument - useful for providing defaults.

## Empty content Blocks

Some nested blocks in Terraform do not have any attributes. The content block can be empty:

```hcl
# WAF action blocks are often empty
dynamic "allow" {
  for_each = var.action == "allow" ? [1] : []
  content {}  # Empty but required
}
```

The `content {}` is still required syntactically, even though there is nothing inside it.

## Common Mistakes with content Blocks

A few things trip people up regularly:

Forgetting that `content` is required:

```hcl
# WRONG - missing content block
dynamic "ingress" {
  for_each = var.rules
  from_port = ingress.value.port  # This will error
}

# CORRECT
dynamic "ingress" {
  for_each = var.rules
  content {
    from_port = ingress.value.port
  }
}
```

Using `each` instead of the iterator name:

```hcl
# WRONG - "each" is for resource-level for_each, not dynamic blocks
dynamic "ingress" {
  for_each = var.rules
  content {
    from_port = each.value.port  # Error: each is not available here
  }
}

# CORRECT
dynamic "ingress" {
  for_each = var.rules
  content {
    from_port = ingress.value.port  # Use the block label as iterator
  }
}
```

## Summary

The content block is the template inside a dynamic block. It supports all normal Terraform expressions, can reference other resources, and can contain nested blocks including other dynamic blocks. The key things to remember are: always include it (even if empty), use the correct iterator name (block label by default, or the custom name from `iterator`), and handle null values explicitly. For more on iterator usage, see our post on [the iterator argument in dynamic blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-iterator-argument-in-dynamic-blocks/view).
