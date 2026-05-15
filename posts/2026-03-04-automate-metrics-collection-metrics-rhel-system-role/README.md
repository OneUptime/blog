# How to Automate Metrics Collection Using the metrics RHEL System Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, Metric, PCP

Description: Use the metrics RHEL System Role to deploy PCP for automated metrics collection.

---

## Overview

Use the metrics RHEL System Role to deploy PCP for automated metrics collection. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

## Prerequisites

- Ansible installed on a control node
- RHEL System Roles package installed
- SSH key-based access to managed RHEL hosts

## Step 1 - Install RHEL System Roles

```bash
sudo dnf install -y rhel-system-roles
```

The collection is installed to `/usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/`.

## Step 2 - Create an Inventory File

Create `inventory.ini`:

```ini
[managed_hosts]
server1.example.com
server2.example.com
server3.example.com
```

## Step 3 - Write the Playbook

Create `configure-metrics.yml`:

```yaml
---
- name: How to Automate Metrics Collection Using the metrics RHEL System Role
  hosts: managed_hosts
  become: true
  tasks:
    - name: Configure Performance Co-Pilot
      ansible.builtin.include_role:
        name: redhat.rhel_system_roles.metrics
      vars:
        metrics_retention_days: 14
```

Add the role-specific variables. Check the role documentation for available options:

```bash
ls /usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/roles/metrics/
cat /usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/roles/metrics/README.md
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-metrics.yml
```

## Step 5 - Verify the Configuration

On the managed hosts, verify that the configuration was applied:

```bash
ansible managed_hosts -i inventory.ini -m command -a 'pminfo -f kernel.all.load'
```

## Idempotency

RHEL System Roles are idempotent. Running the playbook again will not change systems that already match the desired state. This makes them safe to run repeatedly.

## Summary

You have learned how to automate metrics collection using the metrics rhel system role. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
