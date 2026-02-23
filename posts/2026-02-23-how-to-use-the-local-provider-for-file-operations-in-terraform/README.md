# How to Use the Local Provider for File Operations in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Local Provider, File Operations, Infrastructure as Code, Configuration

Description: Learn how to use the Terraform local provider to create and manage local files, generate configuration files, write sensitive data securely, and read file contents.

---

The local provider in Terraform manages local resources such as files and directories on the machine where Terraform runs. It is commonly used to generate configuration files, write output data for other tools to consume, create deployment scripts, and manage sensitive files with restricted permissions. While it does not interact with any cloud API, the local provider fills an important gap in Terraform workflows.

In this guide, we will explore the local provider's resources and data sources. We will cover creating regular files, handling sensitive files with proper permissions, and reading existing files into your Terraform configuration.

## Installing the Local Provider

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Creating a Basic Local File

```hcl
# files.tf - Create local configuration files
resource "local_file" "config" {
  filename = "${path.module}/output/app-config.json"
  content = jsonencode({
    environment = var.environment
    database = {
      host = "db.example.com"
      port = 5432
      name = "appdb"
    }
    redis = {
      host = "redis.example.com"
      port = 6379
    }
    log_level = var.environment == "production" ? "warn" : "debug"
  })
}
```

## Setting File Permissions

Control file permissions for security:

```hcl
# permissions.tf - Files with specific permissions
resource "local_file" "script" {
  filename        = "${path.module}/output/deploy.sh"
  content         = templatefile("${path.module}/templates/deploy.sh.tpl", {
    environment = var.environment
    region      = var.aws_region
  })
  file_permission = "0755"  # Executable
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

resource "local_file" "readonly_config" {
  filename        = "${path.module}/output/readonly.conf"
  content         = "# This file is managed by Terraform\nread_only=true\n"
  file_permission = "0444"  # Read-only
}
```

## Creating Sensitive Files

```hcl
# sensitive.tf - Write sensitive data with restricted permissions
resource "local_sensitive_file" "credentials" {
  filename        = "${path.module}/output/.credentials"
  content         = "DB_PASSWORD=supersecret123\nAPI_KEY=abc123def456\n"
  file_permission = "0600"  # Owner read/write only
}

resource "local_sensitive_file" "private_key" {
  filename        = "${path.module}/output/server.key"
  content         = var.private_key_pem
  file_permission = "0600"
}

variable "private_key_pem" {
  type      = string
  default   = "placeholder"
  sensitive = true
}
```

## Reading Local Files

Use the local_file data source to read existing files:

```hcl
# read-files.tf - Read existing files
data "local_file" "existing_config" {
  filename = "${path.module}/configs/base.json"
}

output "base_config" {
  value = jsondecode(data.local_file.existing_config.content)
}

# Read a sensitive file
data "local_sensitive_file" "api_key" {
  filename = "${path.module}/secrets/api.key"
}
```

## Generating Multi-File Configurations

```hcl
# multi-file.tf - Generate configuration files for multiple services
variable "services" {
  type = map(object({
    port     = number
    replicas = number
  }))
  default = {
    "api"    = { port = 8080, replicas = 3 }
    "web"    = { port = 3000, replicas = 2 }
    "worker" = { port = 9090, replicas = 4 }
  }
}

resource "local_file" "service_config" {
  for_each = var.services

  filename = "${path.module}/output/configs/${each.key}.yaml"
  content  = yamlencode({
    service = {
      name     = each.key
      port     = each.value.port
      replicas = each.value.replicas
      environment = var.environment
    }
  })
}

# Generate an index file listing all services
resource "local_file" "service_index" {
  filename = "${path.module}/output/configs/index.json"
  content = jsonencode({
    services = [for name, config in var.services : {
      name = name
      port = config.port
    }]
    generated_at = timestamp()
  })
}
```

## Creating Ansible Inventory Files

```hcl
# ansible-inventory.tf - Generate Ansible inventory
variable "servers" {
  type = map(object({
    ip   = string
    role = string
  }))
  default = {
    "web-1"    = { ip = "10.0.1.10", role = "webserver" }
    "web-2"    = { ip = "10.0.1.11", role = "webserver" }
    "db-1"     = { ip = "10.0.2.10", role = "database" }
    "worker-1" = { ip = "10.0.3.10", role = "worker" }
  }
}

resource "local_file" "ansible_inventory" {
  filename = "${path.module}/output/inventory.ini"
  content = templatefile("${path.module}/templates/inventory.ini.tpl", {
    webservers = { for k, v in var.servers : k => v if v.role == "webserver" }
    databases  = { for k, v in var.servers : k => v if v.role == "database" }
    workers    = { for k, v in var.servers : k => v if v.role == "worker" }
  })
}
```

## Writing Kubernetes Configuration Files

```hcl
# kubeconfig.tf - Generate kubeconfig files
resource "local_sensitive_file" "kubeconfig" {
  filename        = "${path.module}/output/kubeconfig"
  file_permission = "0600"
  content = yamlencode({
    apiVersion = "v1"
    kind       = "Config"
    clusters = [{
      cluster = {
        server                     = var.cluster_endpoint
        certificate-authority-data = var.cluster_ca_cert
      }
      name = "main-cluster"
    }]
    contexts = [{
      context = {
        cluster = "main-cluster"
        user    = "admin"
      }
      name = "main-context"
    }]
    current-context = "main-context"
    users = [{
      name = "admin"
      user = {
        token = var.cluster_token
      }
    }]
  })
}

variable "cluster_endpoint" {
  type    = string
  default = "https://k8s.example.com:6443"
}

variable "cluster_ca_cert" {
  type    = string
  default = "base64encodedcert"
}

variable "cluster_token" {
  type      = string
  default   = "token-placeholder"
  sensitive = true
}
```

## Conclusion

The local provider is a simple but essential tool in the Terraform ecosystem. It bridges the gap between Terraform's cloud resource management and the local filesystem, enabling you to generate configuration files, scripts, and credentials as part of your infrastructure deployment. For writing sensitive data, always use local_sensitive_file with restrictive permissions. For more local file operations, see our guides on [creating local files](https://oneuptime.com/blog/post/2026-02-23-how-to-create-local-files-with-terraform/view) and [sensitive files](https://oneuptime.com/blog/post/2026-02-23-how-to-create-local-sensitive-files-with-terraform/view).
