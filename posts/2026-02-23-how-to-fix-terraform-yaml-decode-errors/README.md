# How to Fix Terraform YAML Decode Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, YAML

Description: Fix Terraform YAML decode errors caused by indentation problems, invalid syntax, type issues, and encoding problems in yamldecode function calls.

---

YAML is a popular format for configuration files, Kubernetes manifests, and CloudFormation templates. Terraform's `yamldecode()` function lets you parse YAML strings into native Terraform values. But YAML's whitespace-sensitive syntax means there are plenty of ways things can go wrong during decoding. This guide covers the most common YAML decode errors and their fixes.

## The Error

YAML decode errors in Terraform typically look like this:

```
Error: Error in function call

  on main.tf line 4, in locals:
   4:   config = yamldecode(file("${path.module}/config.yaml"))

Call to function "yamldecode" failed: on line 5, column 3: did not find
expected key.
```

Or:

```
Error: Error in function call

Call to function "yamldecode" failed: cannot unmarshal !!str into map.
```

## Cause 1: Indentation Errors

YAML uses indentation to define structure. Inconsistent or incorrect indentation is the number one cause of decode errors.

```yaml
# Wrong - mixed indentation
servers:
  web:
    port: 8080
      host: "0.0.0.0"  # Indented too far
  database:
   port: 5432  # Indented with 1 space instead of 2
```

```yaml
# Right - consistent 2-space indentation
servers:
  web:
    port: 8080
    host: "0.0.0.0"
  database:
    port: 5432
```

Golden rule: pick either 2 or 4 spaces for indentation and stick with it throughout the file. Never use tabs.

## Cause 2: Tabs Instead of Spaces

YAML does not allow tabs for indentation. If your editor inserts tabs, the decode will fail:

```
Error: Error in function call

Call to function "yamldecode" failed: found a tab character where an
indentation space is expected.
```

Fix your editor settings to use spaces for YAML files. Check for hidden tabs:

```bash
# Find tabs in your YAML file
grep -P '\t' config.yaml
```

Replace tabs with spaces:

```bash
# Replace tabs with 2 spaces
sed -i 's/\t/  /g' config.yaml
```

## Cause 3: Duplicate Keys

YAML does not allow duplicate keys at the same level. Some YAML parsers silently take the last value, but Terraform's parser may error:

```yaml
# Wrong - duplicate "port" key
server:
  port: 8080
  host: "0.0.0.0"
  port: 9090
```

```yaml
# Right - unique keys
server:
  port: 8080
  host: "0.0.0.0"
  admin_port: 9090
```

## Cause 4: Special Characters in Strings

YAML has many special characters that can cause unexpected parsing. Colons, hashes, and certain other characters need quoting:

```yaml
# Wrong - colon in unquoted string
message: Error: connection failed
# YAML interprets this as key "message" with value "Error" and then a nested key

# Right - quote strings with special characters
message: "Error: connection failed"

# Wrong - hash interpreted as comment
password: abc#123
# YAML reads this as "abc" and ignores "#123" as a comment

# Right
password: "abc#123"
```

Other values that YAML treats specially and might need quoting:

```yaml
# These are interpreted as booleans, not strings
enabled: yes    # true
disabled: no    # false
flag: on        # true
flag: off       # false

# These are interpreted as null
value: null
value: ~
value:          # empty value

# Quote them if you want the literal string
enabled: "yes"
value: "null"
value: "~"
```

## Cause 5: Multiline String Issues

YAML has multiple multiline string syntaxes, and getting them wrong causes decode errors:

```yaml
# Block scalar (literal) - preserves newlines
description: |
  This is line one.
  This is line two.

  This has a blank line above it.

# Block scalar (folded) - joins lines with spaces
description: >
  This is a long description
  that spans multiple lines
  but will be folded into one.

# Wrong - inconsistent indentation in block scalar
description: |
  Line one
    Line two with extra indent  # This is valid but might not be what you want
  Line three
```

A common mistake is forgetting the pipe or greater-than character:

```yaml
# Wrong - no block scalar indicator
description:
  This is not
  a multiline string
  # YAML parses "This" as a key

# Right
description: |
  This is a proper
  multiline string
```

## Cause 6: Anchors and Aliases Not Supported

