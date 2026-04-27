# How to Use OpenTofu Outputs as Ansible Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ansible, Inventory, Infrastructure as Code, DevOps

Description: Learn how to use OpenTofu output values to dynamically generate Ansible inventory files, bridging infrastructure provisioning and configuration management.

## Introduction

OpenTofu provisions infrastructure; Ansible configures it. Connecting the two tools requires feeding infrastructure data (IP addresses, hostnames, roles) from OpenTofu into Ansible. This guide covers generating static INI and YAML inventory files from outputs and writing a Python-based dynamic inventory script.

## Defining OpenTofu Outputs for Ansible

Structure your outputs to contain the data Ansible needs:

```hcl
# outputs.tf

output "web_servers" {
  value = {
    for i, instance in aws_instance.web :
    instance.tags["Name"] => {
      ansible_host = instance.public_ip
      ansible_user = "ubuntu"
      private_ip   = instance.private_ip
      az           = instance.availability_zone
    }
  }
}

output "db_servers" {
  value = {
    for i, instance in aws_instance.db :
    instance.tags["Name"] => {
      ansible_host = instance.private_ip
      ansible_user = "ubuntu"
      private_ip   = instance.private_ip
    }
  }
}

output "bastion_host" {
  value = {
    ansible_host = aws_instance.bastion.public_ip
    ansible_user = "ubuntu"
  }
}
```

## Method 1: Generate a Static Inventory File

Use `tofu output` with a local-exec provisioner or a shell script:

```bash
#!/bin/bash
# generate-inventory.sh

set -euo pipefail

# Get outputs as JSON

OUTPUTS=$(tofu output -json)

# Generate inventory file
cat > inventory/hosts.ini << EOF
[bastion]
bastion-01 ansible_host=$(echo $OUTPUTS | jq -r '.bastion_host.value.ansible_host') ansible_user=$(echo $OUTPUTS | jq -r '.bastion_host.value.ansible_user')

[web_servers]
$(echo $OUTPUTS | jq -r '.web_servers.value | to_entries[] | "\(.key) ansible_host=\(.value.ansible_host) ansible_user=\(.value.ansible_user) private_ip=\(.value.private_ip)"')

[db_servers]
$(echo $OUTPUTS | jq -r '.db_servers.value | to_entries[] | "\(.key) ansible_host=\(.value.ansible_host) ansible_user=\(.value.ansible_user)"')

[web_servers:vars]
ansible_ssh_common_args='-o StrictHostKeyChecking=no'

[db_servers:vars]
ansible_ssh_common_args='-o ProxyJump=ubuntu@$(echo $OUTPUTS | jq -r ".bastion_host.value.ansible_host")'
EOF

echo "Inventory generated at inventory/hosts.ini"
```

## Method 2: Generate a YAML Inventory

YAML inventory is more powerful and supports group variables:

```bash
#!/bin/bash
# generate-yaml-inventory.sh

OUTPUTS=$(tofu output -json)

cat > inventory/hosts.yml << EOF
all:
  children:
    bastion:
      hosts:
$(echo $OUTPUTS | jq -r '.bastion_host.value | "        bastion-01:\n          ansible_host: \(.ansible_host)\n          ansible_user: \(.ansible_user)"')

    web_servers:
      hosts:
$(echo $OUTPUTS | jq -r '.web_servers.value | to_entries[] | "        \(.key):\n          ansible_host: \(.value.ansible_host)\n          ansible_user: \(.value.ansible_user)\n          private_ip: \(.value.private_ip)"')
      vars:
        ansible_ssh_common_args: '-o StrictHostKeyChecking=no'

    db_servers:
      hosts:
$(echo $OUTPUTS | jq -r '.db_servers.value | to_entries[] | "        \(.key):\n          ansible_host: \(.value.ansible_host)\n          ansible_user: \(.value.ansible_user)"')
      vars:
        ansible_ssh_common_args: '-o ProxyJump=ubuntu@$(echo $OUTPUTS | jq -r ".bastion_host.value.ansible_host")'
EOF
```

## Method 3: Python Dynamic Inventory Script

Create a dynamic inventory script that calls `tofu output` at runtime:

```python
#!/usr/bin/env python3
# inventory/tofu_inventory.py

import json
import subprocess
import sys

def get_tofu_outputs():
    result = subprocess.run(
        ["tofu", "output", "-json"],
        capture_output=True, text=True, check=True,
        cwd="/path/to/tofu/config"
    )
    return json.loads(result.stdout)

def build_inventory(outputs):
    inventory = {
        "_meta": {"hostvars": {}},
        "all": {"children": ["web_servers", "db_servers", "bastion"]},
        "web_servers": {"hosts": []},
        "db_servers": {"hosts": []},
        "bastion": {"hosts": []}
    }

    # Add bastion
    bastion = outputs["bastion_host"]["value"]
    inventory["_meta"]["hostvars"]["bastion-01"] = bastion
    inventory["bastion"]["hosts"].append("bastion-01")

    # Add web servers
    for name, vars in outputs["web_servers"]["value"].items():
        inventory["_meta"]["hostvars"][name] = vars
        inventory["web_servers"]["hosts"].append(name)

    # Add DB servers
    for name, vars in outputs["db_servers"]["value"].items():
        inventory["_meta"]["hostvars"][name] = vars
        inventory["db_servers"]["hosts"].append(name)

    return inventory

if __name__ == "__main__":
    outputs = get_tofu_outputs()
    inventory = build_inventory(outputs)
    print(json.dumps(inventory, indent=2))
```

Make it executable and use with Ansible:

```bash
chmod +x inventory/tofu_inventory.py
ansible-inventory -i inventory/tofu_inventory.py --list
ansible all -i inventory/tofu_inventory.py -m ping
```

## Using in a CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
- name: Provision Infrastructure
  run: tofu apply -auto-approve

- name: Generate Ansible Inventory
  run: bash generate-yaml-inventory.sh

- name: Run Ansible Playbook
  run: |
    ansible-playbook \
      -i inventory/hosts.yml \
      --private-key ${{ secrets.SSH_KEY_PATH }} \
      playbooks/configure.yml
```

## Best Practices

- Use structured output types (`object` or `map(object(...))`) for consistent parsing.
- Add the SSH user and key path to outputs to make Ansible configuration self-contained.
- Commit generated static inventories to version control only if they contain no secrets.
- Use the dynamic inventory approach in CI/CD to always reflect current infrastructure state.
- Test inventory generation with `ansible-inventory --list` before running playbooks.

## Conclusion

Connecting OpenTofu outputs to Ansible inventory bridges infrastructure provisioning and configuration management into a seamless workflow. Whether using static inventory files or dynamic inventory scripts, the pattern of consuming OpenTofu outputs ensures Ansible always targets the exact infrastructure that was just provisioned.
