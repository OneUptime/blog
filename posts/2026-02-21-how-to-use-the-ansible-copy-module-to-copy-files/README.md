# How to Use the Ansible copy Module to Copy Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, DevOps, Configuration Management

Description: A complete guide to using the Ansible copy module to transfer files from the control node to remote hosts with permissions, ownership, and validation.

---

The Ansible `copy` module is one of the most frequently used modules in any playbook. It transfers files from your Ansible control node to remote hosts, sets permissions and ownership, and can even validate the copied file before finalizing the operation. If you have ever used `scp` to push files to servers, the `copy` module is the automated, idempotent version of that.

This post covers the full range of the `copy` module's capabilities with practical examples you can use directly in your projects.

## Basic File Copy

At its simplest, you specify a source file on the control node and a destination on the remote host:

```yaml
# Copy a file from the control node to the remote host
- name: Copy application configuration
  ansible.builtin.copy:
    src: files/app.conf
    dest: /etc/myapp/app.conf
```

The `src` path is relative to the playbook directory (or the `files/` directory within a role). The `dest` path is the absolute path on the remote host. If the file already exists on the remote host and has the same content, checksum, permissions, and ownership, Ansible reports "ok" and does not transfer it again.

## Setting Permissions and Ownership

You should almost always specify permissions and ownership when copying files:

```yaml
# Copy a file with explicit permissions and ownership
- name: Copy Nginx configuration
  ansible.builtin.copy:
    src: files/nginx.conf
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: "0644"
```

For sensitive files like credentials or private keys, lock down the permissions:

```yaml
# Copy a sensitive file with restrictive permissions
- name: Copy SSL private key
  ansible.builtin.copy:
    src: files/ssl/server.key
    dest: /etc/ssl/private/server.key
    owner: root
    group: ssl-cert
    mode: "0640"
  no_log: true
```

## Copying Entire Directories

If the `src` path ends with a `/`, Ansible copies the contents of that directory. If it does not end with `/`, Ansible copies the directory itself:

```yaml
# Copy the contents of the scripts directory into /opt/myapp/scripts/
- name: Copy script files (contents only)
  ansible.builtin.copy:
    src: files/scripts/
    dest: /opt/myapp/scripts/
    owner: myapp
    group: myapp
    mode: "0755"

# Copy the scripts directory itself into /opt/myapp/
- name: Copy scripts directory (creates /opt/myapp/scripts/)
  ansible.builtin.copy:
    src: files/scripts
    dest: /opt/myapp/
    owner: myapp
    group: myapp
    mode: "0755"
```

The trailing slash distinction is subtle but important. With `src: files/scripts/`, the files inside `scripts/` are placed directly into the destination. With `src: files/scripts` (no trailing slash), a `scripts/` subdirectory is created at the destination.

## File Validation Before Finalizing

The `validate` parameter lets you run a command to check the copied file before it replaces the original. If the validation fails, the original file is left untouched:

```yaml
# Copy sudoers file with validation to prevent lockouts
- name: Copy sudoers configuration
  ansible.builtin.copy:
    src: files/sudoers
    dest: /etc/sudoers
    owner: root
    group: root
    mode: "0440"
    validate: /usr/sbin/visudo -csf %s

# Copy sshd config with validation
- name: Copy SSH daemon configuration
  ansible.builtin.copy:
    src: files/sshd_config
    dest: /etc/ssh/sshd_config
    owner: root
    group: root
    mode: "0600"
    validate: /usr/sbin/sshd -t -f %s
  notify: Restart SSHD
```

The `%s` is replaced by the path to the temporary file that Ansible creates during the copy. If the validation command exits with a non-zero return code, the task fails and the original file stays in place.

## Creating Backup of Existing Files

Before overwriting a file, you can create a backup:

```yaml
# Copy a new config file and backup the old one
- name: Update application configuration with backup
  ansible.builtin.copy:
    src: files/app.conf
    dest: /etc/myapp/app.conf
    owner: root
    group: myapp
    mode: "0644"
    backup: true
```

When `backup: true` is set, Ansible renames the existing file with a timestamp suffix (like `app.conf.2024-01-15@10:30:45~`) before writing the new one. This gives you an easy rollback path.

## Copying Files in a Loop

Copy multiple files from a list:

