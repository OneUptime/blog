# How to Use the Ansible lineinfile Module with Regex

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration Management, Regex, File Editing

Description: Master using regular expressions with the Ansible lineinfile module to find and replace configuration lines on remote hosts with precise pattern matching.

---

The `regexp` parameter in Ansible's `lineinfile` module is where this module really shines. Without regex, `lineinfile` can only check for exact line matches. With regex, it can find a line by pattern and replace it with a new value, or confirm that a setting exists regardless of its current value. This is the primary way to manage key-value configuration files with Ansible without using a full template.

This post goes into the mechanics of how `regexp` works with `lineinfile`, including the gotchas that catch people off guard.

## How regexp Works in lineinfile

When you provide both `regexp` and `line`, Ansible does the following:

1. Scans the file for lines matching the regex pattern
2. If a match is found, replaces the last matching line with the value of `line`
3. If no match is found, appends the `line` to the end of the file (or at the position specified by `insertafter`/`insertbefore`)

This "find or add" behavior is what makes it ideal for managing configuration settings:

```yaml
# If a line starting with "MAX_CONN=" exists, replace it.
# If it does not exist, add it at the end.
- name: Set max connections
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^MAX_CONN="
    line: "MAX_CONN=200"
```

## Common Regex Patterns for Configuration Files

Here are patterns you will use over and over:

### Key-Value Settings

```yaml
# Match a setting regardless of its current value
- name: Set listen port
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^LISTEN_PORT="
    line: "LISTEN_PORT=8080"

# Handle settings with spaces around the equals sign
- name: Set log level in properties file
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.properties
    regexp: "^log\\.level\\s*="
    line: "log.level = INFO"

# Handle settings with colons (YAML-style configs)
- name: Set bind address
  ansible.builtin.lineinfile:
    path: /etc/myapp/config.yml
    regexp: "^bind_address:"
    line: "bind_address: 0.0.0.0"
```

### Commented and Uncommented Lines

A very common pattern is to match a setting whether it is commented out or not:

```yaml
# Match the setting whether it is commented out or active
- name: Enable password authentication in SSH
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "^#?PasswordAuthentication"
    line: "PasswordAuthentication no"
  notify: Restart SSHD
```

The `#?` means "zero or one hash character", so this matches both `PasswordAuthentication yes` and `#PasswordAuthentication yes`. Either way, it gets replaced with `PasswordAuthentication no`.

```yaml
# Handle lines with optional comment and optional whitespace
- name: Set MaxSessions in SSH config
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "^#?\\s*MaxSessions"
    line: "MaxSessions 10"
  notify: Restart SSHD
```

### Apache and Nginx Configuration

```yaml
# Set ServerName in Apache config
- name: Set Apache ServerName
  ansible.builtin.lineinfile:
    path: /etc/apache2/sites-available/myapp.conf
    regexp: "^\\s*ServerName"
    line: "    ServerName myapp.example.com"

# Set worker_connections in Nginx
- name: Set Nginx worker connections
  ansible.builtin.lineinfile:
    path: /etc/nginx/nginx.conf
    regexp: "^\\s*worker_connections"
    line: "    worker_connections 4096;"
```

### Kernel Parameters in sysctl

```yaml
# Set kernel parameters (handle both existing and commented-out entries)
- name: Configure sysctl parameters
  ansible.builtin.lineinfile:
    path: /etc/sysctl.conf
    regexp: "^#?{{ item.key }}\\s*="
    line: "{{ item.key }} = {{ item.value }}"
  loop:
    - { key: "net.core.somaxconn", value: "65535" }
    - { key: "net.ipv4.tcp_max_syn_backlog", value: "65535" }
    - { key: "vm.swappiness", value: "10" }
    - { key: "fs.file-max", value: "2097152" }
  notify: Reload sysctl
```

## The "Last Match" Behavior

A critical detail: when multiple lines match the regex, `lineinfile` only replaces the **last** match. This can be surprising:

```yaml
# If the file contains:
# PORT=8080
# PORT=9090
#
# This only replaces the last occurrence (PORT=9090):
- name: Set port
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^PORT="
    line: "PORT=3000"

# Result:
# PORT=8080     <-- This stays!
# PORT=3000     <-- Only this was replaced
```

If you need to replace all occurrences, use the `replace` module instead.

## Combining regexp with insertafter

When a line does not exist and you want it placed in a specific location, combine `regexp` with `insertafter`:

```yaml
# Place the setting in the correct section if it needs to be added
- name: Set database timeout in the database section
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.ini
    regexp: "^db_timeout\\s*="
    line: "db_timeout = 30"
    insertafter: "^\\[database\\]"
```

If a line matching `^db_timeout\s*=` exists anywhere in the file, it gets replaced in place. If it does not exist, the new line is inserted after the `[database]` section header.

## Escaping Special Regex Characters

When your search pattern contains regex special characters, you need to escape them:

