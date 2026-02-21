# How to Use Ansible failed_when for Custom Failure Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Playbooks, Automation

Description: Learn how to use Ansible failed_when to define custom failure conditions that go beyond simple return codes in your playbooks.

---

Ansible decides whether a task succeeded or failed based on the return code of the underlying module. A return code of 0 means success, anything else means failure. But in the real world, a command can return 0 and still have produced bad results, or return a nonzero code while doing exactly what you wanted. The `failed_when` directive lets you override Ansible's default failure detection with your own conditions.

## Why Default Failure Detection Falls Short

Consider this example: you run a database migration script that always exits with code 0, but prints "MIGRATION FAILED" to stderr when something goes wrong. Without `failed_when`, Ansible would happily report success.

```yaml
# Without failed_when, this reports success even when migration fails
- name: Run database migration
  ansible.builtin.command:
    cmd: /opt/app/bin/migrate.sh
  register: migration_output
  # Ansible only checks return code, not output content
```

Or the opposite scenario: a command that returns exit code 1 when an item already exists, which is perfectly fine for idempotent operations.

## Basic failed_when Syntax

The `failed_when` directive takes a Jinja2 expression that evaluates to true or false. When it evaluates to true, Ansible marks the task as failed.

```yaml
# Mark task as failed if the output contains an error message
- name: Run database migration
  ansible.builtin.command:
    cmd: /opt/app/bin/migrate.sh
  register: migration_output
  failed_when: "'MIGRATION FAILED' in migration_output.stderr"
```

You can also check multiple conditions using `and` or `or`:

```yaml
# Fail when return code is nonzero AND error is not "already exists"
- name: Create application user
  ansible.builtin.command:
    cmd: useradd -m -s /bin/bash appuser
  register: useradd_result
  failed_when:
    - useradd_result.rc != 0
    - "'already exists' not in useradd_result.stderr"
```

When you pass a list to `failed_when`, all conditions must be true for the task to fail (they are joined with AND). This means the task above only fails when the return code is nonzero AND the error does not mention "already exists."

## Checking Return Codes

The most straightforward use of `failed_when` is customizing which return codes count as failures:

```yaml
# grep returns 1 when no match found, which is not really a failure
- name: Check if config contains debug mode
  ansible.builtin.command:
    cmd: grep -c 'DEBUG=true' /etc/app/config.env
  register: debug_check
  failed_when: debug_check.rc > 1
  changed_when: false
  # rc=0 means found, rc=1 means not found, rc=2 means actual error
```

Here `grep` returns 1 when no match is found. That is not an error; it just means debug mode is not enabled. By setting `failed_when: debug_check.rc > 1`, we only fail on actual grep errors (like file not found).

## Checking Output Content

You can inspect stdout and stderr for specific strings or patterns:

```yaml
# Fail if the health check returns anything other than "healthy"
- name: Check application health
  ansible.builtin.uri:
    url: "http://localhost:8080/health"
    return_content: true
  register: health
  failed_when: "'healthy' not in health.content"

# Fail if any warnings appear in the output
- name: Validate configuration
  ansible.builtin.command:
    cmd: /opt/app/bin/validate-config
  register: validate_result
  failed_when: >
    validate_result.rc != 0 or
    'WARNING' in validate_result.stdout or
    'CRITICAL' in validate_result.stderr
```

## Using failed_when with Numeric Comparisons

Sometimes the output of a command is a number, and you need to compare it against a threshold:

```yaml
# Check the number of active database connections
- name: Get active connection count
  ansible.builtin.command:
    cmd: psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
  register: active_connections
  become_user: postgres
  become: true
  changed_when: false
  failed_when: (active_connections.stdout | trim | int) > 100

# Check disk usage percentage
- name: Get root partition usage
  ansible.builtin.command:
    cmd: df --output=pcent / | tail -1
  register: disk_usage
  changed_when: false
  failed_when: (disk_usage.stdout | trim | replace('%','') | int) > 90
```

## Using failed_when with Complex Logic

You can use any valid Jinja2 expression, including filters and tests:

