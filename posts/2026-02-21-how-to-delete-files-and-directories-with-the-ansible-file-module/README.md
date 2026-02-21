# How to Delete Files and Directories with the Ansible file Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Linux, Cleanup

Description: Learn how to safely delete files, directories, and symlinks on remote hosts using the Ansible file module with state absent and related patterns.

---

Deleting files and directories is one of those tasks that sounds simple until you need to do it across hundreds of servers without accidentally removing something important. The Ansible `file` module with `state: absent` handles deletion in an idempotent way, meaning it only removes what exists and does nothing if the target is already gone.

This post covers how to delete individual files, entire directory trees, symlinks, and how to do it safely with pre-checks and conditional logic.

## Deleting a Single File

The simplest deletion is removing a single file:

```yaml
# Remove a single file from the remote host
- name: Delete old configuration file
  ansible.builtin.file:
    path: /etc/myapp/old-config.yml
    state: absent
```

If the file exists, Ansible removes it and reports "changed". If the file does not exist, Ansible reports "ok" and moves on. There is no error either way.

## Deleting a Directory and All Its Contents

When you set `state: absent` on a directory, Ansible removes the directory and everything inside it recursively. This is the equivalent of `rm -rf`:

```yaml
# Remove an entire directory tree
- name: Delete old release directory
  ansible.builtin.file:
    path: /opt/myapp/releases/v1.0.0
    state: absent
```

This removes `/opt/myapp/releases/v1.0.0` and all files, subdirectories, and symlinks within it. Be very careful with this, especially when using variables in the path. A wrong variable value could wipe out something you did not intend.

## Deleting Symlinks

Deleting a symlink removes the link itself, not the target it points to:

```yaml
# Remove a symbolic link without affecting the target
- name: Remove current symlink
  ansible.builtin.file:
    path: /opt/myapp/current
    state: absent
```

If `/opt/myapp/current` is a symlink to `/opt/myapp/releases/v2.0.0`, only the symlink is removed. The `/opt/myapp/releases/v2.0.0` directory remains untouched.

## Deleting Multiple Files with a Loop

To delete several specific files, use a loop:

```yaml
# Delete multiple files by name
- name: Clean up temporary files
  ansible.builtin.file:
    path: "{{ item }}"
    state: absent
  loop:
    - /tmp/myapp-install.tar.gz
    - /tmp/myapp-setup.log
    - /tmp/myapp-migration.sql
    - /var/tmp/myapp-cache.db
    - /home/deploy/.myapp-deploy-lock
```

## Deleting Files Based on a Pattern

The `file` module does not support glob patterns. To delete files matching a pattern, combine the `find` module with the `file` module:

```yaml
# Find and delete all .log files older than 30 days in /var/log/myapp
- name: Find old log files
  ansible.builtin.find:
    paths: /var/log/myapp
    patterns: "*.log"
    age: "30d"
    recurse: true
  register: old_logs

- name: Delete old log files
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ old_logs.files }}"
  loop_control:
    label: "{{ item.path }}"
```

```yaml
# Find and delete all .tmp and .bak files in /opt/myapp
- name: Find temporary and backup files
  ansible.builtin.find:
    paths: /opt/myapp
    patterns:
      - "*.tmp"
      - "*.bak"
      - "*.swp"
    recurse: true
  register: junk_files

- name: Remove temporary and backup files
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ junk_files.files }}"
  loop_control:
    label: "{{ item.path }}"
  when: junk_files.matched > 0
```

## Safe Deletion with Pre-checks

Before deleting something important, verify that the right conditions are met:

```yaml
# Only delete the old release if the new one is confirmed working
- name: Check if new release is responding
  ansible.builtin.uri:
    url: "http://localhost:8080/health"
    status_code: 200
  register: health_check
  retries: 5
  delay: 3
  until: health_check.status == 200

- name: Remove previous release directory
  ansible.builtin.file:
    path: /opt/myapp/releases/v1.9.0
    state: absent
  when: health_check.status == 200
```

```yaml
# Double-check before deleting a directory with stat
- name: Verify the path is what we expect
  ansible.builtin.stat:
    path: /opt/myapp/releases/v1.9.0
  register: dir_check

- name: Delete old release only if it is a directory
  ansible.builtin.file:
    path: /opt/myapp/releases/v1.9.0
    state: absent
  when:
    - dir_check.stat.exists
    - dir_check.stat.isdir
```

## Cleaning Up Old Releases

