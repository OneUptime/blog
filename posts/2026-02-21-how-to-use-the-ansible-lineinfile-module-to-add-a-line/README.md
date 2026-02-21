# How to Use the Ansible lineinfile Module to Add a Line

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration Management, File Editing, Linux

Description: Learn how to use the Ansible lineinfile module to add lines to configuration files on remote hosts with proper placement and idempotent behavior.

---

The Ansible `lineinfile` module is designed for making targeted single-line changes to files on remote hosts. Adding a line to a configuration file, a hosts entry, or an environment variable is something you do constantly in server management. While you could use `template` to manage the entire file, sometimes you just need to add or ensure one line is present without touching the rest of the file.

This post focuses specifically on adding lines with `lineinfile`, covering placement control, idempotency, and patterns that work well in production.

## Adding a Line to the End of a File

The simplest use case is appending a line to the end of a file:

```yaml
# Add a line to the end of a file
- name: Add monitoring server to hosts file
  ansible.builtin.lineinfile:
    path: /etc/hosts
    line: "10.0.1.50 monitoring.internal"
```

If the exact line already exists in the file, Ansible does nothing and reports "ok". If it does not exist, Ansible appends it and reports "changed". This idempotent behavior is what makes `lineinfile` safe to run repeatedly.

## Adding a Line at the Beginning of a File

Use `insertbefore: BOF` to add a line at the beginning of the file:

```yaml
# Add a comment header at the beginning of a file
- name: Add managed-by-ansible notice
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    line: "# This file is managed by Ansible. Do not edit manually."
    insertbefore: BOF
```

`BOF` stands for Beginning Of File. The line will be placed as the first line of the file.

## Adding a Line After a Specific Pattern

Use `insertafter` with a regex pattern to place the line after a matching line:

```yaml
# Add a setting after the [database] section header
- name: Add connection pool setting after database section
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    insertafter: "^\\[database\\]"
    line: "pool_size=20"
```

Ansible finds the last line matching the regex `^\[database\]` and inserts the new line after it. If the regex does not match anything, the line is added at the end of the file (default behavior).

## Adding a Line Before a Specific Pattern

Use `insertbefore` with a regex to place the line before a matching line:

```yaml
# Add a comment before the SSL section
- name: Add note before SSL configuration
  ansible.builtin.lineinfile:
    path: /etc/nginx/nginx.conf
    insertbefore: "^\\s*ssl_certificate"
    line: "    # SSL certificates managed by Ansible"
```

## Adding Lines to /etc/hosts

Managing `/etc/hosts` is one of the most common uses of `lineinfile`:

```yaml
# Add multiple host entries
- name: Add internal hosts
  ansible.builtin.lineinfile:
    path: /etc/hosts
    line: "{{ item }}"
  loop:
    - "10.0.1.10 db-primary.internal db-primary"
    - "10.0.1.11 db-replica.internal db-replica"
    - "10.0.1.20 cache-01.internal cache-01"
    - "10.0.1.30 queue-01.internal queue-01"
```

## Adding Environment Variables

Add or update environment variables in shell configuration files:

```yaml
# Add environment variables to the system profile
- name: Add Java home to system profile
  ansible.builtin.lineinfile:
    path: /etc/profile.d/java.sh
    line: "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
    create: true
    owner: root
    group: root
    mode: "0644"
```

The `create: true` parameter tells Ansible to create the file if it does not exist. Without it, Ansible will fail if the file is missing.

## Adding Lines to Specific Sections

For INI-style configuration files with sections, use `insertafter` to target the right section:

```yaml
# Add settings to the correct section in an INI file
- name: Add log level to logging section
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.ini
    insertafter: "^\\[logging\\]"
    line: "level = info"

- name: Add max retries to network section
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.ini
    insertafter: "^\\[network\\]"
    line: "max_retries = 3"
```

## Using create to Handle Missing Files

When adding a line to a file that might not exist yet, use `create`:

```yaml
# Create the file if it does not exist, then add the line
- name: Ensure kernel parameter is set
  ansible.builtin.lineinfile:
    path: /etc/sysctl.d/99-custom.conf
    line: "vm.swappiness=10"
    create: true
    owner: root
    group: root
    mode: "0644"
  notify: Reload sysctl
```

## Adding Lines with Proper Indentation

