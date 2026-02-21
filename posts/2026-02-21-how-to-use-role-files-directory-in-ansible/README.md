# How to Use Role Files Directory in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Files, Configuration Management

Description: Learn how to use the files directory in Ansible roles to manage static files, scripts, and binary assets deployed to remote hosts.

---

Not every file you deploy needs variable substitution. Static configuration files, shell scripts, SSL certificates, binary tools, and other assets that are the same regardless of the target host belong in the `files/` directory of your Ansible role. This post covers how the `files/` directory works, which modules use it, and practical patterns for organizing static assets in your roles.

## Where the Files Directory Lives

The `files/` directory is a standard part of the Ansible role structure:

```
roles/
  myapp/
    files/
      startup.sh
      logrotate.conf
      motd.txt
    tasks/
      main.yml
    templates/
    handlers/
```

When you use certain modules (like `copy`, `script`, or `unarchive`) inside a role, Ansible automatically looks in the `files/` directory for the source file. You reference files by name, not by full path.

## The copy Module

The most common way to use the `files/` directory is with the `copy` module:

```yaml
# roles/myapp/tasks/main.yml
# Ansible looks in roles/myapp/files/ for these source files
---
- name: Deploy startup script
  ansible.builtin.copy:
    src: startup.sh
    dest: /opt/myapp/bin/startup.sh
    owner: myapp
    group: myapp
    mode: '0755'

- name: Deploy logrotate configuration
  ansible.builtin.copy:
    src: logrotate.conf
    dest: /etc/logrotate.d/myapp
    owner: root
    group: root
    mode: '0644'

- name: Deploy message of the day
  ansible.builtin.copy:
    src: motd.txt
    dest: /etc/motd
    owner: root
    group: root
    mode: '0644'
```

The `src` parameter points to a file name. Ansible resolves it by checking the role's `files/` directory first, then falls back to the playbook's `files/` directory.

## The script Module

The `script` module transfers a script to the remote host and executes it. It also looks in the role's `files/` directory:

```bash
#!/bin/bash
# roles/myapp/files/init_database.sh
# One-time database initialization script

set -euo pipefail

echo "Initializing database schema..."
psql -U myapp -d myapp_production -f /opt/myapp/schema.sql
echo "Running initial data migration..."
psql -U myapp -d myapp_production -f /opt/myapp/seed.sql
echo "Database initialization complete."
```

```yaml
# roles/myapp/tasks/main.yml
# The script module finds init_database.sh in the role's files/ directory
- name: Initialize the database
  ansible.builtin.script: init_database.sh
  args:
    creates: /opt/myapp/.db_initialized
```

The `creates` parameter is a nice touch. It tells Ansible to skip the script if the specified file already exists, making the task idempotent.

## The unarchive Module

If you need to deploy a tarball or zip file, put it in `files/` and use `unarchive`:

```yaml
# roles/myapp/tasks/main.yml
# Extract a pre-built application archive from the role's files directory
- name: Deploy application archive
  ansible.builtin.unarchive:
    src: myapp-2.5.0.tar.gz
    dest: /opt/myapp/
    owner: myapp
    group: myapp
    creates: /opt/myapp/bin/myapp
```

## Organizing Files with Subdirectories

For roles with many static files, you can organize them into subdirectories:

```
roles/myapp/files/
  certs/
    ca-bundle.crt
    server.crt
    server.key
  scripts/
    backup.sh
    healthcheck.sh
    rotate-logs.sh
  config/
    sysctl.conf
    limits.conf
```

Reference them with the subdirectory path:

```yaml
# roles/myapp/tasks/main.yml
# Reference files in subdirectories within the files/ directory
---
- name: Deploy TLS certificate
  ansible.builtin.copy:
    src: certs/server.crt
    dest: /etc/ssl/certs/myapp.crt
    mode: '0644'

- name: Deploy TLS private key
  ansible.builtin.copy:
    src: certs/server.key
    dest: /etc/ssl/private/myapp.key
    mode: '0600'

- name: Deploy backup script
  ansible.builtin.copy:
    src: scripts/backup.sh
    dest: /opt/myapp/bin/backup.sh
    mode: '0755'
```

## Copying Entire Directories

The `copy` module can copy a whole directory and its contents:

```yaml
# Copy an entire directory tree from files/ to the remote host
- name: Deploy application static assets
  ansible.builtin.copy:
    src: static/
    dest: /var/www/myapp/static/
    owner: www-data
    group: www-data
    mode: '0644'
    directory_mode: '0755'
```

