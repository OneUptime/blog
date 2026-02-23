# How to Use Terraform with Packer for Image Building

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Packer, AMI, Image Building, DevOps, Immutable Infrastructure

Description: Learn how to integrate Terraform with Packer to build custom machine images and deploy them as immutable infrastructure for faster and more reliable deployments.

---

Packer and Terraform are both HashiCorp tools that work beautifully together. Packer builds machine images (AMIs, VM images, Docker images) with all your software pre-installed and configured. Terraform then deploys those images as running infrastructure. This combination enables an immutable infrastructure pattern where servers are never modified after deployment - instead, you build a new image and replace the old servers entirely.

This guide covers how to integrate Packer and Terraform into a seamless workflow for building and deploying custom images.

## Understanding the Packer-Terraform Workflow

The workflow follows a clear sequence. First, Packer builds a machine image with all required software and configuration baked in. Then, Terraform references that image when creating instances. When changes are needed, you build a new image with Packer and update the Terraform configuration to use it. This approach eliminates configuration drift because servers are replaced rather than modified.

## Creating a Packer Template

Start with a Packer template that builds an AMI with your application dependencies.

```hcl
# packer/app-server.pkr.hcl

# Required plugins
packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

# Variables for the build
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "app_version" {
  type    = string
  default = "latest"
}

variable "base_ami" {
  type    = string
  default = "ami-0c55b159cbfafe1f0"
}

# Source configuration for the AMI builder
source "amazon-ebs" "app_server" {
  ami_name      = "app-server-${var.app_version}-{{timestamp}}"
  instance_type = "t3.medium"
  region        = var.aws_region
  source_ami    = var.base_ami

  ssh_username = "ubuntu"

  # Tag the AMI for easy reference
  tags = {
    Name        = "app-server"
    AppVersion  = var.app_version
    BuildTime   = "{{timestamp}}"
    ManagedBy   = "packer"
    BaseAMI     = var.base_ami
  }

  # Tag the snapshot too
  snapshot_tags = {
    Name = "app-server-snapshot"
  }
}

# Build steps
build {
  sources = ["source.amazon-ebs.app_server"]

  # Update system packages
  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get upgrade -y",
      "sudo apt-get install -y curl wget unzip",
    ]
  }

  # Install application dependencies
  provisioner "shell" {
    inline = [
      "sudo apt-get install -y nginx",
      "sudo apt-get install -y python3 python3-pip",
      "sudo pip3 install gunicorn flask",
    ]
  }

  # Copy application configuration files
  provisioner "file" {
    source      = "configs/nginx.conf"
    destination = "/tmp/nginx.conf"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/nginx.conf /etc/nginx/nginx.conf",
      "sudo systemctl enable nginx",
    ]
  }

  # Install monitoring agent
  provisioner "shell" {
    inline = [
      "wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb",
      "sudo dpkg -i amazon-cloudwatch-agent.deb",
      "rm amazon-cloudwatch-agent.deb",
    ]
  }

  # Clean up for smaller image
  provisioner "shell" {
    inline = [
      "sudo apt-get clean",
      "sudo rm -rf /var/lib/apt/lists/*",
      "sudo rm -rf /tmp/*",
    ]
  }

  # Output the AMI ID to a manifest file
  post-processor "manifest" {
    output     = "manifest.json"
    strip_path = true
  }
}
```

## Referencing Packer AMIs in Terraform

After Packer builds the AMI, Terraform needs to reference it. There are several approaches.

### Approach 1: Data Source Lookup by Tags

```hcl
# Look up the latest AMI built by Packer
data "aws_ami" "app_server" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["app-server-*"]
  }

  filter {
    name   = "tag:ManagedBy"
    values = ["packer"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Use the AMI in an instance or launch template
resource "aws_launch_template" "app" {
  name_prefix   = "app-server-"
  image_id      = data.aws_ami.app_server.id
  instance_type = var.instance_type

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name    = "app-server"
      AMI     = data.aws_ami.app_server.id
      AMIName = data.aws_ami.app_server.name
    }
  }
}

# Auto Scaling Group using the launch template
resource "aws_autoscaling_group" "app" {
  name                = "app-asg-${var.environment}"
  desired_capacity    = var.desired_capacity
  max_size            = var.max_size
  min_size            = var.min_size
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Rolling update configuration
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }
}
```

### Approach 2: Variable-Based AMI Reference

