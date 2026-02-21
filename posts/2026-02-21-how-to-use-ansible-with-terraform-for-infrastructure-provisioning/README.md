# How to Use Ansible with Terraform for Infrastructure Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform, Infrastructure as Code, DevOps, Cloud

Description: Learn how to combine Ansible and Terraform for a powerful infrastructure provisioning workflow where Terraform builds and Ansible configures.

---

Terraform and Ansible are both infrastructure-as-code tools, but they solve different problems. Terraform excels at provisioning cloud resources: VMs, networks, load balancers, and managed services. Ansible excels at configuring those resources once they exist: installing packages, managing files, deploying applications. Using them together gives you a workflow that is stronger than either tool alone.

In this post, I will show you practical patterns for combining Terraform and Ansible, from simple sequential execution to tightly integrated pipelines.

## Why Use Both?

I have seen teams try to do everything with just Terraform or just Ansible. It works, technically, but you end up fighting the tool.

Terraform with its `remote-exec` provisioner can run shell commands, but it has no concept of roles, handlers, or idempotent configuration management. Ansible with its cloud modules can create infrastructure, but it lacks a state file and a proper dependency graph for resource lifecycle management.

```mermaid
flowchart LR
    A[Terraform] -->|Provisions| B[Cloud Resources]
    B -->|IP Addresses, IDs| C[Ansible]
    C -->|Configures| D[Running Services]
    style A fill:#7B42BC,color:#fff
    style C fill:#EE0000,color:#fff
```

## Pattern 1: Sequential Execution

The simplest approach is to run Terraform first, then Ansible second, using a script or CI pipeline to chain them.

```bash
#!/bin/bash
# deploy.sh - Run Terraform then Ansible sequentially

set -e

echo "Step 1: Provisioning infrastructure with Terraform"
cd terraform/
terraform init
terraform apply -auto-approve

echo "Step 2: Extracting outputs for Ansible"
terraform output -json > ../ansible/terraform_outputs.json

echo "Step 3: Configuring infrastructure with Ansible"
cd ../ansible/
ansible-playbook -i inventory/dynamic.py playbooks/configure-all.yml
```

## Pattern 2: Terraform Local-Exec Provisioner

Terraform can call Ansible directly using the `local-exec` provisioner. This runs Ansible from the machine executing Terraform.

```hcl
# terraform/main.tf

resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  key_name      = "deploy-key"

  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id              = aws_subnet.public[count.index % length(aws_subnet.public)].id

  tags = {
    Name = "web-${count.index + 1}"
    Role = "webserver"
  }
}

# Generate an Ansible inventory from Terraform resources
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/inventory.tftpl", {
    web_servers = aws_instance.web[*]
    db_servers  = aws_instance.db[*]
  })
  filename = "${path.module}/../ansible/inventory/terraform_inventory.ini"
}

# Run Ansible after inventory is generated
resource "null_resource" "ansible_provisioner" {
  depends_on = [
    local_file.ansible_inventory,
    aws_instance.web,
    aws_instance.db
  ]

  # Re-run Ansible whenever instances change
  triggers = {
    web_ids = join(",", aws_instance.web[*].id)
    db_ids  = join(",", aws_instance.db[*].id)
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/../ansible"
    command     = "ansible-playbook -i inventory/terraform_inventory.ini playbooks/site.yml"
  }
}
```

The inventory template file generates a proper Ansible inventory from Terraform resources.

```ini
# terraform/templates/inventory.tftpl
[webservers]
%{ for server in web_servers ~}
${server.tags.Name} ansible_host=${server.public_ip} ansible_user=ubuntu
%{ endfor ~}

[databases]
%{ for server in db_servers ~}
${server.tags.Name} ansible_host=${server.private_ip} ansible_user=ubuntu
%{ endfor ~}

[all:vars]
ansible_ssh_private_key_file=~/.ssh/deploy-key.pem
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```

## Pattern 3: Dynamic Inventory Script

Instead of generating a static inventory file, write a dynamic inventory script that queries Terraform state directly.

