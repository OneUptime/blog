# How to Set Up an Ansible Inventory for Talos Linux Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Inventory Management, Kubernetes, DevOps

Description: Learn how to structure and manage Ansible inventory files for Talos Linux clusters with dynamic groups and per-node variables.

---

A well-structured Ansible inventory is the foundation of any reliable automation workflow. For Talos Linux clusters, the inventory needs to reflect the unique nature of Talos - there is no SSH access, nodes are managed through the Talos API, and different node roles require different configurations. This guide walks through setting up an Ansible inventory that works well with Talos Linux deployments.

## Why Inventory Matters for Talos

In a traditional Ansible setup, the inventory is a list of hosts that Ansible connects to via SSH. With Talos Linux, the connection model is different. You cannot SSH into Talos nodes, so all commands run locally on the control machine and use `talosctl` to communicate with nodes over the Talos API.

This changes how you think about inventory. Instead of connection parameters like SSH keys and ports, your inventory focuses on node IP addresses, cluster roles, and configuration variables. The inventory becomes a structured database of your cluster topology that Ansible playbooks reference to target the right nodes with the right operations.

## Basic Inventory Structure

Start with a simple YAML inventory file that groups nodes by role:

```yaml
# inventory/hosts.yml
all:
  children:
    controlplane:
      hosts:
        cp-0:
          node_ip: "10.0.1.10"
        cp-1:
          node_ip: "10.0.1.11"
        cp-2:
          node_ip: "10.0.1.12"

    workers:
      hosts:
        worker-0:
          node_ip: "10.0.1.20"
        worker-1:
          node_ip: "10.0.1.21"
        worker-2:
          node_ip: "10.0.1.22"
```

Since all commands run locally, set the connection type to `local` at the top level:

```yaml
# inventory/hosts.yml
all:
  vars:
    ansible_connection: local
  children:
    controlplane:
      hosts:
        # ...
    workers:
      hosts:
        # ...
```

## Using Group Variables

Group variables let you define settings that apply to all nodes in a particular role. Create a directory structure for group variables:

```
inventory/
  hosts.yml
  group_vars/
    all.yml
    controlplane.yml
    workers.yml
  host_vars/
    cp-0.yml
    worker-0.yml
```

Define cluster-wide variables in `all.yml`:

```yaml
# inventory/group_vars/all.yml
cluster_name: "production"
cluster_endpoint: "https://lb.production.example.com:6443"
talos_version: "v1.7.0"
kubernetes_version: "1.30.0"
talosconfig_path: "{{ inventory_dir }}/../talosconfig"
secrets_path: "{{ inventory_dir }}/../secrets.yaml"

# Common configuration settings
ntp_servers:
  - time.google.com
  - time.cloudflare.com

dns_servers:
  - 8.8.8.8
  - 8.8.4.4

# Talos API settings
talos_api_port: 50000
kubernetes_api_port: 6443
```

Define control-plane-specific settings:

```yaml
# inventory/group_vars/controlplane.yml
node_role: controlplane
install_disk: /dev/sda
vm_size: "Standard_D4s_v3"

# etcd settings
etcd_election_timeout: "5000"
etcd_heartbeat_interval: "500"

# Control plane specific patches
extra_api_server_args:
  audit-log-maxage: "30"
  audit-log-maxbackup: "10"
  audit-log-maxsize: "100"
```

Define worker-specific settings:

```yaml
# inventory/group_vars/workers.yml
node_role: worker
install_disk: /dev/sda
vm_size: "Standard_D2s_v3"

# Kubelet settings for workers
max_pods: 250
image_gc_high_threshold: 85
image_gc_low_threshold: 80
```

## Per-Node Variables

When individual nodes need specific settings, use host variables:

```yaml
# inventory/host_vars/cp-0.yml
node_ip: "10.0.1.10"
availability_zone: "us-east-1a"
bootstrap_node: true

# Node-specific network configuration
network_interfaces:
  - name: eth0
    dhcp: false
    addresses:
      - "10.0.1.10/24"
    routes:
      - network: "0.0.0.0/0"
        gateway: "10.0.1.1"
```

```yaml
# inventory/host_vars/worker-0.yml
node_ip: "10.0.1.20"
availability_zone: "us-east-1a"

# This worker has a GPU
node_labels:
  - "gpu=nvidia-t4"
  - "node-pool=gpu-workers"

node_taints:
  - "nvidia.com/gpu=present:NoSchedule"
```

## Multi-Environment Inventory

For organizations running multiple clusters or environments, create separate inventory directories:

