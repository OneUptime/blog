# How to Use Terraform with Chef for Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Chef, Configuration Management, DevOps, Infrastructure as Code, Automation

Description: Learn how to combine Terraform for infrastructure provisioning with Chef for configuration management to automate the complete server lifecycle from creation to configuration.

---

Terraform and Chef solve different but complementary problems in infrastructure management. Terraform provisions infrastructure resources like virtual machines, networks, and cloud services. Chef configures what runs on those machines, installing software, managing files, and ensuring services are running. Together, they provide end-to-end automation from infrastructure creation to fully configured servers. This guide shows you how to integrate these tools effectively.

## Understanding the Terraform-Chef Workflow

The typical workflow starts with Terraform creating infrastructure resources such as EC2 instances, Azure VMs, or GCP compute instances. Once the machines are running, Chef takes over to install packages, configure services, deploy applications, and maintain the desired state of the operating system and software. Terraform handles the "what" of infrastructure, while Chef handles the "how" of configuration.

## Prerequisites

You need Terraform version 1.0 or later, a Chef Infra Server or Chef Automate instance, Chef Workstation installed on your development machine, the Chef client available for your target operating systems, and a cloud provider account.

## Method 1: Using Terraform's Chef Provisioner

Terraform includes a built-in Chef provisioner that bootstraps nodes with the Chef client.

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
# variables.tf
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "chef_server_url" {
  description = "URL of the Chef Infra Server"
  type        = string
}

variable "chef_user_name" {
  description = "Chef user name for node registration"
  type        = string
}

variable "chef_user_key_path" {
  description = "Path to the Chef user's private key"
  type        = string
}

variable "chef_environment" {
  description = "Chef environment for the node"
  type        = string
  default     = "production"
}
```

```hcl
# web-server.tf
# Create an EC2 instance and configure it with Chef
resource "aws_instance" "web_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name
  subnet_id     = var.subnet_id

  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name        = "web-server-${count.index}"
    Environment = var.chef_environment
    ManagedBy   = "terraform-chef"
  }

  # Bootstrap the instance with Chef
  provisioner "chef" {
    server_url      = var.chef_server_url
    user_name       = var.chef_user_name
    user_key        = file(var.chef_user_key_path)
    node_name       = "web-server-${count.index}"
    environment     = var.chef_environment

    # Run list defines which recipes to apply
    run_list = [
      "recipe[base::default]",
      "recipe[nginx::default]",
      "recipe[app-deploy::default]"
    ]

    # Pass attributes to Chef
    attributes_json = jsonencode({
      nginx = {
        worker_processes = 4
        worker_connections = 1024
      }
      application = {
        version = var.app_version
        port    = 8080
      }
    })

    # Connection details for SSH
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.ssh_private_key_path)
      host        = self.public_ip
    }
  }

  count = var.web_server_count
}
```

## Method 2: Using User Data with Chef Client Bootstrap

A more flexible approach uses cloud-init user data to install and run the Chef client.

```hcl
# chef-bootstrap.tf
# Bootstrap Chef using user data script
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id
  key_name      = aws_key_pair.deploy.key_name

  vpc_security_group_ids = [aws_security_group.app.id]

  # Use user data to bootstrap Chef
  user_data = templatefile("${path.module}/templates/chef-bootstrap.sh.tpl", {
    chef_server_url  = var.chef_server_url
    chef_environment = var.chef_environment
    chef_run_list    = join(",", var.chef_run_list)
    node_name        = "app-server-${count.index}"
    validation_key   = var.chef_validation_key
  })

  tags = {
    Name = "app-server-${count.index}"
  }

  count = var.app_server_count
}
```

```bash
#!/bin/bash
# templates/chef-bootstrap.sh.tpl
# Bootstrap script for installing and configuring Chef client

set -e

# Install Chef client
curl -L https://omnitruck.chef.io/install.sh | bash -s -- -v 18

# Create Chef client configuration directory
mkdir -p /etc/chef

# Write the client configuration
cat > /etc/chef/client.rb <<EOF
chef_server_url  "${chef_server_url}"
node_name        "${node_name}"
environment      "${chef_environment}"
log_level        :info
log_location     "/var/log/chef/client.log"
EOF

# Write the validation key
cat > /etc/chef/validation.pem <<EOF
${validation_key}
EOF

# Create the first-boot configuration
cat > /etc/chef/first-boot.json <<EOF
{
  "run_list": [${chef_run_list}]
}
EOF

# Create log directory
mkdir -p /var/log/chef

# Run Chef client for the first time
chef-client -j /etc/chef/first-boot.json

# Set up Chef client to run periodically
cat > /etc/cron.d/chef-client <<EOF
*/30 * * * * root /usr/bin/chef-client -l warn 2>&1 | /usr/bin/logger -t chef-client
EOF
```

## Method 3: Using Policyfiles for Versioned Configuration

Chef Policyfiles provide versioned, deterministic configuration that pairs well with Terraform's approach.

```hcl
# policyfile-bootstrap.tf
# Bootstrap with a specific Chef Policyfile
resource "aws_instance" "managed_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id

  user_data = templatefile("${path.module}/templates/chef-policyfile-bootstrap.sh.tpl", {
    chef_server_url = var.chef_server_url
    node_name       = "managed-${count.index}"
    policy_name     = "web-server"
    policy_group    = var.chef_environment
    validation_key  = var.chef_validation_key
  })

  tags = {
    Name       = "managed-server-${count.index}"
    ChefPolicy = "web-server"
  }

  count = var.server_count
}
```

```bash
#!/bin/bash
# templates/chef-policyfile-bootstrap.sh.tpl
# Bootstrap script using Chef Policyfiles

