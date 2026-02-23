# How to Fix Terraform Template Rendering Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Templates

Description: Diagnose and resolve Terraform template rendering errors including syntax issues, variable interpolation failures, and templatefile function problems.

---

Terraform templates allow you to generate dynamic strings and configuration files from structured data. They are incredibly useful for generating user data scripts, configuration files, and policy documents. But when something goes wrong during rendering, the errors can be cryptic. This post walks through the most common template rendering errors and how to resolve them.

## How Templates Work in Terraform

There are two main ways to use templates in Terraform:

1. **The `templatefile()` function** - the modern, recommended approach
2. **The `template_file` data source** - deprecated but still seen in older code

```hcl
# Modern approach
resource "aws_instance" "web" {
  user_data = templatefile("${path.module}/scripts/init.sh", {
    hostname = var.hostname
    packages = var.packages
  })
}

# Deprecated approach - migrate away from this
data "template_file" "init" {
  template = file("${path.module}/scripts/init.sh")
  vars = {
    hostname = var.hostname
  }
}
```

## Error 1: Variable Not Defined in Template

The most common error:

```
Error: Error in function call

  on main.tf line 12, in resource "aws_instance" "web":
  12:   user_data = templatefile("${path.module}/scripts/init.sh", {

Call to function "templatefile" failed:
./scripts/init.sh:5,14-22: Unknown variable; There is no variable named
"region" in the template.
```

This means your template references a variable that you did not pass in. Check the template file:

```bash
#!/bin/bash
# init.sh
echo "Setting hostname to ${hostname}"
echo "Deploying to ${region}"  # <-- This variable was not passed
```

Fix by passing all required variables:

```hcl
resource "aws_instance" "web" {
  user_data = templatefile("${path.module}/scripts/init.sh", {
    hostname = var.hostname
    region   = var.aws_region  # Add the missing variable
  })
}
```

## Error 2: Dollar Sign Escaping Issues

Template syntax uses `${}` for interpolation. If your template contains literal dollar signs (common in bash scripts), you need to escape them:

```bash
#!/bin/bash
# This BREAKS Terraform template rendering
for file in $(ls /opt); do
  echo $file
done

CURRENT_DATE=$(date +%Y-%m-%d)
```

Terraform tries to interpret `$(ls /opt)` as a template expression and fails. Fix by escaping dollar signs with `$$`:

```bash
#!/bin/bash
# This works - dollar signs are escaped
for file in $$(ls /opt); do
  echo $$file
done

CURRENT_DATE=$$(date +%Y-%m-%d)
```

Or if you only need interpolation for specific variables, use `%%` for percent signs and `$$` for dollars:

```bash
#!/bin/bash
# Terraform variables use ${}
echo "Hostname: ${hostname}"

# Bash variables use $$
MY_VAR="hello"
echo $$MY_VAR
```

## Error 3: Template Syntax Errors

Terraform templates support a subset of HCL syntax, including directives. Syntax errors in these directives cause rendering failures:

```
Error: Error in function call

Call to function "templatefile" failed:
./config.tpl:8,3-4: Invalid template directive; A template directive must
be a sequence like %{ if ... }, %{ for ... }, or %{ endif }.
```

Common syntax mistakes in templates:

```
# Wrong - missing spaces in directives
%{if condition}
%{for item in list}

# Right - spaces are required after %{
%{ if condition }
%{ for item in list }
%{ endif }
%{ endfor }
```

Another common mistake is mismatched directives:

```
# Wrong - for without endfor
%{ for s in subnets }
subnet: ${s}

# Right - always close directives
%{ for s in subnets }
subnet: ${s}
%{ endfor }
```

## Error 4: Type Issues in Templates

Templates expect strings for basic interpolation. Passing complex types without proper handling causes errors:

```hcl
# This fails if packages is a list
resource "aws_instance" "web" {
  user_data = templatefile("${path.module}/init.sh", {
    packages = var.packages  # ["nginx", "curl", "wget"]
  })
}
```

```bash
# init.sh - This fails with a list
apt-get install -y ${packages}
```

