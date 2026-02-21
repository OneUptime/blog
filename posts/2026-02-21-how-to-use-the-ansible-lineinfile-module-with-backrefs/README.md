# How to Use the Ansible lineinfile Module with backrefs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration Management, Regex, File Editing

Description: Learn how to use the Ansible lineinfile backrefs parameter to capture parts of existing lines and reuse them in replacements for precise config edits.

---

The `backrefs` parameter in Ansible's `lineinfile` module unlocks a feature that most people overlook: the ability to capture parts of an existing line using regex groups and reference them in the replacement. This means you can modify part of a line while keeping the rest intact, without knowing the full contents of the line in advance.

If you have ever needed to change just the value in a configuration line while preserving the key and any comments, or update a version number embedded in a longer string, backrefs is the tool for that job.

## How backrefs Works

When `backrefs: true` is set, the `line` parameter can reference regex capture groups from the `regexp` pattern using `\1`, `\2`, etc. (standard Python regex backreference syntax):

```yaml
# Change only the value of MAX_CONNECTIONS while keeping the key name
- name: Update max connections value
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^(MAX_CONNECTIONS=).*"
    line: "\\1500"
    backrefs: true
```

If the file contains `MAX_CONNECTIONS=200`, it becomes `MAX_CONNECTIONS=500`. The `\\1` refers to the first capture group `(MAX_CONNECTIONS=)`, so the key name is preserved exactly as it was, and only the value after it changes.

## Important: backrefs Changes the Default Behavior

There is a critical difference between using `backrefs: true` and the default behavior. Without `backrefs`, if the regex does not match anything in the file, Ansible appends the `line` to the end of the file. With `backrefs: true`, if the regex does not match, **Ansible does nothing**. The line is not added.

This makes sense because backreference values like `\1` would be meaningless if there was no match to capture from. But it changes the "find or add" behavior to "find and modify only":

```yaml
# WITHOUT backrefs - if no match, the line is ADDED to the file
- name: Set max connections (adds if missing)
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^MAX_CONNECTIONS="
    line: "MAX_CONNECTIONS=500"

# WITH backrefs - if no match, NOTHING happens
- name: Update max connections (only if present)
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^(MAX_CONNECTIONS=).*"
    line: "\\1500"
    backrefs: true
```

## Practical Use Cases

### Updating a Value While Preserving Formatting

Configuration files often have varied spacing or formatting. Backrefs let you update a value without changing the format:

```yaml
# If the file has "  server_name  myapp.old.com;"
# Change only the domain, keep the indentation and semicolon
- name: Update Nginx server_name
  ansible.builtin.lineinfile:
    path: /etc/nginx/sites-available/myapp
    regexp: "^(\\s*server_name\\s+)\\S+;$"
    line: "\\1myapp.new.com;"
    backrefs: true
```

The regex captures the leading whitespace and the `server_name` directive with its trailing spaces as group 1. The domain and semicolon after it are replaced, but the original indentation is preserved.

### Modifying a Version Number

```yaml
# Update a version number in a configuration line
# Before: app_version = "2.3.1"
# After:  app_version = "2.4.0"
- name: Update application version in config
  ansible.builtin.lineinfile:
    path: /etc/myapp/version.conf
    regexp: '^(app_version\s*=\s*")[\d.]+(")'
    line: '\g<1>2.4.0\2'
    backrefs: true
```

The `\g<1>` is an alternative syntax for `\1` that avoids ambiguity when followed by digits. `\2` references the closing quote.

### Preserving Inline Comments

Some configuration files have inline comments that you want to keep:

```yaml
# Before: timeout = 30  # seconds, increase for slow networks
# After:  timeout = 60  # seconds, increase for slow networks
- name: Update timeout while keeping comment
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^(timeout\\s*=\\s*)\\d+(\\s*#.*)$"
    line: "\\g<1>60\\2"
    backrefs: true
```

Group 1 captures `timeout = ` (with its spacing), and group 2 captures `  # seconds, increase for slow networks`. Only the number in between is replaced.

### Updating Port Numbers

```yaml
# Update a port number in a listen directive
# Before: listen 8080;
# After:  listen 8443;
- name: Update listen port
  ansible.builtin.lineinfile:
    path: /etc/nginx/sites-available/myapp
    regexp: "^(\\s*listen\\s+)\\d+(;)$"
    line: "\\g<1>8443\\2"
    backrefs: true
```

### Updating IP Addresses

```yaml
# Change an IP address in a configuration line
# Before: bind_address = 10.0.1.10
# After:  bind_address = 10.0.2.20
- name: Update bind address
  ansible.builtin.lineinfile:
    path: /etc/myapp/network.conf
    regexp: "^(bind_address\\s*=\\s*)\\S+"
    line: "\\g<1>10.0.2.20"
    backrefs: true
```

## Working with Multiple Capture Groups

You can use multiple capture groups to modify specific parts of a line:

