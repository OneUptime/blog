# How to Copy Files with Backup Using Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Backup, Configuration Management

Description: Learn how to use the Ansible copy module backup parameter to automatically create backup copies of files before overwriting them on remote hosts.

---

Overwriting configuration files on production servers is one of those tasks where you want a safety net. What if the new config has a typo? What if it breaks the application? The Ansible `copy`, `template`, `lineinfile`, and `blockinfile` modules all support a `backup` parameter that creates a timestamped copy of the existing file before making changes. This gives you an instant rollback path without any extra scripting.

This post covers how to use the backup feature effectively, how to manage the backup files it creates, and how to build a complete backup-and-restore workflow.

## How the Backup Parameter Works

When you add `backup: true` to a `copy` task, Ansible creates a backup of the existing file before overwriting it:

```yaml
# Copy a new config file, backing up the existing one first
- name: Update application config with backup
  ansible.builtin.copy:
    src: files/app.conf
    dest: /etc/myapp/app.conf
    owner: root
    group: myapp
    mode: "0644"
    backup: true
```

If `/etc/myapp/app.conf` already exists and the new content is different, Ansible renames the existing file to something like:

```
/etc/myapp/app.conf.2024-06-15@14:30:22~
```

The backup filename includes the original name plus a timestamp and a tilde. The new content then replaces the original file. If the file does not exist or the content has not changed, no backup is created.

## Capturing the Backup Path

When a backup is created, Ansible stores the backup file path in the task's return value. You can register it for later use:

```yaml
# Register the backup path for later reference
- name: Deploy new Nginx configuration
  ansible.builtin.copy:
    src: files/nginx.conf
    dest: /etc/nginx/nginx.conf
    backup: true
  register: nginx_copy

- name: Show backup location
  ansible.builtin.debug:
    msg: "Backup created at: {{ nginx_copy.backup_file }}"
  when: nginx_copy.backup_file is defined
```

The `backup_file` attribute is only present when a backup was actually created. If the file did not change, there is no backup and the attribute will not exist.

## Backup with the Template Module

The `backup` parameter works the same way with the `template` module:

```yaml
# Template a config file with backup of the previous version
- name: Generate and deploy application config
  ansible.builtin.template:
    src: templates/app.conf.j2
    dest: /etc/myapp/app.conf
    owner: root
    group: myapp
    mode: "0644"
    backup: true
  register: config_result
  notify: Restart myapp
```

## Backup with lineinfile and blockinfile

The line editing modules also support backup:

```yaml
# Modify a single line with backup
- name: Update max connections setting
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^MAX_CONNECTIONS="
    line: "MAX_CONNECTIONS=500"
    backup: true

# Add a text block with backup
- name: Add monitoring configuration block
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    block: |
      # Monitoring settings
      METRICS_ENABLED=true
      METRICS_PORT=9090
      METRICS_PATH=/metrics
    backup: true
```

## Building a Rollback Mechanism

Since you know where the backup file is, you can build a rollback task:

```yaml
# deploy-and-rollback.yml - deployment with automatic rollback capability
---
- name: Deploy with rollback support
  hosts: web_servers
  become: true

  tasks:
    - name: Deploy new Nginx config
      ansible.builtin.copy:
        src: files/nginx.conf
        dest: /etc/nginx/nginx.conf
        backup: true
      register: nginx_deploy

    - name: Test Nginx configuration
      ansible.builtin.command:
        cmd: nginx -t
      register: nginx_test
      ignore_errors: true

    - name: Rollback if config test failed
      ansible.builtin.copy:
        src: "{{ nginx_deploy.backup_file }}"
        dest: /etc/nginx/nginx.conf
        remote_src: true
      when:
        - nginx_test.rc != 0
        - nginx_deploy.backup_file is defined

    - name: Fail the play if rollback was needed
      ansible.builtin.fail:
        msg: "Nginx config validation failed. Rolled back to previous version."
      when: nginx_test.rc != 0

    - name: Reload Nginx with new config
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
      when: nginx_test.rc == 0
```

This pattern deploys the new config, validates it, and automatically rolls back if validation fails.

## Managing Backup File Accumulation

Over time, backup files accumulate. Here is how to clean them up:

```yaml
# Find and remove old backup files
- name: Find backup files older than 7 days
  ansible.builtin.find:
    paths: /etc/myapp
    patterns: "*.~"
    age: "7d"
    recurse: true
  register: old_backups

- name: Remove old backup files
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ old_backups.files }}"
  loop_control:
    label: "{{ item.path }}"
```

For a more thorough cleanup, look for the tilde-suffixed backup pattern:

```yaml
# Find all Ansible backup files (they end with a tilde)
- name: Find all backup files in config directory
  ansible.builtin.find:
    paths: /etc/myapp
    patterns: "*~"
    recurse: true
  register: all_backups

- name: Report backup file count
  ansible.builtin.debug:
    msg: "Found {{ all_backups.matched }} backup files consuming {{ all_backups.files | map(attribute='size') | sum | human_readable }}"

# Keep only the 3 most recent backups per original file
- name: Group backups by original filename
  ansible.builtin.set_fact:
    backup_groups: "{{ all_backups.files | groupby('path | regex_replace(\"\\\\.[0-9T@:~-]+$\", \"\")') }}"
```

