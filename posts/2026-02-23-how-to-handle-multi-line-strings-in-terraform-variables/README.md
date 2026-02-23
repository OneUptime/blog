# How to Handle Multi-Line Strings in Terraform Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Multi-Line Strings, Heredoc, Variables, HCL, Infrastructure as Code

Description: Learn how to work with multi-line strings in Terraform using heredoc syntax, indented heredocs, and best practices for policies, scripts, and configuration blocks.

---

Multi-line strings come up constantly in Terraform. IAM policies, user data scripts, configuration files, SQL statements, and shell commands all need multiple lines. Terraform provides several ways to handle these, and picking the right approach affects both readability and correctness. This post covers every method and when to use each one.

## Heredoc Syntax (<<)

The most common way to write multi-line strings in Terraform is the heredoc syntax:

```hcl
locals {
  # Standard heredoc
  script = <<EOF
#!/bin/bash
echo "Hello from the script"
apt-get update -y
apt-get install -y nginx
systemctl start nginx
EOF
}
```

The `EOF` marker is a convention. You can use any identifier:

```hcl
locals {
  config = <<ENDCONFIG
[database]
host = localhost
port = 5432
name = mydb
ENDCONFIG
}
```

The closing marker must appear at the very beginning of its line, with no leading whitespace (unless you use the indented variant).

## Indented Heredoc Syntax (<<-)

Standard heredocs have an annoying property: the content is taken literally, including leading whitespace. This means your heredoc content cannot be indented to match the surrounding code without including that indentation in the value.

The indented heredoc (`<<-`) solves this by stripping leading whitespace:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  # Without <<- the script would have unwanted leading spaces
  user_data = <<-EOF
    #!/bin/bash
    echo "Hello"
    apt-get update -y
    apt-get install -y nginx
  EOF
}
```

With `<<-`, Terraform finds the line with the least indentation and strips that amount from all lines. So the script above produces clean output without leading spaces.

## Multi-Line Strings in Variables

You can set multi-line default values for variables:

```hcl
variable "custom_script" {
  type        = string
  description = "Custom bootstrap script"
  default     = <<-EOF
    #!/bin/bash
    echo "Default bootstrap script"
    apt-get update -y
  EOF
}
```

And pass multi-line values through `.tfvars` files:

```hcl
# terraform.tfvars

custom_script = <<-EOF
  #!/bin/bash
  echo "Custom script from tfvars"
  curl -sL https://install.example.com | bash
  systemctl start myapp
EOF
```

## Multi-Line Strings with Interpolation

Heredocs support interpolation just like regular strings:

```hcl
locals {
  config = <<-EOF
    server {
      listen ${var.port};
      server_name ${var.domain};

      location / {
        proxy_pass http://localhost:${var.app_port};
      }
    }
  EOF
}
```

If you need to include a literal `${` in your heredoc, escape it with `$${}`:

```hcl
locals {
  # This produces a literal ${variable} in the output
  template_example = <<-EOF
    # Nginx variable syntax uses dollar signs
    set $$request_uri $${uri};
  EOF
}
```

## Using jsonencode for Multi-Line JSON

Instead of writing JSON as a heredoc (which is error-prone due to trailing commas and escaping), use `jsonencode`:

```hcl
# Avoid this - manual JSON is fragile
locals {
  bad_policy = <<-EOF
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": "s3:GetObject",
          "Resource": "${aws_s3_bucket.data.arn}/*"
        }
      ]
    }
  EOF
}

