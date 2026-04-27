# How to Use Packer-Built AMIs in OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Packer, AMI, AWS, Immutable Infrastructure

Description: Learn how to use Packer to build custom AMIs and reference them in OpenTofu configurations using data sources and automated tagging for immutable infrastructure deployments.

## Introduction

Packer builds machine images with all software pre-installed and configured. OpenTofu then uses those images to launch instances - no configuration management at instance launch time, just a pre-baked image that starts quickly and consistently. This immutable infrastructure pattern reduces deployment time and eliminates configuration drift.

## Packer Template for Custom AMI

```hcl
# packer/web-server.pkr.hcl

packer {
  required_plugins {
    amazon = {
      version = ">= 1.3.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "app_version" {
  type    = string
  default = "latest"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

source "amazon-ebs" "web_server" {
  region        = var.aws_region
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
      virtualization-type = "hvm"
    }
    owners      = ["099720109477"]  # Canonical
    most_recent = true
  }
  instance_type = "t3.medium"
  ssh_username  = "ubuntu"

  ami_name        = "web-server-${var.app_version}-{{timestamp}}"
  ami_description = "Pre-baked web server AMI with app version ${var.app_version}"

  tags = {
    Name        = "web-server"
    Version     = var.app_version
    BuildDate   = "{{isotime}}"
    ManagedBy   = "Packer"
    Application = "web-server"
  }
}

build {
  sources = ["source.amazon-ebs.web_server"]

  provisioner "shell" {
    inline = [
      "sudo apt-get update -y",
      "sudo apt-get install -y nginx python3 python3-pip",
    ]
  }

  provisioner "ansible" {
    playbook_file = "../ansible/playbooks/bake-web-server.yml"
    extra_arguments = [
      "-e", "app_version=${var.app_version}"
    ]
  }

  post-processor "manifest" {
    output     = "packer-manifest.json"
    strip_path = true
  }
}
```

## OpenTofu Data Source to Find Packer AMI

```hcl
# Find the latest Packer-built AMI by tags
data "aws_ami" "web_server" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "tag:Application"
    values = ["web-server"]
  }

  filter {
    name   = "tag:ManagedBy"
    values = ["Packer"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Use a specific version
data "aws_ami" "web_server_v1_2" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "tag:Application"
    values = ["web-server"]
  }

  filter {
    name   = "tag:Version"
    values = ["1.2.*"]
  }
}
```

## Using the AMI in Launch Template and ASG

```hcl
resource "aws_launch_template" "web" {
  name_prefix   = "web-server-"
  image_id      = data.aws_ami.web_server.id
  instance_type = var.instance_type

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.web.id]
  }

  iam_instance_profile {
    name = aws_iam_instance_profile.web.name
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    # Minimal bootstrap - most config is baked into the AMI
    echo "APP_ENV=${var.environment}" >> /etc/app/environment
    systemctl start app
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "web-server"
      AMI         = data.aws_ami.web_server.id
      Environment = var.environment
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "web" {
  name                = "web-${data.aws_ami.web_server.tags["Version"]}"
  vpc_zone_identifier = var.private_subnet_ids
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  # Force replacement when AMI changes
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 90
    }
  }
}
```

## Pinning to a Specific AMI Version

```hcl
variable "web_server_ami_version" {
  type        = string
  description = "Specific AMI version to deploy"
  default     = ""
}

data "aws_ami" "web_server" {
  most_recent = var.web_server_ami_version == "" ? true : false
  owners      = ["self"]

  filter {
    name   = "tag:Application"
    values = ["web-server"]
  }

  dynamic "filter" {
    for_each = var.web_server_ami_version != "" ? [1] : []
    content {
      name   = "tag:Version"
      values = [var.web_server_ami_version]
    }
  }
}
```

## Conclusion

Packer + OpenTofu implements the immutable infrastructure pattern: Packer builds a fully configured image, OpenTofu deploys instances from that image, and updates replace instances rather than modifying running ones. Tag AMIs with version, application, and build date so OpenTofu data sources can reliably find the right image. The ASG `instance_refresh` block automates rolling deployments when the AMI changes.
