# How to Use Terraform with Puppet for Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Puppet, Configuration Management, DevOps, Infrastructure as Code, Automation

Description: Learn how to integrate Terraform for infrastructure provisioning with Puppet for configuration management to automate server setup and maintain desired state.

---

Terraform and Puppet are a natural pairing in the infrastructure automation space. Terraform provisions cloud resources, and Puppet ensures those resources are configured correctly and stay that way. While Terraform excels at creating and managing the lifecycle of infrastructure, Puppet excels at managing the software, files, and services running on that infrastructure. This guide walks you through practical integration patterns.

## Understanding the Roles

Terraform is a provisioning tool. It creates virtual machines, networks, load balancers, and other cloud resources. Once a resource exists, Terraform's job for that resource is largely done until you need to change or destroy it.

Puppet is a configuration management tool. It installs packages, manages configuration files, starts services, and continuously enforces the desired state of a system. Puppet agents run periodically to detect and correct configuration drift.

The handoff between these tools happens at the point where a machine exists but is not yet configured. Terraform creates the machine and Puppet takes over from there.

## Prerequisites

You need Terraform version 1.0 or later, a Puppet Server (formerly Puppet Master), Puppet agent packages for your target OS, a cloud provider account, and basic familiarity with Puppet manifests and modules.

## Method 1: User Data Bootstrap with Puppet Agent

The most common approach uses cloud-init or user data to install and configure the Puppet agent when Terraform creates an instance.

```hcl
# variables.tf
variable "puppet_server" {
  description = "FQDN of the Puppet Server"
  type        = string
}

variable "puppet_environment" {
  description = "Puppet environment to assign"
  type        = string
  default     = "production"
}

variable "puppet_role" {
  description = "Role to assign via trusted facts"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
```

```hcl
# puppet-node.tf
# Create an EC2 instance that bootstraps with Puppet
resource "aws_instance" "puppet_managed" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id
  key_name      = var.key_name

  vpc_security_group_ids = [
    aws_security_group.puppet_agent.id,
  ]

  # Bootstrap the Puppet agent via user data
  user_data = templatefile("${path.module}/templates/puppet-bootstrap.sh.tpl", {
    puppet_server      = var.puppet_server
    puppet_environment = var.puppet_environment
    puppet_role        = var.puppet_role
    node_name          = "app-server-${count.index}"
  })

  tags = {
    Name              = "app-server-${count.index}"
    PuppetEnvironment = var.puppet_environment
    PuppetRole        = var.puppet_role
    ManagedBy         = "terraform"
  }

  count = var.instance_count
}

# Security group allowing Puppet agent communication
resource "aws_security_group" "puppet_agent" {
  name_prefix = "puppet-agent-"
  vpc_id      = var.vpc_id

  # Allow outbound traffic to Puppet Server on port 8140
  egress {
    from_port   = 8140
    to_port     = 8140
    protocol    = "tcp"
    cidr_blocks = [var.puppet_server_cidr]
    description = "Puppet Server communication"
  }

  # Allow all outbound for package installation
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "General outbound access"
  }
}
```

```bash
#!/bin/bash
# templates/puppet-bootstrap.sh.tpl
# Bootstrap script to install and configure the Puppet agent

set -e

# Set the hostname
hostnamectl set-hostname ${node_name}

# Install the Puppet repository
wget https://apt.puppet.com/puppet8-release-focal.deb
dpkg -i puppet8-release-focal.deb
apt-get update

# Install Puppet agent
apt-get install -y puppet-agent

# Configure the Puppet agent
cat > /etc/puppetlabs/puppet/puppet.conf <<EOF
[main]
server = ${puppet_server}
environment = ${puppet_environment}
runinterval = 1800

[agent]
certname = ${node_name}
EOF

# Create custom facts directory
mkdir -p /etc/puppetlabs/facter/facts.d

# Set the role as a custom fact
cat > /etc/puppetlabs/facter/facts.d/role.json <<EOF
{
  "role": "${puppet_role}",
  "provisioned_by": "terraform"
}
EOF

# Enable and start the Puppet agent
/opt/puppetlabs/bin/puppet resource service puppet ensure=running enable=true

# Run Puppet agent immediately for initial configuration
/opt/puppetlabs/bin/puppet agent --test --waitforcert 60 || true
```

## Method 2: Auto-Signing Certificates

For automated workflows, configure Puppet Server to auto-sign certificates based on trusted facts.

```hcl
# puppet-server-config.tf
# Configure auto-signing on the Puppet Server
resource "aws_instance" "puppet_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.xlarge"
  subnet_id     = var.public_subnet_id

  user_data = templatefile("${path.module}/templates/puppet-server-setup.sh.tpl", {
    autosign_domains = var.autosign_domains
  })

  tags = {
    Name = "puppet-server"
    Role = "puppet-infrastructure"
  }
}
```

```bash
#!/bin/bash
# templates/puppet-server-setup.sh.tpl
# Configure Puppet Server with auto-signing

# Create a policy-based autosigning script
cat > /etc/puppetlabs/puppet/autosign.rb <<'RUBY'
#!/opt/puppetlabs/puppet/bin/ruby
# Policy-based autosigning script
# Validates CSR extensions to determine if auto-signing is allowed

require 'openssl'

csr_data = STDIN.read
csr = OpenSSL::X509::Request.new(csr_data)
certname = ARGV[0]

# Check if the certname matches our expected pattern
if certname =~ /^(web|app|db|worker)-server-\d+$/
  exit 0  # Auto-sign
else
  exit 1  # Reject
end
RUBY

chmod 755 /etc/puppetlabs/puppet/autosign.rb

# Configure Puppet Server to use the autosign script
puppet config set autosign /etc/puppetlabs/puppet/autosign.rb --section master
```

