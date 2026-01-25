# How to Create Ansible Inventory from Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Ansible, Infrastructure as Code, DevOps, Configuration Management, Automation

Description: Learn how to generate Ansible inventory files from Terraform outputs. This guide covers static and dynamic inventory generation, template files, and integration patterns for seamless infrastructure provisioning and configuration.

Terraform excels at provisioning infrastructure, while Ansible excels at configuring it. Combining them requires passing infrastructure details from Terraform to Ansible. The most common approach is generating an Ansible inventory file containing the IP addresses and metadata of your provisioned resources.

## Understanding the Integration

```mermaid
flowchart LR
    A[Terraform Apply] --> B[Provision Infrastructure]
    B --> C[Output Instance Details]
    C --> D[Generate Inventory]
    D --> E[Ansible Playbook]
    E --> F[Configure Servers]
```

## Method 1: Using local_file Resource

Generate a simple INI-format inventory file.

```hcl
# main.tf
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  key_name      = aws_key_pair.ansible.key_name

  vpc_security_group_ids = [aws_security_group.allow_ssh.id]
  subnet_id              = aws_subnet.public[count.index % length(aws_subnet.public)].id

  tags = {
    Name = "web-server-${count.index + 1}"
    Role = "webserver"
  }
}

resource "aws_instance" "db" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  key_name      = aws_key_pair.ansible.key_name

  vpc_security_group_ids = [aws_security_group.allow_ssh.id]
  subnet_id              = aws_subnet.private[0].id

  tags = {
    Name = "database-server"
    Role = "database"
  }
}

# Generate Ansible inventory
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/inventory.tftpl", {
    web_servers = aws_instance.web[*]
    db_servers  = [aws_instance.db]
  })
  filename = "${path.module}/inventory/hosts"
}
```

### Inventory Template

```ini
# templates/inventory.tftpl
[webservers]
%{ for server in web_servers ~}
${server.tags.Name} ansible_host=${server.public_ip} ansible_user=ec2-user
%{ endfor ~}

[databases]
%{ for server in db_servers ~}
${server.tags.Name} ansible_host=${server.private_ip} ansible_user=ec2-user
%{ endfor ~}

[all:vars]
ansible_ssh_private_key_file=~/.ssh/ansible-key.pem
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```

## Method 2: YAML Inventory Format

Generate a more feature-rich YAML inventory.

```hcl
resource "local_file" "ansible_inventory_yaml" {
  content = yamlencode({
    all = {
      children = {
        webservers = {
          hosts = {
            for idx, instance in aws_instance.web : instance.tags.Name => {
              ansible_host = instance.public_ip
              ansible_user = "ec2-user"
              instance_id  = instance.id
              private_ip   = instance.private_ip
              az           = instance.availability_zone
            }
          }
          vars = {
            nginx_port = 80
            app_env    = var.environment
          }
        }
        databases = {
          hosts = {
            for instance in [aws_instance.db] : instance.tags.Name => {
              ansible_host = instance.private_ip
              ansible_user = "ec2-user"
              instance_id  = instance.id
            }
          }
          vars = {
            postgresql_version = "14"
          }
        }
      }
      vars = {
        ansible_ssh_private_key_file = "~/.ssh/ansible-key.pem"
        ansible_ssh_common_args      = "-o StrictHostKeyChecking=no"
      }
    }
  })
  filename = "${path.module}/inventory/hosts.yml"
}
```

## Method 3: Dynamic Inventory Script

Generate a dynamic inventory script that queries Terraform state.

