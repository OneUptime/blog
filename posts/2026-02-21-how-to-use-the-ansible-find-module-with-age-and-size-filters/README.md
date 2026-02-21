# How to Use the Ansible find Module with Age and Size Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Disk Cleanup, Linux

Description: Learn how to use the Ansible find module age and size parameters to locate old files for cleanup and large files consuming disk space.

---

Disk space management is a constant concern on production servers. Log files grow endlessly, temporary files accumulate, and old backups pile up. The Ansible `find` module has `age` and `size` parameters that let you locate files based on how old they are and how big they are. Combined with the `file` module to delete what you find, this gives you a clean, automated way to keep disk usage under control.

This post goes deep into the age and size filters, including their syntax, edge cases, and practical cleanup patterns.

## Finding Files by Age

The `age` parameter filters files based on their modification time. The value is a duration string with a number and a unit suffix:

- `s` = seconds
- `m` = minutes
- `h` = hours
- `d` = days
- `w` = weeks

A positive value means "older than" and a negative value means "newer than":

```yaml
# Find files older than 30 days
- name: Find log files older than 30 days
  ansible.builtin.find:
    paths: /var/log/myapp
    patterns: "*.log"
    age: "30d"
  register: old_logs

# Find files newer than 1 hour (negative value = newer than)
- name: Find recently modified config files
  ansible.builtin.find:
    paths: /etc/myapp
    patterns: "*.conf"
    age: "-1h"
  register: recent_configs
```

The age comparison uses the file's `mtime` (modification time) by default. You can change this with the `age_stamp` parameter:

```yaml
# Filter by access time instead of modification time
- name: Find files not accessed in 90 days
  ansible.builtin.find:
    paths: /opt/myapp/cache
    age: "90d"
    age_stamp: atime
  register: stale_cache

# Filter by creation time (ctime - actually inode change time on Linux)
- name: Find files created more than 7 days ago
  ansible.builtin.find:
    paths: /tmp
    patterns: "myapp-*"
    age: "7d"
    age_stamp: ctime
  register: old_temp
```

## Finding Files by Size

The `size` parameter filters files based on their size on disk. Like age, positive values mean "larger than" and negative values mean "smaller than":

- `b` = bytes
- `k` = kilobytes
- `m` = megabytes
- `g` = gigabytes
- `t` = terabytes

```yaml
# Find files larger than 100 megabytes
- name: Find large files
  ansible.builtin.find:
    paths: /var/log
    recurse: true
    size: "100m"
  register: large_files

# Find files smaller than 1 kilobyte (potentially empty or stub files)
- name: Find tiny files
  ansible.builtin.find:
    paths: /opt/myapp/data
    size: "-1k"
  register: tiny_files
```

## Combining Age and Size

You can use both filters together to narrow down results. Both conditions must be true for a file to match:

```yaml
# Find log files that are both old AND large
- name: Find old large log files
  ansible.builtin.find:
    paths: /var/log
    patterns: "*.log"
    recurse: true
    age: "7d"
    size: "50m"
  register: old_large_logs

- name: Report findings
  ansible.builtin.debug:
    msg: "Found {{ old_large_logs.matched }} files older than 7 days and larger than 50MB"
```

```yaml
# Find recently created files that are suspiciously large
- name: Find new large files (potential issue indicator)
  ansible.builtin.find:
    paths: /var/log/myapp
    age: "-1d"
    size: "500m"
  register: suspicious_files

- name: Alert on suspicious large files
  ansible.builtin.debug:
    msg: "WARNING: {{ item.path }} is {{ (item.size / 1048576) | round(1) }} MB and was modified recently"
  loop: "{{ suspicious_files.files }}"
  loop_control:
    label: "{{ item.path }}"
  when: suspicious_files.matched > 0
```

## Practical Pattern: Log File Cleanup

Here is a complete log cleanup playbook:

```yaml
# cleanup-logs.yml - automated log file management
---
- name: Clean up old log files
  hosts: all
  become: true
  vars:
    log_retention_days: 30
    max_log_size_mb: 500

  tasks:
    # Remove old log files
    - name: Find log files older than retention period
      ansible.builtin.find:
        paths:
          - /var/log/myapp
          - /var/log/nginx
        patterns:
          - "*.log"
          - "*.log.gz"
          - "*.log.[0-9]*"
        age: "{{ log_retention_days }}d"
        recurse: true
      register: expired_logs

    - name: Remove expired log files
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ expired_logs.files }}"
      loop_control:
        label: "{{ item.path }} ({{ (item.size / 1048576) | round(1) }} MB)"
      when: expired_logs.matched > 0

    # Identify currently active logs that are too large
    - name: Find oversized active log files
      ansible.builtin.find:
        paths:
          - /var/log/myapp
          - /var/log/nginx
        patterns: "*.log"
        size: "{{ max_log_size_mb }}m"
      register: oversized_logs

    - name: Report oversized logs for manual review
      ansible.builtin.debug:
        msg: "OVERSIZED: {{ item.path }} is {{ (item.size / 1048576) | round(1) }} MB"
      loop: "{{ oversized_logs.files }}"
      loop_control:
        label: "{{ item.path }}"
      when: oversized_logs.matched > 0

    # Summarize the cleanup
    - name: Report cleanup summary
      ansible.builtin.debug:
        msg: >
          Cleanup complete. Removed {{ expired_logs.matched }} expired files.
          Found {{ oversized_logs.matched }} oversized active logs for review.
          Space freed: {{ expired_logs.files | map(attribute='size') | sum | human_readable }}
```

