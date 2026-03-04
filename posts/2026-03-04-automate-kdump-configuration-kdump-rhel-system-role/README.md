# How to Automate Kernel Dump (kdump) Configuration Using the kdump RHEL System Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, kdump, Crash Dump

Description: Use the kdump RHEL System Role to configure kernel crash dump settings.

---

## Overview

Use the kdump RHEL System Role to configure kernel crash dump settings. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

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

Create `configure-kdump.yml`:

```yaml
---
- name: How to Automate Kernel Dump (kdump) Configuration Using the kdump RHEL System Role
  hosts: managed_hosts
  become: true
  roles:
    - role: rhel-system-roles.kdump
```

Add the role-specific variables. Check the role documentation for available options:

```bash
ls /usr/share/doc/rhel-system-roles/kdump/
cat /usr/share/doc/rhel-system-roles/kdump/README.md
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-kdump.yml
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

You have learned how to automate kernel dump (kdump) configuration using the kdump rhel system role. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
