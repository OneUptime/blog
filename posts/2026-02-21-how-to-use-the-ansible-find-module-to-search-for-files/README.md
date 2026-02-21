# How to Use the Ansible find Module to Search for Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Linux, Automation

Description: Learn how to use the Ansible find module to search for files and directories on remote hosts by name patterns, types, and other criteria.

---

Finding files on remote servers is a routine part of system administration. You might need to locate log files for cleanup, find configuration files for auditing, or identify large files consuming disk space. The Ansible `find` module searches for files on remote hosts based on patterns, age, size, and other criteria, and it works entirely server-side without transferring anything to the control node.

This post covers how to use the `find` module for common file search scenarios, along with how to act on the results.

## Basic File Search

The simplest usage searches for files matching a glob pattern in a directory:

```yaml
# Find all .log files in a directory
- name: Find log files
  ansible.builtin.find:
    paths: /var/log/myapp
    patterns: "*.log"
  register: log_files

- name: Display found files
  ansible.builtin.debug:
    msg: "Found {{ log_files.matched }} log files"
```

The `register` keyword captures the search results. The `log_files.files` list contains details about each matched file, and `log_files.matched` gives you the count.

## Searching for Multiple Patterns

You can search for multiple file patterns at once:

```yaml
# Find all log and text files
- name: Find log and text files
  ansible.builtin.find:
    paths: /var/log/myapp
    patterns:
      - "*.log"
      - "*.txt"
      - "*.out"
  register: text_files
```

## Recursive Search

By default, `find` only searches the specified directory, not its subdirectories. Add `recurse: true` to search subdirectories:

```yaml
# Recursively search for config files in a directory tree
- name: Find all YAML config files recursively
  ansible.builtin.find:
    paths: /etc/myapp
    patterns: "*.yml"
    recurse: true
  register: yaml_configs

- name: List found files
  ansible.builtin.debug:
    msg: "{{ item.path }}"
  loop: "{{ yaml_configs.files }}"
  loop_control:
    label: "{{ item.path }}"
```

## Searching by File Type

The `file_type` parameter lets you search for files, directories, links, or any type:

```yaml
# Find only directories
- name: Find all subdirectories in releases
  ansible.builtin.find:
    paths: /opt/myapp/releases
    file_type: directory
  register: release_dirs

# Find only symbolic links
- name: Find all symbolic links in /etc
  ansible.builtin.find:
    paths: /etc/nginx/sites-enabled
    file_type: link
  register: enabled_sites

# Find any file system object (files, dirs, links)
- name: Find everything in tmp directory
  ansible.builtin.find:
    paths: /tmp/myapp
    file_type: any
    recurse: true
  register: all_items
```

## Using Regex Patterns

For more complex matching, use `use_regex: true` to switch from glob to Python regular expressions:

```yaml
# Find files matching a regex pattern
- name: Find rotated log files (e.g., app.log.1, app.log.2.gz)
  ansible.builtin.find:
    paths: /var/log/myapp
    patterns: "^app\\.log\\.\\d+"
    use_regex: true
  register: rotated_logs
```

```yaml
# Find files with a date pattern in the name
- name: Find files with date stamps (YYYY-MM-DD)
  ansible.builtin.find:
    paths: /var/backups
    patterns: ".*\\d{4}-\\d{2}-\\d{2}.*"
    use_regex: true
    recurse: true
  register: dated_files
```

## Searching Multiple Paths

You can search across multiple directories in one task:

```yaml
# Search multiple directories at once
- name: Find config files across multiple directories
  ansible.builtin.find:
    paths:
      - /etc/myapp
      - /opt/myapp/config
      - /home/deploy/.myapp
    patterns: "*.conf"
    recurse: true
  register: all_configs
```

## Excluding Patterns

The `excludes` parameter filters out files that match certain patterns:

```yaml
# Find all files but exclude backups and temp files
- name: Find config files excluding backups
  ansible.builtin.find:
    paths: /etc/myapp
    patterns: "*"
    excludes:
      - "*.bak"
      - "*.tmp"
      - "*.swp"
      - "*~"
    recurse: true
  register: clean_files
```

## Finding Hidden Files

By default, `find` includes hidden files (those starting with a dot). You can explicitly control this:

```yaml
# Find hidden files specifically
- name: Find hidden files in home directory
  ansible.builtin.find:
    paths: /home/deploy
    patterns: ".*"
    hidden: true
    use_regex: true
  register: hidden_files
```