```python
#!/usr/bin/env python3
# ansible/inventory/terraform_dynamic.py
"""
Dynamic Ansible inventory from Terraform state.
Reads terraform.tfstate and generates inventory.
"""

import json
import subprocess
import sys


def get_terraform_output():
    """Run terraform output and parse the JSON result."""
    result = subprocess.run(
        ["terraform", "output", "-json"],
        cwd="../terraform",
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)


def build_inventory(tf_outputs):
    """Build Ansible inventory from Terraform outputs."""
    inventory = {
        "_meta": {"hostvars": {}},
        "webservers": {"hosts": []},
        "databases": {"hosts": []},
    }

    # Process web server outputs
    if "web_instances" in tf_outputs:
        for instance in tf_outputs["web_instances"]["value"]:
            hostname = instance["name"]
            inventory["webservers"]["hosts"].append(hostname)
            inventory["_meta"]["hostvars"][hostname] = {
                "ansible_host": instance["public_ip"],
                "ansible_user": "ubuntu",
                "private_ip": instance["private_ip"],
                "instance_id": instance["id"],
            }

    # Process database outputs
    if "db_instances" in tf_outputs:
        for instance in tf_outputs["db_instances"]["value"]:
            hostname = instance["name"]
            inventory["databases"]["hosts"].append(hostname)
            inventory["_meta"]["hostvars"][hostname] = {
                "ansible_host": instance["private_ip"],
                "ansible_user": "ubuntu",
                "instance_id": instance["id"],
            }

    return inventory


if __name__ == "__main__":
    if "--list" in sys.argv:
        outputs = get_terraform_output()
        print(json.dumps(build_inventory(outputs), indent=2))
    elif "--host" in sys.argv:
        print(json.dumps({}))
```

Make it executable and use it in your playbook.

```bash
# Make the inventory script executable
chmod +x ansible/inventory/terraform_dynamic.py

# Run Ansible with the dynamic inventory
ansible-playbook -i inventory/terraform_dynamic.py playbooks/site.yml
```

## Pattern 4: Terraform Outputs as Ansible Variables

Export structured data from Terraform and consume it in Ansible as variables.

```hcl
# terraform/outputs.tf

output "web_instances" {
  value = [for instance in aws_instance.web : {
    name       = instance.tags.Name
    public_ip  = instance.public_ip
    private_ip = instance.private_ip
    id         = instance.id
  }]
}

output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "lb_dns_name" {
  value = aws_lb.web.dns_name
}
```

Then in Ansible, load these outputs.

```yaml
# playbooks/configure-app.yml
---
- name: Configure application with Terraform outputs
  hosts: webservers
  become: true
  vars_files:
    - ../terraform_outputs.json

  pre_tasks:
    # Load Terraform outputs into variables
    - name: Read Terraform outputs
      ansible.builtin.slurp:
        src: "{{ playbook_dir }}/../terraform/terraform_outputs.json"
      delegate_to: localhost
      register: tf_raw
      run_once: true

    - name: Parse Terraform outputs
      ansible.builtin.set_fact:
        tf: "{{ tf_raw.content | b64decode | from_json }}"
      run_once: true

  tasks:
    # Use Terraform outputs in application configuration
    - name: Deploy application config
      ansible.builtin.template:
        src: app-config.yml.j2
        dest: /etc/myapp/config.yml
        owner: myapp
        group: myapp
        mode: '0640'
      vars:
        db_host: "{{ tf.db_endpoint.value }}"
        redis_host: "{{ tf.redis_endpoint.value }}"
      notify: restart myapp
```

## CI/CD Pipeline Integration

Here is how a GitHub Actions pipeline ties Terraform and Ansible together.

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure
on:
  push:
    branches: [main]

jobs:
  provision:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init and Apply
        working-directory: terraform
        run: |
          terraform init
          terraform apply -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Export Terraform outputs
        working-directory: terraform
        run: terraform output -json > ../ansible/tf_outputs.json

      - name: Setup Python and Ansible
        run: |
          pip install ansible boto3

      - name: Run Ansible
        working-directory: ansible
        run: |
          ansible-playbook -i inventory/aws_ec2.yml playbooks/site.yml
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Project Structure

A clean directory structure keeps things manageable.

```
project/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── templates/
│   │   └── inventory.tftpl
│   └── terraform.tfvars
├── ansible/
│   ├── ansible.cfg
│   ├── inventory/
│   │   ├── terraform_dynamic.py
│   │   └── group_vars/
│   ├── playbooks/
│   │   ├── site.yml
│   │   └── configure-app.yml
│   └── roles/
│       ├── webserver/
│       └── database/
├── deploy.sh
└── .github/
    └── workflows/
        └── deploy.yml
```

## Choosing the Right Pattern

The best pattern depends on your team and workflow:

- **Sequential script**: Simple, easy to understand, good for small teams. Drawback is no built-in error handling between steps.
- **Local-exec provisioner**: Keeps everything in Terraform. Good when Terraform is your primary orchestrator. Can be fragile if Ansible fails mid-run.
- **Dynamic inventory**: Most flexible. Ansible always gets fresh data from Terraform state. Best for ongoing configuration management after initial provisioning.
- **CI/CD pipeline**: Best for production. Clear separation of concerns, proper logging, and rollback capabilities.

Regardless of which pattern you choose, the core idea stays the same: let Terraform do what it does best (provisioning) and let Ansible do what it does best (configuration). Fighting against either tool's strengths is a recipe for frustration.
