# How to Use terraform_data as a Replacement for null_resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform_data, Null_resource, Infrastructure as Code, DevOps

Description: Learn how to use the terraform_data managed resource as a modern built-in replacement for null_resource, with input and output tracking, triggers, and provisioner support.

---

For years, `null_resource` was the go-to workaround for running provisioners outside the context of a real infrastructure resource. It worked, but it required an external provider (`hashicorp/null`) and had limited ability to pass data through the resource lifecycle. Terraform 1.4 introduced `terraform_data` as a built-in replacement that solves both problems. It is part of the Terraform core - no extra provider needed - and it can store and track arbitrary values.

## Why terraform_data Exists

The `null_resource` has two main limitations:

1. **Requires an external provider.** You must declare the `hashicorp/null` provider in your configuration. This adds a dependency that needs version management and can cause issues during `terraform init` if the registry is unreachable.

2. **No input/output tracking.** The only way to pass data through a `null_resource` is via `triggers`, which are strings only and do not participate in Terraform's type system.

`terraform_data` fixes both. It is a built-in managed resource type that requires no provider declaration. It has `input` and `output` attributes that track arbitrary typed values and trigger replacement when they change.

## Basic Syntax

```hcl
resource "terraform_data" "example" {
  input = "some value"
}
```

That is it. No provider block needed. The `input` attribute accepts any Terraform value - strings, numbers, lists, maps, objects. The `output` attribute mirrors the `input` and can be referenced by other resources.

## Comparing null_resource and terraform_data

Here is the same pattern implemented both ways.

### Old Way: null_resource

```hcl
terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

resource "null_resource" "deploy" {
  triggers = {
    image_tag = var.image_tag
  }

  provisioner "local-exec" {
    command = "kubectl set image deployment/app app=${var.ecr_repo}:${var.image_tag}"
  }
}
```

### New Way: terraform_data

```hcl
resource "terraform_data" "deploy" {
  input = var.image_tag

  provisioner "local-exec" {
    command = "kubectl set image deployment/app app=${var.ecr_repo}:${var.image_tag}"
  }
}
```

Cleaner. No provider requirement. And the `input` can be any type, not just strings.

## The input and output Attributes

The `input` attribute stores a value. When the value changes, the resource is replaced (its provisioners run again). The `output` attribute provides the stored value for other resources to reference.

```hcl
resource "terraform_data" "config" {
  input = {
    db_host     = aws_db_instance.main.address
    db_port     = 5432
    redis_host  = aws_elasticache_cluster.main.cache_nodes[0].address
    environment = var.environment
  }
}

# Reference the output in another resource
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  user_data = templatefile("${path.module}/userdata.sh", {
    db_host     = terraform_data.config.output.db_host
    db_port     = terraform_data.config.output.db_port
    redis_host  = terraform_data.config.output.redis_host
    environment = terraform_data.config.output.environment
  })
}
```

When any of the input values change, the `terraform_data` resource is replaced. Resources that reference its output will see the new values.

## The triggers_replace Argument

In addition to `input`, `terraform_data` has a `triggers_replace` argument. While `input` changes cause the resource to be replaced (and its stored values update), `triggers_replace` lets you trigger replacement based on external values without storing them.

```hcl
resource "terraform_data" "restart_service" {
  # Replace when either of these changes
  triggers_replace = [
    aws_launch_template.app.latest_version,
    aws_secretsmanager_secret_version.app.version_id,
  ]

  provisioner "local-exec" {
    command = "aws ecs update-service --cluster ${var.cluster_name} --service ${var.service_name} --force-new-deployment"
  }
}
```

The difference between `input` and `triggers_replace`:
- `input` stores a value that can be referenced via `output`
- `triggers_replace` only triggers replacement - the values are not stored or accessible

## Use Cases

### Replacing Resources Based on Variable Changes

This is the `replace_triggered_by` use case when you need to trigger replacement based on a variable (which `replace_triggered_by` does not directly support).

```hcl
resource "terraform_data" "config_version" {
  input = var.config_version
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  lifecycle {
    replace_triggered_by = [terraform_data.config_version]
  }
}
```

When `var.config_version` changes, the `terraform_data` resource is replaced, which triggers the instance replacement.

### Running Scripts on Configuration Changes

```hcl
resource "terraform_data" "apply_config" {
  input = md5(file("${path.module}/config/app.yaml"))

  provisioner "local-exec" {
    command = <<-EOT
      aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region ${var.region}
      kubectl apply -f ${path.module}/config/app.yaml
    EOT
  }

  depends_on = [aws_eks_cluster.main]
}
```

