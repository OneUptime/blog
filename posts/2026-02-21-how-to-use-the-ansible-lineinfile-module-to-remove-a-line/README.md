# How to Use the Ansible lineinfile Module to Remove a Line

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration Management, File Editing, Linux

Description: Learn how to use the Ansible lineinfile module with state absent to remove specific lines from configuration files on remote hosts safely.

---

Adding lines to files gets a lot of attention, but removing lines is equally important. You might need to remove a deprecated configuration option, delete a host entry, remove an old environment variable, or clean up lines left by previous automation. The Ansible `lineinfile` module handles removal with `state: absent`, and it is just as idempotent as line addition.

This post covers how to remove lines by exact match and by regex pattern, along with practical examples for common removal scenarios.

## Removing a Line by Exact Match

The simplest removal specifies the exact line to remove:

```yaml
# Remove a specific line from /etc/hosts
- name: Remove old monitoring server from hosts
  ansible.builtin.lineinfile:
    path: /etc/hosts
    line: "10.0.1.50 old-monitoring.internal"
    state: absent
```

If the line exists, Ansible removes it and reports "changed". If the line does not exist, Ansible reports "ok" and does nothing. The match must be exact, including whitespace and capitalization.

## Removing a Line by Regex Pattern

More commonly, you want to remove lines matching a pattern rather than an exact string. Use `regexp` for this:

```yaml
# Remove any line that starts with a specific key
- name: Remove deprecated setting from config
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^DEPRECATED_OPTION="
    state: absent
```

This removes any line that starts with `DEPRECATED_OPTION=`, regardless of the value after the equals sign. If multiple lines match the regex, all of them are removed.

Wait, that is actually not accurate. By default, `lineinfile` only removes the last line matching the regex. This is because `lineinfile` is designed for single-line operations. If you need to remove all matching lines, you need to run the task in a loop or use the `replace` module (covered later).

## Removing All Matching Lines

To remove every line matching a pattern, you can use a `until` loop that keeps running until no more matches are found. But a simpler approach is to use the `replace` module with an empty string:

```yaml
# Remove all comment lines from a config file
# Using replace module since lineinfile only removes the last match
- name: Remove all comment lines
  ansible.builtin.replace:
    path: /etc/myapp/app.conf
    regexp: "^#.*\n"
    replace: ""
```

However, if you know there is only one line to remove (which is the common case for configuration keys), `lineinfile` with `state: absent` is the right tool.

## Removing Lines from /etc/hosts

Decommissioning servers often means removing their entries from `/etc/hosts`:

```yaml
# Remove decommissioned hosts
- name: Remove decommissioned servers from /etc/hosts
  ansible.builtin.lineinfile:
    path: /etc/hosts
    regexp: "{{ item }}"
    state: absent
  loop:
    - "^10\\.0\\.1\\.10\\s"   # db-old.internal
    - "^10\\.0\\.1\\.15\\s"   # cache-old.internal
    - "^10\\.0\\.1\\.20\\s"   # app-old.internal
```

Note the escaped dots (`\\.`) in the regex. In regex, an unescaped dot matches any character, so `10.0.1.10` would also match `1000101010`. Also note the `\\s` at the end which matches a whitespace character, preventing `10.0.1.10` from matching `10.0.1.100`.

## Removing Environment Variables

Clean up old environment variables from shell profiles:

```yaml
# Remove old environment variables
- name: Remove deprecated JAVA_HOME setting
  ansible.builtin.lineinfile:
    path: /etc/profile.d/java.sh
    regexp: "^export JAVA_HOME=/usr/lib/jvm/java-11"
    state: absent

- name: Remove old PATH addition
  ansible.builtin.lineinfile:
    path: /etc/profile.d/custom-path.sh
    regexp: "^export PATH=.*old-tools"
    state: absent
```

## Removing SSH Configuration Options

Harden SSH by removing insecure options:

```yaml
# Remove insecure SSH options
- name: Remove PermitRootLogin yes
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "^PermitRootLogin\\s+yes"
    state: absent
  notify: Restart SSHD

- name: Remove PasswordAuthentication yes
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "^PasswordAuthentication\\s+yes"
    state: absent
  notify: Restart SSHD
```

A better approach for SSH is to replace these lines rather than just removing them:

```yaml
# Replace insecure settings with secure ones instead of just removing
- name: Disable root login
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "^#?PermitRootLogin"
    line: "PermitRootLogin no"
  notify: Restart SSHD
```

## Removing Lines from Cron

Remove cron entries that are no longer needed:

