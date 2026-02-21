# How to Use the Ansible replace Module with Regex

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration Management, Regex, Linux

Description: Learn how to use the Ansible replace module with regular expressions to find and modify text patterns across files on managed hosts.

---

If you have ever needed to update a specific pattern inside a configuration file across dozens of servers, you know how tedious that gets with manual edits. The Ansible `replace` module solves this by letting you use Python-style regular expressions to find and swap text in files. Unlike the `lineinfile` module which works on whole lines, `replace` works on arbitrary text patterns within lines or across multiple lines.

In this guide, we will walk through practical examples of using `replace` with regex to handle real configuration management scenarios.

## Understanding the replace Module Basics

The `replace` module searches a file for all occurrences of a regex pattern and replaces them with a specified string. It operates in place, modifying the file directly on the remote host. The key parameters are:

- **path**: The file to modify
- **regexp**: The Python regex pattern to search for
- **replace**: The string to substitute in place of each match
- **backup**: Whether to create a backup before modifying

Here is a simple example that changes a port number in a config file.

```yaml
# Change the listen port from 8080 to 9090 in an nginx config
- name: Update nginx listen port
  ansible.builtin.replace:
    path: /etc/nginx/sites-available/default
    regexp: 'listen\s+8080'
    replace: 'listen 9090'
    backup: yes
```

## Working with Capture Groups

One of the most powerful features is using regex capture groups. You can capture parts of the matched text and reuse them in the replacement string.

```yaml
# Update version numbers in a properties file while keeping the artifact name
# Turns "app-server-1.2.3" into "app-server-2.0.0"
- name: Update application version in properties file
  ansible.builtin.replace:
    path: /opt/app/config.properties
    regexp: '(app-server-)\d+\.\d+\.\d+'
    replace: '\g<1>2.0.0'
```

The `\g<1>` syntax references the first capture group, which is the text inside the parentheses. This preserves "app-server-" while replacing only the version part.

Here is another example that works with multiple capture groups.

```yaml
# Swap the order of key=value pairs to value=key format in a custom config
- name: Reverse key-value pairs in legacy config
  ansible.builtin.replace:
    path: /opt/legacy/mapping.conf
    regexp: '^(\w+)=(\w+)$'
    replace: '\g<2>=\g<1>'
```

## Multiline Pattern Matching

By default, `^` and `$` match the start and end of each line. But sometimes you need to match patterns that span multiple lines. You can use the `(?s)` flag (DOTALL) or `(?m)` flag (MULTILINE) to control this behavior.

```yaml
# Remove a multiline comment block from a configuration file
# This matches everything between /* and */ including newlines
- name: Remove block comments from config
  ansible.builtin.replace:
    path: /etc/myapp/settings.conf
    regexp: '/\*.*?\*/'
    replace: ''
  vars:
    ansible_python_interpreter: /usr/bin/python3
```

For matching across lines, you may need the DOTALL flag.

```yaml
# Remove an entire server block from nginx config
- name: Remove the old backend server block
  ansible.builtin.replace:
    path: /etc/nginx/nginx.conf
    regexp: '(?s)# BEGIN OLD BACKEND.*?# END OLD BACKEND\n'
    replace: ''
    backup: yes
```

## Practical Examples for Configuration Management

Let us look at several real scenarios you will run into when managing servers.

### Commenting Out Lines

```yaml
# Comment out all lines that start with "PermitRootLogin" in sshd_config
- name: Comment out PermitRootLogin directives
  ansible.builtin.replace:
    path: /etc/ssh/sshd_config
    regexp: '^(PermitRootLogin\s+.*)$'
    replace: '# \g<1>'
    backup: yes
  notify: Restart sshd
```

### Uncommenting Lines

```yaml
# Uncomment lines that were previously commented out
- name: Uncomment MaxSessions directive
  ansible.builtin.replace:
    path: /etc/ssh/sshd_config
    regexp: '^#\s*(MaxSessions\s+.*)$'
    replace: '\g<1>'
  notify: Restart sshd
```

### Updating IP Addresses

