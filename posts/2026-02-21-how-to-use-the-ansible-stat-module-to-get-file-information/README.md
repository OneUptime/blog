# How to Use the Ansible stat Module to Get File Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Linux, System Administration

Description: Learn how to use the Ansible stat module to check file existence, get file metadata, verify checksums, and make decisions based on file properties.

---

Before you can manage a file, you often need to know something about it. Does it exist? What are its permissions? Who owns it? How big is it? When was it last modified? The Ansible `stat` module answers all of these questions by returning detailed metadata about files and directories on remote hosts.

The most common use of `stat` is in conditional logic: check if a file exists before trying to modify it, verify a checksum before deploying an update, or confirm that permissions are correct after a deployment.

## Basic File Existence Check

The most frequent use case is checking whether a file exists:

```yaml
# Check if a file exists before acting on it
- name: Check if config file exists
  ansible.builtin.stat:
    path: /etc/myapp/config.yml
  register: config_file

- name: Create default config if none exists
  ansible.builtin.copy:
    src: files/default-config.yml
    dest: /etc/myapp/config.yml
    owner: root
    group: myapp
    mode: "0644"
  when: not config_file.stat.exists
```

The `stat.exists` attribute is a boolean. If the path does not exist at all, `stat.exists` is `false` and most other attributes will not be present.

## Getting Detailed File Information

The `stat` module returns a wealth of information about a file:

```yaml
# Get all metadata about a file
- name: Get file statistics
  ansible.builtin.stat:
    path: /etc/myapp/config.yml
  register: file_info

- name: Display file metadata
  ansible.builtin.debug:
    msg: |
      Path: {{ file_info.stat.path }}
      Exists: {{ file_info.stat.exists }}
      Size: {{ file_info.stat.size }} bytes
      UID: {{ file_info.stat.uid }}
      GID: {{ file_info.stat.gid }}
      Owner: {{ file_info.stat.pw_name }}
      Group: {{ file_info.stat.gr_name }}
      Mode: {{ file_info.stat.mode }}
      Is Regular File: {{ file_info.stat.isreg }}
      Is Directory: {{ file_info.stat.isdir }}
      Is Symlink: {{ file_info.stat.islnk }}
      Modified: {{ file_info.stat.mtime }}
      Accessed: {{ file_info.stat.atime }}
  when: file_info.stat.exists
```

## Checking File Type

Use `stat` to determine what kind of filesystem object you are dealing with:

```yaml
# Check if the path is a directory, file, or symlink
- name: Check the path type
  ansible.builtin.stat:
    path: /opt/myapp/current
  register: path_info

- name: Handle based on type
  ansible.builtin.debug:
    msg: >
      {% if path_info.stat.islnk %}
      It is a symlink pointing to {{ path_info.stat.lnk_target }}
      {% elif path_info.stat.isdir %}
      It is a directory
      {% elif path_info.stat.isreg %}
      It is a regular file
      {% else %}
      It is something else
      {% endif %}
  when: path_info.stat.exists
```

## Verifying File Checksums

The `stat` module can compute checksums to verify file integrity:

```yaml
# Get the SHA256 checksum of a file
- name: Get checksum of deployed binary
  ansible.builtin.stat:
    path: /usr/local/bin/myapp
    checksum_algorithm: sha256
  register: binary_stat

- name: Verify binary matches expected checksum
  ansible.builtin.assert:
    that:
      - binary_stat.stat.checksum == expected_checksum
    fail_msg: "Binary checksum mismatch! Expected {{ expected_checksum }}, got {{ binary_stat.stat.checksum }}"
    success_msg: "Binary checksum verified"
  vars:
    expected_checksum: "a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"
```

Supported checksum algorithms include `md5`, `sha1`, `sha224`, `sha256`, `sha384`, and `sha512`:

```yaml
# Compare checksums between two files
- name: Get checksum of source file
  ansible.builtin.stat:
    path: /opt/staging/myapp
    checksum_algorithm: sha256
  register: source_stat

- name: Get checksum of installed file
  ansible.builtin.stat:
    path: /usr/local/bin/myapp
    checksum_algorithm: sha256
  register: installed_stat

- name: Update binary if checksums differ
  ansible.builtin.copy:
    src: /opt/staging/myapp
    dest: /usr/local/bin/myapp
    remote_src: true
    owner: root
    group: root
    mode: "0755"
  when: >
    source_stat.stat.exists and
    installed_stat.stat.exists and
    source_stat.stat.checksum != installed_stat.stat.checksum
```

## Checking Permissions

Verify that file permissions are what they should be:

```yaml
# Verify permissions on sensitive files
- name: Check SSH private key permissions
  ansible.builtin.stat:
    path: /home/deploy/.ssh/id_ed25519
  register: ssh_key

- name: Assert SSH key has correct permissions
  ansible.builtin.assert:
    that:
      - ssh_key.stat.exists
      - ssh_key.stat.mode == "0600"
      - ssh_key.stat.pw_name == "deploy"
    fail_msg: "SSH key has incorrect permissions: mode={{ ssh_key.stat.mode }}, owner={{ ssh_key.stat.pw_name }}"
```

