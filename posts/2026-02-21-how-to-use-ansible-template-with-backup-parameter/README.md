# How to Use Ansible Template with backup Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Templates, Backup, Configuration Management, Safety

Description: Learn how to use the backup parameter with the Ansible template module to automatically create timestamped backups before overwriting config files.

---

Every experienced sysadmin has a story about accidentally overwriting a working configuration file and spending hours trying to recreate it. The `backup` parameter on the Ansible template module creates an automatic backup of the existing file before replacing it with the new one. It is a simple safety mechanism that can save you significant recovery time when something goes wrong.

## Basic Usage

Add `backup: true` to any template task:

```yaml
# Create a backup of the existing file before overwriting
- name: Deploy nginx configuration with backup
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    backup: true
  notify: reload nginx
```

When this runs and `/etc/nginx/nginx.conf` already exists, Ansible creates a timestamped copy before writing the new version. The backup file looks something like:

```
/etc/nginx/nginx.conf.2026-02-21@14:30:45~
```

The timestamp format is `YYYY-MM-DD@HH:MM:SS~`.

## When Backups Are Created

Backups are only created when the file actually changes. If the template renders the same content as the existing file, no backup is made and the task reports "ok" (not "changed"). This is important because it means you will not accumulate unnecessary backup files from idempotent runs.

```yaml
# Backup only happens when the file content actually changes
- name: Deploy config (backup only on change)
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
    backup: true
  register: template_result

- name: Show backup info
  ansible.builtin.debug:
    msg: "Backup created at: {{ template_result.backup_file }}"
  when: template_result.backup_file is defined
```

## Accessing the Backup File Path

The registered result contains the backup file path in the `backup_file` attribute:

```yaml
# Track which backup files were created
- name: Deploy multiple configs with backups
  ansible.builtin.template:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
    backup: true
  loop:
    - src: nginx.conf.j2
      dest: /etc/nginx/nginx.conf
    - src: php.ini.j2
      dest: /etc/php/8.1/fpm/php.ini
    - src: app.yml.j2
      dest: /etc/myapp/config.yml
  register: config_results

- name: List all backups created
  ansible.builtin.debug:
    msg: "Backed up {{ item.item.dest }} to {{ item.backup_file }}"
  loop: "{{ config_results.results }}"
  loop_control:
    label: "{{ item.item.dest }}"
  when: item.backup_file is defined
```

## Practical Example: Critical System Files

Always back up files that could cause outages if broken:

```yaml
# Critical system files that should ALWAYS have backups
- name: Deploy SSH configuration
  ansible.builtin.template:
    src: sshd_config.j2
    dest: /etc/ssh/sshd_config
    owner: root
    group: root
    mode: '0600'
    backup: true
    validate: 'sshd -t -f %s'
  notify: restart sshd

- name: Deploy sudoers configuration
  ansible.builtin.template:
    src: sudoers.j2
    dest: /etc/sudoers
    owner: root
    group: root
    mode: '0440'
    backup: true
    validate: 'visudo -cf %s'

- name: Deploy PAM configuration
  ansible.builtin.template:
    src: pam_sshd.j2
    dest: /etc/pam.d/sshd
    backup: true
```

## Automatic Rollback on Failure

You can use the backup file path to implement automatic rollback:

```yaml
# Deploy config with automatic rollback on service failure
- name: Deploy and validate nginx config
  block:
    - name: Deploy nginx config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        backup: true
      register: nginx_deploy

    - name: Test nginx configuration
      ansible.builtin.command: nginx -t
      changed_when: false

    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded

  rescue:
    - name: Restore previous config from backup
      ansible.builtin.copy:
        src: "{{ nginx_deploy.backup_file }}"
        dest: /etc/nginx/nginx.conf
        remote_src: true
      when: nginx_deploy.backup_file is defined

    - name: Reload nginx with restored config
      ansible.builtin.service:
        name: nginx
        state: reloaded

    - name: Report rollback
      ansible.builtin.debug:
        msg: "ROLLED BACK nginx config on {{ inventory_hostname }}. Restored from {{ nginx_deploy.backup_file }}"
```

This pattern deploys the new config, tests it, and if anything fails in the block, the rescue section restores the backup.

## Managing Backup File Cleanup

Backups accumulate over time. Set up cleanup tasks to prevent disk space issues:

```yaml
# Clean up old backup files, keeping only the most recent ones
- name: Find old config backups
  ansible.builtin.find:
    paths:
      - /etc/nginx
      - /etc/ssh
      - /etc/myapp
    patterns: '*~'
    age: 30d
  register: old_backups

- name: Remove old backups
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ old_backups.files }}"
  loop_control:
    label: "{{ item.path | basename }}"

- name: Report cleanup
  ansible.builtin.debug:
    msg: "Cleaned up {{ old_backups.files | length }} old backup files"
  when: old_backups.files | length > 0
```

