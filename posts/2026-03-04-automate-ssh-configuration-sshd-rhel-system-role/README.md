# How to Automate SSH Configuration Using the sshd RHEL System Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, SSH, Sshd

Description: Use the sshd RHEL System Role to standardize SSH configuration across RHEL systems.

---

## Overview

Use the sshd RHEL System Role to standardize SSH configuration across RHEL systems. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

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

Create `configure-sshd.yml`:

```yaml
---
- name: How to Automate SSH Configuration Using the sshd RHEL System Role
  hosts: managed_hosts
  become: true
  tasks:
    - name: Configure sshd
      ansible.builtin.include_role:
        name: redhat.rhel_system_roles.sshd
      vars:
        sshd_config:
          PermitRootLogin: no
          PasswordAuthentication: no
```

Add the role-specific variables. Check the role documentation for available options:

```bash
cat /usr/share/ansible/roles/rhel-system-roles.sshd/README.md
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-sshd.yml
```

## Step 5 - Verify the Configuration

On the managed hosts, verify that the configuration was applied:

```bash
systemctl status sshd
cat /etc/ssh/sshd_config.d/00-ansible_system_role.conf
```

## Idempotency

RHEL System Roles are idempotent. Running the playbook again will not change systems that already match the desired state. This makes them safe to run repeatedly.

## Summary

You have learned how to automate ssh configuration using the sshd rhel system role. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