## Checking File Age

You can calculate how old a file is by comparing its modification time to the current time:

```yaml
# Check if a file was modified recently
- name: Get modification time of PID file
  ansible.builtin.stat:
    path: /var/run/myapp.pid
  register: pid_file

- name: Calculate file age in seconds
  ansible.builtin.set_fact:
    pid_age_seconds: "{{ ansible_date_time.epoch | int - pid_file.stat.mtime | int }}"
  when: pid_file.stat.exists

- name: Warn if PID file is stale (older than 1 hour)
  ansible.builtin.debug:
    msg: "WARNING: PID file is {{ (pid_age_seconds | int / 3600) | round(1) }} hours old - application may be down"
  when:
    - pid_file.stat.exists
    - pid_age_seconds | int > 3600
```

## Checking Symlink Targets

For symbolic links, `stat` provides the link target:

```yaml
# Check where a symlink points
- name: Check current deployment symlink
  ansible.builtin.stat:
    path: /opt/myapp/current
  register: current_link

- name: Display current deployment
  ansible.builtin.debug:
    msg: "Current deployment: {{ current_link.stat.lnk_target }}"
  when: current_link.stat.islnk

- name: Verify symlink points to expected release
  ansible.builtin.assert:
    that:
      - current_link.stat.islnk
      - current_link.stat.lnk_target == expected_release_path
    fail_msg: "Symlink points to {{ current_link.stat.lnk_target }}, expected {{ expected_release_path }}"
```

## Using stat for Conditional Deployment

A common pattern is to skip deployment if the target is already up to date:

```yaml
# Skip deployment if binary version is current
- name: Check if binary exists
  ansible.builtin.stat:
    path: /usr/local/bin/myapp
    checksum_algorithm: sha256
  register: current_binary

- name: Get checksum of new binary
  ansible.builtin.stat:
    path: /opt/releases/myapp-v2.0
    checksum_algorithm: sha256
  register: new_binary

- name: Deploy new binary only if different
  ansible.builtin.copy:
    src: /opt/releases/myapp-v2.0
    dest: /usr/local/bin/myapp
    remote_src: true
    owner: root
    group: root
    mode: "0755"
  when: >
    not current_binary.stat.exists or
    current_binary.stat.checksum != new_binary.stat.checksum
  notify: Restart myapp
```

## Security Audit with stat

Use `stat` to audit file permissions across your infrastructure:

```yaml
# security-audit.yml - check permissions on critical files
---
- name: Security audit of file permissions
  hosts: all
  become: true

  tasks:
    - name: Check critical file permissions
      ansible.builtin.stat:
        path: "{{ item.path }}"
      register: audit_results
      loop:
        - { path: "/etc/shadow", expected_mode: "0640", expected_owner: "root" }
        - { path: "/etc/passwd", expected_mode: "0644", expected_owner: "root" }
        - { path: "/etc/ssh/sshd_config", expected_mode: "0600", expected_owner: "root" }
        - { path: "/etc/sudoers", expected_mode: "0440", expected_owner: "root" }
      loop_control:
        label: "{{ item.path }}"

    - name: Report permission violations
      ansible.builtin.debug:
        msg: "VIOLATION: {{ item.item.path }} has mode {{ item.stat.mode }} (expected {{ item.item.expected_mode }})"
      loop: "{{ audit_results.results }}"
      loop_control:
        label: "{{ item.item.path }}"
      when:
        - item.stat.exists
        - item.stat.mode != item.item.expected_mode
```

## Performance: Disabling Checksum Calculation

By default, `stat` calculates the MD5 checksum of files, which can be slow for large files. If you do not need the checksum, disable it:

```yaml
# Skip checksum calculation for faster stat results
- name: Quick stat check (no checksum)
  ansible.builtin.stat:
    path: /var/lib/mysql/ibdata1
    get_checksum: false
  register: ibdata_stat
```

You can also disable MIME type detection and file attributes if they are not needed:

```yaml
# Minimal stat for just existence and basic info
- name: Minimal stat check
  ansible.builtin.stat:
    path: /var/backups/large_dump.sql
    get_checksum: false
    get_mime: false
    get_attributes: false
  register: dump_stat
```

## Summary

The Ansible `stat` module is your go-to tool for querying file metadata on remote hosts. Use it to check file existence before conditionally running tasks, verify checksums to ensure file integrity, audit permissions on sensitive system files, inspect symlink targets, and calculate file ages for staleness detection. The module returns comprehensive information in a single call, and you can optimize performance by disabling checksum and MIME type calculation when you do not need them. Combining `stat` with `assert` gives you a powerful way to enforce file system policies across your infrastructure.
