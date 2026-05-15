# How to Automate GRUB Config Using the bootloader RHEL System Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, GRUB, Bootloader

Description: Use the bootloader RHEL System Role to manage GRUB configuration with Ansible.

---

## Overview

Use the bootloader RHEL System Role to manage GRUB configuration with Ansible. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

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

Create `configure-bootloader.yml`:

```yaml
---
- name: How to Automate GRUB Boot Loader Configuration Using the bootloader RHEL System Role
  hosts: managed_hosts
  become: true
  tasks:
    - name: Update the boot loader timeout
      ansible.builtin.include_role:
        name: redhat.rhel_system_roles.bootloader
      vars:
        bootloader_timeout: 10
```

Add the role-specific variables. Check the role documentation for available options:

```bash
cat /usr/share/ansible/roles/rhel-system-roles.bootloader/README.md
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-bootloader.yml
```

## Step 5 - Verify the Configuration

On the managed hosts, verify that the configuration was applied:

```bash
ansible managed_hosts -i inventory.ini -m ansible.builtin.command -a "grep 'set timeout=10' /boot/grub2/grub.cfg"
```

## Idempotency

RHEL System Roles are idempotent. Running the playbook again will not change systems that already match the desired state. This makes them safe to run repeatedly.

## Summary

You have learned how to automate grub boot loader configuration using the bootloader rhel system role. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