```yaml
# Special characters that need escaping: . * + ? [ ] ( ) { } ^ $ | \

# Matching a line with literal dots (like IP addresses)
- name: Set DNS server
  ansible.builtin.lineinfile:
    path: /etc/resolv.conf
    regexp: "^nameserver\\s+10\\.0\\.0\\.2$"
    line: "nameserver 10.0.0.53"

# Matching a line with literal brackets
- name: Set section header
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.ini
    regexp: "^\\[old_section\\]"
    line: "[new_section]"
```

You can also use the `regex_escape` filter when building patterns from variables:

```yaml
# Safely escape variable values in regex patterns
- name: Replace old server in config
  ansible.builtin.lineinfile:
    path: /etc/myapp/cluster.conf
    regexp: "^server=.*{{ old_server | regex_escape }}"
    line: "server={{ new_server }}"
```

## Practical Examples

### Managing /etc/fstab

```yaml
# Ensure an fstab entry exists for a specific mount point
- name: Add or update NFS mount
  ansible.builtin.lineinfile:
    path: /etc/fstab
    regexp: "\\s+/mnt/shared\\s+"
    line: "nfs-server:/exports/shared /mnt/shared nfs defaults,_netdev 0 0"
```

### Managing sudoers

```yaml
# Add or update a sudoers rule
- name: Allow deploy user to restart services
  ansible.builtin.lineinfile:
    path: /etc/sudoers.d/deploy
    regexp: "^deploy\\s"
    line: "deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart myapp, /bin/systemctl reload nginx"
    create: true
    mode: "0440"
    validate: /usr/sbin/visudo -csf %s
```

### Managing MySQL Configuration

```yaml
# Set MySQL configuration options
- name: Configure MySQL settings
  ansible.builtin.lineinfile:
    path: /etc/mysql/mysql.conf.d/mysqld.cnf
    regexp: "^#?\\s*{{ item.key }}\\s*="
    line: "{{ item.key }} = {{ item.value }}"
    insertafter: "^\\[mysqld\\]"
  loop:
    - { key: "max_connections", value: "500" }
    - { key: "innodb_buffer_pool_size", value: "1G" }
    - { key: "slow_query_log", value: "1" }
    - { key: "long_query_time", value: "2" }
  notify: Restart MySQL
```

### Managing PostgreSQL Configuration

```yaml
# Set PostgreSQL configuration options
- name: Configure PostgreSQL settings
  ansible.builtin.lineinfile:
    path: /etc/postgresql/15/main/postgresql.conf
    regexp: "^#?\\s*{{ item.key }}\\s*="
    line: "{{ item.key }} = '{{ item.value }}'"
  loop:
    - { key: "listen_addresses", value: "*" }
    - { key: "max_connections", value: "200" }
    - { key: "shared_buffers", value: "256MB" }
    - { key: "work_mem", value: "16MB" }
  notify: Restart PostgreSQL
```

## Debugging Regex Issues

When your regex does not match what you expect, use the `ansible.builtin.shell` module to test:

```yaml
# Debug: check what the regex would match in the file
- name: Test regex against file
  ansible.builtin.shell:
    cmd: grep -E '^#?\s*MaxSessions' /etc/ssh/sshd_config || echo "NO MATCH"
  register: grep_result
  changed_when: false

- name: Show matches
  ansible.builtin.debug:
    var: grep_result.stdout_lines
```

## Complete Example: Hardening SSH Configuration

```yaml
# harden-ssh.yml - secure SSH configuration using regex-based lineinfile
---
- name: Harden SSH configuration
  hosts: all
  become: true

  tasks:
    - name: Apply SSH hardening settings
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
        backup: true
      loop:
        - { regexp: "^#?PermitRootLogin", line: "PermitRootLogin no" }
        - { regexp: "^#?PasswordAuthentication", line: "PasswordAuthentication no" }
        - { regexp: "^#?PermitEmptyPasswords", line: "PermitEmptyPasswords no" }
        - { regexp: "^#?X11Forwarding", line: "X11Forwarding no" }
        - { regexp: "^#?MaxAuthTries", line: "MaxAuthTries 3" }
        - { regexp: "^#?MaxSessions", line: "MaxSessions 5" }
        - { regexp: "^#?ClientAliveInterval", line: "ClientAliveInterval 300" }
        - { regexp: "^#?ClientAliveCountMax", line: "ClientAliveCountMax 2" }
        - { regexp: "^#?Protocol", line: "Protocol 2" }
      loop_control:
        label: "{{ item.line }}"
      notify: Restart SSHD

    - name: Validate SSH configuration
      ansible.builtin.command:
        cmd: sshd -t
      changed_when: false

  handlers:
    - name: Restart SSHD
      ansible.builtin.systemd:
        name: sshd
        state: restarted
```

## Summary

The `regexp` parameter turns `lineinfile` from a simple line adder into a powerful configuration management tool. The key patterns are: use `^KEY=` to match key-value settings, use `^#?` to match both commented and uncommented lines, combine `regexp` with `insertafter` for proper placement of new lines, escape special characters with `\\` or the `regex_escape` filter, and always validate critical files after modification. Remember that `lineinfile` only replaces the last match when using regexp, so if your file might have duplicate keys, verify that the behavior matches your expectations.
