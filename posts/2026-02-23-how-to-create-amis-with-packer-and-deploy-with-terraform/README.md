# How to Create AMIs with Packer and Deploy with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Packer, AMI, AWS, Immutable Infrastructure, DevOps, Deployments

Description: Learn how to create custom AMIs with Packer and deploy them with Terraform for a complete immutable infrastructure pipeline with rolling updates and blue-green deployments.

---

Creating custom Amazon Machine Images (AMIs) with Packer and deploying them with Terraform is the gold standard for immutable infrastructure on AWS. This approach ensures that every server in your fleet runs an identical, tested image, eliminating the "works on my machine" problem at the infrastructure level. In this guide, we will build a complete pipeline from AMI creation to production deployment.

## Planning Your AMI Strategy

Before building AMIs, plan your image hierarchy. A common pattern is to use a layered approach: a base image with OS-level configuration, a middleware image with runtime dependencies, and an application image with your specific software. This layering reduces build times because you only rebuild the layers that changed.

## Building the Base AMI with Packer

Start with a base AMI that includes your standard OS configuration, security hardening, and monitoring agents.

```hcl
# packer/base-image.pkr.hcl

packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

# Use the official Ubuntu 22.04 AMI as starting point
data "amazon-ami" "ubuntu" {
  filters = {
    name                = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
    virtualization-type = "hvm"
    root-device-type    = "ebs"
  }
  most_recent = true
  owners      = ["099720109477"]
  region      = var.aws_region
}

source "amazon-ebs" "base" {
  ami_name      = "base-ubuntu-{{timestamp}}"
  instance_type = "t3.medium"
  region        = var.aws_region
  source_ami    = data.amazon-ami.ubuntu.id
  ssh_username  = "ubuntu"

  ami_description = "Base Ubuntu image with standard configuration"

  tags = {
    Name      = "base-ubuntu"
    ImageType = "base"
    ManagedBy = "packer"
    OS        = "ubuntu-22.04"
  }

  # Encrypt the AMI
  encrypt_boot = true
}

build {
  sources = ["source.amazon-ebs.base"]

  # System updates and essential packages
  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get upgrade -y",
      "sudo apt-get install -y ca-certificates curl gnupg lsb-release",
      "sudo apt-get install -y jq unzip htop vim",
    ]
  }

  # Install and configure CloudWatch agent
  provisioner "shell" {
    inline = [
      "wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb",
      "sudo dpkg -i amazon-cloudwatch-agent.deb",
      "rm amazon-cloudwatch-agent.deb",
    ]
  }

  # Copy CloudWatch agent configuration
  provisioner "file" {
    source      = "configs/cloudwatch-agent.json"
    destination = "/tmp/cloudwatch-agent.json"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json",
    ]
  }

  # Security hardening
  provisioner "shell" {
    inline = [
      # Disable root login
      "sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config",
      # Set SSH timeout
      "echo 'ClientAliveInterval 300' | sudo tee -a /etc/ssh/sshd_config",
      "echo 'ClientAliveCountMax 2' | sudo tee -a /etc/ssh/sshd_config",
    ]
  }

  # Install SSM agent for secure access
  provisioner "shell" {
    inline = [
      "sudo snap install amazon-ssm-agent --classic",
      "sudo systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service",
    ]
  }

  # Cleanup
  provisioner "shell" {
    inline = [
      "sudo apt-get clean",
      "sudo rm -rf /var/lib/apt/lists/*",
      "sudo rm -rf /tmp/*",
    ]
  }

  post-processor "manifest" {
    output     = "base-manifest.json"
    strip_path = true
  }
}
```

## Building the Application AMI

The application AMI builds on top of the base image and adds your specific application.

