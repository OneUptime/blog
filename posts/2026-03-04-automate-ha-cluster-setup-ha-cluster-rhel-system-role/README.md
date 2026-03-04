# How to Automate HA Cluster Setup Using the ha_cluster System Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, High Availability, Pacemaker

Description: Use the ha_cluster RHEL System Role to automate Pacemaker cluster setup.

---

## Overview

Use the ha_cluster RHEL System Role to automate Pacemaker cluster setup. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

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

Create `configure-ha_cluster.yml`:

```yaml
---
- name: How to Automate High Availability Cluster Setup Using the ha_cluster RHEL System Role
  hosts: managed_hosts
  become: true
  roles:
    - role: rhel-system-roles.ha_cluster
```

Add the role-specific variables. Check the role documentation for available options:

```bash
ls /usr/share/doc/rhel-system-roles/ha_cluster/
cat /usr/share/doc/rhel-system-roles/ha_cluster/README.md
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-ha_cluster.yml
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

You have learned how to automate high availability cluster setup using the ha_cluster rhel system role. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
