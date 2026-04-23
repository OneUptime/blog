# How to Use replace_triggered_by Lifecycle in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Lifecycle, Replace_triggered_by, Infrastructure as Code, DevOps

Description: A guide to using replace_triggered_by lifecycle in OpenTofu to trigger resource replacement when other resources change.

## Introduction

The `replace_triggered_by` lifecycle setting causes a resource to be replaced (destroyed and recreated) when referenced resources or their attributes change. This is useful when a resource must be recreated in response to changes in dependencies that wouldn't otherwise trigger replacement.

## Basic replace_triggered_by

```hcl
resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = var.ami_id
  instance_type = "t3.micro"
  user_data     = base64encode(var.user_data)
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    # Replace the instance when the launch template changes,
    # such as when its user_data changes
    replace_triggered_by = [
      aws_launch_template.web
    ]
  }
}
```

## Triggering on Specific Attributes

```hcl
resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = var.ami_id
  instance_type = "t3.micro"
  user_data     = base64encode(var.user_data)
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    # Only replace when the launch template's image_id changes
    replace_triggered_by = [
      aws_launch_template.web.image_id
    ]
  }
}
```

## Practical Use Case: Configuration Updates

```hcl
# Config stored in S3

resource "aws_s3_object" "app_config" {
  bucket  = var.config_bucket_name
  key     = "app-config.json"
  content = jsonencode(var.app_configuration)
}

# EC2 instance that needs config baked in
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  user_data     = templatefile("scripts/init.sh", { config_s3_key = aws_s3_object.app_config.key })

  lifecycle {
    # Replace instance when config changes
    replace_triggered_by = [aws_s3_object.app_config]
  }
}
```

## Kubernetes Node Pool Replacement

```hcl
resource "aws_launch_template" "node" {
  name_prefix   = "node-lt-"
  image_id      = var.node_ami
  instance_type = "t3.medium"

  user_data = base64encode(templatefile("templates/userdata.sh.tpl", {
    cluster_endpoint  = var.cluster_endpoint
    cluster_ca        = var.cluster_ca
  }))

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "nodes" {
  name_prefix      = "nodes-"
  min_size         = 2
  max_size         = 10
  desired_capacity = 3

  launch_template {
    id      = aws_launch_template.node.id
    version = aws_launch_template.node.latest_version
  }

  lifecycle {
    # Replace the ASG when the launch template changes
    replace_triggered_by = [aws_launch_template.node]
    create_before_destroy = true
  }
}
```

## Using with Locals for Complex Trigger Logic

```hcl
# Use a hash of multiple values as a single trigger
locals {
  # Hash of all values that should trigger replacement
  config_hash = sha256(jsonencode({
    ami        = var.ami_id
    user_data  = var.user_data
    config     = var.app_configuration
  }))
}

resource "terraform_data" "config_hash" {
  input = local.config_hash
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    ConfigHash = local.config_hash  # Tag tracks the config version
  }

  lifecycle {
    # replace_triggered_by only accepts managed resource references
    replace_triggered_by = [terraform_data.config_hash]
  }
}
```

## Difference from ignore_changes

```hcl
# ignore_changes: IGNORES attribute changes (don't trigger update)
resource "aws_instance" "web_ignore_changes" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  user_data     = var.user_data

  lifecycle {
    ignore_changes = [user_data]  # Changes to user_data are ignored
  }
}

# replace_triggered_by: FORCES replacement when referenced resource changes
resource "terraform_data" "config_change" {
  input = "config-v1"
}

resource "aws_instance" "web_replace_on_trigger" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    replace_triggered_by = [terraform_data.config_change]  # Replacement when config resource changes
  }
}
```

## Conclusion

`replace_triggered_by` solves the problem of cascading replacements when infrastructure has complex dependencies. Instead of relying solely on the changed attributes to determine if replacement is needed, it lets you declare that changes in one resource should trigger replacement in another. This is particularly valuable for EC2 instances that bake configuration during launch, Kubernetes nodes that embed configuration in user data, and any resource where changes to external configuration require full recreation to take effect.
