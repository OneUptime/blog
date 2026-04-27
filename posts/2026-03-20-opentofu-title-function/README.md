# How to Use the title Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the title function in OpenTofu to convert strings to title case for display names and human-readable resource labels.

## Introduction

The `title` function in OpenTofu converts a string to title case, capitalizing the first letter of each word. This is useful for generating human-readable display names, labels, and descriptions from lowercase or inconsistently-cased input strings.

## Syntax

```hcl
title(string)
```

- **string** - any string value
- Returns the string with the first letter of each word capitalized
- Other letters are left unchanged (the function does not lowercase the rest of the string)

## Basic Examples

```hcl
output "simple_title" {
  value = title("hello world")         # Returns "Hello World"
}

output "uppercase_input" {
  value = title("HELLO WORLD")         # Returns "HELLO WORLD" (unchanged; first letters are already uppercase)
}

output "mixed_input" {
  value = title("the quick brown fox")  # Returns "The Quick Brown Fox"
}
```

## Practical Use Cases

### Generating Display Names from Slugs

```hcl
variable "service_slug" {
  type    = string
  default = "payment-processing-service"
}

locals {
  # Convert slug to display name
  display_name = title(replace(var.service_slug, "-", " "))
}

output "service_display_name" {
  value = local.display_name  # Returns "Payment Processing Service"
}
```

### Creating Human-Readable Tags

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "team" {
  type    = string
  default = "platform engineering"
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  tags = {
    Name        = "app-server"
    Environment = title(var.environment)  # "Production"
    Team        = title(var.team)         # "Platform Engineering"
    ManagedBy   = "OpenTofu"
  }
}
```

### Formatting Cost Center Names

```hcl
variable "cost_centers" {
  type = list(string)
  default = ["engineering-platform", "data-science", "product-management"]
}

locals {
  formatted_cost_centers = [
    for cc in var.cost_centers :
    title(replace(cc, "-", " "))
  ]
}

output "cost_center_labels" {
  value = local.formatted_cost_centers
  # ["Engineering Platform", "Data Science", "Product Management"]
}
```

### Dashboard and Alert Names

```hcl
variable "service_name" {
  type    = string
  default = "api-gateway"
}

variable "alert_type" {
  type    = string
  default = "high latency"
}

resource "aws_cloudwatch_metric_alarm" "latency" {
  alarm_name        = "${var.service_name}-high-latency"
  alarm_description = "${title(replace(var.service_name, \"-\", \" \"))}: ${title(var.alert_type)} Alert"

  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  statistic           = "Average"
  period              = 60
  threshold           = 1000
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
}
```

## Step-by-Step Usage

1. Identify strings that need human-readable formatting.
2. Optionally clean up separators (`replace(s, "-", " ")` to convert hyphens to spaces).
3. Apply `title()` to capitalize each word.
4. Test in `tofu console`:

```bash
tofu console

> title("hello world")
"Hello World"
> title(replace("my-service-name", "-", " "))
"My Service Name"
```

## Combining with Other Functions

```hcl
locals {
  raw_input     = "  the amazing--service  "
  cleaned       = trimspace(raw_input)
  normalized    = replace(cleaned, "--", " ")
  display_ready = title(normalized)  # "The Amazing Service"
}
```

## title vs lower vs upper

| Function | Input | Output |
|----------|-------|--------|
| `title("hello world")` | Mixed | `"Hello World"` |
| `lower("Hello World")` | Mixed | `"hello world"` |
| `upper("Hello World")` | Mixed | `"HELLO WORLD"` |

## Limitations

The `title` function capitalizes every word, including short words like "a", "an", "the", "of". If you need proper title case (where small words stay lowercase), you would need to implement custom logic using `replace` and explicit exceptions.

## Conclusion

The `title` function is a quick way to generate human-readable, properly capitalized strings from lowercase slugs or identifiers in OpenTofu. It is particularly useful in tag values, display names, alarm descriptions, and any other place where readability matters more than strict casing conventions.
