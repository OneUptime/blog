# How to Use the RHEL sudo System Role for Centralized sudo Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, sudo, System Roles, Ansible, Security, Privilege Escalation

Description: Use the RHEL sudo system role to centrally manage sudo rules across multiple RHEL servers with Ansible, replacing manual sudoers file editing.

---

Editing `/etc/sudoers` manually on every server is error-prone and hard to audit. The RHEL sudo system role lets you define sudo rules in Ansible playbooks and apply them consistently across your entire fleet.

## Install Prerequisites

```bash
# Install RHEL System Roles and Ansible
sudo dnf install -y rhel-system-roles ansible-core

# Verify the sudo role is available
ls /usr/share/ansible/roles/ | grep sudo
# Should show: rhel-system-roles.sudo
```

## Basic Usage: Grant sudo Access to a Group

```bash
tee ~/sudo-basic.yml << 'EOF'
---
- name: Configure sudo rules
  hosts: all
  become: true
  roles:
    - role: rhel-system-roles.sudo
      vars:
        # Define sudo rules
        sudo_rules:
          - name: "Allow wheel group full access"
            users: "%wheel"
            hosts: ALL
            commands: ALL
            nopassword: false
EOF

ansible-playbook ~/sudo-basic.yml
```

## Grant Specific Commands to a User

```bash
tee ~/sudo-specific.yml << 'EOF'
---
- name: Configure specific sudo rules
  hosts: webservers
  become: true
  roles:
    - role: rhel-system-roles.sudo
      vars:
        sudo_rules:
          # Allow the deploy user to restart specific services
          - name: "Deploy user service management"
            users: "deploy"
            hosts: ALL
            commands:
              - /usr/bin/systemctl restart httpd
              - /usr/bin/systemctl restart nginx
              - /usr/bin/systemctl reload httpd
              - /usr/bin/systemctl reload nginx
            nopassword: true

          # Allow the monitoring user to run specific checks
          - name: "Monitoring user checks"
            users: "monitor"
            hosts: ALL
            commands:
              - /usr/lib64/nagios/plugins/*
              - /usr/bin/systemctl status *
            nopassword: true

          # Allow the DBA group to manage database services
          - name: "DBA database management"
            users: "%dba"
            hosts: ALL
            commands:
              - /usr/bin/systemctl start postgresql
              - /usr/bin/systemctl stop postgresql
              - /usr/bin/systemctl restart postgresql
              - /usr/bin/systemctl status postgresql
            nopassword: false
EOF

ansible-playbook ~/sudo-specific.yml
```

## Configure Sudo Defaults

```bash
tee ~/sudo-defaults.yml << 'EOF'
---
- name: Configure sudo defaults
  hosts: all
  become: true
  roles:
    - role: rhel-system-roles.sudo
      vars:
        # Set sudo defaults for all users
        sudo_defaults:
          - name: "Global defaults"
            defaults:
              - "!visiblepw"
              - "always_set_home"
              - "match_group_by_gid"
              - "always_query_group_plugin"
              - "env_reset"
              - 'secure_path = /sbin:/bin:/usr/sbin:/usr/bin'
              - "log_output"
              - 'log_input'
              - "timestamp_timeout=15"

        sudo_rules:
          - name: "Wheel group access"
            users: "%wheel"
            hosts: ALL
            commands: ALL
            nopassword: false
EOF

ansible-playbook ~/sudo-defaults.yml
```

## Role-Based Sudo Configuration

```bash
tee ~/sudo-rbac.yml << 'EOF'
---
- name: Role-based sudo configuration
  hosts: all
  become: true
  roles:
    - role: rhel-system-roles.sudo
      vars:
        sudo_rules:
          # Tier 1: Full admin access
          - name: "Full admin access"
            users: "%sysadmins"
            hosts: ALL
            commands: ALL
            nopassword: false

          # Tier 2: Limited admin access
          - name: "Limited admin"
            users: "%junior-admins"
            hosts: ALL
            commands:
              - /usr/bin/systemctl restart *
              - /usr/bin/systemctl start *
              - /usr/bin/systemctl stop *
              - /usr/bin/journalctl *
              - /usr/bin/tail /var/log/*
              - /usr/bin/less /var/log/*
            nopassword: false

          # Tier 3: Application team
          - name: "App team"
            users: "%appteam"
            hosts: ALL
            commands:
              - /usr/bin/systemctl restart myapp
              - /usr/bin/systemctl status myapp
              - /usr/bin/journalctl -u myapp*
            nopassword: true

          # Deny specific dangerous commands
          - name: "Deny dangerous commands"
            users: "%junior-admins"
            hosts: ALL
            commands:
              - "!/usr/bin/su"
              - "!/usr/sbin/visudo"
              - "!/usr/bin/passwd root"
EOF

ansible-playbook ~/sudo-rbac.yml
```

## Apply to Specific Host Groups

```bash
tee ~/sudo-per-group.yml << 'EOF'
---
- name: Web server sudo rules
  hosts: webservers
  become: true
  roles:
    - role: rhel-system-roles.sudo
      vars:
        sudo_rules:
          - name: "Web admin"
            users: "webadmin"
            hosts: ALL
            commands:
              - /usr/bin/systemctl * httpd
              - /usr/bin/systemctl * nginx
            nopassword: true

- name: Database server sudo rules
  hosts: dbservers
  become: true
  roles:
    - role: rhel-system-roles.sudo
      vars:
        sudo_rules:
          - name: "DB admin"
            users: "dbadmin"
            hosts: ALL
            commands:
              - /usr/bin/systemctl * postgresql
              - /usr/bin/systemctl * mariadb
              - /usr/bin/pg_dump *
              - /usr/bin/pg_restore *
            nopassword: false
EOF

ansible-playbook ~/sudo-per-group.yml
```

## Verify the Configuration

```bash
# Check what sudo rules are in place on a host
ansible webservers -m command -a "cat /etc/sudoers.d/*" -b

# Test a specific user's sudo permissions
ansible webservers -m command -a "sudo -l -U deploy" -b
```

Using the sudo system role ensures consistent, auditable privilege escalation policies across your RHEL infrastructure. Changes are tracked in your playbook repository and can be reviewed before deployment.
