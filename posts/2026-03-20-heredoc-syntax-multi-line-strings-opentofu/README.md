# How to Use Heredoc Syntax for Multi-Line Strings in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Heredoc, Multi-Line Strings, HCL, Expression, Infrastructure as Code

Description: Learn how to use heredoc syntax in OpenTofu to write multi-line strings for user data scripts, JSON policies, and configuration content.

---

Heredoc syntax lets you write multi-line strings in HCL without escaping newlines or quotes. Use `<<EOF` (or any identifier) to start a heredoc and `EOF` on a line by itself to end it. The indented form `<<-EOF` trims common leading spaces.

---

## Basic Heredoc

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  user_data = <<EOF
#!/bin/bash
yum update -y
yum install -y nginx
systemctl enable nginx
systemctl start nginx
EOF
}
```

---

## Indented Heredoc (<<-)

The `<<-` form trims common leading spaces, letting you indent the content to match your code:

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # <<- trims the common leading spaces from each line
  user_data = <<-EOT
    #!/bin/bash
    export APP_ENV="${var.environment}"
    export APP_PORT="8080"
    yum install -y nodejs
    node /opt/app/server.js &
  EOT
}
```

The content is treated as if the shared indentation doesn't exist - OpenTofu finds the least-indented line and trims that many leading spaces from every line.

---

## String Interpolation in Heredocs

Heredocs support `${...}` interpolation the same way regular strings do:

```hcl
variable "environment" {
  default = "production"
}

resource "aws_ssm_parameter" "config" {
  name  = "/app/config"
  type  = "String"

  value = <<-EOT
    [database]
    host = ${aws_db_instance.main.address}
    port = ${aws_db_instance.main.port}
    name = ${var.db_name}

    [app]
    environment = ${var.environment}
    debug = ${var.environment == "development" ? "true" : "false"}
  EOT
}
```

---

## Multi-Line JSON Policies

```hcl
resource "aws_iam_policy" "app" {
  name = "app-policy"

  policy = <<-JSON
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "s3:GetObject",
            "s3:PutObject"
          ],
          "Resource": "arn:aws:s3:::${var.bucket_name}/*"
        }
      ]
    }
  JSON
}
```

Note: For JSON policies, `jsonencode()` is usually better than heredoc JSON, and OpenTofu recommends `jsonencode()` or `yamlencode()` when generating structured content.

---

## Heredoc in locals

```hcl
locals {
  nginx_config = <<-NGINX
    server {
      listen 80;
      server_name ${var.domain_name};

      location / {
        proxy_pass http://localhost:${var.app_port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
      }
    }
  NGINX
}

resource "aws_ssm_parameter" "nginx_config" {
  name  = "/config/nginx"
  type  = "String"
  value = local.nginx_config
}
```

---

## Escaping Inside Heredocs

- `$${` produces a literal `${` (not interpolated)
- `%%{` produces a literal `%{` (not treated as a template directive)

```hcl
resource "aws_ssm_parameter" "bash_template" {
  name  = "/scripts/template"
  type  = "String"

  # $${VAR} produces literal ${VAR} in the stored string
  # Useful when the stored content is itself a template or script
  value = <<-EOT
    #!/bin/bash
    echo "User home: $${HOME}"
    echo "App env: ${var.environment}"
  EOT
  # Result:
  # #!/bin/bash
  # echo "User home: ${HOME}"     ← literal ${HOME}
  # echo "App env: production"    ← interpolated
}
```

---

## YAML in Heredoc

```hcl
resource "kubernetes_config_map" "app" {
  metadata {
    name = "app-config"
  }

  data = {
    "config.yaml" = <<-YAML
      database:
        host: ${aws_db_instance.main.address}
        port: ${aws_db_instance.main.port}
      server:
        port: 8080
        environment: ${var.environment}
    YAML
  }
}
```

Note: If you're generating YAML from OpenTofu values, `yamlencode()` is usually safer than writing YAML manually in a heredoc.

---

## Summary

Heredoc syntax (`<<EOF`/`<<-EOF`) provides a clean way to write multi-line strings in OpenTofu. Use `<<-` to keep your configuration indented while trimming common leading spaces. Heredocs support full string interpolation with `${...}`. Use `$${` to include a literal `${` and `%%{` to include a literal `%{`. Common use cases include EC2 user data scripts, Nginx config, and any other multi-line text content. For generated JSON or YAML, prefer `jsonencode()` or `yamlencode()`.
