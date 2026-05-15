# How to Automate Journald Configuration Using RHEL System Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, journald, Ansible

Description: Use RHEL System Roles to automate journald configuration across multiple systems.

---

## Overview

Use RHEL System Roles to automate journald configuration across multiple systems. This guide covers the essential steps and configuration needed for a production RHEL 9 environment.

## Prerequisites

- A RHEL 9 control node with a valid subscription or configured repositories
- One or more managed RHEL systems with SSH and sudo access configured
- Basic familiarity with the command line

## Step 1 - Verify the Required Packages

Ensure the relevant packages are installed:

```bash
sudo dnf install -y rhel-system-roles
```

This installs the RHEL System Roles collection and `ansible-core` as a dependency. `systemd-journald` ships with systemd on RHEL 9.

## Step 2 - Understand the Logging Architecture

RHEL 9 uses two logging systems:

- **systemd-journald** - captures structured binary logs from all services, the kernel, and early boot
- **rsyslog** - processes, filters, and forwards text-based syslog messages

The two work together: journald collects everything, and rsyslog can read from the journal or receive messages directly via the syslog socket.

## Step 3 - Apply the Configuration

To automate journald configuration using RHEL System Roles, create a playbook that includes the `redhat.rhel_system_roles.journald` role:

```yaml
---
- name: Configure journald
  hosts: managed-node-01.example.com
  tasks:
    - name: Configure persistent logging
      ansible.builtin.include_role:
        name: redhat.rhel_system_roles.journald
      vars:
        journald_persistent: true
        journald_max_disk_size: 2048
        journald_per_user: true
        journald_sync_interval: 1
```

Validate the playbook syntax, then run it:

```bash
ansible-playbook --syntax-check ~/playbook.yml
ansible-playbook ~/playbook.yml
```

## Step 4 - Verify the Setup

Check the service status:

```bash
systemctl status rsyslog
systemctl status systemd-journald
```

Review recent logs to confirm your changes are working:

```bash
journalctl --since "5 minutes ago"
tail -20 /var/log/messages
```

## Step 5 - Open Firewall Ports (If Applicable)

If your setup involves receiving remote syslog traffic over TCP, open the necessary port:

```bash
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

- Check for syntax errors in rsyslog configuration: `rsyslogd -N1`
- Verify SELinux is not blocking log operations: `ausearch -m AVC -ts recent`
- Ensure the target directory exists and has correct permissions

## Summary

You have learned how to automate journald configuration using rhel system roles on RHEL 9. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
