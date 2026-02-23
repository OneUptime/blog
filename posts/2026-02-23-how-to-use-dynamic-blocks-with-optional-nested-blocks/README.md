# How to Use Dynamic Blocks with Optional Nested Blocks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, HCL, Infrastructure as Code, AWS

Description: Learn how to use dynamic blocks in Terraform to handle optional nested blocks that may or may not be present depending on your configuration variables.

---

Terraform's dynamic blocks are one of the most useful features when you need to generate repeated nested blocks inside a resource. But things get interesting when those nested blocks are optional - meaning they should only appear under certain conditions. This post walks through how to handle that situation cleanly.

## The Problem with Optional Nested Blocks

Consider an AWS security group resource. You might want to add ingress rules, but only when certain variables are set. Without dynamic blocks, you would end up writing separate resource definitions for each combination of optional blocks, which gets messy fast.

Here is a simple example of the problem:

```hcl
# This approach does not scale - you end up with many resource copies
resource "aws_security_group" "with_egress" {
  count = var.enable_egress ? 1 : 0
  name  = "my-sg"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

This is not practical when you have several optional nested blocks. Dynamic blocks solve this by letting you conditionally include nested blocks at plan time.

## Using Dynamic Blocks with Conditional for_each

The key insight is that a dynamic block with an empty `for_each` collection produces zero blocks. You can exploit this to make blocks optional.

```hcl
variable "egress_rules" {
  description = "Optional list of egress rules"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = [] # Empty by default - no egress blocks generated
}

resource "aws_security_group" "main" {
  name        = "flexible-sg"
  description = "Security group with optional egress rules"
  vpc_id      = var.vpc_id

  # Ingress is always present
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress is optional - only created if egress_rules is non-empty
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

When `egress_rules` is an empty list, no `egress` blocks are generated at all. When it has entries, each entry becomes one `egress` block.

## Using a Boolean Toggle for Optional Blocks

Sometimes you want a simple on/off switch rather than passing a full list. You can combine a boolean variable with a conditional expression in `for_each`:

```hcl
variable "enable_logging" {
  description = "Whether to enable access logging on the ALB"
  type        = bool
  default     = false
}

variable "logging_bucket" {
  description = "S3 bucket for ALB access logs"
  type        = string
  default     = ""
}

resource "aws_lb" "main" {
  name               = "my-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.subnet_ids

  # The access_logs block is only created when enable_logging is true
  dynamic "access_logs" {
    # If enabled, for_each gets a single-element list; otherwise, empty list
    for_each = var.enable_logging ? [1] : []
    content {
      bucket  = var.logging_bucket
      prefix  = "alb-logs"
      enabled = true
    }
  }
}
```

The trick here is `var.enable_logging ? [1] : []`. When the condition is true, the list `[1]` causes exactly one block to be created. When false, the empty list means no block at all.

## Handling Multiple Optional Nested Blocks

Real-world resources often have several optional nested blocks. Here is an example with an AWS CloudFront distribution that has optional logging and custom error responses:

```hcl
variable "enable_cloudfront_logging" {
  type    = bool
  default = false
}

variable "custom_error_responses" {
  type = list(object({
    error_code         = number
    response_code      = number
    response_page_path = string
  }))
  default = []
}

resource "aws_cloudfront_distribution" "main" {
  enabled = true

  origin {
    domain_name = var.origin_domain
    origin_id   = "primary"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "primary"
    # ... other settings
    viewer_protocol_policy = "redirect-to-https"
  }

  # Optional logging configuration
  dynamic "logging_config" {
    for_each = var.enable_cloudfront_logging ? [1] : []
    content {
      bucket          = var.log_bucket_domain
      include_cookies = false
      prefix          = "cdn/"
    }
  }

  # Optional custom error responses - zero or many
  dynamic "custom_error_response" {
    for_each = var.custom_error_responses
    content {
      error_code         = custom_error_response.value.error_code
      response_code      = custom_error_response.value.response_code
      response_page_path = custom_error_response.value.response_page_path
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

This pattern keeps the resource definition clean and flexible. Each optional block either appears or does not, controlled entirely by input variables.

## Using Optional Attributes Inside Dynamic Blocks

Starting with Terraform 1.3, you can also use optional attributes in your variable type definitions. This pairs well with dynamic blocks:

```hcl
variable "ingress_rules" {
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = optional(list(string), [])
    # description is optional and defaults to null
    description = optional(string)
  }))
}

resource "aws_security_group" "example" {
  name   = "example"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      # description will be null if not provided, which Terraform handles gracefully
      description = ingress.value.description
    }
  }
}
```

The `optional()` function in the type constraint lets callers omit certain fields, and you can provide sensible defaults.

## Wrapping Up

Dynamic blocks with optional nested blocks keep your Terraform configurations flexible without duplicating resource definitions. The core patterns are straightforward:

- Pass an empty list to `for_each` to skip a dynamic block entirely
- Use a ternary like `condition ? [1] : []` for boolean toggles
- Combine `optional()` type attributes with dynamic blocks for maximum flexibility

These techniques let you build reusable modules where consumers can turn features on and off without touching the resource definitions themselves. For more Terraform patterns, check out our post on [how to simplify complex dynamic blocks with locals](https://oneuptime.com/blog/post/2026-02-23-how-to-simplify-complex-dynamic-blocks-with-locals/view).
