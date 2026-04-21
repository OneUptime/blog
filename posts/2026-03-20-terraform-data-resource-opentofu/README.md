# How to Use the terraform_data Resource in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Terraform_data, Trigger, Infrastructure as Code, DevOps

Description: A guide to using the terraform_data resource in OpenTofu for storing arbitrary data and triggering replacements without external providers.

## Introduction

The `terraform_data` resource is a built-in resource type that stores arbitrary values in state and supports triggers for forcing recreation of dependent resources. It requires no provider configuration and is useful for tracking custom state, triggering resource replacements, and running local provisioners.

## Basic terraform_data Usage

```hcl
# Store arbitrary data in state

resource "terraform_data" "config_version" {
  input = {
    version     = var.app_version
    config_hash = sha256(jsonencode(var.app_config))
    environment = var.environment
  }
}

output "config_info" {
  value = terraform_data.config_version.output
}
```

## Using triggers_replace

```hcl
# Replace a resource when tracked values change
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
}

resource "terraform_data" "app_trigger" {
  # When any of these values change, this resource is replaced
  triggers_replace = {
    ami_id      = var.ami_id
    config_hash = sha256(jsonencode(var.app_config))
    version     = var.app_version
  }
}

resource "aws_instance" "app_with_trigger" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    replace_triggered_by = [terraform_data.app_trigger]
  }
}
```

## Running Local Commands with Provisioners

```hcl
# Run a local script after infrastructure is created
resource "terraform_data" "run_migration" {
  # Trigger re-run when the DB endpoint changes
  triggers_replace = {
    db_endpoint = aws_db_instance.main.endpoint
    schema_hash = filesha256("${path.module}/migrations/schema.sql")
  }

  provisioner "local-exec" {
    command = <<-EOT
      psql \
        --host=${aws_db_instance.main.address} \
        --port=${aws_db_instance.main.port} \
        --username=${var.db_username} \
        --dbname=${var.db_name} \
        -f ${path.module}/migrations/schema.sql
    EOT

    environment = {
      PGPASSWORD = var.db_password
    }
  }
}
```

## Replacing null_resource

```hcl
# Old way: null_resource (requires null provider)
# resource "null_resource" "example" {
#   triggers = {
#     always_run = timestamp()
#   }
#   provisioner "local-exec" {
#     command = "echo hello"
#   }
# }

# New way: terraform_data (built-in, no provider needed)
resource "terraform_data" "example" {
  triggers_replace = timestamp()  # Always replace

  provisioner "local-exec" {
    command = "echo hello"
  }
}
```

## Tracking Deployment State

```hcl
locals {
  deployment_config = {
    app_version   = var.app_version
    config_hash   = sha256(jsonencode(var.app_config))
    environment   = var.environment
    deployment_id = var.deployment_id
  }
}

resource "terraform_data" "deployment_tracker" {
  input = local.deployment_config
}

# Use in another resource to force replacement on changes
resource "aws_ecs_task_definition" "app" {
  family = "myapp"

  container_definitions = jsonencode([{
    name  = "app"
    image = "myapp:${var.app_version}"
    # ...
  }])

  lifecycle {
    replace_triggered_by = [terraform_data.deployment_tracker]
  }
}
```

## Chaining Provisioners

```hcl
# Run multiple commands in sequence
resource "terraform_data" "setup_cluster" {
  triggers_replace = {
    cluster_endpoint = aws_eks_cluster.main.endpoint
    cluster_name     = aws_eks_cluster.main.name
  }

  provisioner "local-exec" {
    command = "aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region ${var.region}"
  }

  provisioner "local-exec" {
    command = "kubectl apply -f ${path.module}/manifests/namespaces.yaml"
  }

  provisioner "local-exec" {
    command = "helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx"
  }

  depends_on = [aws_eks_node_group.workers]
}
```

## Reading Output Values

```hcl
resource "terraform_data" "metadata" {
  input = {
    cluster_name = aws_eks_cluster.main.name
    region       = var.region
    account_id   = data.aws_caller_identity.current.account_id
    environment  = var.environment
  }
}

# Access the stored data
output "cluster_metadata" {
  value = terraform_data.metadata.output
}

# Reference in other resources
resource "aws_ssm_parameter" "cluster_info" {
  name  = "/myapp/cluster-name"
  type  = "String"
  value = terraform_data.metadata.output.cluster_name
}
```

## Conditional Provisioning

```hcl
variable "run_migrations" {
  type    = bool
  default = false
}

resource "terraform_data" "migrations" {
  count = var.run_migrations ? 1 : 0

  triggers_replace = {
    db_endpoint = aws_db_instance.main.endpoint
  }

  provisioner "local-exec" {
    command = "python manage.py migrate"
    environment = {
      DATABASE_URL = "postgresql://${var.db_user}:${var.db_pass}@${aws_db_instance.main.endpoint}/${var.db_name}"
    }
  }
}
```

## Conclusion

The `terraform_data` resource is a versatile built-in resource for tasks that don't map to a specific infrastructure resource. It replaces the `null_resource` from the null provider (which required external configuration) with a zero-dependency alternative. Use `terraform_data` for tracking deployment state, triggering resource replacements based on custom logic, running local provisioners during infrastructure changes, and storing computed values in state for later reference. The `triggers_replace` argument is especially useful for creating fine-grained replacement triggers that can't be expressed through standard `replace_triggered_by` references.
