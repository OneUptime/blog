# How to Use cloud-init with Terraform for Ubuntu Provisioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Terraform, Cloud-init, DevOps, Infrastructure

Description: Combine cloud-init and Terraform to automate Ubuntu server provisioning, configuring packages, users, and services at first boot without manual intervention.

---

Terraform handles infrastructure provisioning - creating VMs, networks, and disks. But getting a fresh Ubuntu instance to the state where it can run your application requires a different layer: cloud-init handles that initial configuration at first boot. Combining the two gives you fully automated, reproducible server provisioning.

## How cloud-init and Terraform Work Together

Terraform creates the virtual machine and passes cloud-init user data to the cloud provider. The provider includes this data in the instance's metadata. When Ubuntu boots for the first time, cloud-init retrieves and processes the user data, installing packages, creating users, writing configuration files, and running commands.

From Terraform's perspective, cloud-init runs after the instance becomes reachable. From cloud-init's perspective, it runs independently on the instance itself.

## Basic cloud-init User Data Structure

cloud-init user data is typically written as YAML, starting with `#cloud-config`:

```yaml
#cloud-config

# Update package cache and upgrade all packages
package_update: true
package_upgrade: true

# Install specific packages
packages:
  - nginx
  - git
  - curl
  - ufw
  - htop

# Create a non-root user with sudo access
users:
  - name: deploy
    groups: [sudo, docker]
    shell: /bin/bash
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... your-public-key-here

# Write configuration files
write_files:
  - path: /etc/nginx/sites-available/myapp
    content: |
      server {
          listen 80;
          server_name _;
          root /var/www/myapp;
          index index.html;
      }
    owner: root:root
    permissions: "0644"

# Run commands at the end of provisioning
runcmd:
  - [ln, -sf, /etc/nginx/sites-available/myapp, /etc/nginx/sites-enabled/]
  - [rm, -f, /etc/nginx/sites-enabled/default]
  - [systemctl, enable, nginx]
  - [systemctl, start, nginx]
  - [ufw, allow, "OpenSSH"]
  - [ufw, allow, "Nginx HTTP"]
  - [ufw, --force, enable]
```

## Terraform Configuration for AWS EC2

Here is a complete example provisioning an Ubuntu instance on AWS with cloud-init:

```hcl
# variables.tf
variable "region" {
  default = "us-east-1"
}

variable "instance_type" {
  default = "t3.small"
}

variable "ssh_public_key" {
  description = "SSH public key content for the deploy user"
  type        = string
}
```

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# Look up the latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu_22_04" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Render cloud-init config using Terraform template
locals {
  cloud_init_config = templatefile("${path.module}/cloud-init.yaml.tpl", {
    ssh_public_key = var.ssh_public_key
    hostname       = "app-server-01"
  })
}

# Security group allowing SSH and HTTP
resource "aws_security_group" "web_server" {
  name        = "web-server-sg"
  description = "Allow SSH and HTTP"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 instance with cloud-init user data
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu_22_04.id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.web_server.id]

  # Pass cloud-init user data
  user_data = local.cloud_init_config

  # Replace instance if user_data changes
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name        = "app-server-01"
    Environment = "production"
  }
}

output "public_ip" {
  value = aws_instance.app_server.public_ip
}
```

The template file referenced above:

```bash
# cloud-init.yaml.tpl
cat > cloud-init.yaml.tpl << 'EOF'
#cloud-config

hostname: ${hostname}
fqdn: ${hostname}.example.com

package_update: true
package_upgrade: true

packages:
  - nginx
  - git
  - curl
  - ufw

users:
  - name: deploy
    groups: [sudo]
    shell: /bin/bash
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    ssh_authorized_keys:
      - ${ssh_public_key}

runcmd:
  - systemctl enable nginx
  - systemctl start nginx
  - ufw allow OpenSSH
  - ufw allow "Nginx HTTP"
  - ufw --force enable
EOF
```

## Using the cloudinit Provider for Multi-Part Data

Terraform has a dedicated `cloudinit` provider that handles multi-part MIME content - useful when combining cloud-config YAML with shell scripts:

```hcl
# Add the cloudinit provider
terraform {
  required_providers {
    cloudinit = {
      source  = "hashicorp/cloudinit"
      version = "~> 2.3"
    }
  }
}

# Multi-part cloud-init configuration
data "cloudinit_config" "server_config" {
  gzip          = true
  base64_encode = true

  # Part 1: cloud-config YAML for package installation
  part {
    filename     = "cloud-config.yaml"
    content_type = "text/cloud-config"
    content = templatefile("${path.module}/cloud-config.yaml.tpl", {
      ssh_public_key = var.ssh_public_key
    })
  }

  # Part 2: Shell script for application-specific setup
  part {
    filename     = "setup-app.sh"
    content_type = "text/x-shellscript"
    content      = file("${path.module}/scripts/setup-app.sh")
  }
}

resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu_22_04.id
  instance_type = var.instance_type

  # Use the rendered multi-part config
  user_data = data.cloudinit_config.server_config.rendered
}
```

The setup script referenced:

```bash
#!/bin/bash
# scripts/setup-app.sh
# This runs after cloud-config completes

set -euo pipefail

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add the deploy user to the docker group
usermod -aG docker deploy

systemctl enable docker
systemctl start docker

echo "Docker installation complete"
```

## Validating cloud-init Locally

Before deploying, validate your cloud-init YAML syntax:

```bash
# Install cloud-init tools
sudo apt install -y cloud-init

# Validate the config file
cloud-init schema --config-file cloud-init.yaml

# On the server after deployment, check cloud-init status
cloud-init status --long

# View cloud-init logs
sudo cat /var/log/cloud-init.log
sudo cat /var/log/cloud-init-output.log
```

## Waiting for cloud-init in Terraform

cloud-init runs asynchronously after the instance starts. If subsequent Terraform resources depend on the instance being fully provisioned, add a wait:

```hcl
resource "null_resource" "wait_for_cloud_init" {
  depends_on = [aws_instance.app_server]

  connection {
    type        = "ssh"
    host        = aws_instance.app_server.public_ip
    user        = "ubuntu"
    private_key = file(var.ssh_private_key_path)
  }

  provisioner "remote-exec" {
    inline = [
      # Block until cloud-init completes
      "cloud-init status --wait",
      "echo 'cloud-init finished'"
    ]
  }
}
```

## Practical Tips

When using cloud-init with Terraform in production:

- Store SSH public keys in Terraform variables and pass them at plan time rather than hardcoding them in templates
- Use `cloud-init status --wait` in health checks to confirm provisioning completed before routing traffic
- The `runcmd` section runs as root; switch to the application user when needed using `su - deploy -c "command"`
- For debugging, check `/var/log/cloud-init-output.log` - it captures all stdout/stderr from runcmd commands
- If you change user data and want the instance replaced, set `user_data_replace_on_change = true` in the instance resource

The combination of Terraform for infrastructure and cloud-init for initial configuration gives you reproducible server builds without custom AMIs or heavy configuration management tools for simple use cases.
