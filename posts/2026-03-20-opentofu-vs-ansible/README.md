# OpenTofu vs Ansible: Infrastructure Provisioning vs Configuration Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ansible, Comparison, Infrastructure as Code, Configuration Management, DevOps

Description: Compare OpenTofu and Ansible - their different purposes, how they complement each other, and when to use each for infrastructure provisioning vs configuration management.

## Introduction

OpenTofu and Ansible are often compared, but they solve different problems. OpenTofu provisions infrastructure (VMs, networks, databases, cloud services). Ansible configures what runs on that infrastructure (software packages, configuration files, services). They're complementary tools, not competitors.

## What Each Tool Does

OpenTofu provisions cloud resources:

```hcl
# OpenTofu: Create the infrastructure

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.public.id

  tags = { Name = "web-server" }
}

output "web_server_ip" {
  value = aws_instance.web.public_ip
}
```

Ansible configures the software on those resources:

```yaml
# Ansible: Configure what runs on the instance
---
- name: Configure web server
  hosts: web_servers
  become: true
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present

    - name: Deploy application
      copy:
        src: app/
        dest: /var/www/html/

    - name: Start nginx
      service:
        name: nginx
        state: started
        enabled: true
```

## Comparison Matrix

| Feature | OpenTofu | Ansible |
|---------|----------|---------|
| Primary purpose | Infrastructure provisioning | Configuration management |
| State model | Explicit state file | Stateless (idempotent tasks) |
| Language | HCL | YAML (Playbooks) |
| Target | Cloud APIs | SSH/WinRM to servers |
| Idempotency | Native (plan/apply) | Task-level idempotency |
| Multi-cloud | Yes (3,000+ providers) | Yes (via modules) |
| Drift detection | `tofu plan -refresh-only` | `ansible-playbook --check` |
| Secrets | SOPS, Vault, write-only | Ansible Vault |
| Agent required | No | No (agentless) |
| License | MPL 2.0 | GPL 3.0 |

## Working Together: The Common Pattern

```hcl
# Step 1: OpenTofu provisions infrastructure
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name
  subnet_id     = aws_subnet.public.id

  tags = { Name = "web-server", Role = "web" }
}

# Generate Ansible inventory from OpenTofu outputs
resource "local_file" "ansible_inventory" {
  content = templatefile("templates/inventory.tpl", {
    web_servers = [aws_instance.web.public_ip]
  })
  filename = "../ansible/inventory/production.ini"
}

output "web_server_ip" {
  value = aws_instance.web.public_ip
}
```

```ini
# templates/inventory.tpl - Ansible inventory
[web_servers]
%{ for ip in web_servers ~}
${ip} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/deploy-key
%{ endfor ~}
```

```bash
# Workflow
# 1. Provision infrastructure
tofu apply

# 2. Wait for instance to be ready
sleep 30

# 3. Configure software
cd ../ansible
ansible-playbook -i inventory/production.ini playbooks/web-server.yml
```

## When to Use OpenTofu

- Creating VMs, networks, databases, load balancers
- Managing cloud-native services (S3, RDS, Lambda, EKS)
- Provisioning accounts and IAM
- Infrastructure that changes rarely

## When to Use Ansible

- Installing and configuring software packages
- Managing configuration files (nginx.conf, application.properties)
- Running one-off operational tasks (rotating certificates, patching)
- Configuring VMs after provisioning

## Modern Alternative: Packer + OpenTofu

For immutable infrastructure, use Packer to bake Ansible configurations into AMIs, then deploy with OpenTofu:

```hcl
# packer.pkr.hcl - Build AMI with Ansible pre-applied
build {
  sources = ["source.amazon-ebs.ubuntu"]

  provisioner "ansible" {
    playbook_file = "playbooks/web-server.yml"
  }
}
```

```hcl
# OpenTofu: Deploy the pre-configured AMI
data "aws_ami" "web_server" {
  most_recent = true
  owners      = ["self"]
  filter {
    name   = "name"
    values = ["web-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.web_server.id
  instance_type = "t3.medium"
}
```

## Conclusion

OpenTofu and Ansible solve different problems and work best together. Use OpenTofu to provision cloud infrastructure (VMs, networks, databases, cloud services), then use Ansible to configure what runs on that infrastructure. For immutable infrastructure, use Packer+Ansible to bake configurations into AMIs, and OpenTofu to deploy them. The combination of declarative infrastructure provisioning (OpenTofu) and procedural configuration management (Ansible) covers the full infrastructure lifecycle.
