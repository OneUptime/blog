# How to Configure Local Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Local Provider, File Management, Infrastructure as Code

Description: Learn how to use the Local provider in Terraform to manage local files and directories, generate configs, and write outputs to disk.

---

Not everything in Terraform needs to talk to a cloud API. Sometimes you just need to write a file to disk. Maybe you are generating a configuration file, saving SSH keys, creating an inventory for Ansible, or writing outputs that other tools will consume. The Local provider in Terraform handles all of this.

It is a simple provider with a focused purpose: create and manage files and directories on the machine running Terraform. Despite its simplicity, it shows up in almost every non-trivial Terraform project.

## Prerequisites

- Terraform 1.0 or later
- No external services or credentials needed

## Declaring the Provider

```hcl
# versions.tf - Declare the Local provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}
```

No configuration needed for the provider itself.

```hcl
# provider.tf - Nothing to set up
provider "local" {}
```

## Writing Files

### local_file

The `local_file` resource creates a file with the given content.

```hcl
# Write a simple text file
resource "local_file" "config" {
  content  = "database_host = db.example.com\ndatabase_port = 5432\n"
  filename = "${path.module}/output/app.conf"
}

# Write a file with specific permissions
resource "local_file" "script" {
  content         = "#!/bin/bash\necho 'Hello from Terraform'\n"
  filename        = "${path.module}/output/setup.sh"
  file_permission = "0755"  # Make it executable
}
```

### local_sensitive_file

For files that contain sensitive data like passwords or private keys, use `local_sensitive_file`. It prevents the content from showing up in Terraform plan output.

```hcl
# Write a private key to disk (content hidden in plan output)
resource "local_sensitive_file" "private_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = "${path.module}/keys/deploy.pem"
  file_permission = "0600"  # Owner read/write only
}

# Write a credentials file
resource "local_sensitive_file" "db_credentials" {
  content  = jsonencode({
    host     = aws_db_instance.main.endpoint
    username = "admin"
    password = random_password.db.result
  })
  filename = "${path.module}/output/db-credentials.json"
}
```

## Reading Files

### local_file Data Source

The `local_file` data source reads the contents of a file.

```hcl
# Read a local file
data "local_file" "user_data_script" {
  filename = "${path.module}/scripts/user-data.sh"
}

# Use the file contents in a resource
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  user_data     = data.local_file.user_data_script.content
}
```

### local_sensitive_file Data Source

```hcl
# Read a sensitive file (content marked as sensitive)
data "local_sensitive_file" "api_key" {
  filename = "${path.module}/secrets/api-key.txt"
}
```

## Practical Patterns

### Generating Configuration Files

One of the most common uses is generating configuration files from Terraform outputs.

```hcl
# Generate an Nginx configuration file
resource "local_file" "nginx_config" {
  filename = "${path.module}/output/nginx.conf"

  content = <<-EOT
    upstream backend {
      %{for ip in aws_instance.app[*].private_ip}
      server ${ip}:8080;
      %{endfor}
    }

    server {
      listen 80;
      server_name app.example.com;

      location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
      }
    }
  EOT
}
```

### Generating Ansible Inventory

```hcl
# Generate an Ansible inventory from provisioned instances
resource "local_file" "ansible_inventory" {
  filename = "${path.module}/output/inventory.ini"

  content = templatefile("${path.module}/templates/inventory.tftpl", {
    web_servers = aws_instance.web[*].private_ip
    db_servers  = aws_instance.db[*].private_ip
    ssh_user    = "ubuntu"
    ssh_key     = "${path.module}/keys/deploy.pem"
  })
}
```

The template file (`inventory.tftpl`) might look like:

```text
[web_servers]
%{ for ip in web_servers ~}
${ip} ansible_user=${ssh_user} ansible_ssh_private_key_file=${ssh_key}
%{ endfor ~}

[db_servers]
%{ for ip in db_servers ~}
${ip} ansible_user=${ssh_user} ansible_ssh_private_key_file=${ssh_key}
%{ endfor ~}
```

### Generating Kubernetes Manifests

```hcl
# Generate a Kubernetes config map manifest
resource "local_file" "k8s_configmap" {
  filename = "${path.module}/output/configmap.yaml"

  content = yamlencode({
    apiVersion = "v1"
    kind       = "ConfigMap"
    metadata = {
      name      = "app-config"
      namespace = "default"
    }
    data = {
      DATABASE_HOST = aws_db_instance.main.address
      DATABASE_PORT = tostring(aws_db_instance.main.port)
      CACHE_HOST    = aws_elasticache_cluster.main.cache_nodes[0].address
      ENVIRONMENT   = var.environment
    }
  })
}
```