When adding lines to files that use indentation (like YAML, Nginx configs, or Apache configs), include the indentation in the `line` parameter:

```yaml
# Add a line with proper indentation in an Nginx config
- name: Add proxy header to Nginx location block
  ansible.builtin.lineinfile:
    path: /etc/nginx/sites-available/myapp
    insertafter: "location / \\{"
    line: "        proxy_set_header X-Real-IP $remote_addr;"
```

## Adding Multiple Related Lines

If you need to add several related lines, consider whether `lineinfile` is the right choice or if `blockinfile` would be better. For independent lines that should each be managed individually, use a loop:

```yaml
# Add multiple sysctl parameters
- name: Set kernel parameters
  ansible.builtin.lineinfile:
    path: /etc/sysctl.d/99-performance.conf
    line: "{{ item }}"
    create: true
    owner: root
    group: root
    mode: "0644"
  loop:
    - "net.core.somaxconn=65535"
    - "net.ipv4.tcp_max_syn_backlog=65535"
    - "net.core.netdev_max_backlog=65535"
    - "net.ipv4.tcp_tw_reuse=1"
    - "vm.swappiness=10"
  notify: Reload sysctl
```

For a group of lines that should be added as a block, use `blockinfile` instead (covered in a separate post).

## The Line Must Be Exact

The `lineinfile` module checks for an exact match of the entire `line` parameter. Extra spaces, different quoting, or different capitalization will cause Ansible to add a duplicate:

```yaml
# These are treated as different lines by Ansible
# "MAX_CONNECTIONS=100"    (no space)
# "MAX_CONNECTIONS = 100"  (with spaces)
# "max_connections=100"    (lowercase)

# Always match exactly what you want the line to look like
- name: Set max connections
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    line: "MAX_CONNECTIONS=100"
```

## Using regexp to Prevent Duplicates

When a setting might already exist with a different value, use `regexp` to find and replace it, or add it if it does not exist:

```yaml
# Add or update a setting (prevents duplicate keys with different values)
- name: Ensure max connections is set to 100
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^MAX_CONNECTIONS="
    line: "MAX_CONNECTIONS=100"
```

This finds any line starting with `MAX_CONNECTIONS=` and replaces it with `MAX_CONNECTIONS=100`. If no matching line exists, the new line is appended. This pattern is covered in more detail in the lineinfile with regex post.

## Complete Example: Server Initial Setup

Here is a practical playbook that uses `lineinfile` to configure a new server:

```yaml
# initial-setup.yml - basic server configuration with lineinfile
---
- name: Initial server configuration
  hosts: new_servers
  become: true

  tasks:
    - name: Set hostname in /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        line: "127.0.1.1 {{ inventory_hostname }}"
        insertafter: "^127.0.0.1"

    - name: Add internal DNS servers
      ansible.builtin.lineinfile:
        path: /etc/hosts
        line: "{{ item }}"
      loop:
        - "10.0.0.2 dns1.internal"
        - "10.0.0.3 dns2.internal"

    - name: Configure kernel parameters for production
      ansible.builtin.lineinfile:
        path: /etc/sysctl.d/99-production.conf
        line: "{{ item }}"
        create: true
        mode: "0644"
      loop:
        - "net.core.somaxconn=65535"
        - "fs.file-max=2097152"
        - "vm.swappiness=10"
      notify: Apply sysctl

    - name: Add banner to SSH config
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "^#?Banner"
        line: "Banner /etc/ssh/banner"
      notify: Restart SSHD

    - name: Set timezone environment variable
      ansible.builtin.lineinfile:
        path: /etc/environment
        line: "TZ=UTC"

  handlers:
    - name: Apply sysctl
      ansible.builtin.command:
        cmd: sysctl --system
      changed_when: true

    - name: Restart SSHD
      ansible.builtin.systemd:
        name: sshd
        state: restarted
```

## Summary

The Ansible `lineinfile` module is the right tool for ensuring a single line exists in a file. Use `insertafter` and `insertbefore` with regex patterns to control placement, `create: true` to handle files that might not exist, and `regexp` to prevent duplicate entries when a key already exists with a different value. For adding multiple related lines as a block, switch to `blockinfile`. For managing entire file contents, use `template`. The key strength of `lineinfile` is its precision: it touches only the line you specify and leaves everything else untouched.