A common pattern is keeping only the N most recent releases and cleaning up the rest:

```yaml
# Keep only the 5 most recent releases
- name: List all release directories
  ansible.builtin.find:
    paths: /opt/myapp/releases
    file_type: directory
  register: all_releases

- name: Sort releases by modification time
  ansible.builtin.set_fact:
    sorted_releases: "{{ all_releases.files | sort(attribute='mtime', reverse=true) }}"

- name: Delete old releases beyond the keep count
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ sorted_releases[5:] }}"
  loop_control:
    label: "{{ item.path }}"
  when: sorted_releases | length > 5
```

## Deleting Contents but Keeping the Directory

Sometimes you want to empty a directory without removing it. The `file` module cannot do this directly, but you can combine `find` and `file`:

```yaml
# Empty a directory without removing the directory itself
- name: Find all contents of the cache directory
  ansible.builtin.find:
    paths: /var/cache/myapp
    file_type: any
    hidden: true
  register: cache_contents

- name: Delete all contents of the cache directory
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ cache_contents.files }}"
  loop_control:
    label: "{{ item.path }}"
```

If you also need to remove subdirectories within the target, add a step for directories:

```yaml
# Find and remove subdirectories too
- name: Find directories in cache
  ansible.builtin.find:
    paths: /var/cache/myapp
    file_type: directory
    recurse: false
  register: cache_dirs

- name: Remove subdirectories
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ cache_dirs.files }}"
  loop_control:
    label: "{{ item.path }}"

- name: Find remaining files in cache
  ansible.builtin.find:
    paths: /var/cache/myapp
    file_type: file
    hidden: true
  register: cache_files

- name: Remove remaining files
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ cache_files.files }}"
  loop_control:
    label: "{{ item.path }}"
```

## Handling Deletion Errors Gracefully

If you are not sure whether a file exists and want to suppress errors:

```yaml
# Use ignore_errors for non-critical cleanup tasks
- name: Attempt to remove optional temp files
  ansible.builtin.file:
    path: "{{ item }}"
    state: absent
  loop:
    - /tmp/myapp-pid
    - /var/run/myapp.sock
  ignore_errors: true
```

Actually, `state: absent` already handles missing files gracefully (it just reports "ok"), so `ignore_errors` is usually not needed unless there is a permission issue.

## Role-Based Cleanup Example

Here is a practical role that handles application cleanup during uninstallation:

```yaml
# roles/myapp-uninstall/tasks/main.yml - complete uninstall cleanup
---
- name: Stop application service
  ansible.builtin.systemd:
    name: myapp
    state: stopped
    enabled: false
  ignore_errors: true

- name: Remove systemd service file
  ansible.builtin.file:
    path: /etc/systemd/system/myapp.service
    state: absent
  notify: Reload systemd

- name: Remove application directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: absent
  loop:
    - /opt/myapp
    - /etc/myapp
    - /var/log/myapp
    - /var/lib/myapp
    - /var/run/myapp

- name: Remove application user
  ansible.builtin.user:
    name: myapp
    state: absent
    remove: true

- name: Remove application group
  ansible.builtin.group:
    name: myapp
    state: absent

- name: Remove logrotate configuration
  ansible.builtin.file:
    path: /etc/logrotate.d/myapp
    state: absent

- name: Remove nginx site configuration
  ansible.builtin.file:
    path: "{{ item }}"
    state: absent
  loop:
    - /etc/nginx/sites-available/myapp.conf
    - /etc/nginx/sites-enabled/myapp.conf
  notify: Reload Nginx
```

## Using become for Privileged Deletion

Files owned by root or other system users require elevated privileges:

```yaml
# Delete system files that require root access
- name: Remove stale PID file
  ansible.builtin.file:
    path: /var/run/myapp.pid
    state: absent
  become: true

# Delete files owned by a different user
- name: Remove postgres backup file
  ansible.builtin.file:
    path: /var/lib/postgresql/backup/old_backup.sql
    state: absent
  become: true
  become_user: postgres
```

## Summary

The Ansible `file` module with `state: absent` is the go-to tool for file and directory deletion. It is idempotent, meaning it safely handles cases where the target does not exist. For pattern-based deletion, combine the `find` module with `file`. Always add safety checks before deleting important paths, especially when using variables that could resolve to unexpected values. Use loops for batch deletion and keep your cleanup tasks organized in dedicated roles or task files for maintainability.
