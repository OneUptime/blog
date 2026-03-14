# How to Use Terraform with cloud-init for VM Bootstrap

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cloud-init, DevOps, VM Bootstrap, Infrastructure as Code, Automation

Description: Learn how to use Terraform with cloud-init to automatically configure virtual machines at boot time, installing packages, creating users, and running scripts.

---

cloud-init is the industry standard for initializing cloud instances at boot time. When combined with Terraform, it provides a powerful way to bootstrap virtual machines with the exact configuration they need from the moment they start. Instead of manually configuring servers after creation, cloud-init runs during the first boot to set up everything from package installation to user creation to service configuration. This guide shows you how to use Terraform and cloud-init together effectively.

## What is cloud-init?

cloud-init is a multi-distribution package that handles early initialization of cloud instances. It runs during the boot process and can perform tasks like setting the hostname, installing packages, writing files, running commands, configuring SSH keys, creating users and groups, mounting filesystems, and setting up networking. Most major cloud providers and Linux distributions support cloud-init out of the box.

## Prerequisites

You need Terraform version 1.0 or later, a cloud provider account (AWS, Azure, GCP, or others that support cloud-init), and basic understanding of YAML syntax for cloud-init configuration.

## Basic cloud-init with Terraform

The simplest approach passes a cloud-init configuration through the instance's user_data attribute.

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

```hcl
# basic-instance.tf
# Create an EC2 instance with cloud-init configuration
resource "aws_instance" "web_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id
  key_name      = var.key_name

  # Pass cloud-init configuration as user data
  user_data = <<-CLOUD_INIT
    #cloud-config
    # Update and install packages on first boot
    package_update: true
    package_upgrade: true
    packages:
      - nginx
      - curl
      - htop
      - unzip

    # Create a non-root user for application deployment
    users:
      - name: deploy
        groups: sudo, www-data
        shell: /bin/bash
        sudo: ALL=(ALL) NOPASSWD:ALL
        ssh_authorized_keys:
          - ${var.deploy_ssh_key}

    # Write configuration files
    write_files:
      - path: /etc/nginx/sites-available/default
        content: |
          server {
              listen 80;
              server_name _;
              root /var/www/html;
              index index.html;
          }
        owner: root:root
        permissions: '0644'

    # Run commands after everything else
    runcmd:
      - systemctl enable nginx
      - systemctl start nginx
      - echo "Instance bootstrap complete" > /var/log/cloud-init-done.log
  CLOUD_INIT

  tags = {
    Name = "web-server"
  }
}
```

## Using the cloudinit_config Data Source

For more complex configurations, Terraform's `cloudinit_config` data source lets you combine multiple cloud-init parts.

```hcl
# multi-part-config.tf
# Combine multiple cloud-init configurations into one
data "cloudinit_config" "server_config" {
  gzip          = true
  base64_encode = true

  # Part 1: Cloud-config with packages and users
  part {
    content_type = "text/cloud-config"
    filename     = "cloud-config.yaml"
    content = yamlencode({
      package_update  = true
      package_upgrade = true

      packages = [
        "docker.io",
        "docker-compose",
        "awscli",
        "jq",
        "prometheus-node-exporter",
      ]

      users = [
        {
          name   = "app"
          groups = "docker,sudo"
          shell  = "/bin/bash"
          sudo   = "ALL=(ALL) NOPASSWD:ALL"
          ssh_authorized_keys = [var.deploy_ssh_key]
        }
      ]

      # System configuration
      timezone = "UTC"

      ntp = {
        enabled = true
        servers = ["time.aws.com"]
      }
    })
  }

  # Part 2: Shell script for custom setup
  part {
    content_type = "text/x-shellscript"
    filename     = "setup.sh"
    content = templatefile("${path.module}/scripts/setup.sh.tpl", {
      app_version     = var.app_version
      environment     = var.environment
      database_url    = var.database_url
      region          = var.aws_region
    })
  }

  # Part 3: Additional configuration file
  part {
    content_type = "text/cloud-config"
    filename     = "write-files.yaml"
    content = yamlencode({
      write_files = [
        {
          path        = "/etc/app/config.json"
          owner       = "app:app"
          permissions = "0600"
          content = jsonencode({
            database_url = var.database_url
            cache_url    = var.cache_url
            environment  = var.environment
            log_level    = var.log_level
          })
        },
        {
          path        = "/etc/docker/daemon.json"
          owner       = "root:root"
          permissions = "0644"
          content = jsonencode({
            log-driver = "json-file"
            log-opts = {
              max-size = "10m"
              max-file = "3"
            }
          })
        }
      ]
    })
  }
}

# Use the combined cloud-init config
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.large"
  subnet_id     = var.subnet_id

  # Reference the multi-part cloud-init config
  user_data_base64 = data.cloudinit_config.server_config.rendered

  tags = {
    Name        = "app-server"
    Environment = var.environment
  }
}
```