```hcl
# Accept AMI ID as a variable (set by CI/CD pipeline)
variable "app_ami_id" {
  description = "AMI ID built by Packer"
  type        = string
}

resource "aws_instance" "app" {
  ami           = var.app_ami_id
  instance_type = var.instance_type

  tags = {
    Name = "app-server-${var.environment}"
  }
}
```

### Approach 3: Reading the Packer Manifest

```hcl
# Read the Packer manifest to get the latest AMI ID
locals {
  packer_manifest = jsondecode(file("${path.module}/../packer/manifest.json"))
  latest_ami_id   = local.packer_manifest.builds[length(local.packer_manifest.builds) - 1].artifact_id
  # The artifact_id format is "region:ami-id", extract just the AMI ID
  ami_id = split(":", local.latest_ami_id)[1]
}

resource "aws_instance" "app" {
  ami           = local.ami_id
  instance_type = var.instance_type
}
```

## Building Multiple Image Types

For complex environments, you may need different images for different roles.

```hcl
# Data sources for each image type
data "aws_ami" "web" {
  most_recent = true
  owners      = ["self"]
  filter {
    name   = "tag:Role"
    values = ["web"]
  }
  filter {
    name   = "tag:ManagedBy"
    values = ["packer"]
  }
}

data "aws_ami" "worker" {
  most_recent = true
  owners      = ["self"]
  filter {
    name   = "tag:Role"
    values = ["worker"]
  }
  filter {
    name   = "tag:ManagedBy"
    values = ["packer"]
  }
}

# Deploy each role with its specific image
resource "aws_launch_template" "web" {
  name_prefix = "web-"
  image_id    = data.aws_ami.web.id
  instance_type = "t3.medium"
}

resource "aws_launch_template" "worker" {
  name_prefix = "worker-"
  image_id    = data.aws_ami.worker.id
  instance_type = "c5.large"
}
```

## CI/CD Pipeline Integration

The typical CI/CD pipeline runs Packer first, captures the AMI ID, and passes it to Terraform.

```hcl
# outputs.tf - Export values for the CI/CD pipeline
output "current_ami_id" {
  description = "Currently deployed AMI ID"
  value       = data.aws_ami.app_server.id
}

output "current_ami_name" {
  description = "Currently deployed AMI name"
  value       = data.aws_ami.app_server.name
}

output "asg_name" {
  description = "ASG name for triggering instance refresh"
  value       = aws_autoscaling_group.app.name
}
```

A pipeline script would orchestrate both tools:

```bash
#!/bin/bash
# build-and-deploy.sh

# Step 1: Build new AMI with Packer
cd packer/
packer init .
packer build -var "app_version=${APP_VERSION}" app-server.pkr.hcl

# Step 2: Extract AMI ID from manifest
AMI_ID=$(jq -r '.builds[-1].artifact_id | split(":")[1]' manifest.json)
echo "Built AMI: ${AMI_ID}"

# Step 3: Deploy with Terraform
cd ../terraform/
terraform init
terraform apply -var "app_ami_id=${AMI_ID}" -auto-approve
```

## AMI Lifecycle Management

Clean up old AMIs to avoid storage costs from accumulating images.

```hcl
# Lambda function to deregister old AMIs
resource "aws_lambda_function" "ami_cleanup" {
  filename      = data.archive_file.ami_cleanup.output_path
  function_name = "ami-lifecycle-cleanup"
  role          = aws_iam_role.ami_cleanup.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 120

  environment {
    variables = {
      KEEP_LATEST_COUNT = "5"
      AMI_NAME_PREFIX   = "app-server-"
    }
  }
}
```

## Best Practices

Build images frequently and keep them small. The faster your image builds, the more often you can deploy. Use a base image layer that changes rarely and an application layer that changes frequently. Test images before deploying them to production by running integration tests against instances launched from the new AMI.

For more on building images, see our guide on [creating AMIs with Packer and deploying with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-amis-with-packer-and-deploy-with-terraform/view) and [using Terraform with Ansible](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-ansible-for-configuration-management/view).

## Conclusion

The Packer-Terraform combination enables truly immutable infrastructure where deployments are predictable, repeatable, and fast. By baking everything into machine images with Packer and deploying those images with Terraform, you eliminate configuration drift and reduce deployment failures. The initial investment in setting up the pipeline pays for itself through faster deployments, fewer production incidents, and the confidence that comes from knowing exactly what is running in every environment.
