# How to Automate TLS Certificates with the certificate System Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, TLS, Certificate

Description: Use the certificate RHEL System Role to automate TLS certificate management.

---

## Overview

Use the certificate RHEL System Role to automate TLS certificate management. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

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

Create `configure-certificate.yml`:

```yaml
---
- name: How to Automate TLS Certificate Management Using the certificate RHEL System Role
  hosts: managed_hosts
  become: true
  tasks:
    - name: Create a self-signed certificate
      ansible.builtin.include_role:
        name: redhat.rhel_system_roles.certificate
      vars:
        certificate_requests:
          - name: web-server
            ca: self-sign
            dns: "{{ inventory_hostname }}"
```

Add the role-specific variables. Check the role documentation for available options:

```bash
ls /usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/roles/certificate/
cat /usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/roles/certificate/README.md
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-certificate.yml
```

## Step 5 - Verify the Configuration

On the managed hosts, verify that the configuration was applied:

```bash
ansible managed_hosts -i inventory.ini -m command -a 'getcert list'
```

## Idempotency

RHEL System Roles are idempotent. Running the playbook again will not change systems that already match the desired state. This makes them safe to run repeatedly.

## Summary

You have learned how to automate tls certificate management using the certificate rhel system role. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
