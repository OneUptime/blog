# How to Install and Get Started with RHEL System Roles on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, Ansible, Automation

Description: Install and use RHEL System Roles on RHEL for standardized system configuration.

---

## Overview

Install and use RHEL System Roles on RHEL for standardized system configuration. RHEL System Roles provide a consistent, Ansible-based interface for managing common system configurations.

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

Create `configure-timesync.yml` (using the timesync role as an example):

```yaml
---
- name: Configure time synchronization with RHEL System Roles
  hosts: managed_hosts
  become: true
  roles:
    - role: rhel-system-roles.timesync
      timesync_ntp_servers:
        - hostname: pool.ntp.org
          iburst: yes
```

Each role has its own variables. Check the role documentation for available options:

```bash
ls /usr/share/ansible/roles/
ls /usr/share/doc/rhel-system-roles/timesync/
cat /usr/share/doc/rhel-system-roles/timesync/README.md
```

Available roles include: timesync, network, storage, firewall, selinux, logging, certificate, kdump, cockpit, ha_cluster, podman, bootloader, metrics, sshd, and sudo.

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini configure-timesync.yml
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

You have learned how to install and get started with rhel system roles. RHEL System Roles simplify fleet-wide configuration management by providing tested, supported Ansible roles for common RHEL administration tasks.