### Storing Computed Values

Unlike `null_resource`, `terraform_data` can store and expose complex typed values.

```hcl
resource "terraform_data" "network_config" {
  input = {
    vpc_id     = aws_vpc.main.id
    subnet_ids = aws_subnet.private[*].id
    cidr_blocks = {
      public  = [for s in aws_subnet.public : s.cidr_block]
      private = [for s in aws_subnet.private : s.cidr_block]
    }
  }
}

# Other modules or resources can reference these computed values
output "network_config" {
  value = terraform_data.network_config.output
}
```

### Database Migrations

```hcl
resource "terraform_data" "db_migration" {
  input = md5(join("", [
    for f in fileset("${path.module}/migrations", "*.sql") :
    filemd5("${path.module}/migrations/${f}")
  ]))

  provisioner "local-exec" {
    command = <<-EOT
      export PGPASSWORD="${var.db_password}"
      for file in $(ls ${path.module}/migrations/*.sql | sort); do
        psql -h ${aws_db_instance.main.address} \
             -U ${var.db_username} \
             -d ${var.db_name} \
             -f "$file"
      done
    EOT
  }

  depends_on = [aws_db_instance.main]
}
```

### Destruction-Time Cleanup

```hcl
resource "terraform_data" "cleanup" {
  input = {
    cluster_name = aws_eks_cluster.main.name
    region       = var.region
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      aws eks update-kubeconfig --name ${self.output.cluster_name} --region ${self.output.region}
      kubectl delete ingress --all -A --timeout=60s || true
      sleep 30
    EOT
  }
}
```

Notice how destruction-time provisioners can reference `self.output` instead of `self.triggers`. This is a significant improvement over `null_resource`, where you had to carefully store values in triggers to make them available at destroy time.

### Running a One-Time Setup

```hcl
resource "terraform_data" "initial_setup" {
  # This input never changes, so the provisioner runs only once
  input = "v1"

  provisioner "local-exec" {
    command = <<-EOT
      aws s3 cp s3://config-bucket/initial-data.tar.gz /tmp/
      tar xzf /tmp/initial-data.tar.gz -C /tmp/data/
      aws s3 sync /tmp/data/ s3://${aws_s3_bucket.app.bucket}/data/
    EOT
  }

  depends_on = [aws_s3_bucket.app]
}
```

Since the input is a static string `"v1"`, the provisioner runs only on the first apply. To re-run it, change the input to `"v2"`.

## Migration from null_resource

Migrating from `null_resource` to `terraform_data` is straightforward, but it requires a state change since they are different resource types. You have two options:

### Option 1: Remove and Re-create

Simply replace the `null_resource` with `terraform_data` in your code. Terraform will destroy the old `null_resource` and create a new `terraform_data` resource. The provisioners will run again.

### Option 2: Use moved Blocks

```hcl
# Old code (remove this)
# resource "null_resource" "deploy" {
#   triggers = { image_tag = var.image_tag }
#   provisioner "local-exec" { ... }
# }

# New code
resource "terraform_data" "deploy" {
  input = var.image_tag

  provisioner "local-exec" {
    command = "kubectl set image deployment/app app=${var.ecr_repo}:${var.image_tag}"
  }
}

# Note: moved blocks between different resource types are not supported,
# so you will need to use terraform state mv or accept the recreate
```

Since `moved` blocks do not support cross-type moves, you will need to either accept the recreate or use `terraform state rm` and `terraform import` to manually migrate the state.

## When to Still Use null_resource

There are a few edge cases where `null_resource` is still necessary:

1. **Terraform versions before 1.4.** If you are on an older version, `terraform_data` is not available.
2. **Provider-specific features.** Some third-party tooling may expect `null_resource` specifically.

For everything else, prefer `terraform_data`.

## Summary

`terraform_data` is the modern replacement for `null_resource`. It is built into Terraform core, requires no external provider, and offers typed `input`/`output` attributes alongside `triggers_replace` for controlling when provisioners re-execute. If you are writing new Terraform code or refactoring existing configurations, use `terraform_data` instead of `null_resource`.

For more context on the patterns that `terraform_data` supports, see our post on [null_resource workarounds](https://oneuptime.com/blog/post/2026-02-23-terraform-null-resource-provisioner-workarounds/view) and [provisioners with resources](https://oneuptime.com/blog/post/2026-02-23-terraform-provisioners-with-resources/view).
