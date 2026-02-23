# How to Use Terraform Escape Sequences in HCL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Escape Sequences, String Interpolation, Infrastructure as Code

Description: A complete guide to escape sequences in Terraform HCL, covering string literals, template directives, special characters, and heredoc syntax.

---

HCL, the language Terraform uses, has its own set of escape sequences for handling special characters in strings. Whether you need to include literal dollar signs, percent signs, newlines, or quotes in your Terraform strings, understanding escape sequences saves you from frustrating syntax errors.

## Basic String Escape Sequences

HCL supports the standard escape sequences you would expect in a programming language:

```hcl
locals {
  # Newline
  multiline = "line one\nline two"

  # Tab
  indented = "column1\tcolumn2"

  # Backslash
  windows_path = "C:\\Users\\admin\\Documents"

  # Double quote inside a string
  quoted = "She said \"hello\""

  # Unicode character (by code point)
  emoji = "\u2713"       # Checkmark
  snowman = "\U0001F600" # Wide Unicode character
}
```

The full list of escape sequences:

| Sequence | Character |
|----------|-----------|
| `\n` | Newline |
| `\r` | Carriage return |
| `\t` | Tab |
| `\"` | Literal double quote |
| `\\` | Literal backslash |
| `\uNNNN` | Unicode character (4 hex digits) |
| `\UNNNNNNNN` | Unicode character (8 hex digits) |

## Escaping Template Sequences

This is where Terraform-specific escaping comes in. HCL uses `${ }` for string interpolation and `%{ }` for template directives. If you need a literal `${` or `%{` in your string, you escape them by doubling the first character:

```hcl
locals {
  # Literal ${} - not interpreted as interpolation
  bash_variable = "echo $${HOME}"         # Produces: echo ${HOME}

  # Literal %{} - not interpreted as a directive
  literal_percent = "100 %%{complete}"     # Produces: 100 %{complete}

  # This is especially important for shell scripts in user_data
  user_data_script = <<-EOF
    #!/bin/bash
    # Use $$ to produce a literal $ in the output
    HOSTNAME=$$(hostname)
    echo "Host is $${HOSTNAME}"

    # Terraform interpolation still works with single $
    echo "Instance ID: ${aws_instance.main.id}"
  EOF
}
```

The `$$` and `%%` escaping only applies when followed by `{`. A lone `$` or `%` does not need escaping:

```hcl
locals {
  # These do NOT need escaping - $ is not followed by {
  price = "$100"          # Fine as-is
  percent = "50% off"     # Fine as-is

  # These DO need escaping - $ or % followed by {
  bash_ref = "$${MY_VAR}"     # Produces: ${MY_VAR}
  template = "%%{if true}"    # Produces: %{if true}
}
```

## Heredoc Strings

For multi-line strings, heredocs avoid most escaping issues:

```hcl
locals {
  # Standard heredoc - preserves indentation exactly
  script = <<EOF
#!/bin/bash
echo "Hello from the script"
if [ -f /etc/config ]; then
  source /etc/config
fi
EOF

  # Indented heredoc (<<-) - strips leading whitespace
  indented_script = <<-EOF
    #!/bin/bash
    echo "Hello from the script"
    if [ -f /etc/config ]; then
      source /etc/config
    fi
  EOF
}
```

The `<<-` (with dash) variant strips leading whitespace from each line, which lets you indent the heredoc content with your Terraform code. The closing marker determines the indentation level - everything is stripped up to the column of the closing `EOF`.

## Heredocs and Interpolation

Heredocs support interpolation by default. To disable it, use single quotes around the marker:

```hcl
locals {
  # With interpolation (default)
  with_vars = <<EOF
Server: ${var.server_name}
Port: ${var.port}
EOF

  # Without interpolation - use single quotes
  no_interpolation = <<'EOF'
This ${is_not_interpolated}
Neither is this ${variable}
EOF
}
```

The single-quoted heredoc marker (`<<'EOF'`) is useful when you are embedding scripts or templates that use `${}` syntax themselves and you do not want Terraform to interpret them.

## Escaping in JSON Strings

When working with JSON in Terraform (common for IAM policies, CloudWatch dashboards, etc.), you need to handle both HCL and JSON escaping:

```hcl
# Using jsonencode avoids manual JSON escaping
locals {
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "s3:GetObject"
        Resource = "arn:aws:s3:::my-bucket/*"
      }
    ]
  })
}

# If you must write raw JSON strings, escape quotes properly
locals {
  raw_json = "{\"key\": \"value with \\\"nested quotes\\\"\"}"
  # This is ugly - prefer jsonencode() instead
}
```