## A Cleanup Role for Backup Files

Here is a reusable role that cleans up old backup files:

```yaml
# roles/cleanup-backups/tasks/main.yml
---
- name: Find old Ansible backup files
  ansible.builtin.find:
    paths: "{{ item }}"
    patterns: "*~"
    age: "{{ backup_retention_days | default('30') }}d"
    recurse: true
  register: old_backups
  loop: "{{ backup_directories }}"

- name: Count files to remove
  ansible.builtin.set_fact:
    total_old_backups: "{{ old_backups.results | map(attribute='files') | flatten | length }}"

- name: Remove old backup files
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ old_backups.results | map(attribute='files') | flatten }}"
  loop_control:
    label: "{{ item.path }}"
  when: total_old_backups | int > 0
```

```yaml
# Use the cleanup role in a playbook
- name: Clean up old backups
  hosts: all
  become: true
  roles:
    - role: cleanup-backups
      vars:
        backup_directories:
          - /etc/myapp
          - /etc/nginx
          - /etc/postgresql
        backup_retention_days: 14
```

## Backup to a Specific Directory

The `backup` parameter always puts the backup next to the original file. If you want backups in a separate directory, combine `remote_src` copy with the standard copy:

```yaml
# Custom backup to a dedicated backup directory
- name: Create backup directory
  ansible.builtin.file:
    path: /var/backups/myapp/configs
    state: directory
    owner: root
    group: root
    mode: "0750"

- name: Backup current config to backup directory
  ansible.builtin.copy:
    src: /etc/myapp/app.conf
    dest: "/var/backups/myapp/configs/app.conf.{{ ansible_date_time.iso8601_basic_short }}"
    remote_src: true
    owner: root
    group: root
    mode: "0640"
  ignore_errors: true  # OK if original does not exist yet

- name: Deploy new configuration
  ansible.builtin.copy:
    src: files/app.conf
    dest: /etc/myapp/app.conf
    owner: root
    group: myapp
    mode: "0644"
```

## Multi-File Deployment with Backup

When deploying multiple files, track all backups:

```yaml
# Deploy multiple files and track all backups
- name: Deploy configuration files with backup
  ansible.builtin.copy:
    src: "files/{{ item }}"
    dest: "/etc/myapp/{{ item }}"
    owner: root
    group: myapp
    mode: "0644"
    backup: true
  loop:
    - app.conf
    - db.conf
    - cache.conf
    - logging.conf
  register: deploy_results

- name: List all created backups
  ansible.builtin.debug:
    msg: "Backup: {{ item.backup_file }}"
  loop: "{{ deploy_results.results }}"
  loop_control:
    label: "{{ item.item }}"
  when: item.backup_file is defined
```

## Complete Workflow: Deploy, Validate, Report

Here is a production-ready workflow that deploys, validates, and reports on changes:

```yaml
# deploy-with-safety.yml
---
- name: Safe deployment with backup and validation
  hosts: app_servers
  become: true

  tasks:
    - name: Deploy application configuration
      ansible.builtin.template:
        src: templates/app.conf.j2
        dest: /etc/myapp/app.conf
        owner: root
        group: myapp
        mode: "0640"
        backup: true
        validate: "/opt/myapp/bin/myapp validate-config %s"
      register: config_deploy

    - name: Verify application can start with new config
      ansible.builtin.command:
        cmd: /opt/myapp/bin/myapp check
      register: app_check
      changed_when: false
      ignore_errors: true

    - name: Rollback configuration if check failed
      block:
        - name: Restore previous configuration
          ansible.builtin.copy:
            src: "{{ config_deploy.backup_file }}"
            dest: /etc/myapp/app.conf
            remote_src: true
            owner: root
            group: myapp
            mode: "0640"

        - name: Notify about rollback
          ansible.builtin.debug:
            msg: "Configuration rolled back to {{ config_deploy.backup_file }}"

        - name: Fail with details
          ansible.builtin.fail:
            msg: "Application check failed: {{ app_check.stderr }}"
      when:
        - app_check.rc != 0
        - config_deploy.backup_file is defined

    - name: Restart application with new config
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      when: config_deploy.changed
```

## Summary

The `backup` parameter is a simple but powerful safety mechanism. Adding `backup: true` to any `copy`, `template`, `lineinfile`, or `blockinfile` task creates a timestamped backup before changes are applied. Register the task output to capture the backup file path for rollback scenarios. Implement cleanup tasks to prevent backup file accumulation, and consider centralized backup directories for important configurations. Combined with validation and automatic rollback, the backup feature turns potentially dangerous configuration deployments into safe, reversible operations.