```hcl
# packer/app-image.pkr.hcl

variable "base_ami_id" {
  type        = string
  description = "Base AMI ID to build upon"
}

variable "app_version" {
  type    = string
  default = "latest"
}

source "amazon-ebs" "app" {
  ami_name      = "app-server-v${var.app_version}-{{timestamp}}"
  instance_type = "t3.medium"
  region        = var.aws_region
  source_ami    = var.base_ami_id
  ssh_username  = "ubuntu"

  tags = {
    Name       = "app-server"
    ImageType  = "application"
    AppVersion = var.app_version
    ManagedBy  = "packer"
    BaseAMI    = var.base_ami_id
  }

  encrypt_boot = true
}

build {
  sources = ["source.amazon-ebs.app"]

  # Install application runtime
  provisioner "shell" {
    inline = [
      "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -",
      "sudo apt-get install -y nodejs",
      "sudo npm install -g pm2",
    ]
  }

  # Create application directory
  provisioner "shell" {
    inline = [
      "sudo mkdir -p /opt/app",
      "sudo chown ubuntu:ubuntu /opt/app",
    ]
  }

  # Copy application code
  provisioner "file" {
    source      = "../app/dist/"
    destination = "/opt/app/"
  }

  # Install application dependencies
  provisioner "shell" {
    inline = [
      "cd /opt/app && npm install --production",
    ]
  }

  # Copy systemd service file
  provisioner "file" {
    source      = "configs/app.service"
    destination = "/tmp/app.service"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/app.service /etc/systemd/system/app.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable app.service",
    ]
  }

  # Copy nginx configuration
  provisioner "file" {
    source      = "configs/nginx-app.conf"
    destination = "/tmp/nginx-app.conf"
  }

  provisioner "shell" {
    inline = [
      "sudo apt-get install -y nginx",
      "sudo mv /tmp/nginx-app.conf /etc/nginx/sites-available/app",
      "sudo ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app",
      "sudo rm -f /etc/nginx/sites-enabled/default",
      "sudo systemctl enable nginx",
    ]
  }

  # Cleanup
  provisioner "shell" {
    inline = [
      "sudo apt-get clean",
      "sudo rm -rf /tmp/*",
    ]
  }

  post-processor "manifest" {
    output     = "app-manifest.json"
    strip_path = true
  }
}
```

## Deploying with Terraform - Rolling Update

Use Terraform to deploy the AMI with rolling updates via Auto Scaling Groups.

```hcl
# Look up the latest application AMI
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["app-server-v*"]
  }

  filter {
    name   = "tag:ImageType"
    values = ["application"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Launch template with the latest AMI
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = data.aws_ami.app.id
  instance_type = var.instance_type
  key_name      = var.key_name

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  network_interfaces {
    security_groups             = [aws_security_group.app.id]
    associate_public_ip_address = false
  }

  # Pass runtime configuration via user data
  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh", {
    environment  = var.environment
    db_host      = aws_db_instance.main.address
    redis_host   = aws_elasticache_cluster.main.cache_nodes[0].address
    log_group    = aws_cloudwatch_log_group.app.name
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.common_tags, {
      Name    = "app-${var.environment}"
      AMI     = data.aws_ami.app.id
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group with rolling update
resource "aws_autoscaling_group" "app" {
  name                = "app-${var.environment}-${aws_launch_template.app.latest_version}"
  desired_capacity    = var.desired_capacity
  max_size            = var.max_size
  min_size            = var.min_size
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Rolling update configuration
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 75
      instance_warmup        = 120
    }
    triggers = ["launch_template"]
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}
```

## Blue-Green Deployment Pattern

For zero-downtime deployments, implement a blue-green pattern.

```hcl
# Two ASGs - blue and green
variable "active_color" {
  description = "Currently active deployment: blue or green"
  type        = string
  default     = "blue"
}

resource "aws_autoscaling_group" "blue" {
  name             = "app-blue-${var.environment}"
  desired_capacity = var.active_color == "blue" ? var.desired_capacity : 0
  max_size         = var.max_size
  min_size         = 0
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = var.active_color == "blue" ? [aws_lb_target_group.app.arn] : []

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}

resource "aws_autoscaling_group" "green" {
  name             = "app-green-${var.environment}"
  desired_capacity = var.active_color == "green" ? var.desired_capacity : 0
  max_size         = var.max_size
  min_size         = 0
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = var.active_color == "green" ? [aws_lb_target_group.app.arn] : []

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

## Best Practices

Always test AMIs before deploying to production. Build a test stage into your pipeline that launches an instance from the new AMI, runs health checks, and only promotes the AMI if all checks pass. Keep AMI builds fast by using a layered approach where the base image builds infrequently and application images build on top of it.

Use AMI tags extensively to track versions, build dates, and source code commits. This metadata is invaluable for debugging production issues.

For more integration patterns, see our guides on [using Terraform with Packer for image building](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-packer-for-image-building/view) and [using Terraform with Docker Compose](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-docker-compose/view).

## Conclusion

Building AMIs with Packer and deploying them with Terraform creates a robust, immutable infrastructure pipeline. Every deployment uses a known, tested image, eliminating configuration drift and reducing the risk of production incidents. Whether you use rolling updates for simplicity or blue-green deployments for zero downtime, the Packer-Terraform combination gives you the tools to deploy with confidence.
