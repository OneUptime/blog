# How to Use Lifecycle Rules with ignore_changes in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Lifecycle, Infrastructure as Code, DevOps, Drift Management

Description: Learn how to use the ignore_changes lifecycle argument in Terraform to prevent unwanted updates when external processes modify resource attributes outside of Terraform control.

---

When you manage infrastructure with Terraform, you expect your configuration files to be the single source of truth. But in practice, other tools, auto-scaling policies, manual interventions, and cloud provider behaviors change resource attributes after Terraform creates them. Without `ignore_changes`, Terraform would try to revert those modifications on the next apply, potentially breaking your running services.

The `ignore_changes` lifecycle argument tells Terraform to look the other way when specific attributes drift from the declared configuration. It is one of the most commonly used lifecycle rules, and getting it right prevents a whole class of frustrating plan-apply loops.

## The Problem ignore_changes Solves

Consider this scenario. You deploy an Auto Scaling Group with a desired capacity of 2. During a traffic spike, the auto-scaling policy increases the desired capacity to 5. The next time someone runs `terraform plan`, Terraform shows a diff that says it wants to change `desired_capacity` from 5 back to 2. If you apply that change, you just killed three instances in the middle of a traffic spike.

This is not a theoretical problem. It happens all the time with attributes that are meant to be managed outside of Terraform after the initial creation.

## Basic Syntax

The `ignore_changes` argument lives inside a `lifecycle` block within a resource definition. You pass it a list of attribute names that Terraform should not track for changes.

```hcl
resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  min_size            = 1
  max_size            = 10
  desired_capacity    = 2
  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
  vpc_zone_identifier = var.subnet_ids

  lifecycle {
    # Let the auto-scaling policy manage desired_capacity
    # Terraform will only enforce this on initial creation
    ignore_changes = [desired_capacity]
  }
}
```

After the initial creation with `desired_capacity = 2`, Terraform will not attempt to revert it even if the actual value changes to 5, 8, or any other number.

## Ignoring Multiple Attributes

You can list multiple attributes in the `ignore_changes` list. This is common with resources that get modified by multiple external systems.

```hcl
resource "aws_instance" "app_server" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  tags = {
    Name = "app-server"
  }

  lifecycle {
    # Tags might be modified by AWS Config auto-tagging
    # AMI might be updated by a separate image pipeline
    ignore_changes = [ami, tags]
  }
}
```

In this case, both the AMI and tags are ignored. If your image pipeline updates the AMI or AWS Config adds compliance tags, Terraform will not undo those changes.

## Using ignore_changes = all

If you want Terraform to ignore all attribute changes on a resource, you can use the special `all` keyword.

```hcl
resource "aws_instance" "managed_externally" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  lifecycle {
    # This resource is created by Terraform but fully managed
    # by another tool after creation
    ignore_changes = all
  }
}
```

This tells Terraform: create the resource, then hands off. Terraform will still track the resource in state and destroy it if you remove it from configuration, but it will never propose any updates.

Be careful with `all`. It effectively turns the resource into a "create-only" object. If you actually need to change something, you will have to either remove `ignore_changes`, taint the resource, or use `terraform state rm` and re-import.

## Common Use Cases

### Auto Scaling Groups

This is the classic use case. The `desired_capacity` gets modified by scaling policies, and you want Terraform to leave it alone.

```hcl
resource "aws_autoscaling_group" "backend" {
  name                = "backend-asg"
  min_size            = 2
  max_size            = 20
  desired_capacity    = 4
  launch_template {
    id      = aws_launch_template.backend.id
    version = "$Latest"
  }
  vpc_zone_identifier = var.private_subnet_ids

  lifecycle {
    ignore_changes = [desired_capacity]
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}
```

### ECS Service Task Count

Similar to ASGs, ECS services with Application Auto Scaling will have their `desired_count` changed by scaling policies.

