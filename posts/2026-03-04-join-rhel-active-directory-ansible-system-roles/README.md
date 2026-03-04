# How to Join RHEL Systems to Active Directory Using Ansible System Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Active Directory, System Roles, SSSD, Identity Management, Linux

Description: Use Ansible System Roles to automate joining RHEL systems to an Active Directory domain for centralized authentication and identity management.

---

RHEL System Roles provide a set of Ansible roles maintained by Red Hat. The `ad_integration` role automates the process of joining RHEL hosts to a Microsoft Active Directory domain using SSSD and realmd.

## Prerequisites

Install the RHEL System Roles package on your Ansible control node:

```bash
# Install RHEL System Roles
sudo dnf install -y rhel-system-roles
```

The roles are installed to `/usr/share/ansible/roles/`. Verify the ad_integration role exists:

```bash
# List available system roles
ls /usr/share/ansible/roles/ | grep ad
# Should show: rhel-system-roles.ad_integration
```

## Creating the Playbook

Write a playbook that uses the ad_integration role:

```yaml
# join_ad.yml - Join RHEL hosts to Active Directory
---
- name: Join RHEL systems to Active Directory
  hosts: rhel_clients
  become: true
  vars:
    ad_integration_realm: "EXAMPLE.COM"
    ad_integration_password: "{{ ad_join_password }}"
    ad_integration_user: "svc_adjoin"
    # Allow specific AD groups to log in
    ad_integration_manage_dns: false
    ad_integration_timesync_source: "ad-dc.example.com"

  roles:
    - rhel-system-roles.ad_integration
```

Create an inventory for the target hosts:

```ini
# inventory.ini
[rhel_clients]
server1.example.com
server2.example.com

[rhel_clients:vars]
ansible_user=admin
ansible_become=true
```

## Running the Playbook

Execute the playbook, passing the AD join password securely:

```bash
# Run the playbook with a vault-encrypted password
ansible-playbook join_ad.yml \
  -i inventory.ini \
  -e "ad_join_password='SecureP@ss123'" \
  --ask-become-pass
```

For production, store the password in an Ansible Vault file:

```bash
# Create a vault file for sensitive variables
ansible-vault create vars/ad_secrets.yml
# Add: ad_join_password: "SecureP@ss123"

# Run with vault
ansible-playbook join_ad.yml -i inventory.ini --ask-vault-pass
```

## Verifying the Join

After the playbook completes, verify domain membership:

```bash
# Check realm membership on a target host
realm list

# Test AD user resolution
id aduser@EXAMPLE.COM

# Verify SSSD is running
systemctl status sssd
```

The role handles installing required packages (sssd, realmd, adcli), configuring Kerberos, and joining the domain automatically.