## Practical Pattern: Backup Rotation

Keep only the most recent backups and remove old ones:

```yaml
# rotate-backups.yml - manage backup retention
---
- name: Rotate old backups
  hosts: db_servers
  become: true
  vars:
    backup_paths:
      - /var/backups/postgresql
      - /var/backups/mysql
    daily_retention_days: 7
    weekly_retention_days: 30
    monthly_retention_days: 365

  tasks:
    # Clean up daily backups older than 7 days
    - name: Find old daily backups
      ansible.builtin.find:
        paths: "{{ backup_paths }}"
        patterns: "*-daily-*"
        age: "{{ daily_retention_days }}d"
      register: old_daily

    - name: Remove old daily backups
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_daily.files }}"
      loop_control:
        label: "{{ item.path }}"

    # Clean up weekly backups older than 30 days
    - name: Find old weekly backups
      ansible.builtin.find:
        paths: "{{ backup_paths }}"
        patterns: "*-weekly-*"
        age: "{{ weekly_retention_days }}d"
      register: old_weekly

    - name: Remove old weekly backups
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_weekly.files }}"
      loop_control:
        label: "{{ item.path }}"

    # Report on remaining storage usage
    - name: Calculate remaining backup sizes
      ansible.builtin.find:
        paths: "{{ backup_paths }}"
        recurse: true
        file_type: file
      register: all_backups

    - name: Report backup storage usage
      ansible.builtin.debug:
        msg: "Total backup storage: {{ all_backups.files | map(attribute='size') | sum | human_readable }} across {{ all_backups.matched }} files"
```

## Practical Pattern: Temporary File Cleanup

Clean up temporary files across the system:

```yaml
# cleanup-temp.yml - manage temporary files
---
- name: Clean temporary files
  hosts: all
  become: true

  tasks:
    # Remove old files from /tmp
    - name: Find old files in /tmp
      ansible.builtin.find:
        paths: /tmp
        age: "3d"
        recurse: true
        file_type: file
      register: old_tmp_files

    - name: Remove old /tmp files
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_tmp_files.files }}"
      loop_control:
        label: "{{ item.path }}"

    # Remove empty directories in /tmp
    - name: Find empty directories in /tmp
      ansible.builtin.find:
        paths: /tmp
        file_type: directory
        recurse: true
        age: "3d"
      register: old_tmp_dirs

    # Remove directories in reverse order (deepest first)
    - name: Remove empty /tmp directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_tmp_dirs.files | sort(attribute='path', reverse=true) }}"
      loop_control:
        label: "{{ item.path }}"
      ignore_errors: true  # Skip non-empty directories

    # Find and report files consuming the most space in /var
    - name: Find the 10 largest files in /var
      ansible.builtin.find:
        paths: /var
        recurse: true
        file_type: file
        size: "100m"
      register: large_var_files

    - name: Report largest files
      ansible.builtin.debug:
        msg: "{{ item.path }}: {{ (item.size / 1048576) | round(1) }} MB"
      loop: "{{ large_var_files.files | sort(attribute='size', reverse=true) | list }}"
      loop_control:
        label: "{{ item.path }}"
```

## Practical Pattern: Disk Space Monitoring

Use `find` to build a simple disk space monitoring task:

```yaml
# disk-check.yml - check for disk space issues
---
- name: Check disk space usage
  hosts: all
  become: true
  vars:
    alert_threshold_gb: 1

  tasks:
    - name: Find files larger than threshold
      ansible.builtin.find:
        paths: /
        size: "{{ alert_threshold_gb }}g"
        recurse: true
        file_type: file
      register: giant_files

    - name: Report giant files
      ansible.builtin.debug:
        msg: |
          HOST: {{ inventory_hostname }}
          FILES OVER {{ alert_threshold_gb }}GB:
          {% for f in giant_files.files | sort(attribute='size', reverse=true) %}
          - {{ f.path }}: {{ (f.size / 1073741824) | round(2) }} GB
          {% endfor %}
      when: giant_files.matched > 0
```

## Edge Cases and Tips

The `age` filter compares against the current time on the remote host, not the control node. If your servers have clock drift, the results might be unexpected. Make sure NTP is running on all hosts.

When using `size: "0"`, Ansible finds files that are exactly 0 bytes. For finding empty files, this is useful:

```yaml
# Find empty files (zero bytes)
- name: Find empty log files
  ansible.builtin.find:
    paths: /var/log/myapp
    patterns: "*.log"
    size: 0
  register: empty_logs
```

The size comparison is inclusive. `size: "100m"` means files that are 100 megabytes or larger, not strictly larger.

## Summary

The `age` and `size` parameters of the Ansible `find` module are your primary tools for automated disk space management. Use `age` with a positive value to find files older than a threshold, negative for newer. Use `size` with a positive value for files larger than a threshold, negative for smaller. Combine both parameters for precise targeting. Build reusable cleanup playbooks with configurable retention periods and size limits, and schedule them as cron-like recurring tasks to keep your servers healthy.