Always prefer `jsonencode()` over hand-written JSON strings. It handles all the escaping for you.

## Escaping in Provisioner Scripts

Provisioners that run shell commands are a common place where escaping gets tricky:

```hcl
resource "null_resource" "example" {
  provisioner "local-exec" {
    # The command is a Terraform string, so HCL escaping applies
    command = "echo \"Hello from Terraform\""
  }

  provisioner "local-exec" {
    # Using a heredoc is cleaner for complex commands
    command = <<-EOF
      echo "Hello from Terraform"
      echo "Instance: ${aws_instance.main.id}"
      echo "Literal dollar: $${SOME_VAR}"
    EOF
  }
}
```

## Template Files and Escaping

The `templatefile()` function reads a separate file and processes it as a template. Inside template files, the same `$$` and `%%` escaping rules apply:

```hcl
# main.tf
resource "aws_instance" "main" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    environment = var.environment
    app_port    = var.app_port
  })
}
```

```bash
# user_data.sh.tpl
#!/bin/bash

# Terraform variables (interpolated)
ENVIRONMENT="${environment}"
APP_PORT="${app_port}"

# Bash variables (escaped - literal ${})
HOSTNAME=$${HOSTNAME}
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)

# Terraform template directives
%{ if environment == "production" }
echo "Running in production mode"
%{ else }
echo "Running in ${environment} mode"
%{ endif }

# Literal percent-brace (escaped)
echo "Template processing %%{complete}"
```

## Regex Patterns in Terraform

Regular expressions need their own escaping since backslash has meaning in both HCL strings and regex:

```hcl
locals {
  # To match a literal dot in regex, you need \. in the regex
  # But \ must be escaped in HCL strings, so you write \\.
  domain_pattern = ".*\\.example\\.com$"

  # To match a digit: \d in regex becomes \\d in HCL
  phone_pattern = "\\d{3}-\\d{3}-\\d{4}"

  # Using regex with replace()
  cleaned = replace("hello-world_v2", "/[^a-zA-Z0-9]/", "-")
}

# Validation with regex
variable "domain" {
  type = string
  validation {
    # Double backslash for HCL string, single backslash in the actual regex
    condition     = can(regex("^[a-z0-9\\-]+\\.example\\.com$", var.domain))
    error_message = "Domain must be a subdomain of example.com."
  }
}
```

## The format() Function

The `format()` function uses Go's fmt syntax. Percent signs have special meaning:

```hcl
locals {
  # %s is a string placeholder
  greeting = format("Hello, %s!", var.name)

  # %d is an integer placeholder
  port_msg = format("Listening on port %d", var.port)

  # %% is a literal percent sign
  progress = format("Progress: %d%%", 75)  # Produces: Progress: 75%

  # Padding and formatting
  padded = format("%-20s %s", "Key:", var.value)
}
```

## Common Escaping Pitfalls

Here are situations that commonly cause confusion:

```hcl
# Pitfall 1: Forgetting $$ in user_data scripts
# WRONG - Terraform tries to interpolate ${HOME}
user_data = "export PATH=${HOME}/bin:$PATH"

# CORRECT
user_data = "export PATH=$${HOME}/bin:$$PATH"

# Pitfall 2: JSON inside HCL strings
# WRONG - unescaped quotes
policy = "{\"Statement\": [{\"Effect\": \"Allow\"}]}"

# CORRECT - use jsonencode
policy = jsonencode({
  Statement = [{ Effect = "Allow" }]
})

# Pitfall 3: Backslashes in Windows paths
# WRONG - \U is interpreted as Unicode escape
path = "C:\Users\admin"

# CORRECT
path = "C:\\Users\\admin"

# Pitfall 4: Dollar sign in regex
# WRONG - $ followed by literal text is fine, but ${ is interpolation
pattern = "end$"      # Fine
pattern = "foo${bar}" # Terraform tries to interpolate

# CORRECT
pattern = "foo$${bar}"  # If you need literal ${bar}
```

## Summary

Escape sequences in Terraform HCL cover three areas: standard string escapes (`\n`, `\t`, `\\`, `\"`), template sequence escapes (`$$` for literal `$` before `{`, `%%` for literal `%` before `{`), and heredoc strings for multi-line content. The most common source of confusion is the `$$` escaping needed in shell scripts and templates. When in doubt, use `jsonencode()` for JSON, heredocs for multi-line strings, and `templatefile()` for complex templates. For more on handling JSON in Terraform, see our post on [handling complex JSON policies](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-json-policies-in-terraform/view).