```yaml
# Fail if response time exceeds threshold
- name: Test API response time
  ansible.builtin.uri:
    url: "http://{{ inventory_hostname }}:8080/api/status"
    return_content: true
  register: api_response
  failed_when: >
    api_response.elapsed > 5 or
    api_response.status != 200 or
    (api_response.json.errors | default([]) | length) > 0

# Fail if a required key is missing from JSON response
- name: Verify deployment metadata
  ansible.builtin.uri:
    url: "http://localhost:8080/api/version"
    return_content: true
  register: version_info
  failed_when: >
    'version' not in version_info.json or
    'build_date' not in version_info.json or
    version_info.json.version != expected_version
```

## Combining failed_when with changed_when

It is common to use `failed_when` together with `changed_when` to get full control over how Ansible reports a task:

```yaml
# Full control over task status reporting
- name: Synchronize application data
  ansible.builtin.command:
    cmd: /opt/app/bin/sync-data --source=primary --target=replica
  register: sync_result
  changed_when: "'records synchronized' in sync_result.stdout"
  failed_when:
    - sync_result.rc != 0
    - "'already in sync' not in sync_result.stdout"
```

This task reports "changed" only when records were actually synchronized, "ok" when everything was already in sync, and "failed" only for genuine errors.

## Real-World Example: Safe Database Backup

Here is a practical example that validates a database backup beyond just checking the exit code:

```yaml
---
- name: Backup PostgreSQL database
  hosts: db_servers
  become: true
  become_user: postgres

  vars:
    backup_dir: /var/backups/postgresql
    min_backup_size_kb: 1024

  tasks:
    - name: Create backup directory
      ansible.builtin.file:
        path: "{{ backup_dir }}"
        state: directory
        owner: postgres
        mode: "0750"

    - name: Run pg_dump
      ansible.builtin.command:
        cmd: >
          pg_dump --format=custom
          --file={{ backup_dir }}/mydb_{{ ansible_date_time.date }}.dump
          mydb
      register: dump_result
      failed_when: >
        dump_result.rc != 0 or
        'error' in (dump_result.stderr | lower)

    - name: Check backup file size
      ansible.builtin.stat:
        path: "{{ backup_dir }}/mydb_{{ ansible_date_time.date }}.dump"
      register: backup_file

    - name: Validate backup is not suspiciously small
      ansible.builtin.debug:
        msg: "Backup size: {{ backup_file.stat.size // 1024 }}KB"
      failed_when: (backup_file.stat.size // 1024) < min_backup_size_kb

    - name: Verify backup integrity
      ansible.builtin.command:
        cmd: pg_restore --list {{ backup_dir }}/mydb_{{ ansible_date_time.date }}.dump
      register: verify_result
      changed_when: false
      failed_when: >
        verify_result.rc != 0 or
        'error' in (verify_result.stderr | lower)
```

This playbook goes beyond checking exit codes. It verifies the backup file exists, checks that it is not suspiciously small (which could indicate an empty or corrupt dump), and validates the backup integrity by listing its contents.

## Using failed_when with Loops

When `failed_when` is used inside a loop, it applies to each iteration:

```yaml
# Verify all critical services are running
- name: Check service status
  ansible.builtin.command:
    cmd: "systemctl is-active {{ item }}"
  loop:
    - nginx
    - postgresql
    - redis-server
    - app-worker
  register: service_status
  failed_when:
    - service_status.stdout != 'active'
    - item != 'redis-server'  # Redis is optional
  changed_when: false
```

This checks all four services but only fails for the first three. Redis being inactive is tolerated.

## Inverting Default Failure Behavior

You can completely disable failure detection by setting `failed_when: false`. This is similar to `ignore_errors` but cleaner because the task will show as "ok" instead of "failed (ignored)":

```yaml
# Never fail this task, regardless of what happens
- name: Clean up temporary files (best effort)
  ansible.builtin.command:
    cmd: find /tmp/app-* -mtime +7 -delete
  failed_when: false
  changed_when: false
```

## Summary

The `failed_when` directive gives you precise control over what Ansible considers a failure. Use it when return codes alone do not tell the full story. Check output content for error messages, validate numeric thresholds, verify response data, and combine it with `changed_when` for complete control over task reporting. The key advantage over `ignore_errors` is that `failed_when` defines what failure actually means for your specific use case, rather than blindly ignoring all errors.
