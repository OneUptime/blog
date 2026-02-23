# How to Use Terraform with SaltStack for Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, SaltStack, Configuration Management, DevOps, Infrastructure as Code, Automation

Description: Learn how to combine Terraform for infrastructure provisioning with SaltStack for configuration management to automate your entire server lifecycle effectively.

---

Terraform and SaltStack form a powerful combination for infrastructure automation. Terraform handles the provisioning of cloud resources, creating virtual machines, networks, and services. SaltStack then configures those resources, managing packages, files, services, and application deployments. SaltStack's event-driven architecture and fast communication make it particularly effective for large-scale environments. This guide covers practical patterns for integrating these tools.

## Understanding the Terraform-SaltStack Workflow

SaltStack uses a master-minion architecture where a Salt Master sends configuration instructions to Salt Minions running on managed nodes. The workflow begins with Terraform creating infrastructure and installing the Salt Minion on each new instance. The minion connects to the Salt Master, which applies the appropriate state configuration. SaltStack then continuously maintains the desired state.

SaltStack also supports a masterless mode (salt-call) that works well for simpler deployments where you do not want to manage a Salt Master.

## Prerequisites

You need Terraform version 1.0 or later, a Salt Master server (or plan to use masterless mode), access to a cloud provider account, and familiarity with SaltStack states and pillar data.

## Method 1: Minion Bootstrap with Salt Master

The standard approach installs a Salt Minion on each Terraform-provisioned instance.

```hcl
# variables.tf
variable "salt_master_ip" {
  description = "IP address of the Salt Master"
  type        = string
}

variable "salt_environment" {
  description = "Salt environment for state management"
  type        = string
  default     = "production"
}

variable "salt_grains" {
  description = "Custom grains to assign to the minion"
  type        = map(string)
  default     = {}
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
```

```hcl
# salt-minion.tf
# Create instances with Salt Minion bootstrap
resource "aws_instance" "salt_managed" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id
  key_name      = var.key_name

  vpc_security_group_ids = [aws_security_group.salt_minion.id]

  # Bootstrap Salt Minion via user data
  user_data = templatefile("${path.module}/templates/salt-minion-bootstrap.sh.tpl", {
    salt_master_ip     = var.salt_master_ip
    minion_id          = "app-server-${count.index}"
    salt_environment   = var.salt_environment
    salt_grains        = var.salt_grains
    salt_role          = var.salt_role
  })

  tags = {
    Name        = "app-server-${count.index}"
    SaltRole    = var.salt_role
    Environment = var.salt_environment
    ManagedBy   = "terraform-salt"
  }

  count = var.instance_count
}

# Security group for Salt Minion communication
resource "aws_security_group" "salt_minion" {
  name_prefix = "salt-minion-"
  vpc_id      = var.vpc_id

  # Salt Master communication ports
  egress {
    from_port   = 4505
    to_port     = 4506
    protocol    = "tcp"
    cidr_blocks = ["${var.salt_master_ip}/32"]
    description = "Salt Master publish and return ports"
  }

  # General outbound for package installation
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

```bash
#!/bin/bash
# templates/salt-minion-bootstrap.sh.tpl
# Bootstrap script for installing and configuring Salt Minion

set -e

# Install Salt Minion using the bootstrap script
curl -L https://bootstrap.saltproject.io | sh -s -- -A ${salt_master_ip}

# Configure the Salt Minion
cat > /etc/salt/minion <<EOF
# Salt Minion configuration
master: ${salt_master_ip}
id: ${minion_id}
environment: ${salt_environment}

# Set mine interval for data sharing
mine_interval: 60

# Log settings
log_level: info
log_file: /var/log/salt/minion
EOF

# Set custom grains
cat > /etc/salt/grains <<EOF
role: ${salt_role}
provisioned_by: terraform
environment: ${salt_environment}
%{ for key, value in salt_grains ~}
${key}: ${value}
%{ endfor ~}
EOF

# Restart Salt Minion to pick up configuration
systemctl restart salt-minion

