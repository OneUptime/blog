# How to Automate Network Configuration Using the network RHEL System Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, Network, Ansible

Description: Use the network RHEL System Role to automate network interface configuration.

---

## Overview

Use the network RHEL System Role to automate network interface configuration. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

## Prerequisites

- Ansible installed on a control node
- RHEL System Roles package installed
- SSH key-based access to managed RHEL hosts

## Step 1 - Install RHEL System Roles

```bash
sudo dnf install -y rhel-system-roles
```

The roles are installed to `/usr/share/ansible/roles/`.

## Step 2 - Create an Inventory File

Create `inventory.ini`:

```ini
[managed_hosts]
server1.example.com
server2.example.com
server3.example.com
```

## Step 3 - Write the Playbook

Create `configure-network.yml`:

```yaml
---
- name: How to Automate Network Configuration Using the network RHEL System Role
  hosts: managed_hosts
  become: true
  vars:
    network_connections:
      - name: example-ethernet
        type: ethernet
        interface_name: eth1
        state: up
        ip:
          dhcp4: true
          auto6: false
  roles:
    - role: rhel-system-roles.network
```

Add the role-specific variables. Check the role documentation for available options:

```bash
cat /usr/share/ansible/roles/rhel-system-roles.network/README.md
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-network.yml
```

## Step 5 - Verify the Configuration

On the managed hosts, verify that the configuration was applied:

```bash
systemctl status NetworkManager
nmcli connection show example-ethernet
```

## Idempotency

RHEL System Roles are idempotent. Running the playbook again will not change systems that already match the desired state. This makes them safe to run repeatedly.

## Summary

You have learned how to automate network configuration using the network rhel system role. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