```hcl
resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnets
    security_groups = [aws_security_group.ecs.id]
  }

  lifecycle {
    # Auto Scaling manages the task count after initial deployment
    ignore_changes = [desired_count, task_definition]
  }
}
```

Notice that `task_definition` is also ignored here. That is a common pattern when a CI/CD pipeline updates the task definition separately, and you do not want Terraform to roll it back.

### Kubernetes Deployments

If you use the Kubernetes provider, the replica count on deployments can be managed by a Horizontal Pod Autoscaler.

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "app"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "myapp"
      }
    }

    template {
      metadata {
        labels = {
          app = "myapp"
        }
      }
      spec {
        container {
          name  = "app"
          image = "myapp:latest"
        }
      }
    }
  }

  lifecycle {
    # HPA manages replica count
    ignore_changes = [spec[0].replicas]
  }
}
```

### Azure Resources with External Tag Management

Azure Policy can automatically apply tags to resources. If you do not ignore those tags, Terraform will fight with Azure Policy on every apply.

```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-production"
  location = "East US"

  tags = {
    Environment = "production"
    Team        = "platform"
  }

  lifecycle {
    # Azure Policy adds compliance tags we don't manage
    ignore_changes = [tags]
  }
}
```

## Ignoring Nested Attributes

You can reference nested attributes using the standard Terraform indexing syntax.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  lifecycle {
    # Ignore changes to root block device settings
    ignore_changes = [root_block_device[0].volume_size]
  }
}
```

This ignores only the `volume_size` inside the first `root_block_device` block, leaving all other attributes tracked normally.

## Gotchas and Pitfalls

### You Cannot Ignore Computed-Only Attributes

If an attribute is computed by the provider and not settable in your configuration, you do not need to ignore it because Terraform already knows it is not something you control.

### Ignoring Changes Does Not Prevent Initial Set

The `ignore_changes` rule only applies to updates. The initial value in your configuration is still used when the resource is first created. So you should still set a reasonable default.

### Plan Output Can Be Confusing

When `ignore_changes` is active, `terraform plan` will not show diffs for those attributes, even if the actual state has drifted significantly. This can mask real problems. If your EC2 instance is running on a completely different AMI than your configuration says, and you have `ignore_changes = [ami]`, you will never know about it from the plan output.

### Interactions with replace_triggered_by

If you use `replace_triggered_by` alongside `ignore_changes`, be aware that `ignore_changes` takes precedence for the attributes it covers. A change to an ignored attribute will not trigger a replacement, even if `replace_triggered_by` references something that would normally cause one.

## When Not to Use ignore_changes

Do not use `ignore_changes` as a band-aid for configuration problems. If your Terraform code and actual infrastructure are constantly out of sync for an attribute, the right fix might be to update your configuration to match reality, not to ignore the drift.

Also avoid ignoring security-critical attributes. If someone manually changes a security group rule to allow all inbound traffic, you probably want Terraform to revert that on the next apply, not ignore it.

## A Quick Reference

```hcl
lifecycle {
  # Ignore a single attribute
  ignore_changes = [tags]

  # Ignore multiple attributes
  ignore_changes = [tags, ami, instance_type]

  # Ignore nested attributes
  ignore_changes = [root_block_device[0].volume_size]

  # Ignore everything
  ignore_changes = all
}
```

## Wrapping Up

The `ignore_changes` lifecycle argument is a critical tool for managing infrastructure where Terraform is not the only actor. Auto-scaling groups, CI/CD-managed deployments, externally tagged resources, and anything with a lifecycle beyond Terraform's control benefit from targeted use of `ignore_changes`.

The key is to be intentional about it. Ignore only what you need to, document why you are ignoring it with comments, and periodically review your `ignore_changes` blocks to make sure they are still necessary. If you want to learn more about related lifecycle arguments, check out our post on [replace_triggered_by](https://oneuptime.com/blog/post/2026-02-23-terraform-lifecycle-replace-triggered-by/view).