```yaml
# Remove an old cron job from a crontab file
- name: Remove deprecated backup cron job
  ansible.builtin.lineinfile:
    path: /etc/cron.d/myapp-backups
    regexp: ".*old-backup-script\\.sh"
    state: absent
```

## Removing Lines with Backup

Always create a backup when removing lines from critical files:

```yaml
# Remove a line with backup for safety
- name: Remove deprecated kernel parameter
  ansible.builtin.lineinfile:
    path: /etc/sysctl.d/99-custom.conf
    regexp: "^net\\.ipv4\\.tcp_tw_recycle"
    state: absent
    backup: true
  register: sysctl_change
  notify: Reload sysctl

- name: Show backup location
  ansible.builtin.debug:
    msg: "Backup saved to {{ sysctl_change.backup }}"
  when: sysctl_change.backup is defined
```

## Removing Multiple Lines with a Variable List

When decommissioning involves removing several related lines, define them as a variable:

```yaml
# Define lines to remove as a variable for clarity
- name: Remove old server entries
  ansible.builtin.lineinfile:
    path: /etc/hosts
    regexp: "{{ item }}"
    state: absent
  loop: "{{ hosts_to_remove }}"
  vars:
    hosts_to_remove:
      - "^10\\.0\\.1\\.100\\s"
      - "^10\\.0\\.1\\.101\\s"
      - "^10\\.0\\.1\\.102\\s"
      - "^.*\\.deprecated\\.internal"
```

## Removing Commented-Out Lines

Sometimes you want to remove lines that were previously commented out:

```yaml
# Remove commented-out lines for a specific setting
- name: Clean up commented-out old settings
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^#\\s*OLD_SETTING="
    state: absent
```

## Conditional Line Removal

Remove lines only when certain conditions are met:

```yaml
# Remove debug settings only in production
- name: Remove debug mode in production
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: "^DEBUG="
    state: absent
  when: env_name == "production"

# Remove a line only if the file exists
- name: Check if legacy config exists
  ansible.builtin.stat:
    path: /etc/old-app/config.ini
  register: legacy_config

- name: Remove deprecated option from legacy config
  ansible.builtin.lineinfile:
    path: /etc/old-app/config.ini
    regexp: "^use_legacy_auth="
    state: absent
  when: legacy_config.stat.exists
```

## Complete Example: Server Decommissioning Cleanup

Here is a playbook that cleans up references to decommissioned servers:

```yaml
# decommission-cleanup.yml - remove all references to decommissioned servers
---
- name: Clean up after server decommissioning
  hosts: all
  become: true
  vars:
    decommissioned_hosts:
      - { ip: "10.0.1.50", name: "old-web1" }
      - { ip: "10.0.1.51", name: "old-web2" }
      - { ip: "10.0.1.60", name: "old-db1" }

  tasks:
    - name: Remove decommissioned hosts from /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: "^{{ item.ip | regex_escape }}\\s"
        state: absent
      loop: "{{ decommissioned_hosts }}"
      loop_control:
        label: "{{ item.name }} ({{ item.ip }})"

    - name: Remove decommissioned hosts from SSH known_hosts
      ansible.builtin.lineinfile:
        path: /root/.ssh/known_hosts
        regexp: "^{{ item.ip | regex_escape }}\\s"
        state: absent
      loop: "{{ decommissioned_hosts }}"
      loop_control:
        label: "{{ item.name }}"
      ignore_errors: true

    - name: Remove references from application config
      ansible.builtin.lineinfile:
        path: /etc/myapp/cluster.conf
        regexp: ".*{{ item.ip | regex_escape }}.*"
        state: absent
        backup: true
      loop: "{{ decommissioned_hosts }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Remove old monitoring target entries
      ansible.builtin.lineinfile:
        path: /etc/prometheus/targets.conf
        regexp: ".*{{ item.name }}.*"
        state: absent
      loop: "{{ decommissioned_hosts }}"
      loop_control:
        label: "{{ item.name }}"
      ignore_errors: true
```

The `regex_escape` filter is important here. It escapes special regex characters in the IP address (the dots), so `10.0.1.50` becomes `10\.0\.1\.50` and only matches the literal IP, not patterns like `1000105.0`.

## Summary

Removing lines with `lineinfile` and `state: absent` is the safe, idempotent way to clean up configuration files. Use `regexp` for pattern-based removal when you do not know the exact line content, always escape special characters in IP addresses and other patterns with `regex_escape`, create backups of critical files before removing lines, and remember that `lineinfile` only removes the last match of a regex pattern by default. For removing all instances of a pattern, use the `replace` module instead. Combining line removal with proper backup and conditional logic gives you a reliable cleanup workflow for decommissioning, hardening, and configuration migration tasks.
