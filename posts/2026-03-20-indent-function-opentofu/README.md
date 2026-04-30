# How to Use the indent Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Indent, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the indent function in OpenTofu to add consistent indentation to multi-line strings when embedding them in YAML or other indentation-sensitive formats.

---

The `indent()` function adds a specified number of spaces to the beginning of each line in a string, except for the first line. This is useful when embedding multi-line strings (like JSON or YAML blocks) inside other indented formats.

---

## Syntax

```hcl
indent(num_spaces, string)
```

The first line of the string is **not** indented - only subsequent lines receive the indentation. This matches how you'd embed a multi-line value in an already-indented context.

---

## Basic Example

```hcl
locals {
  example = indent(4, "line1\nline2\nline3")
  # "line1\n    line2\n    line3"
  # line1     (no indent on first line)
  #     line2 (4 spaces)
  #     line3 (4 spaces)
}
```

---

## Embedding Multi-line Content in YAML

The most common use case for `indent()` is embedding multi-line content in YAML:

```hcl
locals {
  inline_policy = yamlencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::my-bucket/*"
    }]
  })
}

resource "kubernetes_config_map" "app" {
  metadata { name = "app-config" }

  data = {
    # indent() keeps continuation lines aligned under policy: |
    "policy.yaml" = <<-YAML
      apiVersion: v1
      kind: ConfigMap
      data:
        policy: |
          ${indent(4, local.inline_policy)}
    YAML
  }
}
```

---

## Use in Heredoc Templates

```hcl
variable "environment" {
  default = "production"
}

locals {
  db_config = yamlencode({
    environment = var.environment
    host        = "db.example.internal"
    port        = 5432
  })

  # Embed the YAML config inside a Secret manifest with proper indentation
  k8s_secret_yaml = <<-YAML
    apiVersion: v1
    kind: Secret
    metadata:
      name: db-config
    stringData:
      config.yaml: |
        ${indent(4, local.db_config)}
  YAML
}
```

---

## When the First Line Exception Matters

Because `indent()` doesn't indent the first line, it's designed for the case where the first line follows some existing text at an indentation level:

```hcl
locals {
  content = "value1\nvalue2\nvalue3"

  # In a YAML context like:
  # key: value1
  #      value2
  #      value3
  # Use: "key: ${indent(5, local.content)}"
  # The first "value1" sits right after "key: "
  # Subsequent lines are indented to align
}
```

---

## Alternative: Combining with templatefile

```hcl
# For complex multi-line embeddings, templatefile() with %{ directives }

# may be cleaner than indent() for some cases

resource "aws_ssm_parameter" "config" {
  name  = "/app/config"
  type  = "String"
  value = templatefile("${path.module}/templates/config.yaml.tpl", {
    db_host  = aws_db_instance.main.address
    app_name = var.app_name
  })
}
```

---

## Summary

`indent(n, string)` adds `n` spaces to the beginning of every line in `string` except the first. It's designed for embedding multi-line content in indentation-sensitive formats like YAML. The first-line exception exists because the first line is typically already positioned at the correct indentation by its surrounding context. Use it when building Kubernetes manifests, Helm values files, or any YAML that embeds JSON or other multi-line content.