```bash
#!/bin/bash
# scripts/setup.sh.tpl
# Custom setup script for application deployment

set -e

# Log all output
exec > /var/log/app-setup.log 2>&1

echo "Starting application setup..."

# Wait for cloud-init package installation to complete
cloud-init status --wait

# Configure Docker
systemctl enable docker
systemctl start docker
usermod -aG docker app

# Pull and run the application container
docker pull myregistry.example.com/myapp:${app_version}

# Create the docker-compose file
cat > /home/app/docker-compose.yml <<EOF
version: '3.8'
services:
  app:
    image: myregistry.example.com/myapp:${app_version}
    restart: always
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=${database_url}
      - ENVIRONMENT=${environment}
      - AWS_REGION=${region}
    volumes:
      - /etc/app/config.json:/app/config.json:ro
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
EOF

# Start the application
cd /home/app
docker-compose up -d

echo "Application setup complete"
```

## Template-Based cloud-init Configuration

Use Terraform's templatefile function for dynamic cloud-init configurations.

```hcl
# template-cloudinit.tf
# Use a template file for the cloud-init configuration
resource "aws_instance" "templated_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  user_data = templatefile("${path.module}/templates/cloud-init.yaml.tpl", {
    hostname       = "app-server-${count.index}"
    packages       = var.packages
    ssh_keys       = var.ssh_authorized_keys
    mount_points   = var.mount_points
    environment    = var.environment
    monitoring_key = var.monitoring_api_key
  })

  tags = {
    Name = "app-server-${count.index}"
  }

  count = var.instance_count
}
```

```yaml
#cloud-config
# templates/cloud-init.yaml.tpl
# Templated cloud-init configuration

# Set the hostname
hostname: ${hostname}
manage_etc_hosts: true

# Update packages on first boot
package_update: true
package_upgrade: true

# Install required packages
packages:
%{ for pkg in packages ~}
  - ${pkg}
%{ endfor ~}

# Configure SSH
ssh_authorized_keys:
%{ for key in ssh_keys ~}
  - ${key}
%{ endfor ~}

# Mount additional volumes
mounts:
%{ for mount in mount_points ~}
  - [ "${mount.device}", "${mount.path}", "${mount.fstype}", "defaults,nofail", "0", "2" ]
%{ endfor ~}

# Write configuration files
write_files:
  - path: /etc/environment.d/app.conf
    content: |
      ENVIRONMENT=${environment}
    owner: root:root
    permissions: '0644'

  - path: /etc/monitoring/agent.conf
    content: |
      api_key: ${monitoring_key}
      hostname: ${hostname}
      environment: ${environment}
    owner: root:root
    permissions: '0600'

# Run commands after setup
runcmd:
  - echo "Cloud-init setup starting for ${hostname}"
  - systemctl daemon-reload
  - systemctl enable monitoring-agent
  - systemctl start monitoring-agent
  - echo "Cloud-init setup complete for ${hostname}" >> /var/log/cloud-init-custom.log

# Phone home when cloud-init completes (useful for monitoring)
phone_home:
  url: https://monitoring.example.com/api/cloud-init-complete
  post:
    - hostname
    - instance_id

# Final message
final_message: "Cloud-init completed for ${hostname} after $UPTIME seconds"
```