```yaml
# Copy multiple configuration files
- name: Deploy all configuration files
  ansible.builtin.copy:
    src: "files/{{ item.src }}"
    dest: "{{ item.dest }}"
    owner: "{{ item.owner | default('root') }}"
    group: "{{ item.group | default('root') }}"
    mode: "{{ item.mode | default('0644') }}"
  loop:
    - { src: "app.conf", dest: "/etc/myapp/app.conf" }
    - { src: "db.conf", dest: "/etc/myapp/db.conf", mode: "0640", group: "myapp" }
    - { src: "logrotate.conf", dest: "/etc/logrotate.d/myapp" }
    - { src: "systemd.service", dest: "/etc/systemd/system/myapp.service" }
  loop_control:
    label: "{{ item.src }} -> {{ item.dest }}"
```

## Conditional Copy

Only copy a file when certain conditions are met:

```yaml
# Copy the production config only to production hosts
- name: Deploy production database config
  ansible.builtin.copy:
    src: files/db-production.conf
    dest: /etc/myapp/db.conf
    owner: root
    group: myapp
    mode: "0640"
  when: env_name == "production"

# Copy a file only if it does not already exist
- name: Check if the config exists
  ansible.builtin.stat:
    path: /etc/myapp/app.conf
  register: config_check

- name: Copy default config only if none exists
  ansible.builtin.copy:
    src: files/app.conf.default
    dest: /etc/myapp/app.conf
    owner: root
    group: myapp
    mode: "0644"
  when: not config_check.stat.exists
```

## Using the copy Module in Roles

Inside a role, the `src` path is relative to the role's `files/` directory:

```
roles/
  myapp/
    files/
      app.conf
      nginx-site.conf
    tasks/
      main.yml
```

```yaml
# roles/myapp/tasks/main.yml - src is relative to roles/myapp/files/
- name: Copy application config
  ansible.builtin.copy:
    src: app.conf
    dest: /etc/myapp/app.conf
    owner: root
    group: myapp
    mode: "0644"

- name: Copy nginx site config
  ansible.builtin.copy:
    src: nginx-site.conf
    dest: /etc/nginx/sites-available/myapp.conf
    owner: root
    group: root
    mode: "0644"
```

## Copy vs Template

A common question is when to use `copy` versus `template`. The answer is simple:

- Use `copy` when the file content is static and does not need variable substitution.
- Use `template` when the file contains Jinja2 variables or logic.

```yaml
# Use copy for static files (no variables needed)
- name: Copy a static HTML error page
  ansible.builtin.copy:
    src: files/503.html
    dest: /var/www/errors/503.html
    mode: "0644"

# Use template when you need variable substitution
- name: Generate dynamic configuration
  ansible.builtin.template:
    src: templates/app.conf.j2
    dest: /etc/myapp/app.conf
    mode: "0644"
```

## Complete Example: Deploying Application Files

Here is a comprehensive playbook that uses `copy` to deploy an application's configuration and supporting files:

```yaml
# deploy-config.yml - deploy all static files for the application
---
- name: Deploy application configuration files
  hosts: app_servers
  become: true
  vars:
    app_user: myapp
    app_group: myapp

  tasks:
    - name: Ensure configuration directory exists
      ansible.builtin.file:
        path: /etc/myapp
        state: directory
        owner: root
        group: "{{ app_group }}"
        mode: "0750"

    - name: Copy main application config
      ansible.builtin.copy:
        src: files/app.conf
        dest: /etc/myapp/app.conf
        owner: root
        group: "{{ app_group }}"
        mode: "0640"
        backup: true
      notify: Restart myapp

    - name: Copy systemd service file
      ansible.builtin.copy:
        src: files/myapp.service
        dest: /etc/systemd/system/myapp.service
        owner: root
        group: root
        mode: "0644"
      notify:
        - Reload systemd
        - Restart myapp

    - name: Copy logrotate configuration
      ansible.builtin.copy:
        src: files/myapp-logrotate
        dest: /etc/logrotate.d/myapp
        owner: root
        group: root
        mode: "0644"

    - name: Copy helper scripts
      ansible.builtin.copy:
        src: "files/scripts/{{ item }}"
        dest: "/opt/myapp/bin/{{ item }}"
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: "0755"
      loop:
        - healthcheck.sh
        - backup.sh
        - cleanup.sh

  handlers:
    - name: Reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

    - name: Restart myapp
      ansible.builtin.systemd:
        name: myapp
        state: restarted
```

## Summary

The Ansible `copy` module is the workhorse for transferring static files from your control node to remote hosts. Always set explicit permissions and ownership, use the `validate` parameter for critical system files like sudoers and sshd_config, enable `backup` when overwriting existing configurations, and pay attention to the trailing slash behavior when copying directories. For files that need variable substitution, use the `template` module instead.