### Writing JSON Output Files

```hcl
# Write infrastructure details as JSON for other tools
resource "local_file" "infra_output" {
  filename = "${path.module}/output/infrastructure.json"

  content = jsonencode({
    vpc_id          = aws_vpc.main.id
    subnet_ids      = aws_subnet.app[*].id
    security_groups = [aws_security_group.app.id]
    load_balancer   = {
      dns_name = aws_lb.main.dns_name
      zone_id  = aws_lb.main.zone_id
    }
    instances = [
      for i in aws_instance.app : {
        id         = i.id
        private_ip = i.private_ip
        az         = i.availability_zone
      }
    ]
  })
}
```

### SSH Config Generation

```hcl
# Generate SSH config for easy access to instances
resource "local_file" "ssh_config" {
  filename        = "${path.module}/output/ssh_config"
  file_permission = "0644"

  content = join("\n\n", [
    for idx, instance in aws_instance.app : <<-EOT
      Host app-${idx}
        HostName ${instance.public_ip}
        User ubuntu
        IdentityFile ${path.module}/keys/deploy.pem
        StrictHostKeyChecking no
    EOT
  ])
}
```

### Generating .env Files

```hcl
# Generate a .env file for local development
resource "local_sensitive_file" "dotenv" {
  filename = "${path.module}/output/.env"

  content = <<-EOT
    # Auto-generated by Terraform - do not edit manually
    DATABASE_URL=postgresql://${aws_db_instance.main.endpoint}/${var.db_name}
    REDIS_URL=redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:6379
    AWS_REGION=${var.aws_region}
    S3_BUCKET=${aws_s3_bucket.uploads.id}
    API_SECRET=${random_password.api_secret.result}
  EOT
}
```

## Directory Management

While the Local provider does not have a dedicated directory resource, you can use `local_file` to create files in new directories. Terraform will create the parent directories automatically.

```hcl
# This creates the output/configs/ directory structure automatically
resource "local_file" "nested_config" {
  filename = "${path.module}/output/configs/app/production.json"
  content  = jsonencode({ environment = "production" })
}
```

## File Permissions

On Unix systems, you can control file and directory permissions.

```hcl
resource "local_file" "executable_script" {
  content  = file("${path.module}/templates/deploy.sh")
  filename = "${path.module}/output/deploy.sh"

  # File permissions (owner read/write/execute, group read/execute, others read/execute)
  file_permission = "0755"

  # Directory permissions for any directories created
  directory_permission = "0755"
}
```

## Working with Binary Files

For binary content, use the `content_base64` attribute instead of `content`.

```hcl
# Write a binary file from base64-encoded content
resource "local_file" "binary_data" {
  content_base64 = base64encode(file("${path.module}/templates/icon.png"))
  filename       = "${path.module}/output/icon.png"
}

# Or read and write a binary file
resource "local_file" "copy_binary" {
  source   = "${path.module}/templates/app.jar"
  filename = "${path.module}/output/app.jar"
}
```

## Lifecycle Management

By default, if the file already exists and has different content, Terraform will overwrite it. You can control this behavior.

```hcl
resource "local_file" "config" {
  content  = jsonencode(local.app_config)
  filename = "${path.module}/output/config.json"

  lifecycle {
    # Do not recreate if the file was manually modified
    ignore_changes = [content]
  }
}
```

## Best Practices

1. Use `local_sensitive_file` for any file containing secrets, credentials, or private keys. This keeps sensitive values out of your plan output.

2. Use `path.module` in file paths to keep files relative to the module directory. Avoid hardcoded absolute paths.

3. Add generated files to `.gitignore`. Configuration files generated by Terraform often contain environment-specific values that should not be committed.

4. Set appropriate file permissions, especially for private keys (`0600`) and executable scripts (`0755`).

5. Use `templatefile()` for complex file generation instead of inline heredocs. It keeps your Terraform code cleaner.

6. Remember that the Local provider runs on the machine executing Terraform. In a CI/CD pipeline, files are written to the build agent, not to production servers.

## Wrapping Up

The Local provider is a workhorse in the Terraform ecosystem. It bridges the gap between Terraform-managed infrastructure and the local tools that need to interact with it. Whether you are generating configuration files, saving credentials, building inventories, or writing deployment scripts, the Local provider keeps everything within your Terraform workflow.

For monitoring the services that consume these generated configurations, [OneUptime](https://oneuptime.com) provides comprehensive monitoring and alerting across your infrastructure.
