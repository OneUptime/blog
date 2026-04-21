# How to Use the template_file Data Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Template_file, templatefile, Data Source, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the template_file data source and templatefile function in OpenTofu to render dynamic configuration files and user data scripts.

---

The `template_file` data source from the deprecated `hashicorp/template` provider was the historical way to render templates in Terraform/OpenTofu. Modern configurations use the built-in `templatefile()` function instead, which doesn't require a separate provider. Both approaches are covered here.

---

## Modern Approach: templatefile() Function

For all new configurations, use the built-in `templatefile()` function:

```hcl
# templates/user_data.sh.tpl

# #!/bin/bash
# export APP_ENV="${environment}"
# export DB_HOST="${db_host}"
# export APP_PORT="${app_port}"
# systemctl start myapp

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  user_data = templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment = var.environment
    db_host     = aws_db_instance.main.address
    app_port    = var.app_port
  })
}
```

---

## Legacy: template_file Data Source

If you're working with older configurations, the `template_file` data source looks like this:

```hcl
# versions.tf - add the template provider
terraform {
  required_providers {
    template = {
      source  = "hashicorp/template"
      version = "~> 2.2"
    }
  }
}

# The template file itself (user_data.sh.tpl):
# #!/bin/bash
# export APP_ENV="${environment}"
# export DB_HOST="${db_host}"

data "template_file" "user_data" {
  template = file("${path.module}/templates/user_data.sh.tpl")

  vars = {
    environment = var.environment
    db_host     = aws_db_instance.main.address
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  user_data     = data.template_file.user_data.rendered
}
```

Note: The legacy `template_file` data source's `vars` map only accepts primitive values. Use `templatefile()` for lists, maps, objects, and modern OpenTofu syntax.

---

## Inline Templates with templatestring

For short templates, you can inline the template string with `templatestring()`:

```hcl
# Render a JSON config inline without a separate template file
locals {
  app_config = templatestring(<<-EOT
    {
      "database": {
        "host": "$${db_host}",
        "port": $${db_port},
        "name": "$${db_name}"
      },
      "server": {
        "port": $${app_port}
      }
    }
  EOT
  , {
    db_host  = aws_db_instance.main.address
    db_port  = aws_db_instance.main.port
    db_name  = var.db_name
    app_port = var.app_port
  })
}
```

Note: In a template string passed to `templatestring()`, escape template markers as `$${...}` and `%%{...}` in the outer HCL string so OpenTofu passes literal `${...}` and `%{...}` into `templatestring()`.

---

## Template for IAM Policy Documents

```hcl
# templates/bucket_policy.json.tpl:
# {
#   "Version": "2012-10-17",
#   "Statement": [{
#     "Effect": "Allow",
#     "Principal": { "AWS": "${role_arn}" },
#     "Action": ["s3:GetObject", "s3:PutObject"],
#     "Resource": "${bucket_arn}/*"
#   }]
# }

resource "aws_s3_bucket_policy" "app" {
  bucket = aws_s3_bucket.app.id

  policy = templatefile("${path.module}/templates/bucket_policy.json.tpl", {
    role_arn   = aws_iam_role.app.arn
    bucket_arn = aws_s3_bucket.app.arn
  })
}
```

---

## Migrating from template_file to templatefile

| Old (template_file data source) | New (templatefile function) |
|---|---|
| `data "template_file" "x" { template = file(...) vars = {...} }` | `templatefile("path", {...})` |
| `data.template_file.x.rendered` | Directly use `templatefile()` return value |
| Requires `hashicorp/template` provider | Built-in, no provider needed |

---

## Template Syntax Reference

Templates use `${variable}` interpolation and support directives:

```text
%{ for item in items ~}
- ${item}
%{ endfor ~}
```

```text
%{ if condition }true text%{ else }false text%{ endif }
```

The `~` trims whitespace/newlines around a directive.

---

## Summary

Use the built-in `templatefile()` function for rendering templates in modern OpenTofu - it takes a file path and a map of variables and returns the rendered string. The older `template_file` data source from the deprecated `hashicorp/template` provider serves a similar purpose but requires an extra provider and only accepts primitive values in its `vars` map. Template syntax supports `${variable}` interpolation, `%{ for }` loops, and `%{ if }` conditionals.