```hcl
# Output values for dynamic inventory
output "ansible_inventory" {
  value = {
    webservers = {
      hosts = [
        for instance in aws_instance.web : {
          name       = instance.tags.Name
          public_ip  = instance.public_ip
          private_ip = instance.private_ip
          id         = instance.id
        }
      ]
      vars = {
        ansible_user = "ec2-user"
        nginx_port   = 80
      }
    }
    databases = {
      hosts = [
        {
          name       = aws_instance.db.tags.Name
          public_ip  = aws_instance.db.public_ip
          private_ip = aws_instance.db.private_ip
          id         = aws_instance.db.id
        }
      ]
      vars = {
        ansible_user = "ec2-user"
        db_port      = 5432
      }
    }
  }
  description = "Ansible inventory data"
}

# Generate dynamic inventory script
resource "local_file" "dynamic_inventory" {
  content  = <<-EOF
    #!/usr/bin/env python3
    import json
    import subprocess
    import sys

    def get_terraform_output():
        result = subprocess.run(
            ['terraform', 'output', '-json', 'ansible_inventory'],
            capture_output=True,
            text=True,
            cwd='${abspath(path.module)}'
        )
        return json.loads(result.stdout)

    def generate_inventory():
        tf_output = get_terraform_output()

        inventory = {
            '_meta': {
                'hostvars': {}
            }
        }

        for group_name, group_data in tf_output.items():
            inventory[group_name] = {
                'hosts': [],
                'vars': group_data.get('vars', {})
            }

            for host in group_data.get('hosts', []):
                hostname = host['name']
                inventory[group_name]['hosts'].append(hostname)
                inventory['_meta']['hostvars'][hostname] = {
                    'ansible_host': host['public_ip'] or host['private_ip'],
                    'private_ip': host['private_ip'],
                    'instance_id': host['id']
                }

        return inventory

    if __name__ == '__main__':
        if len(sys.argv) == 2 and sys.argv[1] == '--list':
            print(json.dumps(generate_inventory(), indent=2))
        elif len(sys.argv) == 3 and sys.argv[1] == '--host':
            print(json.dumps({}))
        else:
            print("Usage: inventory.py --list | --host <hostname>")
            sys.exit(1)
  EOF
  filename = "${path.module}/inventory/dynamic_inventory.py"
  file_permission = "0755"
}
```

## Method 4: Using templatefile with Groups

Generate complex inventory with multiple groups and variables.

```hcl
variable "environments" {
  type = list(object({
    name           = string
    instance_count = number
    instance_type  = string
  }))
  default = [
    { name = "production", instance_count = 3, instance_type = "t3.large" },
    { name = "staging", instance_count = 2, instance_type = "t3.medium" }
  ]
}

resource "aws_instance" "app" {
  for_each = {
    for idx, config in flatten([
      for env in var.environments : [
        for i in range(env.instance_count) : {
          key           = "${env.name}-${i + 1}"
          environment   = env.name
          instance_type = env.instance_type
          index         = i + 1
        }
      ]
    ]) : config.key => config
  }

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = each.value.instance_type
  key_name      = aws_key_pair.ansible.key_name

  tags = {
    Name        = "app-${each.key}"
    Environment = each.value.environment
    Index       = each.value.index
  }
}

locals {
  inventory_groups = {
    for env in var.environments : env.name => [
      for key, instance in aws_instance.app : instance
      if instance.tags.Environment == env.name
    ]
  }
}

resource "local_file" "inventory" {
  content = templatefile("${path.module}/templates/complex_inventory.tftpl", {
    groups       = local.inventory_groups
    ssh_key_path = var.ssh_key_path
    ssh_user     = var.ssh_user
  })
  filename = "${path.module}/inventory/hosts"
}
```

### Complex Inventory Template

```ini
# templates/complex_inventory.tftpl
# Generated by Terraform - Do not edit manually
# Generated at: ${timestamp()}

%{ for group_name, instances in groups ~}
[${group_name}]
%{ for instance in instances ~}
${instance.tags.Name} ansible_host=${instance.public_ip} instance_id=${instance.id}
%{ endfor ~}

[${group_name}:vars]
ansible_user=${ssh_user}
env_name=${group_name}

%{ endfor ~}

[all:vars]
ansible_ssh_private_key_file=${ssh_key_path}
ansible_ssh_common_args='-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
```

## Method 5: Integration with Ansible Provisioner

Run Ansible directly from Terraform using the null_resource.

