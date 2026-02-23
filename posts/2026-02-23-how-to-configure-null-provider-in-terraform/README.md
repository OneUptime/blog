# How to Configure Null Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Null Provider, Provisioners, Infrastructure as Code

Description: Learn how to configure and use the Null provider in Terraform for running provisioners, creating dependency chains, and triggering actions on changes.

---

The Null provider in Terraform is one of those tools that seems pointless at first glance but turns out to be incredibly useful in practice. It provides a resource called `null_resource` that does not create any actual infrastructure. Instead, it serves as a container for running provisioners, establishing dependency chains, and triggering actions based on changes to other resources.

If you have ever needed to run a script after Terraform creates a resource, or wanted to force a re-run of some action when a value changes, the Null provider is your friend.

## Prerequisites

- Terraform 1.0 or later
- Basic understanding of Terraform resources and provisioners

## Declaring the Provider

```hcl
# versions.tf - Declare the Null provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}
```

The Null provider does not need any configuration, so the provider block is empty.

```hcl
# provider.tf - No configuration needed
provider "null" {}
```

## The null_resource Resource

The core of this provider is the `null_resource` resource type. It has one important argument: `triggers`. When any trigger value changes, the resource is destroyed and recreated, which causes any associated provisioners to run again.

```hcl
# A basic null_resource that runs a local script
resource "null_resource" "example" {
  # Triggers determine when the resource is recreated
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = "echo 'This runs every time you apply'"
  }
}
```

## Common Use Cases

### Running Scripts After Resource Creation

One of the most common uses is running a script after Terraform creates a resource.

```hcl
# Create a server
resource "aws_instance" "app" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"

  tags = {
    Name = "app-server"
  }
}

# Run a configuration script after the server is created
resource "null_resource" "configure_app" {
  # Re-run if the instance changes
  triggers = {
    instance_id = aws_instance.app.id
  }

  # Wait for the instance to be reachable
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo systemctl start nginx"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/id_rsa")
      host        = aws_instance.app.public_ip
    }
  }
}
```

### Running Local Commands

```hcl
# Run a local command to update a configuration file
resource "null_resource" "update_inventory" {
  triggers = {
    instance_ips = join(",", aws_instance.cluster[*].private_ip)
  }

  # Generate an Ansible inventory file
  provisioner "local-exec" {
    command = <<-EOT
      echo "[web_servers]" > inventory.ini
      for ip in ${join(" ", aws_instance.cluster[*].private_ip)}; do
        echo "$ip ansible_user=ubuntu" >> inventory.ini
      done
    EOT
  }
}
```

### Triggering Actions on Changes

The `triggers` map is what makes `null_resource` truly powerful. You can tie it to any value, and when that value changes, the resource is recreated.

```hcl
# Re-run deployment when the Docker image tag changes
variable "image_tag" {
  type    = string
  default = "v1.0.0"
}

resource "null_resource" "deploy" {
  triggers = {
    image_tag = var.image_tag
  }

  provisioner "local-exec" {
    command = "kubectl set image deployment/myapp myapp=myregistry/myapp:${var.image_tag}"
  }
}
```

### Creating Dependency Chains

Sometimes you need to enforce ordering between resources that Terraform cannot automatically detect.

```hcl
# Step 1: Create the database
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  # ... other config
}

# Step 2: Run database migrations (depends on the database being ready)
resource "null_resource" "db_migrations" {
  triggers = {
    db_endpoint = aws_db_instance.main.endpoint
  }

  # This forces Terraform to wait for the database before running migrations
  depends_on = [aws_db_instance.main]

  provisioner "local-exec" {
    command = "python manage.py migrate"

    environment = {
      DATABASE_URL = "postgresql://${aws_db_instance.main.endpoint}/mydb"
    }
  }
}

# Step 3: Deploy the application (depends on migrations)
resource "aws_ecs_service" "app" {
  depends_on = [null_resource.db_migrations]
  # ... service config
}
```

### Conditional Execution

