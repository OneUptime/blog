# How to Configure Template Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Templates, Configuration Management, Infrastructure as Code

Description: Learn how to use the Template provider in Terraform to render templates for configuration files, user data scripts, and dynamic content generation.

---

The Template provider in Terraform was originally the go-to way to render template files with dynamic values. While Terraform has since added the built-in `templatefile()` function that covers most use cases, the Template provider still exists and remains in use across many codebases. Understanding both approaches is important, especially when maintaining older Terraform configurations.

This guide covers the Template provider, how it works, when to use it versus the built-in function, and practical examples of template rendering in Terraform.

## A Note on Deprecation

The Template provider has been deprecated in favor of the built-in `templatefile()` function available since Terraform 0.12. For new projects, you should use `templatefile()` directly. However, the provider still works and you will encounter it in existing codebases, so it is worth understanding.

## Declaring the Provider

```hcl
# versions.tf - Declare the Template provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    template = {
      source  = "hashicorp/template"
      version = "~> 2.2"
    }
  }
}
```

No configuration needed.

```hcl
# provider.tf - Nothing to configure
provider "template" {}
```

## Using the template_file Data Source

The `template_file` data source renders a template string with variables.

```hcl
# Render an inline template
data "template_file" "greeting" {
  template = "Hello, $${name}! You are working in the $${environment} environment."

  vars = {
    name        = "DevOps Team"
    environment = var.environment
  }
}

output "greeting" {
  value = data.template_file.greeting.rendered
}
```

Note the `$${}` syntax in inline templates. The double dollar sign is needed to escape Terraform's own interpolation when writing templates inline.

### Rendering from a File

More commonly, you load the template from an external file.

```hcl
# Render a template file
data "template_file" "user_data" {
  template = file("${path.module}/templates/user-data.sh.tpl")

  vars = {
    hostname    = "web-server-01"
    environment = var.environment
    region      = var.aws_region
    app_version = var.app_version
  }
}

# Use the rendered template as EC2 user data
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  user_data     = data.template_file.user_data.rendered

  tags = {
    Name = "web-server-01"
  }
}
```

The template file (`templates/user-data.sh.tpl`):

```bash
#!/bin/bash
# User data script for ${hostname}
# Environment: ${environment}

# Set the hostname
hostnamectl set-hostname ${hostname}

# Install and configure the application
apt-get update
apt-get install -y docker.io

# Pull and run the application container
docker pull myregistry/myapp:${app_version}
docker run -d \
  --name myapp \
  -e ENVIRONMENT=${environment} \
  -e REGION=${region} \
  -p 8080:8080 \
  myregistry/myapp:${app_version}
```

## The Modern Alternative: templatefile()

For new Terraform code, use the built-in `templatefile()` function instead of the provider.

```hcl
# Using the built-in templatefile() function
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  user_data = templatefile("${path.module}/templates/user-data.sh.tftpl", {
    hostname    = "web-server-01"
    environment = var.environment
    region      = var.aws_region
    app_version = var.app_version
  })
}
```

The `templatefile()` function uses `.tftpl` as the conventional file extension (though any extension works). The template syntax inside the file is the same.

### Key Differences

The `templatefile()` function has several advantages over the provider:

```hcl
# templatefile() supports complex types (lists, maps)
resource "aws_instance" "web" {
  user_data = templatefile("${path.module}/templates/hosts.tftpl", {
    # You can pass lists and maps, not just strings
    servers = ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
    config  = {
      port    = 8080
      workers = 4
    }
  })
}
```

The template file can then use loops and conditionals:

```text
# /etc/hosts additions
%{ for ip in servers ~}
${ip} app-server
%{ endfor ~}

# App configuration
APP_PORT=${config.port}
APP_WORKERS=${config.workers}
```

With the `template_file` data source, all variables must be strings. This is a significant limitation.

## Template Syntax

Both the provider and the built-in function use the same template syntax.

### Variable Interpolation

```text
# Simple variable substitution
server_name = ${hostname}
database_url = postgresql://${db_host}:${db_port}/${db_name}
```

### Conditionals

```text
%{ if environment == "production" }
log_level = warn
replicas = 3
%{ else }
log_level = debug
replicas = 1
%{ endif }
```

### Loops

```text
# Generate a list of upstream servers
upstream backend {
%{ for addr in backend_addresses ~}
  server ${addr}:8080;
%{ endfor ~}
}
```

### Whitespace Control

The `~` character trims whitespace around directives.

```text
# Without whitespace control (extra blank lines)
%{ for ip in servers }
${ip}
%{ endfor }

# With whitespace control (clean output)
%{ for ip in servers ~}
${ip}
%{ endfor ~}
```

## Practical Examples

