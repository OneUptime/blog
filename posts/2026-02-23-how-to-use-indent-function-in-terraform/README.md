# How to Use the indent Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps, YAML

Description: Learn how to use the indent function in Terraform to add leading spaces to multi-line strings, with practical examples for YAML generation and template formatting.

---

When you are embedding multi-line strings inside other multi-line strings - particularly when generating YAML, JSON, or configuration files - getting the indentation right can be a real headache. The `indent` function in Terraform adds a specified number of spaces to the beginning of each line in a multi-line string (except the first line), making it easy to nest content at the right indentation level.

## What Does indent Do?

The `indent` function takes a number of spaces and a string. It adds that many spaces to the beginning of every line in the string except the first one. The first line is left unchanged because you typically position the first line yourself in the surrounding context.

```hcl
# Basic syntax
indent(num_spaces, string)
```

## Basic Examples

Let us start with some simple demonstrations.

```hcl
# Indent a multi-line string by 4 spaces
> indent(4, "line one\nline two\nline three")
"line one\n    line two\n    line three"

# The first line is NOT indented
> indent(2, "first\nsecond\nthird")
"first\n  second\n  third"

# Single-line strings are returned unchanged
> indent(10, "just one line")
"just one line"

# Zero indentation returns the string unchanged
> indent(0, "line one\nline two")
"line one\nline two"
```

## Why the First Line Is Not Indented

This behavior makes sense when you consider how you typically use `indent`. The first line starts at whatever position you place it in the surrounding template:

```hcl
locals {
  yaml_output = <<-EOT
    metadata:
      annotations: ${indent(8, "key1: value1\nkey2: value2\nkey3: value3")}
  EOT
}

# Produces:
# metadata:
#   annotations: key1: value1
#         key2: value2
#         key3: value3
```

Since the first line sits right after `annotations: `, it does not need extra indentation. The subsequent lines need the indentation to align properly.

## Generating YAML Configuration

This is probably the most common use case for `indent`. When building YAML in Terraform, indentation matters.

```hcl
variable "extra_labels" {
  type = map(string)
  default = {
    team        = "platform"
    cost-center = "engineering"
    managed-by  = "terraform"
  }
}

locals {
  # Build the labels section as a YAML string
  labels_yaml = join("\n", [
    for key, value in var.extra_labels :
    "${key}: ${value}"
  ])

  # Embed it in a larger YAML document with proper indentation
  kubernetes_yaml = <<-EOT
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: app-config
      labels:
        ${indent(8, local.labels_yaml)}
    data:
      config.yaml: |
        setting: enabled
  EOT
}
```

## Embedding JSON in YAML

When you need to embed JSON content inside a YAML document, indentation becomes critical.

```hcl
locals {
  # Some JSON configuration
  app_config = jsonencode({
    database = {
      host = "db.example.com"
      port = 5432
    }
    cache = {
      host = "redis.example.com"
      port = 6379
    }
  })

  # Embed JSON inside a Kubernetes ConfigMap YAML
  configmap = <<-EOT
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: app-config
    data:
      config.json: |
        ${indent(8, local.app_config)}
  EOT
}
```

## Working with Heredoc Strings

`indent` works especially well with heredoc syntax for building complex multi-line outputs.

```hcl
locals {
  script_body = <<-SCRIPT
    #!/bin/bash
    echo "Starting deployment"
    apt-get update
    apt-get install -y nginx
    systemctl start nginx
  SCRIPT

  # Embed the script in a cloud-init user data template
  cloud_init = <<-EOT
    #cloud-config
    runcmd:
      - |
        ${indent(8, chomp(local.script_body))}
  EOT
}
```

Notice the use of [chomp](https://oneuptime.com/blog/post/2026-02-23-how-to-use-chomp-function-in-terraform/view) to remove the trailing newline from the heredoc before indenting.

## Kubernetes Manifests

Building Kubernetes manifests often requires precise indentation control.

```hcl
variable "container_ports" {
  type = list(object({
    name = string
    port = number
  }))
  default = [
    { name = "http", port = 8080 },
    { name = "metrics", port = 9090 }
  ]
}

locals {
  # Build the ports section
  ports_yaml = join("\n", [
    for p in var.container_ports :
    "- name: ${p.name}\n  containerPort: ${p.port}"
  ])

  # Build the full deployment spec
  deployment = <<-EOT
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: myapp
    spec:
      template:
        spec:
          containers:
            - name: myapp
              image: myapp:latest
              ports:
                ${indent(16, local.ports_yaml)}
  EOT
}
```

## Nginx Configuration Generation

Another scenario where indentation matters is when generating Nginx configuration blocks.

```hcl
variable "upstream_servers" {
  default = ["10.0.1.10:8080", "10.0.1.11:8080", "10.0.1.12:8080"]
}

locals {
  # Build upstream server entries
  upstream_entries = join("\n", [
    for server in var.upstream_servers :
    "server ${server};"
  ])

  # Build the full Nginx config
  nginx_config = <<-EOT
    upstream backend {
        ${indent(8, local.upstream_entries)}
    }

    server {
        listen 80;
        location / {
            proxy_pass http://backend;
        }
    }
  EOT
}
```

## Combining indent with templatefile

When using `templatefile`, `indent` helps you place dynamic content at the right indentation level within your template.

```hcl
# In your template file (config.yaml.tpl):
# apiVersion: v1
# kind: ConfigMap
# metadata:
#   name: ${name}
# data:
#   extra: |
#     ${indent(4, extra_content)}

# In your Terraform configuration:
locals {
  rendered = templatefile("${path.module}/config.yaml.tpl", {
    name          = "my-config"
    extra_content = "line1: value1\nline2: value2\nline3: value3"
  })
}
```

## indent with Dynamic Blocks

When building configuration strings dynamically, you often need to control indentation at multiple levels.

```hcl
variable "rules" {
  type = list(object({
    name   = string
    action = string
    match  = string
  }))
  default = [
    { name = "allow-health", action = "allow", match = "/health" },
    { name = "deny-admin", action = "deny", match = "/admin" }
  ]
}

locals {
  # Build each rule block
  rule_blocks = [
    for rule in var.rules :
    <<-RULE
      rule "${rule.name}" {
        action = "${rule.action}"
        match  = "${rule.match}"
      }
    RULE
  ]

  # Join and indent within a larger config
  all_rules = join("\n", local.rule_blocks)

  config = <<-EOT
    config {
      ${indent(6, chomp(local.all_rules))}
    }
  EOT
}
```

## Common Mistakes

Watch out for a couple of pitfalls.

```hcl
# Mistake: forgetting that the first line is NOT indented
# If you need all lines indented, add a newline at the start
locals {
  all_indented = "\n${indent(4, "line1\nline2\nline3")}"
  # Now all visible lines have 4-space indentation
}

# Mistake: double-indenting by applying indent twice
locals {
  text = "a\nb\nc"
  once = indent(4, local.text)
  # "a\n    b\n    c"

  twice = indent(4, local.once)
  # "a\n        b\n        c" - 8 spaces now!
}
```

## Summary

The `indent` function solves a specific but important problem: adding consistent indentation to multi-line strings when embedding them in larger documents. It is essential for generating YAML, building Kubernetes manifests, creating Nginx configurations, and any other scenario where whitespace-sensitive formatting matters. Remember that it skips the first line, and combine it with `chomp` and `join` for best results.