Terraform's `yamldecode()` does not support YAML anchors and aliases:

```yaml
# This will fail in Terraform
defaults: &defaults
  adapter: postgres
  host: localhost

development:
  <<: *defaults
  database: dev_db

production:
  <<: *defaults
  database: prod_db
```

You need to flatten the YAML manually before Terraform can parse it:

```yaml
development:
  adapter: postgres
  host: localhost
  database: dev_db

production:
  adapter: postgres
  host: localhost
  database: prod_db
```

Or pre-process the YAML with an external tool in your pipeline.

## Cause 7: Type Conversion Issues

After decoding, the Terraform values might not be the types you expect:

```yaml
# config.yaml
port: 8080
enabled: true
ratio: 0.75
name: web-server
```

```hcl
locals {
  config = yamldecode(file("${path.module}/config.yaml"))
}

# port is a number, enabled is a bool, ratio is a number, name is a string
# But if you use them where strings are expected:
resource "aws_instance" "web" {
  tags = {
    Port = local.config.port  # Error: number, not string
  }
}

# Fix with tostring()
resource "aws_instance" "web" {
  tags = {
    Port = tostring(local.config.port)
  }
}
```

YAML's automatic type detection can surprise you:

```yaml
# These become numbers, not strings
version: 1.0     # float: 1.0
zipcode: 01234   # octal: 668 in some parsers, or string "01234" in others

# Quote to force strings
version: "1.0"
zipcode: "01234"
```

## Cause 8: Empty YAML Documents

An empty YAML file or one with only comments causes a decode error:

```yaml
# This file is intentionally blank
```

```hcl
# This fails because yamldecode returns null
locals {
  config = yamldecode(file("${path.module}/config.yaml"))
}

# Fix with a fallback
locals {
  raw    = file("${path.module}/config.yaml")
  config = try(yamldecode(local.raw), {})
}
```

## Cause 9: Multiple YAML Documents

YAML supports multiple documents in a single file, separated by `---`. Terraform's `yamldecode()` only handles a single document:

```yaml
# This fails - multiple documents
---
name: web
port: 8080
---
name: api
port: 9090
```

Split into separate files or parse only one document. If you must use a multi-document file, pre-process it externally.

## Debugging YAML Decode Errors

### Validate externally

```bash
# Use Python to validate YAML
python3 -c "import yaml; yaml.safe_load(open('config.yaml'))"

# Use yq for validation and pretty-printing
yq eval '.' config.yaml
```

### Inspect in terraform console

```bash
terraform console
> yamldecode("key: value")
{
  "key" = "value"
}

> yamldecode("  bad: indentation\n bad: yaml")
# Shows error details
```

### Output the raw content

```hcl
output "debug_raw" {
  value = file("${path.module}/config.yaml")
}
```

## yamlencode vs yamldecode

Remember that `yamlencode()` produces YAML and `yamldecode()` consumes it. When creating YAML for Kubernetes or other tools, prefer `yamlencode()`:

```hcl
# Creating YAML from Terraform data
locals {
  k8s_config = yamlencode({
    apiVersion = "v1"
    kind       = "ConfigMap"
    metadata = {
      name      = "app-config"
      namespace = "default"
    }
    data = {
      DATABASE_URL = var.database_url
    }
  })
}
```

This avoids all the YAML syntax pitfalls because Terraform generates valid YAML automatically.

## Best Practices

1. **Validate YAML in CI** - Use a linter like `yamllint` in your pipeline.
2. **Use yamlencode() to create YAML** - Do not build YAML strings manually.
3. **Wrap yamldecode() in try()** - For external or user-provided YAML.
4. **Quote ambiguous values** - Anything that might be interpreted as a boolean, null, or number.
5. **Use consistent indentation** - 2 spaces is the most common convention.
6. **Avoid advanced YAML features** - Anchors, aliases, and multi-document files are not supported.

## Conclusion

YAML decode errors in Terraform come down to the input not being valid YAML or Terraform not supporting a particular YAML feature. Indentation is the most common culprit, followed by special characters and type surprises. Validate your YAML externally before feeding it to Terraform, and prefer `yamlencode()` when you need to produce YAML output. Keep your YAML simple and well-formatted, and these errors become rare.