```
inventory/
  production/
    hosts.yml
    group_vars/
      all.yml
      controlplane.yml
      workers.yml
  staging/
    hosts.yml
    group_vars/
      all.yml
      controlplane.yml
      workers.yml
  development/
    hosts.yml
    group_vars/
      all.yml
```

Each environment has its own hosts and variables:

```yaml
# inventory/staging/hosts.yml
all:
  vars:
    ansible_connection: local
  children:
    controlplane:
      hosts:
        stg-cp-0:
          node_ip: "10.1.1.10"
    workers:
      hosts:
        stg-worker-0:
          node_ip: "10.1.1.20"
        stg-worker-1:
          node_ip: "10.1.1.21"
```

```yaml
# inventory/staging/group_vars/all.yml
cluster_name: "staging"
cluster_endpoint: "https://lb.staging.example.com:6443"
talos_version: "v1.8.0"  # Testing newer version in staging
kubernetes_version: "1.30.0"
```

Target a specific environment when running playbooks:

```bash
# Deploy to staging
ansible-playbook -i inventory/staging playbooks/deploy.yml

# Deploy to production
ansible-playbook -i inventory/production playbooks/deploy.yml
```

## Dynamic Inventory for Cloud Environments

If your Talos nodes run on a cloud provider, you can use a dynamic inventory script that queries the cloud API for node information:

```python
#!/usr/bin/env python3
# inventory/dynamic_inventory.py

import json
import subprocess
import sys

def get_instances():
    """Query cloud provider for Talos instances."""
    # Example using AWS CLI
    result = subprocess.run(
        ["aws", "ec2", "describe-instances",
         "--filters", "Name=tag:Cluster,Values=production",
         "--query", "Reservations[].Instances[].[Tags[?Key=='Name'].Value|[0],PrivateIpAddress,Tags[?Key=='Role'].Value|[0]]",
         "--output", "json"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def build_inventory():
    instances = get_instances()
    inventory = {
        "all": {
            "vars": {
                "ansible_connection": "local"
            },
            "children": ["controlplane", "workers"]
        },
        "controlplane": {"hosts": {}},
        "workers": {"hosts": {}},
        "_meta": {"hostvars": {}}
    }

    for name, ip, role in instances:
        group = "controlplane" if role == "controlplane" else "workers"
        inventory[group]["hosts"][name] = {}
        inventory["_meta"]["hostvars"][name] = {
            "node_ip": ip,
            "node_role": role
        }

    return inventory

if __name__ == "__main__":
    if "--list" in sys.argv:
        print(json.dumps(build_inventory(), indent=2))
    elif "--host" in sys.argv:
        print(json.dumps({}))
```

Use the dynamic inventory:

```bash
# Make the script executable
chmod +x inventory/dynamic_inventory.py

# Use it with ansible-playbook
ansible-playbook -i inventory/dynamic_inventory.py playbooks/deploy.yml
```

## Inventory Validation

Create a simple playbook to validate your inventory:

```yaml
# playbooks/validate-inventory.yml
---
- name: Validate Talos inventory
  hosts: all
  gather_facts: false
  connection: local

  tasks:
    - name: Check that node_ip is defined
      ansible.builtin.assert:
        that:
          - node_ip is defined
          - node_ip | length > 0
        fail_msg: "node_ip is not defined for {{ inventory_hostname }}"

    - name: Verify node is reachable on Talos API port
      ansible.builtin.wait_for:
        host: "{{ node_ip }}"
        port: "{{ talos_api_port | default(50000) }}"
        timeout: 10
        state: started
      ignore_errors: true
      register: reach_check

    - name: Report reachability
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} ({{ node_ip }}): {{ 'reachable' if reach_check.state is defined else 'unreachable' }}"

- name: Summarize inventory
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Display inventory summary
      ansible.builtin.debug:
        msg: |
          Cluster: {{ cluster_name }}
          Control plane nodes: {{ groups['controlplane'] | length }}
          Worker nodes: {{ groups['workers'] | length }}
          Talos version: {{ talos_version }}
```

## Ansible Configuration

Set up your `ansible.cfg` to work well with Talos:

```ini
# ansible.cfg
[defaults]
inventory = inventory/production
host_key_checking = false
retry_files_enabled = false
stdout_callback = yaml

[privilege_escalation]
become = false
```

A properly structured inventory makes all your Talos automation more maintainable and less error-prone. Take the time to organize it well from the start, and it will pay dividends as your cluster grows and your automation becomes more sophisticated.
