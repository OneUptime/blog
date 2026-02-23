# How to Use the title Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the title function in Terraform to convert strings to title case, with practical examples for display names, tags, and formatted output.

---

When you need to display human-readable names in your cloud resources - dashboard titles, tag values, descriptions, or output messages - title case looks polished and professional. The `title` function in Terraform converts the first letter of each word in a string to uppercase while making the rest lowercase.

## What Does title Do?

The `title` function converts a string to title case. Each word's first character becomes uppercase, and all other characters become lowercase.

```hcl
# Basic syntax
title(string)
```

A "word" is defined as a sequence of characters separated by spaces or other non-letter characters.

## Basic Examples

```hcl
# Simple conversion
> title("hello world")
"Hello World"

# All lowercase input
> title("my terraform project")
"My Terraform Project"

# All uppercase input - converts to title case
> title("MY TERRAFORM PROJECT")
"My Terraform Project"

# Mixed case gets normalized
> title("hELLO wORLD")
"Hello World"

# Single word
> title("terraform")
"Terraform"

# Hyphenated words - each part gets capitalized
> title("us-east-1")
"Us-East-1"
```

Notice that `title` treats hyphens as word boundaries, so each part of a hyphenated string gets capitalized.

## Display-Friendly Tag Values

Use `title` to create readable tag values from variable inputs.

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "team_name" {
  description = "Team that owns this resource"
  type        = string
  default     = "platform engineering"
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  tags = {
    # Display-friendly tags
    Environment = title(var.environment)    # "Production"
    Team        = title(var.team_name)      # "Platform Engineering"
    Name        = title("web application server")  # "Web Application Server"
  }
}
```

## Dashboard and Display Names

CloudWatch dashboards, Grafana panels, and other monitoring tools benefit from properly cased names.

```hcl
variable "service_name" {
  default = "order processing service"
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = replace(var.service_name, " ", "-")
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        properties = {
          # Use title case for the display heading
          markdown = "# ${title(var.service_name)} Dashboard"
          # Result: "# Order Processing Service Dashboard"
        }
      }
    ]
  })
}
```

## Generating Human-Readable Descriptions

When resources need description fields, title case makes them look professional.

```hcl
variable "resources" {
  type = list(object({
    name = string
    type = string
  }))
  default = [
    { name = "web server",       type = "compute" },
    { name = "message queue",    type = "messaging" },
    { name = "data warehouse",   type = "storage" }
  ]
}

locals {
  resource_descriptions = {
    for r in var.resources :
    r.name => "Managed ${title(r.type)} Resource: ${title(r.name)}"
  }
  # {
  #   "web server"     = "Managed Compute Resource: Web Server"
  #   "message queue"  = "Managed Messaging Resource: Message Queue"
  #   "data warehouse" = "Managed Storage Resource: Data Warehouse"
  # }
}
```

## Formatting Output Messages

Make Terraform outputs more polished with title case.

```hcl
variable "project_name" {
  default = "cloud migration project"
}

variable "environment" {
  default = "staging"
}

output "deployment_info" {
  value = <<-EOT
    Project:     ${title(var.project_name)}
    Environment: ${title(var.environment)}
    Status:      ${title("deployment complete")}
    Provider:    ${title("amazon web services")}
  EOT
}

# Output:
#   Project:     Cloud Migration Project
#   Environment: Staging
#   Status:      Deployment Complete
#   Provider:    Amazon Web Services
```

## Combining title with Other Functions

Title case works well in combination with trimming and replacement functions.

```hcl
locals {
  raw_input = "  my-web-application  "

  # Clean up and create display name
  display_name = title(replace(trimspace(local.raw_input), "-", " "))
  # Step 1: trimspace -> "my-web-application"
  # Step 2: replace  -> "my web application"
  # Step 3: title    -> "My Web Application"
}
```

This pattern is great for converting kebab-case identifiers into human-readable display names.

## Converting Identifiers to Display Names

Slug-style or snake_case identifiers often need to be shown in a readable format.

```hcl
variable "service_ids" {
  type    = list(string)
  default = ["user-auth-service", "payment-gateway", "notification-handler", "data-pipeline"]
}

locals {
  # Convert IDs to display names
  service_display_names = {
    for id in var.service_ids :
    id => title(replace(id, "-", " "))
  }
  # {
  #   "user-auth-service"    = "User Auth Service"
  #   "payment-gateway"      = "Payment Gateway"
  #   "notification-handler" = "Notification Handler"
  #   "data-pipeline"        = "Data Pipeline"
  # }
}
```

## SNS Topic Display Names

AWS SNS topics have a display name attribute that benefits from title case.

```hcl
variable "alert_topics" {
  type    = list(string)
  default = ["high cpu usage", "disk space low", "service unavailable", "deployment failed"]
}

resource "aws_sns_topic" "alerts" {
  for_each     = toset(var.alert_topics)
  name         = replace(each.value, " ", "-")
  display_name = title(each.value)
}

# Creates topics like:
# Name: high-cpu-usage,        Display: "High Cpu Usage"
# Name: disk-space-low,        Display: "Disk Space Low"
# Name: service-unavailable,   Display: "Service Unavailable"
# Name: deployment-failed,     Display: "Deployment Failed"
```

## A Word of Caution

The `title` function is purely mechanical - it capitalizes the first letter of every word. It does not understand English grammar, so it will capitalize words like "of", "the", "and", "in" that would normally stay lowercase in proper title case.

```hcl
> title("lord of the rings")
"Lord Of The Rings"

# Grammatically, you might want "Lord of the Rings"
# But title() capitalizes every word boundary
```

If you need grammatically correct title casing, you would need to handle that with more complex logic. For most infrastructure use cases, the simple word-by-word approach is perfectly fine.

## title vs lower vs upper

Here is how the three casing functions compare.

```hcl
locals {
  input = "hello WORLD"

  titled  = title(local.input)  # "Hello World"
  lowered = lower(local.input)  # "hello world"
  uppered = upper(local.input)  # "HELLO WORLD"
}
```

Use `title` for display names and descriptions. Use [lower](https://oneuptime.com/blog/post/2026-02-23-how-to-use-lower-function-in-terraform/view) for resource identifiers. Use [upper](https://oneuptime.com/blog/post/2026-02-23-how-to-use-upper-function-in-terraform/view) for constants and environment variable names.

## Building Notification Messages

When you need to include dynamic values in notification templates.

```hcl
variable "alert_config" {
  type = object({
    severity = string
    service  = string
    region   = string
  })
  default = {
    severity = "critical"
    service  = "payment processing"
    region   = "us-east-1"
  }
}

locals {
  alert_subject = "${title(var.alert_config.severity)} Alert: ${title(var.alert_config.service)} in ${title(var.alert_config.region)}"
  # Result: "Critical Alert: Payment Processing in Us-East-1"
}
```

## Summary

The `title` function is your go-to for making strings presentable in Terraform. It is perfect for tag values, dashboard names, descriptions, display names, and output messages. While it does not handle English grammar rules for articles and prepositions, it covers the vast majority of infrastructure naming needs. Combine it with `replace` and `trimspace` to convert identifiers into clean, readable display names.