## Acting on Found Files

The real power of `find` comes from combining it with other modules. Here are common patterns:

### Delete Found Files

```yaml
# Find and delete old temporary files
- name: Find temp files older than 7 days
  ansible.builtin.find:
    paths: /tmp
    patterns: "myapp-*"
    age: "7d"
  register: old_temp

- name: Remove old temp files
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ old_temp.files }}"
  loop_control:
    label: "{{ item.path }}"
```

### Change Permissions on Found Files

```yaml
# Find scripts and make them executable
- name: Find shell scripts
  ansible.builtin.find:
    paths: /opt/myapp/bin
    patterns: "*.sh"
  register: scripts

- name: Make scripts executable
  ansible.builtin.file:
    path: "{{ item.path }}"
    mode: "0755"
  loop: "{{ scripts.files }}"
  loop_control:
    label: "{{ item.path }}"
```

### Fetch Found Files

```yaml
# Find and download specific report files
- name: Find today's reports
  ansible.builtin.find:
    paths: /opt/reports
    patterns: "*{{ ansible_date_time.date }}*"
  register: todays_reports

- name: Fetch today's reports
  ansible.builtin.fetch:
    src: "{{ item.path }}"
    dest: "reports/"
  loop: "{{ todays_reports.files }}"
  loop_control:
    label: "{{ item.path }}"
```

## Understanding the Return Data

Each item in the `files` list contains detailed information:

```yaml
# Explore the data returned by find
- name: Find a file and show all metadata
  ansible.builtin.find:
    paths: /etc/myapp
    patterns: "app.conf"
  register: found

- name: Show file details
  ansible.builtin.debug:
    msg: |
      Path: {{ item.path }}
      Size: {{ item.size }} bytes
      Mode: {{ item.mode }}
      Owner: {{ item.pw_name }}
      Group: {{ item.gr_name }}
      Modified: {{ item.mtime }}
      Accessed: {{ item.atime }}
      Is Regular File: {{ item.isreg }}
      Is Directory: {{ item.isdir }}
      Is Link: {{ item.islnk }}
  loop: "{{ found.files }}"
  loop_control:
    label: "{{ item.path }}"
```

## Sorting Results

You can sort the results by various attributes:

```yaml
# Find files and sort them by modification time
- name: Find log files sorted by newest first
  ansible.builtin.find:
    paths: /var/log/myapp
    patterns: "*.log"
  register: log_files

- name: Show files from newest to oldest
  ansible.builtin.debug:
    msg: "{{ item.path }} - {{ item.mtime }}"
  loop: "{{ log_files.files | sort(attribute='mtime', reverse=true) }}"
  loop_control:
    label: "{{ item.path }}"
```

## Practical Example: Application Deployment Cleanup

Here is a complete playbook that uses `find` to manage deployment artifacts:

```yaml
# cleanup-deployments.yml - manage old releases and artifacts
---
- name: Clean up old deployment artifacts
  hosts: app_servers
  become: true
  vars:
    keep_releases: 5

  tasks:
    - name: Find all release directories
      ansible.builtin.find:
        paths: /opt/myapp/releases
        file_type: directory
      register: releases

    - name: Identify releases to remove
      ansible.builtin.set_fact:
        old_releases: "{{ (releases.files | sort(attribute='mtime', reverse=true))[keep_releases:] }}"

    - name: Remove old release directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_releases }}"
      loop_control:
        label: "{{ item.path }}"
      when: old_releases | length > 0

    - name: Find stale PID files
      ansible.builtin.find:
        paths:
          - /var/run
          - /tmp
        patterns: "myapp-*.pid"
      register: stale_pids

    - name: Remove stale PID files
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ stale_pids.files }}"
      loop_control:
        label: "{{ item.path }}"

    - name: Report cleanup results
      ansible.builtin.debug:
        msg: "Removed {{ old_releases | length }} old releases and {{ stale_pids.matched }} stale PID files"
```

## Summary

The Ansible `find` module is a versatile tool for locating files on remote hosts. It supports glob and regex patterns, multiple search paths, recursive searching, and filtering by file type. The results include rich metadata about each matched file, and you can sort and filter the results using Jinja2 filters. The most common workflow is to use `find` to locate files and then loop over the results with `file`, `fetch`, `copy`, or other modules to act on them. This two-step pattern replaces complex shell commands with clean, readable, idempotent Ansible tasks.