## Keeping Only N Most Recent Backups

A more sophisticated approach keeps the last N backups for each file:

```yaml
# Keep only the 5 most recent backups for each config file
- name: Find nginx config backups
  ansible.builtin.find:
    paths: /etc/nginx
    patterns: 'nginx.conf.*~'
  register: nginx_backups

- name: Remove old nginx backups (keep last 5)
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ nginx_backups.files | sort(attribute='mtime') | list }}"
  loop_control:
    label: "{{ item.path | basename }}"
  when: nginx_backups.files | length > 5
  # Only delete if there are more than 5 backups
  # The sort puts oldest first, so we remove from the beginning
```

A cleaner version:

```yaml
# Keep only the 5 most recent backups
- name: Prune old backups
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ (nginx_backups.files | sort(attribute='mtime', reverse=true))[5:] }}"
  loop_control:
    label: "{{ item.path | basename }}"
  when: nginx_backups.files | length > 5
```

## Combining backup with validate

Using both parameters together gives you maximum safety:

```yaml
# The safest way to deploy configuration files
- name: Deploy PostgreSQL config (backup + validate)
  ansible.builtin.template:
    src: postgresql.conf.j2
    dest: /etc/postgresql/14/main/postgresql.conf
    owner: postgres
    group: postgres
    mode: '0644'
    backup: true
    validate: 'su - postgres -c "pg_isready && echo valid"'
  notify: reload postgresql
```

The validate parameter prevents deploying a broken config, and the backup parameter preserves the previous version just in case the config is syntactically valid but causes operational issues.

## Backup with Multiple Configuration Files

When deploying a set of related configs:

```yaml
# Deploy multiple related configs with backups and track all backups
- name: Deploy application configuration set
  ansible.builtin.template:
    src: "templates/{{ item.name }}.j2"
    dest: "{{ item.path }}"
    owner: "{{ item.owner | default('root') }}"
    mode: "{{ item.mode | default('0644') }}"
    backup: true
  loop:
    - name: app.conf
      path: /etc/myapp/app.conf
    - name: database.conf
      path: /etc/myapp/database.conf
    - name: cache.conf
      path: /etc/myapp/cache.conf
    - name: logging.conf
      path: /etc/myapp/logging.conf
  register: config_deployments

- name: Save backup manifest
  ansible.builtin.copy:
    content: |
      # Backup Manifest - {{ ansible_date_time.iso8601 }}
      {% for result in config_deployments.results %}
      {% if result.backup_file is defined %}
      {{ result.item.path }} -> {{ result.backup_file }}
      {% endif %}
      {% endfor %}
    dest: /etc/myapp/.backup_manifest
  when: config_deployments.results | selectattr('backup_file', 'defined') | list | length > 0
```

## Using Backups for Audit Trails

Backup files can serve as an audit trail of configuration changes:

```yaml
# Log configuration changes using backup information
- name: Deploy and log config change
  ansible.builtin.template:
    src: important.conf.j2
    dest: /etc/important.conf
    backup: true
  register: config_change

- name: Log the change
  ansible.builtin.lineinfile:
    path: /var/log/config_changes.log
    line: >-
      {{ ansible_date_time.iso8601 }} |
      {{ ansible_user_id }} |
      /etc/important.conf |
      backup: {{ config_change.backup_file | default('no change') }}
    create: true
  when: config_change.changed
```

## The backup Parameter with Other Modules

The backup parameter is not exclusive to the template module. It also works with:

```yaml
# backup works with copy module
- name: Deploy static file with backup
  ansible.builtin.copy:
    src: files/motd
    dest: /etc/motd
    backup: true

# backup works with lineinfile
- name: Modify a line with backup
  ansible.builtin.lineinfile:
    path: /etc/hosts
    line: "10.0.1.10    myapp.internal"
    backup: true

# backup works with replace module
- name: Replace text with backup
  ansible.builtin.replace:
    path: /etc/myapp/config.ini
    regexp: 'debug\s*=\s*true'
    replace: 'debug = false'
    backup: true

# backup works with blockinfile
- name: Insert block with backup
  ansible.builtin.blockinfile:
    path: /etc/hosts
    block: |
      10.0.1.10 web01
      10.0.1.11 web02
    backup: true
```

## Summary

The `backup` parameter is a simple safety net that costs nothing to use. Add `backup: true` to any template task that manages critical configuration files. It only creates backups when the file actually changes, so it will not clutter your filesystem with identical copies from idempotent runs. Use the `backup_file` attribute from the registered result for automatic rollback logic. Combine it with `validate` for maximum protection: validate prevents deploying broken syntax, and backup preserves the previous version in case the new config causes runtime issues. Clean up old backup files periodically to prevent disk space accumulation, and consider using backup manifests as an audit trail of configuration changes.