## Method 3: Using Terraform with Puppet Bolt

Puppet Bolt is an agentless task runner that can configure servers without requiring a Puppet Server.

```hcl
# bolt-provisioning.tf
# Use Puppet Bolt for agentless configuration after Terraform creates instances
resource "aws_instance" "bolt_managed" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id
  key_name      = var.key_name

  tags = {
    Name = "bolt-managed-${count.index}"
  }

  count = var.instance_count
}

# Run Puppet Bolt after instances are created
resource "null_resource" "puppet_bolt" {
  count = var.instance_count

  triggers = {
    instance_id = aws_instance.bolt_managed[count.index].id
  }

  # Apply Puppet manifests using Bolt
  provisioner "local-exec" {
    command = <<-EOT
      bolt apply manifests/site.pp \
        --targets ${aws_instance.bolt_managed[count.index].public_ip} \
        --user ubuntu \
        --private-key ${var.ssh_private_key_path} \
        --no-host-key-check \
        --run-as root
    EOT
  }

  depends_on = [aws_instance.bolt_managed]
}
```

```hcl
# bolt-tasks.tf
# Run specific Puppet Bolt tasks after provisioning
resource "null_resource" "bolt_task" {
  count = var.instance_count

  triggers = {
    instance_id = aws_instance.bolt_managed[count.index].id
  }

  # Run a Bolt task to configure the web server
  provisioner "local-exec" {
    command = <<-EOT
      bolt task run package \
        action=install name=nginx \
        --targets ${aws_instance.bolt_managed[count.index].public_ip} \
        --user ubuntu \
        --private-key ${var.ssh_private_key_path} \
        --run-as root
    EOT
  }

  # Run a Bolt plan for complete setup
  provisioner "local-exec" {
    command = <<-EOT
      bolt plan run web_server::setup \
        --targets ${aws_instance.bolt_managed[count.index].public_ip} \
        --user ubuntu \
        --private-key ${var.ssh_private_key_path} \
        --run-as root
    EOT
  }

  depends_on = [null_resource.puppet_bolt]
}
```

## Terraform Module for Puppet-Managed Infrastructure

Create a reusable module that standardizes the Terraform-Puppet integration.

```hcl
# modules/puppet-node/main.tf
# Reusable module for Puppet-managed instances

variable "instance_config" {
  description = "Instance configuration"
  type = object({
    count         = number
    instance_type = string
    name_prefix   = string
    puppet_role   = string
  })
}

variable "puppet_config" {
  description = "Puppet configuration"
  type = object({
    server      = string
    environment = string
    ca_server   = optional(string)
  })
}

# Create the instances with Puppet bootstrap
resource "aws_instance" "puppet_node" {
  count = var.instance_config.count

  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_config.instance_type
  subnet_id     = var.subnet_id

  user_data = templatefile("${path.module}/templates/puppet-bootstrap.sh.tpl", {
    puppet_server      = var.puppet_config.server
    puppet_environment = var.puppet_config.environment
    puppet_role        = var.instance_config.puppet_role
    node_name          = "${var.instance_config.name_prefix}-${count.index}"
  })

  tags = {
    Name              = "${var.instance_config.name_prefix}-${count.index}"
    PuppetRole        = var.instance_config.puppet_role
    PuppetEnvironment = var.puppet_config.environment
  }

  # Clean up Puppet certificate when destroying
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      puppet cert clean ${self.tags["Name"]} || true
    EOT
  }
}

output "instance_ips" {
  value = aws_instance.puppet_node[*].private_ip
}
```

Usage:

```hcl
# main.tf
# Deploy different server roles with Puppet configuration
module "web_servers" {
  source = "./modules/puppet-node"

  instance_config = {
    count         = 3
    instance_type = "t3.medium"
    name_prefix   = "web-server"
    puppet_role   = "web"
  }

  puppet_config = {
    server      = "puppet.example.com"
    environment = "production"
  }
}

module "worker_servers" {
  source = "./modules/puppet-node"

  instance_config = {
    count         = 5
    instance_type = "t3.large"
    name_prefix   = "worker"
    puppet_role   = "worker"
  }

  puppet_config = {
    server      = "puppet.example.com"
    environment = "production"
  }
}
```

## Handling Node Cleanup on Destroy

When Terraform destroys instances, you should clean up their Puppet certificates and node data.

```hcl
# cleanup.tf
# Clean up Puppet node data when Terraform destroys resources
resource "null_resource" "puppet_cleanup" {
  count = var.instance_count

  triggers = {
    node_name     = "app-server-${count.index}"
    puppet_server = var.puppet_server
  }

  # Run cleanup when the resource is destroyed
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      # Remove the node from Puppet Server
      puppet node deactivate ${self.triggers.node_name} \
        --server ${self.triggers.puppet_server} || true

      # Clean the certificate
      puppetserver ca clean --certname ${self.triggers.node_name} || true
    EOT
  }
}
```

## Best Practices

Use custom facts to pass Terraform metadata to Puppet, such as the instance role, environment, and cloud provider details. Implement certificate auto-signing with strict policies for automated environments. Always clean up Puppet node data when Terraform destroys instances to prevent stale entries. Store Puppet Server connection details in Terraform variables, not hardcoded in templates. Use Puppet environments that match your Terraform workspaces for consistency. Consider Puppet Bolt for simpler setups that do not require a persistent Puppet Server.

## Conclusion

Terraform and Puppet together provide complete infrastructure lifecycle management. Terraform handles the creation, modification, and destruction of cloud resources, while Puppet ensures those resources are properly configured and remain in their desired state. By using bootstrap scripts, reusable modules, and proper cleanup procedures, you can create a reliable automation pipeline that takes infrastructure from initial provisioning to fully configured and continuously managed.
