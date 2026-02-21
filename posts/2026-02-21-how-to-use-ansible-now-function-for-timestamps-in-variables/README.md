# How to Use Ansible now Function for Timestamps in Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Timestamps, now Function, Jinja2, Automation

Description: Learn how to use the Ansible now() function to generate timestamps for file names, log entries, backup labels, and deployment tracking.

---

Timestamps show up everywhere in infrastructure automation: backup file names, deployment logs, audit trails, cache-busting paths, and rotation schedules. The Ansible `now()` function gives you access to the current date and time during playbook execution, formatted however you need it using Python's `strftime` directives. No need to shell out to the `date` command or register the output of a command task.

## Basic Usage

The `now()` function returns the current timestamp. You can format it using the `strftime` method or pass a format string directly.

```yaml
# timestamps-basic.yml - Basic now() usage
---
- name: Demonstrate now() function
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Show various timestamp formats
      ansible.builtin.debug:
        msg:
          - "Default: {{ now() }}"
          - "ISO format: {{ now(fmt='%Y-%m-%dT%H:%M:%S') }}"
          - "Date only: {{ now(fmt='%Y-%m-%d') }}"
          - "Time only: {{ now(fmt='%H:%M:%S') }}"
          - "Compact: {{ now(fmt='%Y%m%d%H%M%S') }}"
          - "Human readable: {{ now(fmt='%B %d, %Y at %I:%M %p') }}"
```

Sample output:

```
Default: 2026-02-21 14:30:45.123456
ISO format: 2026-02-21T14:30:45
Date only: 2026-02-21
Time only: 14:30:45
Compact: 20260221143045
Human readable: February 21, 2026 at 02:30 PM
```

## UTC vs Local Time

By default, `now()` returns the local time of the Ansible controller. You can explicitly request UTC:

```yaml
# utc-timestamps.yml - UTC timestamp usage
---
- name: UTC and local timestamps
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Compare local and UTC time
      ansible.builtin.debug:
        msg:
          - "Local time: {{ now(fmt='%Y-%m-%d %H:%M:%S %Z') }}"
          - "UTC time: {{ now(utc=true, fmt='%Y-%m-%d %H:%M:%S UTC') }}"
```

Always use UTC for anything that will be compared across systems in different time zones. Deployment records, audit logs, and backup timestamps should all use UTC.

## Practical Example: Backup File Naming

One of the most common uses for timestamps is naming backup files:

```yaml
# backup-with-timestamp.yml - Create timestamped backups
---
- name: Create database backup with timestamp
  hosts: db_servers
  gather_facts: false
  vars:
    backup_dir: /var/backups/postgres
    backup_timestamp: "{{ now(utc=true, fmt='%Y%m%d_%H%M%S') }}"
    db_name: myapp_production
  tasks:
    - name: Ensure backup directory exists
      ansible.builtin.file:
        path: "{{ backup_dir }}"
        state: directory
        owner: postgres
        group: postgres
        mode: '0750'
      become: true

    - name: Create database dump with timestamp
      ansible.builtin.command:
        cmd: >
          pg_dump -U postgres {{ db_name }}
          -f {{ backup_dir }}/{{ db_name }}_{{ backup_timestamp }}.sql
      become: true
      become_user: postgres
      changed_when: true

    - name: Compress the backup
      ansible.builtin.command:
        cmd: "gzip {{ backup_dir }}/{{ db_name }}_{{ backup_timestamp }}.sql"
      become: true
      become_user: postgres
      changed_when: true

    - name: Report backup file
      ansible.builtin.debug:
        msg: "Backup created: {{ backup_dir }}/{{ db_name }}_{{ backup_timestamp }}.sql.gz"
```

## Important: Timestamp Consistency Within a Play

A subtle but critical point: if you use `now()` in multiple places without storing it in a variable first, each call returns a slightly different time. Store the timestamp in a variable at the start to keep it consistent.

```yaml
# consistent-timestamps.yml - Store timestamp once for consistency
---
- name: Deployment with consistent timestamp
  hosts: app_servers
  gather_facts: false
  vars:
    # Store the timestamp once for the entire play
    deploy_timestamp: "{{ now(utc=true, fmt='%Y%m%d%H%M%S') }}"
    deploy_date_human: "{{ now(utc=true, fmt='%Y-%m-%d %H:%M:%S UTC') }}"
  tasks:
    - name: Create versioned deployment directory
      ansible.builtin.file:
        path: "/opt/app/releases/{{ deploy_timestamp }}"
        state: directory
        owner: app
        group: app
        mode: '0755'
      become: true

    - name: Deploy application
      ansible.builtin.unarchive:
        src: /tmp/app-release.tar.gz
        dest: "/opt/app/releases/{{ deploy_timestamp }}"
        remote_src: true
        owner: app
        group: app
      become: true

    - name: Update current symlink
      ansible.builtin.file:
        src: "/opt/app/releases/{{ deploy_timestamp }}"
        dest: /opt/app/current
        state: link
        owner: app
        group: app
      become: true

    - name: Record deployment metadata
      ansible.builtin.copy:
        content: |
          deployed_at: {{ deploy_date_human }}
          release_dir: /opt/app/releases/{{ deploy_timestamp }}
          deployed_by: {{ ansible_user_id }}
          hosts: {{ ansible_play_hosts | join(', ') }}
        dest: "/opt/app/releases/{{ deploy_timestamp }}/DEPLOY_INFO"
        mode: '0644'
      become: true
```

