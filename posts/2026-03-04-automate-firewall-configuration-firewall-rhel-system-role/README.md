# How to Automate Firewall Configuration Using the firewall RHEL System Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, Firewall, Ansible

Description: Use the firewall RHEL System Role to manage firewalld zones and rules with Ansible.

---

## Overview

Use the firewall RHEL System Role to manage firewalld zones and rules with Ansible. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

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

Create `configure-firewall.yml`:

```yaml
---
- name: How to Automate Firewall Configuration Using the firewall RHEL System Role
  hosts: managed_hosts
  become: true
  roles:
    - role: rhel-system-roles.firewall
```

Add the role-specific variables. Check the role documentation for available options:

```bash
ls /usr/share/doc/rhel-system-roles/firewall/
cat /usr/share/doc/rhel-system-roles/firewall/README.md
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-firewall.yml
```

## Step 5 - Verify the Configuration

On the managed hosts, verify that the configuration was applied:

```bash
# Check relevant service or configuration
systemctl status <service>
cat <config-file>
```

## Idempotency

RHEL System Roles are idempotent. Running the playbook again will not change systems that already match the desired state. This makes them safe to run repeatedly.

## Summary

You have learned how to automate firewall configuration using the firewall rhel system role. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