# Enable Salt Minion on boot
systemctl enable salt-minion
```

## Method 2: Auto-Accepting Minion Keys

For automated environments, configure the Salt Master to auto-accept keys from Terraform-provisioned minions.

```hcl
# salt-master.tf
# Configure the Salt Master with auto-accept for Terraform minions
resource "aws_instance" "salt_master" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.xlarge"
  subnet_id     = var.public_subnet_id

  user_data = templatefile("${path.module}/templates/salt-master-setup.sh.tpl", {
    auto_accept_pattern = "^(app|web|db|worker)-server-\\d+$"
  })

  vpc_security_group_ids = [aws_security_group.salt_master.id]

  tags = {
    Name = "salt-master"
  }
}

# Security group for Salt Master
resource "aws_security_group" "salt_master" {
  name_prefix = "salt-master-"
  vpc_id      = var.vpc_id

  # Allow Salt publish port from VPC
  ingress {
    from_port   = 4505
    to_port     = 4505
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Salt publish port"
  }

  # Allow Salt return port from VPC
  ingress {
    from_port   = 4506
    to_port     = 4506
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Salt return port"
  }
}
```

```bash
#!/bin/bash
# templates/salt-master-setup.sh.tpl
# Setup Salt Master with auto-accept reactor

# Install Salt Master
curl -L https://bootstrap.saltproject.io | sh -s -- -M -N

# Create the auto-accept reactor
mkdir -p /srv/reactor

cat > /srv/reactor/auto_accept.sls <<EOF
# Auto-accept minion keys matching the pattern
{% if data['id'] | regex_match('${auto_accept_pattern}') %}
accept_key:
  wheel.key.accept:
    - match: {{ data['id'] }}
{% endif %}
EOF

# Configure the Salt Master reactor
cat >> /etc/salt/master <<EOF

# Reactor configuration for auto-accepting keys
reactor:
  - 'salt/auth':
    - /srv/reactor/auto_accept.sls

# File server settings
file_roots:
  base:
    - /srv/salt
  production:
    - /srv/salt/production
  staging:
    - /srv/salt/staging

# Pillar configuration
pillar_roots:
  base:
    - /srv/pillar
  production:
    - /srv/pillar/production
  staging:
    - /srv/pillar/staging
EOF

# Restart Salt Master
systemctl restart salt-master
systemctl enable salt-master
```

## Method 3: Masterless Salt with Terraform

For simpler deployments, use Salt in masterless mode where states are applied locally.

```hcl
# masterless-salt.tf
# Use Salt in masterless mode with states bundled in the instance
resource "aws_instance" "masterless_salt" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id

  user_data = templatefile("${path.module}/templates/salt-masterless.sh.tpl", {
    salt_states_url = var.salt_states_archive_url
    node_role       = var.node_role
    environment     = var.environment
  })

  tags = {
    Name = "masterless-${count.index}"
  }

  count = var.instance_count
}
```

```bash
#!/bin/bash
# templates/salt-masterless.sh.tpl
# Masterless Salt bootstrap and configuration

set -e

# Install Salt Minion (used in masterless mode)
curl -L https://bootstrap.saltproject.io | sh -s --

# Download Salt states from the archive URL
mkdir -p /srv/salt /srv/pillar
curl -L "${salt_states_url}" | tar xz -C /srv/salt

# Configure Salt for masterless operation
cat > /etc/salt/minion <<EOF
# Masterless mode configuration
file_client: local
log_level: info

file_roots:
  base:
    - /srv/salt

pillar_roots:
  base:
    - /srv/pillar
EOF

# Set grains for role-based configuration
cat > /etc/salt/grains <<EOF
role: ${node_role}
environment: ${environment}
EOF

# Create pillar data with node-specific configuration
cat > /srv/pillar/node.sls <<EOF
role: ${node_role}
environment: ${environment}
EOF

cat > /srv/pillar/top.sls <<EOF
base:
  '*':
    - node
EOF

# Apply Salt states
salt-call --local state.apply