set -e

# Install Chef client
curl -L https://omnitruck.chef.io/install.sh | bash -s -- -v 18

# Create Chef configuration
mkdir -p /etc/chef

# Write client config with policy settings
cat > /etc/chef/client.rb <<EOF
chef_server_url  "${chef_server_url}"
node_name        "${node_name}"
policy_name      "${policy_name}"
policy_group     "${policy_group}"
use_policyfile   true
log_level        :info
log_location     "/var/log/chef/client.log"
EOF

# Write validation key
cat > /etc/chef/validation.pem <<EOF
${validation_key}
EOF

# Create log directory
mkdir -p /var/log/chef

# Run initial Chef client converge
chef-client --once

# Configure periodic runs
systemctl enable chef-client
systemctl start chef-client
```

## Method 4: Managing Chef Server with Terraform

You can also use Terraform to manage the Chef Server itself and its configuration.

```hcl
# chef-server.tf
# Provision the Chef Server instance
resource "aws_instance" "chef_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.xlarge"
  subnet_id     = var.public_subnet_id

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/templates/chef-server-install.sh.tpl", {
    chef_server_fqdn = "chef.example.com"
    admin_username   = var.chef_admin_username
    admin_password   = var.chef_admin_password
    admin_email      = var.chef_admin_email
    org_name         = var.chef_org_name
  })

  tags = {
    Name = "chef-server"
    Role = "chef-infra-server"
  }
}

# Create a DNS record for the Chef Server
resource "aws_route53_record" "chef" {
  zone_id = var.dns_zone_id
  name    = "chef.example.com"
  type    = "A"
  ttl     = 300
  records = [aws_instance.chef_server.public_ip]
}
```

## Terraform Module for Chef-Managed Instances

Create a reusable module that combines instance creation with Chef bootstrap.

```hcl
# modules/chef-node/variables.tf
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "chef_server_url" {
  description = "URL of the Chef Server"
  type        = string
}

variable "chef_run_list" {
  description = "Chef run list for the node"
  type        = list(string)
}

variable "chef_environment" {
  description = "Chef environment"
  type        = string
  default     = "production"
}

variable "chef_attributes" {
  description = "Additional Chef attributes as a map"
  type        = map(any)
  default     = {}
}

variable "node_name_prefix" {
  description = "Prefix for node names"
  type        = string
}

variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 1
}
```

```hcl
# modules/chef-node/main.tf
# Reusable module for creating Chef-managed instances
resource "aws_instance" "chef_node" {
  count = var.instance_count

  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  user_data = templatefile("${path.module}/templates/bootstrap.sh.tpl", {
    chef_server_url  = var.chef_server_url
    node_name        = "${var.node_name_prefix}-${count.index}"
    chef_environment = var.chef_environment
    chef_run_list    = jsonencode(var.chef_run_list)
    chef_attributes  = jsonencode(var.chef_attributes)
    validation_key   = var.validation_key
  })

  tags = merge(var.tags, {
    Name        = "${var.node_name_prefix}-${count.index}"
    ChefManaged = "true"
  })
}

# Output instance details
output "instance_ids" {
  value = aws_instance.chef_node[*].id
}

output "private_ips" {
  value = aws_instance.chef_node[*].private_ip
}
```

Usage of the module:

```hcl
# main.tf
# Use the chef-node module for different server roles
module "web_servers" {
  source = "./modules/chef-node"

  node_name_prefix = "web"
  instance_count   = 3
  instance_type    = "t3.medium"
  chef_server_url  = var.chef_server_url
  chef_environment = "production"

  chef_run_list = [
    "recipe[base]",
    "recipe[nginx]",
    "recipe[web-app]",
  ]

  chef_attributes = {
    nginx = {
      worker_processes = 4
    }
  }
}

module "database_servers" {
  source = "./modules/chef-node"

  node_name_prefix = "db"
  instance_count   = 2
  instance_type    = "r5.large"
  chef_server_url  = var.chef_server_url
  chef_environment = "production"

  chef_run_list = [
    "recipe[base]",
    "recipe[postgresql]",
    "recipe[monitoring-agent]",
  ]

  chef_attributes = {
    postgresql = {
      max_connections = 200
    }
  }
}
```

## Best Practices

Store Chef validation keys and credentials in a secrets manager like AWS Secrets Manager or HashiCorp Vault rather than in Terraform variables. Use Chef Policyfiles for deterministic, versioned configuration that aligns with Terraform's approach to reproducibility. Tag instances with their Chef role and environment for easier management. Implement health checks to verify Chef runs complete successfully after Terraform provisioning. Clean up Chef node and client objects when Terraform destroys instances using a destroy-time provisioner.

## Conclusion

Terraform and Chef together provide comprehensive infrastructure automation. Terraform handles the provisioning layer, creating the compute, networking, and storage resources your applications need. Chef handles the configuration layer, ensuring those resources are properly set up with the right software and settings. By using reusable Terraform modules with built-in Chef bootstrap, you can create a repeatable, maintainable infrastructure pipeline that takes servers from bare metal to fully configured in minutes.