# Prefer this - Terraform handles the JSON formatting
locals {
  good_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.data.arn}/*"
      }
    ]
  })
}
```

## Multi-Line Strings in Outputs

Outputs can contain multi-line strings. This is useful for generating instructions or config snippets:

```hcl
output "connection_instructions" {
  value = <<-EOF
    Connect to the database using:

    Host:     ${aws_db_instance.main.address}
    Port:     ${aws_db_instance.main.port}
    Database: ${aws_db_instance.main.db_name}
    Username: ${var.db_username}

    Connection string:
    postgresql://${var.db_username}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}
  EOF
}
```

## Passing Multi-Line Strings to Resources

Many resources accept multi-line strings. Here are common examples:

### IAM Policies

```hcl
resource "aws_iam_policy" "s3_access" {
  name = "s3-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*",
        ]
      }
    ]
  })
}
```

### Kubernetes Manifests

```hcl
resource "kubernetes_config_map" "app" {
  metadata {
    name      = "app-config"
    namespace = "default"
  }

  data = {
    "app.properties" = <<-EOF
      database.host=${var.db_host}
      database.port=${var.db_port}
      database.name=${var.db_name}
      cache.ttl=${var.cache_ttl}
      log.level=${var.log_level}
    EOF

    "logging.xml" = <<-EOF
      <?xml version="1.0" encoding="UTF-8"?>
      <configuration>
        <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
          <encoder>
            <pattern>%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n</pattern>
          </encoder>
        </appender>
        <root level="${var.log_level}">
          <appender-ref ref="STDOUT" />
        </root>
      </configuration>
    EOF
  }
}
```

## Multi-Line Strings in Local-Exec Provisioners

Shell commands in provisioners often need multiple lines:

```hcl
resource "null_resource" "setup" {
  provisioner "local-exec" {
    command = <<-EOF
      echo "Setting up environment..."
      aws s3 cp s3://${var.config_bucket}/config.json ./config.json
      python3 scripts/setup.py \
        --environment ${var.environment} \
        --region ${var.region} \
        --config ./config.json
      echo "Setup complete"
    EOF

    interpreter = ["/bin/bash", "-c"]
  }
}
```

## Handling Newlines and Whitespace

Sometimes you need precise control over newlines:

```hcl
locals {
  # chomp() removes trailing newline from a heredoc
  clean_value = chomp(<<-EOF
    This string has no trailing newline
  EOF
  )

  # trimspace() removes leading and trailing whitespace
  trimmed = trimspace(<<-EOF

    This string has no surrounding whitespace

  EOF
  )

  # join with newlines to build multi-line from a list
  hosts_file = join("\n", [
    "127.0.0.1 localhost",
    "${var.db_ip} database",
    "${var.cache_ip} cache",
    "${var.app_ip} application",
  ])
}
```

## Multi-Line Strings from External Files

For very long multi-line content, consider using the `file()` function instead:

```hcl
locals {
  # Read a static file
  static_script = file("${path.module}/scripts/bootstrap.sh")

  # Read and template a file
  dynamic_script = templatefile("${path.module}/templates/bootstrap.sh.tpl", {
    environment = var.environment
    region      = var.region
  })
}
```

This keeps your Terraform files clean and lets you manage the content in purpose-built files with proper syntax highlighting.

## Conditional Multi-Line Content

You can conditionally include blocks of text:

```hcl
locals {
  ssl_config = var.enable_ssl ? <<-EOF
    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
  EOF
  : ""

  nginx_config = <<-EOF
    server {
      listen ${var.port};
      server_name ${var.domain};
      ${local.ssl_config}
      location / {
        proxy_pass http://localhost:${var.app_port};
      }
    }
  EOF
}
```

## Common Pitfalls

There are several issues to watch for with multi-line strings:

1. Standard heredocs (`<<`) include all leading whitespace. If your code is indented four spaces, so is your string content. Use `<<-` to avoid this.

2. The closing heredoc marker must be on its own line. You cannot put it after other content.

3. Windows line endings (`\r\n`) can cause issues. If you are on Windows and your heredoc content will be used on Linux, the extra carriage returns can break scripts.

4. Heredocs always end with a newline. Use `chomp()` if you need to remove it.

5. Empty lines inside a heredoc are significant. They will appear in the rendered output.

## Summary

Multi-line strings in Terraform are handled primarily through heredoc syntax. Use `<<-` (indented heredoc) in almost all cases to keep your code properly indented. Use `jsonencode` instead of JSON heredocs. Use `file()` or `templatefile()` for long content. And remember that `chomp()` and `trimspace()` are your friends when you need to control whitespace precisely.