Fix by handling the list type in the template:

```bash
#!/bin/bash
# Use a for directive to iterate over the list
%{ for pkg in packages }
apt-get install -y ${pkg}
%{ endfor }
```

Or join the list before passing:

```hcl
resource "aws_instance" "web" {
  user_data = templatefile("${path.module}/init.sh", {
    packages = join(" ", var.packages)
  })
}
```

## Error 5: Nested Interpolation

You cannot nest `${}` inside another `${}`:

```
# Wrong - nested interpolation
${lookup(var.config, "${var.env}-key")}
```

Fix by using a local or restructuring:

```hcl
locals {
  config_key = "${var.env}-key"
}

# Then in the template vars
templatefile("config.tpl", {
  value = lookup(var.config, local.config_key)
})
```

## Error 6: File Path Issues

The template file path must be resolvable at plan time:

```
Error: Error in function call

Call to function "templatefile" failed: no file exists at
"scripts/init.sh"; this function works only with files that are
distributed as part of the configuration.
```

Common path issues:

```hcl
# Wrong - relative to working directory, not the module
user_data = templatefile("scripts/init.sh", {})

# Right - relative to the current module
user_data = templatefile("${path.module}/scripts/init.sh", {})

# Right - using path.root for root module references
user_data = templatefile("${path.root}/templates/init.sh", {})
```

## Error 7: JSON and YAML in Templates

Generating JSON or YAML from templates is error-prone. A missing comma or incorrect indentation breaks everything:

```
# config.json.tpl - Error-prone approach
{
  "servers": [
    %{ for i, s in servers }
    {
      "name": "${s.name}",
      "ip": "${s.ip}"
    }%{ if i < length(servers) - 1 },
    %{ endif }
    %{ endfor }
  ]
}
```

A better approach is to use `jsonencode()` or `yamlencode()` instead of templates for structured data:

```hcl
# Much cleaner - no template needed
resource "aws_instance" "web" {
  user_data = jsonencode({
    servers = [for s in var.servers : {
      name = s.name
      ip   = s.ip
    }]
  })
}
```

## Error 8: Whitespace Control in Templates

Template directives often produce unwanted blank lines:

```
%{ for s in subnets }
${s.cidr}
%{ endfor }
```

This produces:

```

10.0.1.0/24

10.0.2.0/24

```

Use the tilde `~` to strip whitespace:

```
%{ for s in subnets ~}
${s.cidr}
%{ endfor ~}
```

This produces clean output:

```
10.0.1.0/24
10.0.2.0/24
```

## Migrating from template_file to templatefile

If you are still using the deprecated `template_file` data source, here is how to migrate:

```hcl
# Old way
data "template_file" "init" {
  template = file("${path.module}/init.sh")
  vars = {
    hostname = var.hostname
    region   = var.region
  }
}

resource "aws_instance" "web" {
  user_data = data.template_file.init.rendered
}

# New way
resource "aws_instance" "web" {
  user_data = templatefile("${path.module}/init.sh", {
    hostname = var.hostname
    region   = var.region
  })
}
```

The `templatefile()` function is better because it supports complex types (lists, maps, objects), while `template_file` only supports string variables.

## Debugging Templates

When a template is not rendering correctly, isolate the problem:

1. **Use terraform console** to test the rendering:

```bash
terraform console
> templatefile("${path.module}/test.tpl", { name = "test" })
```

2. **Start with a minimal template** and add complexity gradually.

3. **Check the rendered output** by writing it to a local file:

```hcl
resource "local_file" "debug" {
  content  = templatefile("${path.module}/init.sh", { hostname = "test" })
  filename = "${path.module}/debug-output.txt"
}
```

4. **Use terraform plan** to see what the rendered value looks like in the plan output.

## Conclusion

Template rendering errors in Terraform usually come down to undefined variables, unescaped dollar signs, syntax errors in directives, or type mismatches. The fix is almost always straightforward once you identify the root cause. For complex data structures, prefer `jsonencode()` and `yamlencode()` over templates. And remember to always use `${path.module}` for file paths to keep your modules portable.