## cloud-init with Auto Scaling Groups

cloud-init is especially useful with auto scaling groups where instances are created automatically.

```hcl
# asg-cloudinit.tf
# Launch template with cloud-init for auto scaling
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  # Use the multi-part cloud-init config
  user_data = base64encode(data.cloudinit_config.asg_config.rendered)

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.app.id]
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "app-asg-instance"
      Environment = var.environment
    }
  }
}

# Auto scaling group using the launch template
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  desired_capacity    = 3
  max_size            = 10
  min_size            = 2
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}

# Cloud-init config for ASG instances
data "cloudinit_config" "asg_config" {
  gzip          = false
  base64_encode = false

  part {
    content_type = "text/cloud-config"
    content = yamlencode({
      package_update = true
      packages       = ["docker.io", "awscli"]

      runcmd = [
        "systemctl enable docker",
        "systemctl start docker",
        # Pull application image
        "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${var.ecr_registry}",
        "docker pull ${var.ecr_registry}/${var.app_image}:${var.app_version}",
        "docker run -d --restart=always -p 8080:8080 ${var.ecr_registry}/${var.app_image}:${var.app_version}",
      ]
    })
  }
}
```

## Validating cloud-init Configuration

You can validate your cloud-init configuration locally before deploying.

```hcl
# validate-cloudinit.tf
# Generate the cloud-init config as a local file for validation
resource "local_file" "cloud_init_debug" {
  count    = var.debug_mode ? 1 : 0
  filename = "${path.module}/debug/cloud-init-rendered.yaml"
  content  = templatefile("${path.module}/templates/cloud-init.yaml.tpl", {
    hostname       = "debug-server"
    packages       = var.packages
    ssh_keys       = var.ssh_authorized_keys
    mount_points   = var.mount_points
    environment    = "debug"
    monitoring_key = "debug-key"
  })
}
```

Then validate locally:

```bash
# Validate the rendered cloud-init configuration
cloud-init schema --config-file debug/cloud-init-rendered.yaml
```

## Troubleshooting cloud-init

When cloud-init does not behave as expected, check these log files on the instance.

```hcl
# debug-instance.tf
# Instance with cloud-init debugging enabled
resource "aws_instance" "debug" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  subnet_id     = var.subnet_id

  user_data = <<-CLOUDINIT
    #cloud-config
    # Enable verbose logging for debugging
    output:
      all: "| tee -a /var/log/cloud-init-output.log"

    runcmd:
      # Print cloud-init status for debugging
      - cloud-init status --long
      # List all cloud-init modules that ran
      - cat /run/cloud-init/status.json | jq .
  CLOUDINIT

  tags = {
    Name = "cloud-init-debug"
  }
}
```

Key log files to check are `/var/log/cloud-init.log` for the main cloud-init log, `/var/log/cloud-init-output.log` for command output, and `/run/cloud-init/status.json` for the status of each cloud-init stage.

## Best Practices

Keep cloud-init configurations idempotent so they can safely run multiple times. Use the `cloudinit_config` data source to organize complex configurations into multiple parts. Template your configurations with Terraform's `templatefile` function for dynamic values. Validate configurations locally before deploying with `cloud-init schema`. Keep cloud-init scripts focused on initial bootstrap and use configuration management tools for ongoing state management. Log all custom script output for troubleshooting. Use `phone_home` or similar mechanisms to verify that cloud-init completed successfully.

## Conclusion

Terraform and cloud-init together provide a clean separation between infrastructure provisioning and instance initialization. Terraform creates the cloud resources, and cloud-init ensures they are properly bootstrapped on first boot. By using multi-part configurations, templates, and proper validation, you can build reliable VM bootstrap processes that work consistently across your infrastructure. Whether you are setting up a single instance or an auto scaling group with hundreds of nodes, cloud-init gives you the flexibility to configure each machine exactly as needed.
