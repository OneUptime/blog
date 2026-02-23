# How to Use the templatestring Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps, Templates

Description: Learn how to use the templatestring function in Terraform to render inline template strings with variables, with practical examples for dynamic configuration generation.

---

The `templatestring` function was introduced in Terraform 1.7 and lets you render a template string with a set of variables, all inline - without needing an external file. If you have used `templatefile` before, think of `templatestring` as its inline cousin. Instead of reading a template from a file, you pass the template directly as a string argument.

## What Does templatestring Do?

The `templatestring` function takes a template string and a map of variables, then renders the template with those variables substituted.

```hcl
# Basic syntax
templatestring(template, vars)
```

The template string uses the same syntax as `templatefile`: `${var_name}` for interpolation, `%{if}...%{endif}` for conditionals, and `%{for}...%{endfor}` for loops.

## Basic Examples

```hcl
# Simple variable substitution
> templatestring("Hello, ${name}!", { name = "World" })
"Hello, World!"

# Multiple variables
> templatestring("${greeting}, ${name}! Welcome to ${place}.", {
    greeting = "Hi"
    name     = "Alice"
    place    = "Terraform"
  })
"Hi, Alice! Welcome to Terraform."

# Numeric values
> templatestring("Server count: ${count}", { count = 5 })
"Server count: 5"
```

## Why Use templatestring Instead of Interpolation?

You might wonder why you would use `templatestring` when Terraform already supports `"${var.name}"` interpolation. The key difference is that `templatestring` accepts a dynamic template string that can come from a variable, data source, or other expression.

```hcl
variable "message_template" {
  description = "Template for alert messages"
  type        = string
  default     = "Alert: ${service} is ${status} in ${region}"
}

locals {
  alert_message = templatestring(var.message_template, {
    service = "payment-api"
    status  = "degraded"
    region  = "us-east-1"
  })
  # Result: "Alert: payment-api is degraded in us-east-1"
}
```

With standard interpolation, the template must be written directly in the Terraform code. With `templatestring`, users can customize the template through variables.

## Conditionals in Templates

The template syntax supports if/else conditionals.

```hcl
locals {
  config = templatestring(
    <<-EOT
    server {
      listen ${port};
      %{if ssl_enabled}
      ssl_certificate     ${cert_path};
      ssl_certificate_key ${key_path};
      %{else}
      # SSL disabled
      %{endif}
    }
    EOT
    ,
    {
      port        = 443
      ssl_enabled = true
      cert_path   = "/etc/ssl/server.crt"
      key_path    = "/etc/ssl/server.key"
    }
  )
}
```

## Loops in Templates

Iterate over lists and maps within the template.

```hcl
locals {
  hosts_file = templatestring(
    <<-EOT
    # Generated hosts file
    %{for entry in entries}
    ${entry.ip}  ${entry.hostname}
    %{endfor}
    EOT
    ,
    {
      entries = [
        { ip = "10.0.1.10", hostname = "web-01" },
        { ip = "10.0.1.11", hostname = "web-02" },
        { ip = "10.0.1.12", hostname = "db-01" }
      ]
    }
  )
}
```

## Generating User Data Scripts

Build EC2 user data scripts from templates stored in variables.

```hcl
variable "user_data_template" {
  description = "Template for EC2 user data"
  type        = string
  default     = <<-EOT
    #!/bin/bash
    set -e

    # Configure environment
    echo "ENVIRONMENT=${environment}" >> /etc/environment
    echo "APP_PORT=${app_port}" >> /etc/environment
    echo "DB_HOST=${db_host}" >> /etc/environment

    # Install packages
    apt-get update
    %{for pkg in packages}
    apt-get install -y ${pkg}
    %{endfor}

    # Start the application
    systemctl start myapp
  EOT
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  user_data = templatestring(var.user_data_template, {
    environment = "production"
    app_port    = "8080"
    db_host     = "db.internal"
    packages    = ["nginx", "jq", "awscli"]
  })
}
```

## Dynamic Configuration from Module Input

Modules can accept template strings as inputs, giving callers control over output format.

```hcl
# Module: modules/alert/variables.tf
variable "alert_template" {
  description = "Template for alert messages"
  type        = string
  default     = "[${severity}] ${service}: ${message}"
}

variable "alert_vars" {
  description = "Variables for the alert template"
  type        = map(string)
}

# Module: modules/alert/main.tf
locals {
  rendered_alert = templatestring(var.alert_template, var.alert_vars)
}

# Root module
module "alert" {
  source = "./modules/alert"

  alert_template = "ALERT (${severity}) - Service: ${service} | ${message} | Region: ${region}"
  alert_vars = {
    severity = "HIGH"
    service  = "payment-api"
    message  = "Response time exceeding 5s threshold"
    region   = "us-east-1"
  }
}
```

## Generating JSON Configuration

Build JSON strings from templates when `jsonencode` feels too rigid.

```hcl
locals {
  config_json = templatestring(
    <<-EOT
    {
      "app_name": "${app_name}",
      "version": "${version}",
      "features": {
        "caching": ${caching_enabled},
        "debug": ${debug_enabled}
      },
      "replicas": ${replicas}
    }
    EOT
    ,
    {
      app_name        = "myapp"
      version         = "2.1.0"
      caching_enabled = true
      debug_enabled   = false
      replicas        = 3
    }
  )
}
```

## YAML Generation

Generate YAML configuration dynamically.

```hcl
locals {
  k8s_config = templatestring(
    <<-EOT
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: ${name}
      namespace: ${namespace}
    data:
    %{for key, value in config_data}
      ${key}: "${value}"
    %{endfor}
    EOT
    ,
    {
      name      = "app-config"
      namespace = "production"
      config_data = {
        LOG_LEVEL = "info"
        DB_HOST   = "postgres.internal"
        CACHE_TTL = "300"
      }
    }
  )
}
```

## templatestring vs templatefile

Here is when to use each:

```hcl
# Use templatefile when:
# - Your template is complex and benefits from being in a separate file
# - You want syntax highlighting in your editor
# - The template is reused across multiple configurations
resource "local_file" "config" {
  content = templatefile("${path.module}/templates/config.tpl", {
    name = "myapp"
  })
  filename = "/tmp/config.txt"
}

# Use templatestring when:
# - The template is short and simple
# - The template comes from a variable or data source
# - You want everything in one file
locals {
  greeting = templatestring("Hello, ${name}!", { name = "World" })
}
```

For more on the file-based approach, see [how to use templatefile](https://oneuptime.com/blog/post/2026-02-23-how-to-use-templatefile-function-in-terraform/view).

## Escaping Special Characters

If you need literal `${` or `%{` in the output, use `$${` and `%%{` respectively.

```hcl
locals {
  script = templatestring(
    <<-EOT
    #!/bin/bash
    # This variable uses Terraform template syntax
    APP_NAME="${app_name}"

    # This is a bash variable, not a Terraform variable
    CURRENT_DATE=$${(date +%Y-%m-%d)}
    EOT
    ,
    { app_name = "myapp" }
  )
}
```

## Summary

The `templatestring` function brings template rendering inline, without needing external files. It is perfect for short templates, templates that come from variables or data sources, and situations where you want to keep everything in a single file. It supports the full template syntax including interpolation, conditionals, and loops. For complex templates or those that benefit from syntax highlighting and separate file management, stick with `templatefile`.