# Set up periodic state application
cat > /etc/cron.d/salt-apply <<EOF
*/30 * * * * root /usr/bin/salt-call --local state.apply 2>&1 | /usr/bin/logger -t salt-apply
EOF
```

## Method 4: Using Salt Cloud with Terraform State

Salt Cloud can read Terraform outputs to manage the Salt configuration of Terraform-created instances.

```hcl
# salt-cloud-integration.tf
# Generate a Salt Cloud map file from Terraform state
resource "local_file" "salt_cloud_map" {
  filename = "${path.module}/salt-cloud-map.yml"

  content = yamlencode({
    for idx, instance in aws_instance.salt_managed :
    instance.tags["Name"] => {
      minion = {
        master  = var.salt_master_ip
        grains  = {
          role        = instance.tags["SaltRole"]
          environment = instance.tags["Environment"]
          instance_id = instance.id
          private_ip  = instance.private_ip
        }
      }
    }
  })
}
```

## Passing Terraform Outputs to Salt Pillar

Share Terraform outputs with SaltStack through pillar data.

```hcl
# pillar-generation.tf
# Generate Salt pillar data from Terraform outputs
resource "null_resource" "salt_pillar" {
  triggers = {
    db_endpoint    = aws_rds_cluster.main.endpoint
    cache_endpoint = aws_elasticache_cluster.main.cache_nodes[0].address
    lb_dns         = aws_lb.main.dns_name
  }

  # Create pillar file with infrastructure details
  provisioner "local-exec" {
    command = <<-EOT
      ssh salt-master "cat > /srv/pillar/infrastructure.sls << 'YAML'
      infrastructure:
        database:
          endpoint: ${aws_rds_cluster.main.endpoint}
          port: ${aws_rds_cluster.main.port}
          name: ${aws_rds_cluster.main.database_name}
        cache:
          endpoint: ${aws_elasticache_cluster.main.cache_nodes[0].address}
          port: 6379
        load_balancer:
          dns: ${aws_lb.main.dns_name}
      YAML"
    EOT
  }

  # Apply the pillar to all minions
  provisioner "local-exec" {
    command = "ssh salt-master 'salt \"*\" saltutil.refresh_pillar'"
  }
}
```

## Reusable Terraform Module

```hcl
# modules/salt-node/main.tf
variable "node_config" {
  type = object({
    count         = number
    instance_type = string
    name_prefix   = string
    salt_role     = string
  })
}

variable "salt_master_ip" {
  type = string
}

resource "aws_instance" "node" {
  count         = var.node_config.count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.node_config.instance_type
  subnet_id     = var.subnet_id

  user_data = templatefile("${path.module}/templates/bootstrap.sh.tpl", {
    salt_master_ip = var.salt_master_ip
    minion_id      = "${var.node_config.name_prefix}-${count.index}"
    salt_role      = var.node_config.salt_role
  })

  tags = {
    Name     = "${var.node_config.name_prefix}-${count.index}"
    SaltRole = var.node_config.salt_role
  }

  # Clean up Salt key on destroy
  provisioner "local-exec" {
    when    = destroy
    command = "ssh salt-master 'salt-key -d ${self.tags[\"Name\"]} -y' || true"
  }
}
```

## Best Practices

Use Salt grains to pass Terraform metadata like instance role, environment, and cloud provider to SaltStack states. Implement auto-accept reactors with strict pattern matching for automated environments. Clean up Salt minion keys when Terraform destroys instances. Use Salt environments that correspond to your Terraform workspaces. Store infrastructure details in Salt pillar data so states can reference Terraform-created resources. Monitor Salt minion connectivity and state application success to catch issues early.

## Conclusion

Terraform and SaltStack together provide a comprehensive infrastructure automation solution. Terraform handles cloud resource provisioning with its declarative approach, while SaltStack manages server configuration with its fast, event-driven architecture. By using bootstrap scripts, pillar data integration, and proper cleanup procedures, you can build a reliable pipeline that takes servers from creation to fully configured in an automated and repeatable way.