Note the trailing slash on `src: static/`. This copies the *contents* of the directory. Without the trailing slash, it would create `static/static/` on the remote host.

## Files vs Templates: When to Use Which

The decision is simple:

- Use `files/` with the `copy` module when the content is static and does not change based on variables, facts, or environment.
- Use `templates/` with the `template` module when you need variable substitution, conditionals, or loops.

Here are some examples of what belongs where:

```
files/ (static, no variable substitution):
  - SSL certificates and keys
  - Pre-compiled binaries
  - Shell scripts that do not need host-specific values
  - Static web assets (images, CSS, fonts)
  - Systemd unit files that are identical across hosts
  - GPG keys and APT/YUM repository files

templates/ (dynamic, needs variable substitution):
  - Application configuration files with host-specific settings
  - Nginx/Apache virtual host configs with variable ports and paths
  - Systemd unit files where the binary path or user varies
  - Environment files with host-specific values
```

## Deploying Systemd Unit Files

A common use case for the `files/` directory is deploying systemd unit files that do not vary between hosts:

```ini
# roles/myapp/files/myapp.service
# Systemd unit file - static, no variable substitution needed
[Unit]
Description=MyApp Application Server
After=network.target

[Service]
Type=simple
User=myapp
Group=myapp
ExecStart=/opt/myapp/bin/myapp serve
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```yaml
# roles/myapp/tasks/main.yml
# Deploy the static systemd unit file
- name: Install systemd service file
  ansible.builtin.copy:
    src: myapp.service
    dest: /etc/systemd/system/myapp.service
    owner: root
    group: root
    mode: '0644'
  notify:
    - Reload systemd
    - Restart myapp
```

If the unit file needs host-specific values (like different memory limits per host), move it to `templates/` and use `template` instead.

## File Lookup Order

When Ansible resolves a file reference inside a role, it searches in this order:

1. `roles/<role_name>/files/` (the role's own files directory)
2. The playbook directory's `files/` directory
3. The current working directory

This means a file in the role's `files/` directory takes precedence. But it also means you can override role files by placing a file with the same name in your playbook's `files/` directory.

## Validating Deployed Files

You can validate files after deployment using the `validate` parameter (available on `copy` and `template`):

```yaml
# Validate a sudoers file before deploying it
- name: Deploy sudoers file
  ansible.builtin.copy:
    src: sudoers_myapp
    dest: /etc/sudoers.d/myapp
    owner: root
    group: root
    mode: '0440'
    validate: "visudo -cf %s"
```

If the validation fails, the file is not deployed and the task fails. This prevents broken configuration files from reaching production.

## Practical Example: A Complete Role

Let's put it all together with a role that deploys a monitoring agent:

```
roles/monitoring_agent/
  files/
    agent.gpg
    agent.repo
    check_disk.sh
    check_memory.sh
  templates/
    agent.conf.j2
  tasks/
    main.yml
  handlers/
    main.yml
  defaults/
    main.yml
```

```yaml
# roles/monitoring_agent/tasks/main.yml
---
- name: Add agent GPG key
  ansible.builtin.copy:
    src: agent.gpg
    dest: /etc/apt/trusted.gpg.d/agent.gpg
    mode: '0644'

- name: Add agent repository
  ansible.builtin.copy:
    src: agent.repo
    dest: /etc/apt/sources.list.d/agent.list
    mode: '0644'

- name: Install monitoring agent
  ansible.builtin.apt:
    name: monitoring-agent
    state: present
    update_cache: yes

- name: Deploy agent configuration
  ansible.builtin.template:
    src: agent.conf.j2
    dest: /etc/monitoring-agent/agent.conf
  notify: Restart monitoring agent

- name: Deploy custom check scripts
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/monitoring-agent/checks/
    mode: '0755'
  loop:
    - check_disk.sh
    - check_memory.sh
```

Notice how the role uses `copy` for static files (GPG key, repo file, scripts) and `template` for the configuration file that needs variable substitution. This is the standard pattern.

## Wrapping Up

The `files/` directory in an Ansible role is your go-to location for static assets that do not need variable substitution. The `copy`, `script`, and `unarchive` modules all look there automatically when used inside a role. Organize your files into subdirectories for clarity, use the `validate` parameter to catch errors before deployment, and remember the distinction: `files/` for static content, `templates/` for dynamic content. Keeping this separation clean makes your roles easier to understand and maintain.
