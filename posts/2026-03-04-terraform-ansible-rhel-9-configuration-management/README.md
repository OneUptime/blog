# How to Use Terraform with Ansible for RHEL Configuration Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Terraform, Ansible, Configuration Management, IaC, Linux

Description: Combine Terraform for infrastructure provisioning with Ansible for configuration management to fully automate RHEL deployments.

---

Terraform excels at creating infrastructure, and Ansible excels at configuring it. Together, they form a powerful combination: Terraform provisions the servers, and Ansible configures them. This guide shows how to wire them together on RHEL.

## The Two-Phase Approach

```mermaid
graph LR
    A[Terraform] -->|Phase 1: Provision| B[RHEL Servers Created]
    B -->|Generate Inventory| C[Ansible Inventory File]
    C -->|Phase 2: Configure| D[Ansible Playbooks]
    D --> E[Configured RHEL Servers]
```

## Install Both Tools

```bash
# Install Terraform
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
sudo dnf install -y terraform

# Install Ansible
sudo dnf install -y ansible-core
```

## Terraform: Provision Infrastructure

```hcl
# main.tf - Create RHEL servers on AWS

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "server_count" {
  default = 3
}

data "aws_ami" "rhel9" {
  most_recent = true
  owners      = ["309956199498"]

  filter {
    name   = "name"
    values = ["RHEL-9.*_HVM-*-x86_64-*-Hourly*"]
  }
}

resource "aws_instance" "rhel_servers" {
  count         = var.server_count
  ami           = data.aws_ami.rhel9.id
  instance_type = "t3.medium"
  key_name      = "my-keypair"

  tags = {
    Name = "rhel9-server-${count.index + 1}"
    Role = count.index == 0 ? "web" : "app"
  }
}
```

## Generate Ansible Inventory from Terraform

```hcl
# inventory.tf - Generate Ansible inventory from Terraform outputs

resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/inventory.tftpl", {
    web_servers = [for i, inst in aws_instance.rhel_servers :
      inst.public_ip if inst.tags["Role"] == "web"
    ]
    app_servers = [for i, inst in aws_instance.rhel_servers :
      inst.public_ip if inst.tags["Role"] == "app"
    ]
  })
  filename = "${path.module}/ansible/inventory.ini"
}
```

Create the inventory template:

```ini
# inventory.tftpl - Ansible inventory template

[web]
%{ for ip in web_servers ~}
${ip} ansible_user=ec2-user ansible_ssh_private_key_file=~/.ssh/my-keypair.pem
%{ endfor ~}

[app]
%{ for ip in app_servers ~}
${ip} ansible_user=ec2-user ansible_ssh_private_key_file=~/.ssh/my-keypair.pem
%{ endfor ~}

[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

## Ansible: Configure the Servers

```yaml
# ansible/playbook.yml - Configure the provisioned RHEL servers

---
- name: Configure all RHEL servers
  hosts: all
  become: true
  tasks:
    - name: Update all packages
      ansible.builtin.dnf:
        name: "*"
        state: latest

    - name: Install common packages
      ansible.builtin.dnf:
        name:
          - vim
          - curl
          - wget
          - bash-completion
          - firewalld
        state: present

    - name: Start and enable firewalld
      ansible.builtin.systemd:
        name: firewalld
        state: started
        enabled: true

    - name: Set the timezone
      community.general.timezone:
        name: America/New_York

- name: Configure web servers
  hosts: web
  become: true
  tasks:
    - name: Install Nginx
      ansible.builtin.dnf:
        name: nginx
        state: present

    - name: Start and enable Nginx
      ansible.builtin.systemd:
        name: nginx
        state: started
        enabled: true

    - name: Allow HTTP traffic
      ansible.posix.firewalld:
        service: http
        permanent: true
        state: enabled
        immediate: true

- name: Configure app servers
  hosts: app
  become: true
  tasks:
    - name: Install Java 17
      ansible.builtin.dnf:
        name: java-17-openjdk
        state: present
```

## Run Terraform Provisioner for Ansible

You can also call Ansible directly from Terraform using a local-exec provisioner:

```hcl
# provisioner.tf - Run Ansible after Terraform creates resources

resource "null_resource" "ansible_provisioner" {
  # Re-run when instance IDs change
  triggers = {
    instance_ids = join(",", aws_instance.rhel_servers[*].id)
  }

  # Wait for the inventory file to be created
  depends_on = [local_file.ansible_inventory]

  # Run the Ansible playbook
  provisioner "local-exec" {
    command = <<-EOT
      # Wait for SSH to become available
      sleep 30

      # Run the Ansible playbook
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
        -i ansible/inventory.ini \
        ansible/playbook.yml
    EOT
  }
}
```

## Complete Workflow

```bash
# Step 1: Initialize Terraform
terraform init

# Step 2: Provision infrastructure and generate inventory
terraform apply -auto-approve

# Step 3: If not using the null_resource approach, run Ansible manually
cd ansible
ansible-playbook -i inventory.ini playbook.yml

# Step 4: Verify connectivity
ansible all -i inventory.ini -m ping
```

## Wrapper Script

```bash
#!/bin/bash
# deploy.sh - Full deployment with Terraform and Ansible
set -euo pipefail

echo "Phase 1: Provisioning infrastructure with Terraform..."
terraform init
terraform apply -auto-approve

echo "Phase 2: Waiting for instances to be ready..."
sleep 60

echo "Phase 3: Configuring servers with Ansible..."
ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
  -i ansible/inventory.ini \
  ansible/playbook.yml

echo "Deployment complete!"
terraform output
```

Using Terraform and Ansible together gives you the best of both worlds: declarative infrastructure provisioning and powerful configuration management for your RHEL servers.