```hcl
resource "null_resource" "ansible_provisioner" {
  # Run when instances change
  triggers = {
    instance_ids = join(",", aws_instance.web[*].id)
  }

  # Wait for instances to be ready
  depends_on = [aws_instance.web]

  # Generate inventory first
  provisioner "local-exec" {
    command = <<-EOT
      cat > inventory/hosts <<EOF
      [webservers]
      %{ for instance in aws_instance.web ~}
      ${instance.tags.Name} ansible_host=${instance.public_ip}
      %{ endfor ~}

      [all:vars]
      ansible_user=ec2-user
      ansible_ssh_private_key_file=~/.ssh/ansible-key.pem
      EOF
    EOT
  }

  # Wait for SSH to be available
  provisioner "local-exec" {
    command = <<-EOT
      for host in ${join(" ", aws_instance.web[*].public_ip)}; do
        until nc -zw 5 $host 22; do
          echo "Waiting for SSH on $host..."
          sleep 5
        done
      done
    EOT
  }

  # Run Ansible playbook
  provisioner "local-exec" {
    command = "ansible-playbook -i inventory/hosts playbooks/configure.yml"
  }
}
```

## Complete Working Example

```hcl
# variables.tf
variable "environment" {
  type    = string
  default = "production"
}

variable "web_instance_count" {
  type    = number
  default = 3
}

variable "ssh_key_path" {
  type    = string
  default = "~/.ssh/ansible-key.pem"
}

# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# SSH Key
resource "tls_private_key" "ansible" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ansible" {
  key_name   = "ansible-key-${var.environment}"
  public_key = tls_private_key.ansible.public_key_openssh
}

resource "local_sensitive_file" "private_key" {
  content         = tls_private_key.ansible.private_key_pem
  filename        = "${path.module}/keys/ansible-key.pem"
  file_permission = "0600"
}

# Instances
resource "aws_instance" "web" {
  count         = var.web_instance_count
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.ansible.key_name

  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name        = "web-${var.environment}-${count.index + 1}"
    Environment = var.environment
    Role        = "webserver"
    Ansible     = "managed"
  }
}

resource "aws_instance" "db" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.ansible.key_name

  vpc_security_group_ids = [aws_security_group.db.id]

  tags = {
    Name        = "db-${var.environment}"
    Environment = var.environment
    Role        = "database"
    Ansible     = "managed"
  }
}

# Generate Ansible inventory
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/inventory.tftpl", {
    environment = var.environment
    web_servers = aws_instance.web[*]
    db_servers  = [aws_instance.db]
    ssh_key     = "${path.module}/keys/ansible-key.pem"
  })
  filename = "${path.module}/ansible/inventory/hosts"

  depends_on = [local_sensitive_file.private_key]
}

# Generate Ansible variables
resource "local_file" "ansible_vars" {
  content = yamlencode({
    environment          = var.environment
    db_host             = aws_instance.db.private_ip
    web_server_count    = var.web_instance_count
    load_balancer_dns   = aws_lb.main.dns_name
  })
  filename = "${path.module}/ansible/group_vars/all.yml"
}

# AMI lookup
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# outputs.tf
output "ansible_command" {
  value       = "ansible-playbook -i ${local_file.ansible_inventory.filename} playbooks/site.yml"
  description = "Command to run Ansible playbook"
}

output "inventory_path" {
  value       = local_file.ansible_inventory.filename
  description = "Path to generated inventory file"
}
```

## Best Practices

1. **Use templatefile** - More readable than heredoc for complex inventories
2. **Generate SSH keys with Terraform** - Ensures keys exist before inventory
3. **Use depends_on** - Ensure instances are ready before generating inventory
4. **Include metadata** - Add instance IDs, IPs, and other useful info
5. **Separate inventory by environment** - Different files for prod/staging
6. **Version control templates** - Keep inventory templates in git
7. **Use sensitive files** - Protect private keys with `local_sensitive_file`

By implementing these patterns, you can seamlessly integrate Terraform infrastructure provisioning with Ansible configuration management, creating a complete Infrastructure as Code workflow.
