# How to Use Lifecycle Rules with replace_triggered_by in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Lifecycle, Infrastructure as Code, Resource Replacement, DevOps

Description: Learn how to use the replace_triggered_by lifecycle argument in Terraform to force resource replacement when dependent resources or attributes change.

---

Terraform is great at detecting when a resource attribute changes and needs an update. But sometimes you need to replace a resource based on changes to something else entirely - another resource, a variable, or an attribute that Terraform would not normally consider relevant. That is exactly what `replace_triggered_by` is for.

Introduced in Terraform 1.2, `replace_triggered_by` lets you define explicit replacement triggers. When any referenced object changes, Terraform marks the resource for replacement. This gives you precise control over resource recreation that goes beyond Terraform's built-in dependency tracking.

## Why replace_triggered_by Exists

Before `replace_triggered_by`, forcing a resource to recreate based on external changes was awkward. You had two options:

1. Use a `null_resource` with `triggers` and chain dependencies.
2. Use `terraform taint` to manually mark a resource for replacement.

Both approaches had problems. The `null_resource` approach required extra boilerplate and did not integrate cleanly with the resource you actually wanted to replace. The `taint` approach was manual and did not persist in configuration.

`replace_triggered_by` solves this by making replacement triggers a first-class part of the resource definition.

## Basic Syntax

The `replace_triggered_by` argument lives inside the `lifecycle` block. It accepts a list of references to other resources or resource attributes.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.public.id

  lifecycle {
    # Replace this instance whenever the subnet changes
    replace_triggered_by = [aws_subnet.public.id]
  }
}
```

In this example, if the subnet gets replaced (maybe because you changed its CIDR block), the EC2 instance will also be replaced. Without `replace_triggered_by`, Terraform might try to do an in-place update or might not detect the need for replacement at all.

## Referencing Entire Resources vs. Attributes

You can reference either an entire resource or a specific attribute. The behavior differs slightly.

### Referencing an Entire Resource

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.ami_id
  instance_type = "t3.medium"

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    db_host = var.db_host
  }))
}

resource "aws_instance" "app" {
  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
  subnet_id = var.subnet_id

  lifecycle {
    # Replace the instance when the entire launch template changes
    replace_triggered_by = [aws_launch_template.app]
  }
}
```

When you reference the entire resource (`aws_launch_template.app`), any change to any attribute of that resource triggers replacement. This is the broadest trigger.

### Referencing a Specific Attribute

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id

  lifecycle {
    # Only replace when the launch template version changes
    replace_triggered_by = [aws_launch_template.app.latest_version]
  }
}
```

This is more targeted. Only a change to `latest_version` triggers the replacement. Other changes to the launch template are ignored.

## Practical Use Cases

### Rotating TLS Certificates

When you rotate a TLS certificate, you often need to restart the service that uses it. If the service is an EC2 instance running nginx, you might want to replace the instance to pick up the new certificate.

```hcl
resource "tls_private_key" "app" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "app" {
  private_key_pem = tls_private_key.app.private_key_pem

  subject {
    common_name  = "app.example.com"
    organization = "Example Corp"
  }

  validity_period_hours = 8760 # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  user_data = templatefile("${path.module}/setup.sh", {
    cert_pem = tls_self_signed_cert.app.cert_pem
    key_pem  = tls_private_key.app.private_key_pem
  })

  lifecycle {
    # Recreate the instance whenever the certificate is regenerated
    replace_triggered_by = [tls_self_signed_cert.app]
  }
}
```

### Rebuilding After Configuration Changes

Sometimes you have a resource that cannot be updated in place when its configuration changes. For example, an ECS task definition change might require recreating the service.

```hcl
resource "aws_ecs_task_definition" "api" {
  family                   = "api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${var.ecr_repo}:${var.image_tag}"
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnets
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  lifecycle {
    # Force a new deployment when the task definition changes
    replace_triggered_by = [aws_ecs_task_definition.api.revision]
  }
}
```

### Secret Rotation

When a secret rotates, resources that consume it may need to be recreated.

```hcl
resource "random_password" "db" {
  length  = 24
  special = true
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = random_password.db.result
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  user_data = templatefile("${path.module}/init.sh", {
    secret_arn = aws_secretsmanager_secret.db.arn
  })

  lifecycle {
    # When the password changes, rebuild the app server
    # so it picks up the new credentials
    replace_triggered_by = [random_password.db.result]
  }
}
```

## Multiple Triggers

You can specify multiple triggers in a single `replace_triggered_by` list. The resource will be replaced if any of them change.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  lifecycle {
    replace_triggered_by = [
      aws_security_group.web.id,      # Replace if SG is recreated
      aws_key_pair.deployer.id,        # Replace if SSH key changes
      aws_launch_template.web.id,      # Replace if template changes
    ]
  }
}
```

## Combining with Other Lifecycle Arguments

`replace_triggered_by` works alongside other lifecycle arguments. Here is a resource that uses `create_before_destroy` to minimize downtime during triggered replacements.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id

  lifecycle {
    # Create the new one before destroying the old one
    create_before_destroy = true

    # Trigger replacement when the launch template changes
    replace_triggered_by = [aws_launch_template.web]
  }
}
```

This combination means: when the launch template changes, create a new instance first, then destroy the old one. This is useful for maintaining availability.

## Interaction with ignore_changes

Be aware of how `replace_triggered_by` interacts with `ignore_changes`. If an attribute is listed in `ignore_changes`, changes to that attribute will not trigger replacement through `replace_triggered_by` either.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  lifecycle {
    # This will NOT trigger replacement because ami is ignored
    ignore_changes         = [ami]
    replace_triggered_by   = [aws_instance.web.ami]  # This has no effect
  }
}
```

This is an important gotcha. If you need to both ignore drift for normal applies and trigger replacement for specific changes, you will need to structure your dependencies differently.

## Limitations

There are a few things to keep in mind:

1. **Only references to managed resources and their attributes are allowed.** You cannot reference data sources, variables, or locals directly. If you need to trigger on a variable change, you can use `terraform_data` as an intermediary.

2. **Self-references are not allowed.** You cannot use `replace_triggered_by` to reference attributes of the same resource.

3. **The referenced resource must be in the same module.** Cross-module references are not supported.

### Using terraform_data as an Intermediary

```hcl
resource "terraform_data" "config_version" {
  input = var.config_version
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  lifecycle {
    # Replace the instance when the config version variable changes
    replace_triggered_by = [terraform_data.config_version]
  }
}
```

This pattern lets you trigger replacement based on arbitrary values that are not direct resource attributes.

## When to Use replace_triggered_by

Use `replace_triggered_by` when:

- A resource must be recreated after a dependent resource changes
- In-place updates are not possible or not desirable
- You need deterministic, automated replacement without manual taint operations
- Certificate, secret, or configuration rotation requires service restart

Avoid using it for everything. Over-triggering replacements causes unnecessary downtime and churn. Only add replacement triggers for genuine dependencies that Terraform cannot detect on its own.

## Summary

`replace_triggered_by` fills a gap in Terraform's lifecycle management. It lets you declare explicit replacement dependencies between resources, eliminating the need for manual taint operations and hacky workarounds with `null_resource` triggers. Combined with `create_before_destroy`, it enables zero-downtime replacement workflows that are fully automated and version-controlled.

For more on Terraform lifecycle management, see our post on [ignore_changes](https://oneuptime.com/blog/post/2026-02-23-terraform-lifecycle-ignore-changes/view) and the [broader lifecycle rules overview](https://oneuptime.com/blog/post/2026-01-24-terraform-lifecycle-rules/view).