```yaml
# Before: server db-host 10.0.1.10 port 5432
# After:  server db-host 10.0.2.20 port 5432
# Change only the IP, keep everything else
- name: Update database server IP
  ansible.builtin.lineinfile:
    path: /etc/myapp/cluster.conf
    regexp: "^(server db-host\\s+)\\S+(\\s+port\\s+\\d+)"
    line: "\\g<1>10.0.2.20\\2"
    backrefs: true
```

## Handling Optional Parts with backrefs

Regex alternation and optional groups work with backrefs too:

```yaml
# Handle lines that may or may not have a trailing comment
# Match "maxconn 100" or "maxconn 100 # some comment"
- name: Update maxconn regardless of trailing comment
  ansible.builtin.lineinfile:
    path: /etc/haproxy/haproxy.cfg
    regexp: "^(\\s*maxconn\\s+)\\d+(\\s*(?:#.*)?)$"
    line: "\\g<1>5000\\2"
    backrefs: true
```

The `(?:#.*)?` is a non-capturing group that optionally matches a comment. The outer group `(\\s*(?:#.*)?)` captures any trailing whitespace and comment for preservation.

## Backrefs in a Loop

Apply backrefs-based updates to multiple settings:

```yaml
# Update multiple configuration values using backrefs
- name: Update application settings
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^({{ item.key }}\\s*=\\s*).*"
    line: "\\g<1>{{ item.value }}"
    backrefs: true
  loop:
    - { key: "max_connections", value: "500" }
    - { key: "timeout", value: "60" }
    - { key: "log_level", value: "warn" }
    - { key: "bind_address", value: "0.0.0.0" }
  loop_control:
    label: "{{ item.key }}"
```

## Common Mistakes

### Forgetting to Escape Backslashes

In YAML, backslashes need to be doubled. `\1` in YAML becomes the literal string `\1` which is what Python regex expects. But if you use double quotes in YAML, you need to be extra careful:

```yaml
# CORRECT - double backslash in double-quoted YAML
- name: Example with double quotes
  ansible.builtin.lineinfile:
    path: /tmp/test.conf
    regexp: "^(KEY=).*"
    line: "\\1new_value"
    backrefs: true

# ALSO CORRECT - single quotes do not interpret backslashes
- name: Example with single quotes
  ansible.builtin.lineinfile:
    path: /tmp/test.conf
    regexp: '^(KEY=).*'
    line: '\1new_value'
    backrefs: true
```

### Expecting Line Addition with backrefs

Remember that `backrefs: true` will never add a line. If you need "update if exists, add if missing" behavior with a specific format, you need two tasks:

```yaml
# Two-step pattern: update if exists, add if missing
- name: Try to update existing line with backrefs
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^(\\s*max_connections\\s*=\\s*).*"
    line: "\\g<1>500"
    backrefs: true
  register: update_result

# If the line did not exist (backrefs made no change), add it
- name: Add line if it did not exist
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    line: "max_connections = 500"
    insertafter: "^\\[server\\]"
  when: not update_result.changed
```

## Complete Example: Migration of Configuration Format

Here is a real-world scenario where you need to migrate a config file from one format to another:

```yaml
# migrate-config.yml - update config format using backrefs
---
- name: Migrate configuration format
  hosts: app_servers
  become: true

  tasks:
    # Migrate from old format to new format
    # Old: db.host = localhost
    # New: database_host = localhost
    - name: Rename db.host to database_host
      ansible.builtin.lineinfile:
        path: /etc/myapp/app.conf
        regexp: "^db\\.host(\\s*=\\s*.*)$"
        line: "database_host\\1"
        backrefs: true
        backup: true

    # Old: db.port = 5432
    # New: database_port = 5432
    - name: Rename db.port to database_port
      ansible.builtin.lineinfile:
        path: /etc/myapp/app.conf
        regexp: "^db\\.port(\\s*=\\s*.*)$"
        line: "database_port\\1"
        backrefs: true

    # Old: db.name = myapp_production
    # New: database_name = myapp_production
    - name: Rename db.name to database_name
      ansible.builtin.lineinfile:
        path: /etc/myapp/app.conf
        regexp: "^db\\.name(\\s*=\\s*.*)$"
        line: "database_name\\1"
        backrefs: true

    # Validate the result
    - name: Verify no old-format keys remain
      ansible.builtin.shell:
        cmd: grep -c "^db\\." /etc/myapp/app.conf || true
      register: old_format_count
      changed_when: false

    - name: Report migration status
      ansible.builtin.debug:
        msg: "{{ 'Migration complete' if old_format_count.stdout | int == 0 else 'WARNING: ' + old_format_count.stdout + ' old-format entries remain' }}"
```

## Summary

The `backrefs` parameter in `lineinfile` enables surgical edits to configuration lines. You capture parts of the existing line with regex groups and reference them in the replacement using `\1`, `\2`, or `\g<1>` syntax. This preserves formatting, comments, and structure while changing only the targeted value. The critical thing to remember is that `backrefs: true` disables the default "add if not found" behavior, so lines will never be added, only modified. When you need both behaviors, use a two-task pattern: first try backrefs, then fall back to regular `lineinfile` if no match was found.
