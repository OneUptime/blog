# How to Use the templatestring Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Function, HCL, DevOps, Template

Description: Learn how to use the templatestring function in Terraform to render inline template strings with variables, with practical examples for dynamic configuration generation.

---

The `templatestring` function was introduced in Terraform 1.9 and lets you render a template string with a set of variables, without needing an external file. If you have used `templatefile` before, think of `templatestring` as its inline cousin. Instead of reading a template from a file, you pass a reference to a string value that contains the template.

## What Does templatestring Do?

The `templatestring` function takes a reference to a template string and a map of variables, then renders the template with those variables substituted.

```hcl
# Basic syntax

templatestring(ref, vars)
```

The template string uses the same syntax as `templatefile`: `${var_name}` for interpolation, `%{if}...%{endif}` for conditionals, and `%{for}...%{endfor}` for loops. The first argument must be a reference to a string value, such as a variable, local value, or data source attribute. It cannot be a literal template string written directly in the function call.

## Basic Examples

```hcl
locals {
  greeting_template = "Hello, $${name}!"
  welcome_template  = "$${greeting}, $${name}! Welcome to $${place}."
  count_template    = "Server count: $${count}"

  greeting = templatestring(local.greeting_template, { name = "World" })

  welcome = templatestring(local.welcome_template, {
    greeting = "Hi"
    name     = "Alice"
    place    = "Terraform"
  })

  server_count = templatestring(local.count_template, { count = 5 })
}
```

## Why Use templatestring Instead of Interpolation?

You might wonder why you would use `templatestring` when Terraform already supports `"${var.name}"` interpolation. The key difference is that `templatestring` accepts a dynamic template string that can come from a variable, data source, or other expression.

```hcl
variable "message_template" {
  description = "Template for alert messages"
  type        = string
  default     = "Alert: $${service} is $${status} in $${region}"
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
  config_template = <<-EOT
    server {
      listen $${port};
      %%{if ssl_enabled}
      ssl_certificate     $${cert_path};
      ssl_certificate_key $${key_path};
      %%{else}
      # SSL disabled
      %%{endif}
    }
    EOT

  config = templatestring(local.config_template, {
    port        = 443
    ssl_enabled = true
    cert_path   = "/etc/ssl/server.crt"
    key_path    = "/etc/ssl/server.key"
  })
}
```

## Loops in Templates

Iterate over lists and maps within the template.

```hcl
locals {
  hosts_template = <<-EOT
    # Generated hosts file
    %%{for entry in entries}
    $${entry.ip}  $${entry.hostname}
    %%{endfor}
    EOT

  hosts_file = templatestring(local.hosts_template, {
    entries = [
      { ip = "10.0.1.10", hostname = "web-01" },
      { ip = "10.0.1.11", hostname = "web-02" },
      { ip = "10.0.1.12", hostname = "db-01" }
    ]
  })
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
    echo "ENVIRONMENT=$${environment}" >> /etc/environment
    echo "APP_PORT=$${app_port}" >> /etc/environment
    echo "DB_HOST=$${db_host}" >> /etc/environment

    # Install packages
    apt-get update
    %%{for pkg in packages}
    apt-get install -y $${pkg}
    %%{endfor}

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
  default     = "[$${severity}] $${service}: $${message}"
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

  alert_template = "ALERT ($${severity}) - Service: $${service} | $${message} | Region: $${region}"
  alert_vars = {
    severity = "HIGH"
    service  = "payment-api"
    message  = "Response time exceeding 5s threshold"
    region   = "us-east-1"
  }
}
```

## Generating JSON Configuration

For JSON, prefer `jsonencode` so Terraform can handle quoting and escaping correctly. You can still call `jsonencode` from inside a template rendered by `templatestring`.

```hcl
locals {
  config_json_template = <<-EOT
    $${jsonencode({
      app_name = app_name
      version  = version
      features = {
        caching = caching_enabled
        debug   = debug_enabled
      }
      replicas = replicas
    })}
    EOT

  config_json = templatestring(local.config_json_template, {
    app_name        = "myapp"
    version         = "2.1.0"
    caching_enabled = true
    debug_enabled   = false
    replicas        = 3
  })
}
```

## YAML Generation

For YAML, prefer `yamlencode` for the same reason.

```hcl
locals {
  k8s_config_template = <<-EOT
    $${yamlencode({
      apiVersion = "v1"
      kind       = "ConfigMap"
      metadata = {
        name      = name
        namespace = namespace
      }
      data = config_data
    })}
    EOT

  k8s_config = templatestring(local.k8s_config_template, {
    name      = "app-config"
    namespace = "production"
    config_data = {
      LOG_LEVEL = "info"
      DB_HOST   = "postgres.internal"
      CACHE_TTL = "300"
    }
  })
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
  greeting_template = "Hello, $${name}!"
  greeting          = templatestring(local.greeting_template, { name = "World" })
}
```

For more on the file-based approach, see [how to use templatefile](https://oneuptime.com/blog/post/2026-02-23-how-to-use-templatefile-function-in-terraform/view).

## Escaping Special Characters

If you need literal `${` or `%{` in the output, use `$${` and `%%{` respectively inside the template value. When you write that template value as an HCL string, you may need to escape once for HCL too, as shown with `$$${HOME}` below.

```hcl
locals {
  script_template = <<-EOT
    #!/bin/bash
    # This variable uses Terraform template syntax
    APP_NAME="$${app_name}"

    # This keeps a shell-style variable reference in the rendered output
    echo "Home directory: $$${HOME}"
    EOT

  script = templatestring(local.script_template, { app_name = "myapp" })
}
```

## Summary

The `templatestring` function brings template rendering inline, without needing external files. It is perfect for short templates, templates that come from variables or data sources, and situations where you want to keep everything in a single file. It supports the full template syntax including interpolation, conditionals, and loops. For complex templates or those that benefit from syntax highlighting and separate file management, stick with `templatefile`.
