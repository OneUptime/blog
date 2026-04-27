# How to Use the templatestring Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the templatestring function in OpenTofu to render inline string templates with variables and template directives.

## Introduction

The `templatestring` function in OpenTofu renders a template string (provided directly as a value, not from a file) using a provided set of variables. It works like `templatefile` but takes the template content as a string argument rather than reading from a file, making it useful for inline templates stored in variables or data sources.

## Syntax

```hcl
templatestring(template, vars)
```

- **template** - a string containing the template content
- **vars** - a map of variables to pass into the template
- Returns the rendered string

## Basic Examples

```hcl
variable "template_content" {
  type    = string
  default = "Hello, $${name}! Environment: $${env}"
}

output "rendered" {
  value = templatestring(var.template_content, {
    name = "World"
    env  = "production"
  })
  # Returns "Hello, World! Environment: production"
}
```

The `$${...}` escapes prevent OpenTofu from interpreting the placeholders when the variable's default is parsed; the stored string is the literal `${name}` and `${env}`, which `templatestring` then renders.

## Practical Use Cases

### Rendering Templates Stored in SSM

```hcl
data "aws_ssm_parameter" "email_template" {
  name = "/app/templates/welcome-email"
}

locals {
  rendered_email = templatestring(data.aws_ssm_parameter.email_template.value, {
    user_name    = var.user_name
    company_name = "Acme Corp"
    support_url  = "https://support.acme.com"
  })
}

resource "aws_ses_template" "welcome" {
  name    = "WelcomeEmail"
  subject = "Welcome to Acme Corp!"
  html    = local.rendered_email
}
```

### Dynamic Configuration Templates

```hcl
variable "config_template" {
  type    = string
  default = <<-EOT
    [database]
    host = $${db_host}
    port = $${db_port}
    
    [app]
    environment = $${env}
    debug = $${debug}
  EOT
}

locals {
  config_content = templatestring(var.config_template, {
    db_host = aws_db_instance.main.address
    db_port = aws_db_instance.main.port
    env     = var.environment
    debug   = var.environment != "prod"
  })
}

resource "aws_ssm_parameter" "config" {
  name  = "/app/config"
  type  = "String"
  value = local.config_content
}
```

### Rendering Templates from S3

```hcl
data "aws_s3_object" "script_template" {
  bucket = "my-templates"
  key    = "scripts/setup.sh"
}

locals {
  rendered_script = templatestring(data.aws_s3_object.script_template.body, {
    environment  = var.environment
    app_version  = var.app_version
    cluster_name = var.cluster_name
  })
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  user_data     = base64encode(local.rendered_script)
}
```

### Inline Alert Message Templates

```hcl
variable "alert_message_template" {
  type    = string
  default = "ALERT: $${service} in $${environment} has $${metric} = $${value}"
}

locals {
  alert_message = templatestring(var.alert_message_template, {
    service     = "api-gateway"
    environment = var.environment
    metric      = "error_rate"
    value       = "5.2%"
  })
}

resource "aws_sns_topic_subscription" "alert" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

## Template Directives

Like `templatefile`, `templatestring` supports:

```hcl
locals {
  hosts_template = "Hosts:\n%%{ for h in hosts ~}\n- $${h}\n%%{ endfor ~}"

  hosts_rendered = templatestring(local.hosts_template, {
    hosts = ["server1", "server2", "server3"]
  })
}
```

## Step-by-Step Usage

1. Obtain or define a template string.
2. Call `templatestring(template, { var = value, ... })`.
3. Use the result in resource arguments.

## templatestring vs templatefile

| Function | Template Source | Use Case |
|----------|----------------|----------|
| `templatefile(path, vars)` | File on disk | Templates managed as files |
| `templatestring(string, vars)` | String value | Templates from variables, SSM, S3 |

## Conclusion

The `templatestring` function in OpenTofu enables dynamic template rendering when the template content itself is a variable - read from SSM parameters, S3 objects, or input variables. This separates template content from deployment code, enabling template management through configuration management systems.