You can use `count` or `for_each` with `null_resource` to conditionally run actions.

```hcl
variable "run_migrations" {
  type    = bool
  default = true
}

# Only run migrations if the variable is set to true
resource "null_resource" "migrations" {
  count = var.run_migrations ? 1 : 0

  triggers = {
    migration_hash = filesha256("migrations/latest.sql")
  }

  provisioner "local-exec" {
    command = "psql -f migrations/latest.sql"
  }
}
```

### Multiple Provisioners

A single `null_resource` can have multiple provisioners that run in order.

```hcl
# Run multiple steps in sequence
resource "null_resource" "setup" {
  triggers = {
    cluster_id = aws_eks_cluster.main.id
  }

  # Step 1: Update kubeconfig
  provisioner "local-exec" {
    command = "aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region us-east-1"
  }

  # Step 2: Install cluster essentials
  provisioner "local-exec" {
    command = "kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/aws/deploy.yaml"
  }

  # Step 3: Wait for ingress controller to be ready
  provisioner "local-exec" {
    command = "kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s"
  }
}
```

### Cleanup with Destroy Provisioners

You can run actions when a resource is destroyed using the `when = destroy` option.

```hcl
resource "null_resource" "cleanup" {
  triggers = {
    cluster_name = var.cluster_name
  }

  # This runs during normal apply
  provisioner "local-exec" {
    command = "echo 'Setting up ${var.cluster_name}'"
  }

  # This runs when the resource is destroyed
  provisioner "local-exec" {
    when    = destroy
    command = "echo 'Cleaning up ${self.triggers.cluster_name}'"
  }
}
```

Note that destroy-time provisioners can only reference `self.triggers` - they cannot access other resources or variables.

## The terraform_data Resource (Modern Alternative)

Starting with Terraform 1.4, there is a built-in alternative called `terraform_data` that does not require any external provider.

```hcl
# terraform_data works similarly to null_resource but is built-in
resource "terraform_data" "example" {
  # triggers_replace works like null_resource triggers
  triggers_replace = [
    var.image_tag
  ]

  provisioner "local-exec" {
    command = "echo 'Deploying ${var.image_tag}'"
  }
}
```

The `terraform_data` resource also supports `input` and `output` attributes for passing data.

```hcl
resource "terraform_data" "version" {
  input = var.app_version
}

# Reference the stored value
output "deployed_version" {
  value = terraform_data.version.output
}
```

## When to Use null_resource

Use `null_resource` when you need to:

- Run a script or command as part of your Terraform workflow
- Create explicit dependencies between resources
- Trigger an action when some value changes
- Execute setup or cleanup steps around infrastructure changes
- Bridge Terraform with external tools like Ansible, kubectl, or custom scripts

## When Not to Use null_resource

Avoid `null_resource` when:

- A native Terraform resource or data source can do the job
- You are using it to work around a missing provider feature (consider writing or requesting the feature instead)
- The action does not need to be part of the Terraform lifecycle

## Best Practices

1. Always use meaningful trigger values. Using `timestamp()` as a trigger forces re-execution on every apply, which is usually not what you want in production.

2. Keep provisioner scripts short. If you need complex logic, put it in an external script and call that.

3. Use `terraform_data` instead of `null_resource` if you are on Terraform 1.4 or later. It is built-in and does not require downloading an external provider.

4. Be careful with destroy provisioners. They run during `terraform destroy` and can fail, blocking the destroy operation.

5. Document why you are using `null_resource`. Future maintainers will thank you for explaining the purpose.

## Wrapping Up

The Null provider and `null_resource` fill an important gap in Terraform's capabilities. They let you run arbitrary actions as part of your infrastructure workflow, create explicit dependency chains, and react to changes in other resources. While the newer `terraform_data` resource offers similar functionality without an external provider, `null_resource` remains widely used and well-understood.

For monitoring the infrastructure you provision with Terraform, including the services those provisioner scripts set up, check out [OneUptime](https://oneuptime.com) for end-to-end observability.
