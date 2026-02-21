# How to Use the Ansible replace Module for Text Substitution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration Management, Regex, File Editing

Description: Learn how to use the Ansible replace module to perform regex-based find-and-replace operations across all matching lines in files on remote hosts.

---

The Ansible `replace` module performs regex-based find-and-replace operations on file contents. Unlike `lineinfile`, which works on individual lines (and only replaces the last match), `replace` operates on all matches throughout the entire file. This makes it the right tool when you need to change every occurrence of a pattern, update all instances of an IP address, or perform bulk text substitutions across configuration files.

This post covers how `replace` works, when to use it instead of `lineinfile`, and practical patterns for common text substitution tasks.

## Basic Text Replacement

The simplest usage replaces a literal string everywhere it appears in a file:

```yaml
# Replace all occurrences of an old server name with a new one
- name: Update server name in config
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "old-server\\.example\\.com"
    replace: "new-server.example.com"
```

Every line containing `old-server.example.com` will have that text replaced with `new-server.example.com`. If the string appears three times in the file, all three occurrences are updated.

## replace vs lineinfile

The key differences:

- `lineinfile` replaces the last matching line entirely
- `replace` replaces every occurrence of the pattern, potentially multiple times per line and across all lines
- `lineinfile` can add lines; `replace` never adds content
- `lineinfile` works with whole lines; `replace` works with any part of a line

```yaml
# lineinfile: replaces the ENTIRE last matching line
- name: Set port using lineinfile
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^PORT="
    line: "PORT=8080"

# replace: replaces ONLY the matched text, everywhere it appears
- name: Change port number using replace
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "PORT=3000"
    replace: "PORT=8080"
```

## Regex Pattern Matching

The `regexp` parameter uses Python regular expression syntax:

```yaml
# Replace an IP address pattern throughout the file
- name: Update all references to old database IP
  ansible.builtin.replace:
    path: /etc/myapp/cluster.conf
    regexp: "10\\.0\\.1\\.10"
    replace: "10.0.2.20"
```

```yaml
# Replace version numbers matching a pattern
- name: Update version string
  ansible.builtin.replace:
    path: /opt/myapp/version.txt
    regexp: "version\\s*=\\s*\\d+\\.\\d+\\.\\d+"
    replace: "version = 3.2.1"
```

## Using Capture Groups

The `replace` parameter can reference capture groups from the regex pattern:

```yaml
# Swap the order of key-value pairs
# Before: value=key
# After:  key=value
- name: Fix reversed key-value format
  ansible.builtin.replace:
    path: /etc/myapp/broken.conf
    regexp: "^(\\w+)=(\\w+)$"
    replace: "\\2=\\1"
```

```yaml
# Add quotes around unquoted values
# Before: name=myapp
# After:  name="myapp"
- name: Add quotes around values
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "^(\\w+)=([^\"\\n]+)$"
    replace: '\\1="\\2"'
```

```yaml
# Update version but keep surrounding text
# Before: Running MyApp v2.3.1 (stable)
# After:  Running MyApp v3.0.0 (stable)
- name: Update embedded version number
  ansible.builtin.replace:
    path: /opt/myapp/banner.txt
    regexp: "(Running MyApp v)\\d+\\.\\d+\\.\\d+(.*)"
    replace: "\\g<1>3.0.0\\2"
```

## Multi-line Replacements

By default, `^` and `$` match the start and end of each line. You can use the `(?s)` flag for dot-matches-all, or `(?m)` for multi-line mode:

```yaml
# Remove a multi-line comment block
- name: Remove old commented section
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "# OLD SECTION START.*?# OLD SECTION END\\n"
    replace: ""
```

Note: Multi-line regex with `replace` can be tricky. For managing multi-line blocks, `blockinfile` is usually a better choice.

## Practical Examples

### Updating All IP Addresses After a Network Migration

```yaml
# Migrate from 10.0.1.x subnet to 10.0.2.x subnet
- name: Update subnet in all config files
  ansible.builtin.replace:
    path: "{{ item }}"
    regexp: "10\\.0\\.1\\."
    replace: "10.0.2."
  loop:
    - /etc/myapp/app.conf
    - /etc/myapp/cluster.conf
    - /etc/myapp/replication.conf
    - /etc/hosts
```

### Changing Domain Names

```yaml
# Update all references from old domain to new domain
- name: Migrate domain references
  ansible.builtin.replace:
    path: /etc/nginx/sites-available/myapp
    regexp: "oldcompany\\.com"
    replace: "newcompany.io"
```

### Commenting Out Lines

```yaml
# Comment out all lines containing a specific setting
- name: Comment out deprecated settings
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "^(deprecated_\\w+=.*)$"
    replace: "# \\1"
```

### Uncommenting Lines

```yaml
# Uncomment lines that start with a specific pattern
- name: Enable previously commented-out settings
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "^#\\s*(enable_\\w+=.*)$"
    replace: "\\1"
```

### Removing Blank Lines

```yaml
# Remove consecutive blank lines, leaving only single blank lines
- name: Clean up excessive blank lines
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "\\n{3,}"
    replace: "\n\n"
```

### Updating Database Connection Strings

