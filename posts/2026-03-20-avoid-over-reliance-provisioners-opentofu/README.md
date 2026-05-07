# How to Avoid Over-Reliance on Provisioners in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, Best Practice, Configuration Management, Infrastructure as Code

Description: Learn why provisioners are a last resort in OpenTofu and what alternatives to use for bootstrapping and configuring infrastructure.

## Introduction

OpenTofu provisioners (`remote-exec`, `local-exec`, `file`) allow running commands on the machine running OpenTofu or on remote resources, and copying files to remote resources, during resource creation or destruction. They seem convenient but create significant problems: creation-time provisioners run only during creation, can fail and leave resources in partially configured states, are hard to test, and bypass OpenTofu's idempotency model. Understanding better alternatives saves hours of debugging.

## Why Provisioners Are Problematic

The core issues with provisioners.

```hcl
# This looks convenient but has serious problems

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    host        = self.public_ip
    private_key = file(var.private_key_path)
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo systemctl start nginx",
    ]
    # Problems:
    # 1. Creation-time provisioners only run on initial creation, never on updates
    # 2. If the script fails, the resource is tainted by default and replaced on the next apply
    # 3. Requires SSH access (security concern)
    # 4. Not idempotent - can fail if packages changed
    # 5. Can't be tested in isolation
  }
}
```

## Better Alternative 1: user_data for VM Bootstrapping

Use cloud-init via `user_data` for initial VM configuration.

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  # user_data runs via cloud-init (no SSH needed)
  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx

    # Write a simple index page
    echo "<h1>Deployed by OpenTofu</h1>" > /var/www/html/index.html
  EOF

  # Or render user_data from a file template:
  # user_data = templatefile("${path.module}/scripts/bootstrap.sh", {
  #   app_name    = var.app_name
  #   environment = var.environment
  # })
}
```

## Better Alternative 2: AMI Baking

Pre-bake AMIs with all required software using Packer.

```hcl
# Use a pre-baked AMI with all software installed
data "aws_ami" "app_server" {
  most_recent = true
  owners      = ["self"]  # your organization's account

  filter {
    name   = "name"
    values = ["myapp-server-*"]  # AMIs built by Packer
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.app_server.id  # software pre-installed
  instance_type = "t3.medium"
  # No provisioners needed - everything is in the AMI
}
```

## Better Alternative 3: Container-Based Deployments

Run applications in containers rather than configuring VMs.

```hcl
# ECS task: the container image contains everything
resource "aws_ecs_task_definition" "app" {
  family = "my-app"

  container_definitions = jsonencode([{
    name  = "app"
    image = "my-org/my-app:${var.app_version}"
    # The container handles all software configuration
    portMappings = [{
      containerPort = 8080
    }]
  }])
}
```

## Better Alternative 4: AWS Systems Manager State Manager for Post-Creation Config

If you must configure VMs after creation, use Systems Manager State Manager associations on SSM-managed instances instead of SSH-based provisioners.

```hcl
# Apply packages via SSM State Manager (no SSH needed)
resource "aws_ssm_association" "install_cloudwatch_agent" {
  name = "AWS-ConfigureAWSPackage"

  targets {
    key    = "InstanceIds"
    values = [aws_instance.web.id]
  }

  parameters = {
    action  = "Install"
    name    = "AmazonCloudWatchAgent"
    version = "latest"
  }
}
```

## When Provisioners Are Actually Appropriate

```text
Legitimate provisioner use cases (rare):
✓ Destroying resources that require external cleanup before deletion
  (use destroy-time provisioner)
✓ Notifying external systems when resources are created
  (use local-exec calling an API)
✓ One-time certificate enrollment that has no idempotent API

NOT appropriate:
✗ Installing software on VMs (use user_data or AMI baking)
✗ Running database migrations (use separate migration tooling)
✗ Bootstrapping configuration (use configuration management tools)
✗ Copying files (use S3, artifact storage, or container images)
```

## Summary

Provisioners are a last resort that bypass OpenTofu's idempotency model and create resources that are hard to reason about. For VM bootstrapping, use `user_data` with cloud-init or pre-baked AMIs. For application deployment, use containers. For post-creation configuration, use Systems Manager State Manager associations on SSM-managed instances. Reserve provisioners only for destroy-time cleanup and external notifications where no idempotent alternative exists.