## Timestamp Arithmetic

You can combine `now()` with Jinja2 filters to calculate relative dates:

```yaml
# timestamp-math.yml - Calculate dates relative to now
---
- name: Timestamp arithmetic
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Calculate cleanup cutoff date
      ansible.builtin.set_fact:
        # Current timestamp as epoch seconds
        current_epoch: "{{ now(utc=true, fmt='%s') }}"
        # 7 days ago in epoch seconds
        seven_days_ago_epoch: "{{ now(utc=true, fmt='%s') | int - (7 * 86400) }}"

    - name: Show dates
      ansible.builtin.debug:
        msg:
          - "Current epoch: {{ current_epoch }}"
          - "7 days ago epoch: {{ seven_days_ago_epoch }}"

    - name: Find and remove old backups (older than 7 days)
      ansible.builtin.find:
        paths: /var/backups
        patterns: "*.sql.gz"
        age: 7d
        age_stamp: mtime
      register: old_backups
      become: true

    - name: Delete old backup files
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_backups.files }}"
      become: true
```

## Using Timestamps in Templates

Templates can call `now()` directly, which is useful for generating configuration files with build timestamps:

```yaml
# roles/app/tasks/main.yml
---
- name: Generate configuration with build timestamp
  ansible.builtin.template:
    src: app-config.yml.j2
    dest: /opt/app/config/app.yml
    mode: '0644'
  become: true
```

```jinja2
# roles/app/templates/app-config.yml.j2
# Application Configuration
# Generated by Ansible on {{ now(utc=true, fmt='%Y-%m-%d %H:%M:%S UTC') }}
# Do not edit manually

server:
  port: {{ app_port }}
  host: {{ app_host }}

build_info:
  generated_at: "{{ now(utc=true, fmt='%Y-%m-%dT%H:%M:%SZ') }}"
  ansible_version: "{{ ansible_version.full }}"
  target_host: "{{ inventory_hostname }}"
```

## Strftime Format Reference

Here is a quick reference for common format codes:

```yaml
# format-reference.yml - Common strftime format codes
---
- name: Strftime format reference
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Show common format codes
      ansible.builtin.debug:
        msg:
          - "%Y = Four-digit year: {{ now(fmt='%Y') }}"
          - "%m = Two-digit month: {{ now(fmt='%m') }}"
          - "%d = Two-digit day: {{ now(fmt='%d') }}"
          - "%H = 24-hour hour: {{ now(fmt='%H') }}"
          - "%I = 12-hour hour: {{ now(fmt='%I') }}"
          - "%M = Minute: {{ now(fmt='%M') }}"
          - "%S = Second: {{ now(fmt='%S') }}"
          - "%p = AM/PM: {{ now(fmt='%p') }}"
          - "%Z = Timezone name: {{ now(fmt='%Z') }}"
          - "%s = Unix epoch: {{ now(fmt='%s') }}"
          - "%A = Weekday name: {{ now(fmt='%A') }}"
          - "%B = Month name: {{ now(fmt='%B') }}"
          - "%j = Day of year: {{ now(fmt='%j') }}"
          - "%W = Week number: {{ now(fmt='%W') }}"
```

## Log Rotation Example

```yaml
# log-rotation.yml - Rotate logs with timestamps
---
- name: Rotate application logs
  hosts: app_servers
  gather_facts: false
  vars:
    log_dir: /var/log/myapp
    archive_dir: /var/log/myapp/archive
    rotation_timestamp: "{{ now(utc=true, fmt='%Y%m%d_%H%M%S') }}"
  tasks:
    - name: Ensure archive directory exists
      ansible.builtin.file:
        path: "{{ archive_dir }}"
        state: directory
        mode: '0755'
      become: true

    - name: Find current log files
      ansible.builtin.find:
        paths: "{{ log_dir }}"
        patterns: "*.log"
        file_type: file
      register: log_files

    - name: Archive log files with timestamp
      ansible.builtin.command:
        cmd: >
          mv {{ item.path }}
          {{ archive_dir }}/{{ item.path | basename | splitext | first }}_{{ rotation_timestamp }}.log
      loop: "{{ log_files.files }}"
      become: true
      changed_when: true

    - name: Compress archived logs
      ansible.builtin.command:
        cmd: "gzip {{ archive_dir }}/*_{{ rotation_timestamp }}.log"
      become: true
      changed_when: true

    - name: Restart application to create fresh log files
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true
```

## Best Practices

Always use UTC (`utc=true`) for timestamps that will be compared across machines or stored in databases. Store the timestamp in a variable at the top of the play to ensure consistency across tasks. Use compact formats (like `%Y%m%d%H%M%S`) for file names and ISO formats for log entries and metadata. Do not rely on `now()` for precise timing between tasks since each call is independent. If you need the timestamp to be the same across all hosts in a play, set it with `run_once: true` and use `set_fact` with `cacheable: true`.

The `now()` function is a small utility, but it eliminates the need for `command: date` tasks and keeps your playbooks cleaner and more portable across operating systems.
