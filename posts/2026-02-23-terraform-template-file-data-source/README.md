# How to Use the template_file Data Source in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Source, Template, Infrastructure as Code, Configuration

Description: Learn how to use the template_file data source and the templatefile function in Terraform to render dynamic configuration files with variable interpolation.

---

The `template_file` data source renders a template string with variable substitution. It takes a template (either inline or from a file) and a set of variables, then produces the rendered output. This is essential for generating configuration files, user data scripts, IAM policies, and any text that needs dynamic values inserted at plan time.

Important note: the `template_file` data source is considered legacy. Terraform 0.12 introduced the built-in `templatefile()` function, which is the recommended approach for new code. This post covers both, since you will encounter `template_file` in existing codebases and the `templatefile()` function in new ones.

## The Legacy template_file Data Source

```hcl
terraform {
  required_providers {
    template = {
      source  = "hashicorp/template"
      version = "~> 2.0"
    }
  }
}

data "template_file" "user_data" {
  template = file("${path.module}/templates/userdata.sh.tpl")

  vars = {
    db_host     = aws_db_instance.main.address
    db_port     = "5432"
    environment = var.environment
    app_version = var.app_version
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  user_data     = data.template_file.user_data.rendered
}
```

The template file (`templates/userdata.sh.tpl`) uses `${variable_name}` for interpolation:

```bash
#!/bin/bash
# Bootstrap script for application server

echo "Configuring for environment: ${environment}"

# Install application
apt-get update
apt-get install -y docker.io

# Write configuration
cat > /etc/app/config.env << EOF
DB_HOST=${db_host}
DB_PORT=${db_port}
ENVIRONMENT=${environment}
APP_VERSION=${app_version}
EOF

# Start the application
docker pull myapp:${app_version}
docker run -d --env-file /etc/app/config.env -p 80:8080 myapp:${app_version}
```

## The Modern templatefile() Function

The `templatefile()` function does the same thing without requiring an external provider:

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  user_data = templatefile("${path.module}/templates/userdata.sh.tpl", {
    db_host     = aws_db_instance.main.address
    db_port     = 5432
    environment = var.environment
    app_version = var.app_version
  })
}
```

The template syntax is identical. The only difference is that `templatefile()` is a built-in function, so no provider is needed.

## Template Syntax

### Variable Interpolation

Use `${variable_name}` to insert variable values:

```text
server_name = ${server_name}
listen_port = ${port}
```

### Conditionals

Templates support if/else directives:

```text
%{ if environment == "production" }
log_level = warn
max_connections = 1000
%{ else }
log_level = debug
max_connections = 100
%{ endif }
```

### Loops

Templates support for loops:

```text
%{ for host in upstream_hosts }
server ${host}:8080;
%{ endfor }
```

### Strip Whitespace

Use `~` to strip trailing whitespace and newlines:

```text
%{ for host in upstream_hosts ~}
server ${host}:8080;
%{ endfor ~}
```

## Practical Examples

### Nginx Configuration Template

Template file (`templates/nginx.conf.tpl`):

```nginx
worker_processes auto;

events {
    worker_connections ${worker_connections};
}

http {
    upstream backend {
%{ for server in backend_servers ~}
        server ${server};
%{ endfor ~}
    }

    server {
        listen ${listen_port};
        server_name ${server_name};

%{ if ssl_enabled }
        listen 443 ssl;
        ssl_certificate /etc/ssl/certs/${ssl_cert_name}.crt;
        ssl_certificate_key /etc/ssl/private/${ssl_cert_name}.key;
%{ endif }

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

%{ if health_check_path != "" }
        location ${health_check_path} {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
%{ endif }
    }
}
```

Terraform usage:

```hcl
resource "aws_instance" "nginx" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  user_data = templatefile("${path.module}/templates/setup-nginx.sh.tpl", {
    nginx_config = templatefile("${path.module}/templates/nginx.conf.tpl", {
      worker_connections = 1024
      backend_servers    = ["10.0.1.10:8080", "10.0.1.11:8080", "10.0.1.12:8080"]
      listen_port        = 80
      server_name        = "app.example.com"
      ssl_enabled        = true
      ssl_cert_name      = "app.example.com"
      health_check_path  = "/health"
    })
  })
}
```

### IAM Policy Template

Template file (`templates/s3-policy.json.tpl`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${bucket_name}",
        "arn:aws:s3:::${bucket_name}/*"
      ]
    }
%{ if allow_write }
    ,{
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::${bucket_name}/*"
      ]
%{ if restrict_prefix != "" }
      ,"Condition": {
        "StringLike": {
          "s3:prefix": ["${restrict_prefix}/*"]
        }
      }
%{ endif }
    }
%{ endif }
  ]
}
```

Usage:

```hcl
resource "aws_iam_policy" "app_s3" {
  name = "app-s3-access"
  policy = templatefile("${path.module}/templates/s3-policy.json.tpl", {
    bucket_name     = aws_s3_bucket.app.id
    allow_write     = var.environment == "production"
    restrict_prefix = "uploads"
  })
}
```

### Docker Compose Template

Template file (`templates/docker-compose.yml.tpl`):

```yaml
version: '3.8'

services:
  app:
    image: ${app_image}:${app_tag}
    ports:
      - "${app_port}:8080"
    environment:
      - DB_HOST=${db_host}
      - DB_PORT=${db_port}
      - DB_NAME=${db_name}
      - REDIS_HOST=${redis_host}
      - ENVIRONMENT=${environment}
%{ if enable_debug }
      - DEBUG=true
      - LOG_LEVEL=debug
%{ endif }
    restart: always
    deploy:
      replicas: ${replicas}
      resources:
        limits:
          cpus: '${cpu_limit}'
          memory: ${memory_limit}

%{ if enable_monitoring }
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
%{ endif }
```

Usage:

```hcl
resource "aws_instance" "docker_host" {
  ami           = var.ami_id
  instance_type = "t3.large"

  user_data = templatefile("${path.module}/templates/setup-docker.sh.tpl", {
    compose_content = templatefile("${path.module}/templates/docker-compose.yml.tpl", {
      app_image        = var.app_image
      app_tag          = var.app_tag
      app_port         = 80
      db_host          = aws_db_instance.main.address
      db_port          = 5432
      db_name          = "appdb"
      redis_host       = aws_elasticache_cluster.main.cache_nodes[0].address
      environment      = var.environment
      enable_debug     = var.environment != "production"
      replicas         = var.environment == "production" ? 3 : 1
      cpu_limit        = "1.0"
      memory_limit     = "512M"
      enable_monitoring = var.environment == "production"
    })
  })
}
```

### SystemD Service File Template

```hcl
locals {
  service_file = templatefile("${path.module}/templates/app.service.tpl", {
    app_name        = var.app_name
    app_user        = "appuser"
    app_binary      = "/opt/${var.app_name}/bin/${var.app_name}"
    working_dir     = "/opt/${var.app_name}"
    environment_vars = {
      DB_HOST     = aws_db_instance.main.address
      API_KEY     = var.api_key
      ENVIRONMENT = var.environment
    }
  })
}
```

Template (`templates/app.service.tpl`):

```ini
[Unit]
Description=${app_name} service
After=network.target

[Service]
Type=simple
User=${app_user}
WorkingDirectory=${working_dir}
ExecStart=${app_binary}
Restart=always
RestartSec=5
%{ for key, value in environment_vars ~}
Environment=${key}=${value}
%{ endfor ~}

[Install]
WantedBy=multi-user.target
```

## Differences Between template_file and templatefile()

| Feature | template_file (data source) | templatefile() (function) |
|---|---|---|
| Provider required | Yes (hashicorp/template) | No (built-in) |
| Supports complex types | Strings only in vars | Any type (lists, maps, objects) |
| Used in expressions | `data.template_file.x.rendered` | Directly in any expression |
| Supports count/for_each | Yes | N/A (it is a function) |
| Status | Legacy | Recommended |

The biggest practical difference is that `templatefile()` supports complex types like lists and maps in variables, while `template_file` only supports string variables.

## Migration from template_file to templatefile()

```hcl
# Before (legacy)
data "template_file" "init" {
  template = file("${path.module}/init.sh.tpl")
  vars = {
    name = var.name
    port = var.port
  }
}

resource "aws_instance" "app" {
  user_data = data.template_file.init.rendered
}

# After (modern)
resource "aws_instance" "app" {
  user_data = templatefile("${path.module}/init.sh.tpl", {
    name = var.name
    port = var.port
  })
}
```

## Common Gotchas

### Escaping Dollar Signs

Since `${}` is the interpolation syntax, literal dollar signs in templates must be escaped:

```bash
# In template file, to get a literal $HOME:
echo $${HOME}

# To get a literal ${variable}:
echo $${variable}
```

### Template Cannot Be Empty

An empty template file causes an error. Always have at least some content.

### Type Mismatches

With `template_file`, all vars must be strings. Passing a number or list causes an error. With `templatefile()`, any type works.

## Summary

Template rendering is fundamental to Terraform configuration. Whether you use the legacy `template_file` data source or the modern `templatefile()` function, the template syntax is the same: `${}` for interpolation, `%{ if }` for conditionals, and `%{ for }` for loops. For new code, always use `templatefile()` - it requires no external provider and supports complex data types.

For more on reading local files, see our post on the [local_file data source](https://oneuptime.com/blog/post/2026-02-23-terraform-local-file-data-source/view). For data sources in general, check out [querying infrastructure with data sources](https://oneuptime.com/blog/post/2026-02-23-terraform-query-infrastructure-data-sources/view).