```yaml
# Update database connection strings throughout a config
- name: Update database connection string
  ansible.builtin.replace:
    path: /etc/myapp/database.yml
    regexp: "postgresql://\\w+:\\w+@[\\w.]+:\\d+/\\w+"
    replace: "postgresql://{{ db_user }}:{{ db_password }}@{{ db_host }}:{{ db_port }}/{{ db_name }}"
  no_log: true
```

### Normalizing Configuration Formatting

```yaml
# Normalize spacing around equals signs
# Before: key=value, key =value, key= value, key = value
# After:  key = value (consistent spacing)
- name: Normalize spacing in config file
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "^(\\w+)\\s*=\\s*(\\S.*)$"
    replace: "\\1 = \\2"
```

### Removing Trailing Whitespace

```yaml
# Clean up trailing whitespace from all lines
- name: Remove trailing whitespace
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "\\s+$"
    replace: ""
```

## Backup Before Replacement

Always create a backup when making bulk replacements:

```yaml
# Replace with backup for safety
- name: Update all server references with backup
  ansible.builtin.replace:
    path: /etc/myapp/cluster.conf
    regexp: "server1\\.old\\.domain"
    replace: "server1.new.domain"
    backup: true
  register: replace_result

- name: Show backup location
  ansible.builtin.debug:
    msg: "Backup saved to {{ replace_result.backup }}"
  when: replace_result.backup is defined
```

## Validation After Replacement

For critical files, validate after making replacements:

```yaml
# Replace in Nginx config and validate
- name: Update proxy upstream
  ansible.builtin.replace:
    path: /etc/nginx/nginx.conf
    regexp: "proxy_pass http://old-backend"
    replace: "proxy_pass http://new-backend"
    backup: true
  register: nginx_update

- name: Validate Nginx configuration
  ansible.builtin.command:
    cmd: nginx -t
  register: nginx_test
  changed_when: false

- name: Rollback if validation fails
  ansible.builtin.copy:
    src: "{{ nginx_update.backup }}"
    dest: /etc/nginx/nginx.conf
    remote_src: true
  when:
    - nginx_test.rc != 0
    - nginx_update.backup is defined
```

## Working with Multiple Files

Apply the same replacement across many files:

```yaml
# Find all config files and apply a replacement
- name: Find all application config files
  ansible.builtin.find:
    paths: /etc/myapp
    patterns: "*.conf"
    recurse: true
  register: config_files

- name: Update old hostname in all config files
  ansible.builtin.replace:
    path: "{{ item.path }}"
    regexp: "legacy-host\\.internal"
    replace: "modern-host.internal"
    backup: true
  loop: "{{ config_files.files }}"
  loop_control:
    label: "{{ item.path }}"
```

## Complete Example: Server Migration

Here is a comprehensive playbook for updating all configuration references during a server migration:

```yaml
# migrate-references.yml - update all config references to new infrastructure
---
- name: Migrate configuration references
  hosts: all
  become: true
  vars:
    migrations:
      - { old: "db-primary\\.old\\.internal", new: "db-primary.new.internal" }
      - { old: "db-replica\\.old\\.internal", new: "db-replica.new.internal" }
      - { old: "redis\\.old\\.internal", new: "redis.new.internal" }
      - { old: "10\\.0\\.1\\.10", new: "10.0.2.10" }
      - { old: "10\\.0\\.1\\.11", new: "10.0.2.11" }

    config_files:
      - /etc/myapp/app.conf
      - /etc/myapp/database.conf
      - /etc/myapp/cache.conf
      - /etc/hosts

  tasks:
    - name: Apply all migrations to all config files
      ansible.builtin.replace:
        path: "{{ item.0 }}"
        regexp: "{{ item.1.old }}"
        replace: "{{ item.1.new }}"
        backup: true
      loop: "{{ config_files | product(migrations) | list }}"
      loop_control:
        label: "{{ item.0 }}: {{ item.1.old }} -> {{ item.1.new }}"
      register: migration_results

    - name: Count changes made
      ansible.builtin.set_fact:
        changes_made: "{{ migration_results.results | selectattr('changed', 'equalto', true) | list | length }}"

    - name: Report migration summary
      ansible.builtin.debug:
        msg: "Migration complete. {{ changes_made }} replacements made across {{ config_files | length }} files."
```

The `product` filter creates a cross product of files and migrations, so every migration is applied to every file.

## When Not to Use replace

Avoid `replace` when:
- You need to add new content (use `lineinfile` or `blockinfile`)
- You want to manage an entire file (use `template`)
- The replacement is complex with conditionals (use `template`)
- You are modifying structured data like JSON or YAML (use dedicated modules or `template`)

## Summary

The Ansible `replace` module is the right tool for bulk text substitutions across files. It replaces every occurrence of a pattern (not just the last match like `lineinfile`), supports regex capture groups for preserving parts of the matched text, and works well for migrations, normalizations, and cleanup tasks. Always create backups when making bulk changes, validate critical files after replacement, and prefer `template` for managing entire file contents or complex logic. The `replace` module fills a specific niche that sits between `lineinfile` and `template`, and using it appropriately keeps your playbooks clean and precise.
