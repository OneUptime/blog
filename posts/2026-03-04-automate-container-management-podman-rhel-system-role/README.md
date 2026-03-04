# How to Automate Container Management Using the podman RHEL System Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, Podman, Containers

Description: Use the podman RHEL System Role to manage container deployments with Ansible.

---

## Overview

Use the podman RHEL System Role to manage container deployments with Ansible. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

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

Create `configure-podman.yml`:

```yaml
---
- name: How to Automate Container Management Using the podman RHEL System Role
  hosts: managed_hosts
  become: true
  roles:
    - role: rhel-system-roles.podman
```

Add the role-specific variables. Check the role documentation for available options:

```bash
ls /usr/share/doc/rhel-system-roles/podman/
cat /usr/share/doc/rhel-system-roles/podman/README.md
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-podman.yml
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

You have learned how to automate container management using the podman rhel system role. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