### Nginx Configuration

```hcl
# Generate Nginx configuration
locals {
  nginx_config = templatefile("${path.module}/templates/nginx.conf.tftpl", {
    server_name      = "app.example.com"
    backend_servers  = aws_instance.app[*].private_ip
    backend_port     = 8080
    ssl_enabled      = var.environment == "production"
    ssl_cert_path    = "/etc/ssl/certs/app.crt"
    ssl_key_path     = "/etc/ssl/private/app.key"
  })
}

resource "local_file" "nginx_config" {
  content  = local.nginx_config
  filename = "${path.module}/output/nginx.conf"
}
```

Template (`templates/nginx.conf.tftpl`):

```text
upstream backend {
%{ for ip in backend_servers ~}
    server ${ip}:${backend_port};
%{ endfor ~}
}

server {
%{ if ssl_enabled }
    listen 443 ssl;
    ssl_certificate ${ssl_cert_path};
    ssl_certificate_key ${ssl_key_path};
%{ else }
    listen 80;
%{ endif }
    server_name ${server_name};

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Systemd Service File

```hcl
locals {
  service_file = templatefile("${path.module}/templates/app.service.tftpl", {
    app_name    = "myapp"
    app_user    = "appuser"
    app_port    = 8080
    environment = var.environment
    env_vars = {
      DATABASE_URL = "postgresql://${aws_db_instance.main.endpoint}/mydb"
      REDIS_URL    = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:6379"
      LOG_LEVEL    = var.environment == "production" ? "warn" : "debug"
    }
  })
}
```

Template:

```text
[Unit]
Description=${app_name} service
After=network.target

[Service]
Type=simple
User=${app_user}
ExecStart=/opt/${app_name}/bin/${app_name} --port ${app_port}
Restart=always
RestartSec=5

%{ for key, value in env_vars ~}
Environment="${key}=${value}"
%{ endfor ~}

[Install]
WantedBy=multi-user.target
```

### Cloud-Init Configuration

```hcl
# Generate cloud-init configuration
locals {
  cloud_init = templatefile("${path.module}/templates/cloud-init.yaml.tftpl", {
    hostname      = "web-01"
    ssh_keys      = var.ssh_public_keys
    packages      = ["nginx", "certbot", "python3-certbot-nginx"]
    ntp_servers   = ["0.pool.ntp.org", "1.pool.ntp.org"]
    timezone      = "UTC"
  })
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  user_data     = local.cloud_init
}
```

### Kubernetes Manifest Templates

```hcl
# Generate a Kubernetes deployment manifest
locals {
  k8s_deployment = templatefile("${path.module}/templates/deployment.yaml.tftpl", {
    app_name    = "api"
    namespace   = var.k8s_namespace
    image       = "${var.registry}/api:${var.image_tag}"
    replicas    = var.environment == "production" ? 3 : 1
    cpu_request = var.environment == "production" ? "500m" : "100m"
    mem_request = var.environment == "production" ? "512Mi" : "128Mi"
    env_vars = {
      NODE_ENV     = var.environment
      DATABASE_URL = var.database_url
    }
  })
}
```

## Migrating from Template Provider to templatefile()

If you are maintaining code that uses the Template provider and want to migrate, here is the mapping:

```hcl
# Before (Template provider)
data "template_file" "config" {
  template = file("${path.module}/templates/config.tpl")
  vars = {
    hostname = "web-01"
    port     = "8080"
  }
}

resource "aws_instance" "web" {
  user_data = data.template_file.config.rendered
}

# After (built-in function)
resource "aws_instance" "web" {
  user_data = templatefile("${path.module}/templates/config.tftpl", {
    hostname = "web-01"
    port     = 8080  # Can use native types now
  })
}
```

## Best Practices

1. Use `templatefile()` for new code. The Template provider is deprecated and the built-in function is more capable.

2. Use the `.tftpl` file extension for template files. This is the conventional extension and helps editors provide syntax highlighting.

3. Keep templates in a `templates/` directory within your module.

4. Use whitespace control (`~`) to keep rendered output clean.

5. Pass only the variables the template needs. Avoid passing entire resource objects when only a few attributes are used.

6. Test your templates by rendering them and checking the output before deploying.

## Wrapping Up

The Template provider served Terraform well for years, and you will still find it in many existing projects. For new code, the built-in `templatefile()` function is the right choice since it supports complex types, does not require an external provider, and works everywhere Terraform does.

Whether you are generating user data scripts, configuration files, or Kubernetes manifests, templates keep your Terraform code clean and your generated content maintainable.

For monitoring the infrastructure you deploy with these templates, [OneUptime](https://oneuptime.com) offers comprehensive monitoring and alerting for all your services.