```yaml
# Replace old IP addresses with new ones in a config file
# Matches the full dotted-quad format
- name: Update database server IP
  ansible.builtin.replace:
    path: /opt/app/database.yml
    regexp: 'host:\s*192\.168\.1\.100'
    replace: 'host: 10.0.5.20'
```

Note the escaped dots in the regex. In regular expressions, an unescaped dot matches any character, so `192.168.1.100` would also match `192x168y1z100`. Always escape literal dots.

### Replacing Tokens in Template-like Files

```yaml
# Replace placeholder tokens with actual values
# Useful for files that use %%TOKEN%% style placeholders
- name: Replace database connection tokens
  ansible.builtin.replace:
    path: /opt/app/config.ini
    regexp: '%%DB_HOST%%'
    replace: "{{ db_host }}"

- name: Replace database port token
  ansible.builtin.replace:
    path: /opt/app/config.ini
    regexp: '%%DB_PORT%%'
    replace: "{{ db_port }}"
```

## Using replace with Loops

When you need to make multiple replacements in the same file, a loop keeps your playbook clean.

```yaml
# Apply multiple regex replacements to a single config file
- name: Apply configuration updates to app settings
  ansible.builtin.replace:
    path: /opt/app/settings.conf
    regexp: "{{ item.pattern }}"
    replace: "{{ item.value }}"
    backup: yes
  loop:
    - { pattern: '^max_connections\s*=\s*\d+', value: 'max_connections = 500' }
    - { pattern: '^timeout\s*=\s*\d+', value: 'timeout = 30' }
    - { pattern: '^log_level\s*=\s*\w+', value: 'log_level = warning' }
    - { pattern: '^worker_threads\s*=\s*\d+', value: 'worker_threads = 8' }
```

## Controlling Match Scope with before and after

The `replace` module supports `before` and `after` parameters that limit the scope of the replacement to a specific section of the file.

```yaml
# Only replace within a specific section of the config file
# This changes the timeout only in the [database] section, not elsewhere
- name: Update timeout in database section only
  ansible.builtin.replace:
    path: /opt/app/multi-section.conf
    after: '\[database\]'
    before: '\[.*\]'
    regexp: 'timeout\s*=\s*\d+'
    replace: 'timeout = 60'
```

This is particularly useful for INI-style configuration files where the same key name appears in different sections.

## Error Handling and Validation

Always validate your regex patterns and handle potential issues.

```yaml
# Replace with validation using a block
- name: Safely update configuration with regex
  block:
    - name: Update the max memory setting
      ansible.builtin.replace:
        path: /etc/myapp/app.conf
        regexp: '^max_memory\s*=\s*\d+[mMgG]'
        replace: 'max_memory = 4G'
        backup: yes
      register: replace_result

    - name: Verify the change was applied
      ansible.builtin.command: grep 'max_memory = 4G' /etc/myapp/app.conf
      register: verify_result
      changed_when: false

    - name: Fail if verification failed
      ansible.builtin.fail:
        msg: "Configuration update was not applied correctly"
      when: verify_result.rc != 0

  rescue:
    - name: Restore backup if something went wrong
      ansible.builtin.copy:
        src: "{{ replace_result.backup_file }}"
        dest: /etc/myapp/app.conf
        remote_src: yes
      when: replace_result.backup_file is defined
```

## replace vs lineinfile

Choosing between `replace` and `lineinfile` depends on your use case:

| Feature | replace | lineinfile |
|---------|---------|------------|
| Scope | Any text pattern | Whole lines |
| Multiple matches | Replaces all matches | Only last match (by default) |
| Line insertion | No | Yes (can add lines) |
| Capture groups | Yes | No |
| Before/After scoping | Yes | Yes (insertafter/insertbefore) |

Use `replace` when you need to modify part of a line, handle multiple matches, or use capture groups. Use `lineinfile` when you need to ensure a whole line exists or insert new lines.

## Summary

The `replace` module with regex gives you surgical precision for modifying configuration files. Capture groups let you preserve parts of matched text, the `before` and `after` parameters scope your changes to specific file sections, and the `backup` option provides a safety net. Combined with loops and error handling blocks, you can build robust playbooks that manage even the most complex configuration file updates across your entire fleet.
