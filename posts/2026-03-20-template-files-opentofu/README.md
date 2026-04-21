# How to Use Template Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, templatefile, Template, User Data, HCL, Infrastructure as Code

Description: Learn how to use the templatefile() function in OpenTofu to render dynamic configuration files - generating user data scripts, YAML configs, and JSON policies with variable interpolation.

## Introduction

The `templatefile()` function renders a file template with variable substitutions. It replaces the deprecated `template_file` data source and is the standard way to generate dynamic content - EC2 user data scripts, Kubernetes manifests, IAM policies, and configuration files.

## Basic templatefile() Usage

```hcl
# Template file: templates/user-data.sh.tpl

# ${variable} syntax for substitution

# main.tf
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  user_data = templatefile("${path.module}/templates/user-data.sh.tpl", {
    environment     = var.environment
    app_version     = var.app_version
    db_endpoint     = aws_db_instance.main.endpoint
    log_bucket      = aws_s3_bucket.logs.id
  })
}
```

Template file `templates/user-data.sh.tpl`:

```bash
#!/bin/bash
set -euo pipefail

# Environment: ${environment}
# App version: ${app_version}

# Install the application
aws s3 cp s3://artifacts/${app_version}/app.tar.gz /opt/app.tar.gz
tar -xzf /opt/app.tar.gz -C /opt/app

# Configure database connection
cat > /opt/app/config.env << EOF
DB_HOST=${db_endpoint}
APP_ENV=${environment}
LOG_BUCKET=${log_bucket}
EOF

# Start the application
systemctl enable app
systemctl start app
```

## Loop in Templates

Use `%{ for }` for list iteration in templates:

```bash
# templates/nginx.conf.tpl
upstream backend {
%{ for server in upstream_servers ~}
  server ${server}:${app_port};
%{ endfor ~}
}

server {
  listen 80;
  server_name ${domain_name};

  location / {
    proxy_pass http://backend;
  }
%{ for location in extra_locations ~}
  location ${location.path} {
    ${location.config}
  }
%{ endfor ~}
}
```

```hcl
locals {
  nginx_config = templatefile("${path.module}/templates/nginx.conf.tpl", {
    upstream_servers = ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
    app_port         = 8080
    domain_name      = "app.example.com"
    extra_locations  = [
      { path = "/health", config = "return 200 'OK';" }
    ]
  })
}
```

## Conditional in Templates

```bash
# templates/app-config.yaml.tpl
app:
  environment: ${environment}
  debug: ${environment == "dev" ? "true" : "false"}
%{ if enable_cache ~}
  cache:
    host: ${cache_endpoint}
    ttl: 300
%{ endif ~}
%{ if length(feature_flags) > 0 ~}
  features:
%{ for flag in feature_flags ~}
    - ${flag}
%{ endfor ~}
%{ endif ~}
```

```hcl
resource "aws_ssm_parameter" "app_config" {
  name  = "/app/${var.environment}/config"
  type  = "String"
  value = templatefile("${path.module}/templates/app-config.yaml.tpl", {
    environment    = var.environment
    enable_cache   = var.enable_cache
    cache_endpoint = var.enable_cache ? aws_elasticache_cluster.main[0].cache_nodes[0].address : ""
    feature_flags  = var.feature_flags
  })
}
```

## IAM Policy Template

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAppAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "${role_arn}"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "${bucket_arn}/*"
      ]
    }%{ if enable_list_bucket },
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Principal": {
        "AWS": "${role_arn}"
      },
      "Action": "s3:ListBucket",
      "Resource": "${bucket_arn}"
    }%{ endif }
  ]
}
```

```hcl
resource "aws_s3_bucket_policy" "app" {
  bucket = aws_s3_bucket.app.id
  policy = templatefile("${path.module}/templates/s3-policy.json.tpl", {
    bucket_arn        = aws_s3_bucket.app.arn
    role_arn          = aws_iam_role.app.arn
    enable_list_bucket = true
  })
}
```

## path.module vs path.root

```hcl
# path.module: directory containing the current module's .tf files
# Use this for templates inside a module

# path.root: the root module's directory
# Use this for templates that are in the root, not inside a module

resource "aws_instance" "web" {
  user_data = templatefile("${path.module}/templates/user-data.sh.tpl", {
    # path.module works correctly when this code is used as a module
    environment = var.environment
  })
}
```

## Using templatefile vs heredoc

```hcl
# For simple scripts: heredoc inline
resource "aws_instance" "simple" {
  user_data = <<-EOF
    #!/bin/bash
    echo "Hello from ${var.environment}" >> /var/log/init.log
  EOF
}

# For complex templates: templatefile()
resource "aws_instance" "complex" {
  user_data = templatefile("${path.module}/templates/user-data.sh.tpl", {
    environment = var.environment
    # many variables...
  })
}
```

## Conclusion

The `templatefile()` function is the standard way to generate dynamic content in OpenTofu. Use `${variable}` for simple substitutions, `%{ for item in list }...%{ endfor }` for loops, and `%{ if condition }...%{ endif }` for conditionals. Always use `path.module` (not relative paths) for template files inside modules. Prefer `templatefile()` over inline heredocs for multi-line content with complex logic - it keeps `.tf` files clean and makes templates independently readable and testable.
