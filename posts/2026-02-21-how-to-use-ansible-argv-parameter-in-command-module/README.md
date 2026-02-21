# How to Use Ansible argv Parameter in command Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Command Module, argv, DevOps

Description: Learn how to use the argv parameter in Ansible command module to pass arguments safely as a list without shell interpretation.

---

The `argv` parameter in Ansible's `command` module lets you pass command arguments as a list instead of a string. This might seem like a small detail, but it solves real problems around argument quoting, special characters, and security. When you use `argv`, each list element becomes a separate argument to the process, bypassing any shell interpretation issues.

In this post, we will look at why `argv` exists, when to use it, and how it compares to the standard `cmd` parameter.

## Why argv Matters

Consider a scenario where you need to create a file with spaces in the name, or pass an argument that contains special characters. With the `cmd` parameter, you have to worry about quoting:

```yaml
# using cmd with special characters can be tricky
- name: Create file with spaces (cmd approach)
  ansible.builtin.command:
    cmd: touch "/tmp/my file with spaces.txt"
```

With `argv`, each argument is passed directly to the process without any shell parsing:

```yaml
# using argv eliminates quoting issues
- name: Create file with spaces (argv approach)
  ansible.builtin.command:
    argv:
      - touch
      - "/tmp/my file with spaces.txt"
```

Both achieve the same result, but `argv` is less error-prone because you do not have to think about how the shell will split your arguments.

## Basic argv Syntax

The `argv` parameter takes a YAML list. The first element is the command to execute, and the remaining elements are the arguments:

```yaml
# basic argv usage showing the list structure
---
- name: argv basics
  hosts: all
  tasks:
    - name: Simple command with argv
      ansible.builtin.command:
        argv:
          - /usr/bin/ls
          - -la
          - /var/log
      register: listing
      changed_when: false

    - name: Show output
      ansible.builtin.debug:
        var: listing.stdout_lines
```

This is equivalent to running `ls -la /var/log`, but each piece is a separate list item.

## Handling Arguments with Special Characters

The real power of `argv` shows up when your arguments contain characters that would normally be interpreted by a shell:

```yaml
# argv handles special characters without escaping
---
- name: Special character handling
  hosts: all
  tasks:
    # Passing arguments that contain dollar signs, backticks, etc.
    - name: Create user with special characters in comment
      ansible.builtin.command:
        argv:
          - useradd
          - -c
          - "John's Account (Team $A)"
          - -m
          - -s
          - /bin/bash
          - john_doe
      become: true

    # Passing regex patterns that contain shell metacharacters
    - name: Search for pattern with grep
      ansible.builtin.command:
        argv:
          - grep
          - -r
          - "error.*[0-9]{3}"
          - /var/log/app/
      register: grep_result
      failed_when: false
      changed_when: false
```

Without `argv`, the dollar sign in `$A` would be interpreted as a variable, and the regex brackets would need careful escaping.

## Using argv with Variables

You can use Ansible variables in `argv` lists just like anywhere else in a playbook:

```yaml
# using variables within argv lists
---
- name: argv with variables
  hosts: app_servers
  vars:
    app_user: myapp
    app_dir: /opt/myapp
    java_opts: "-Xmx2g -Xms512m -XX:+UseG1GC"
  tasks:
    - name: Start application with Java options
      ansible.builtin.command:
        argv:
          - "{{ app_dir }}/bin/start.sh"
          - "--user"
          - "{{ app_user }}"
          - "--java-opts"
          - "{{ java_opts }}"
          - "--config"
          - "{{ app_dir }}/conf/production.yaml"
      become: true
      become_user: "{{ app_user }}"
```

## Building argv Lists Dynamically

Sometimes you need to construct the argument list based on conditions. You can do this with Jinja2 filters:

```yaml
# build argv lists dynamically using filters
---
- name: Dynamic argv construction
  hosts: all
  vars:
    base_command:
      - /opt/tools/backup
      - --dest
      - /mnt/backup
    verbose: true
    compression: gzip
    exclude_patterns:
      - "*.tmp"
      - "*.log"
      - "*.pid"
  tasks:
    - name: Build and execute backup command
      ansible.builtin.command:
        argv: >-
          {{
            base_command +
            (['--verbose'] if verbose else []) +
            ['--compress', compression] +
            exclude_patterns | map('regex_replace', '^', '--exclude=') | list
          }}
      register: backup_result

    - name: Show what was executed
      ansible.builtin.debug:
        msg: "Ran command with args: {{ backup_result.cmd }}"
```

This builds an argument list like: `/opt/tools/backup --dest /mnt/backup --verbose --compress gzip --exclude=*.tmp --exclude=*.log --exclude=*.pid`

## argv vs cmd: A Side-by-Side Comparison

Here are equivalent tasks using both approaches:

```yaml
# comparing cmd and argv approaches side by side
---
- name: cmd vs argv comparison
  hosts: all
  vars:
    filename: "report (Q1 2026).csv"
    search_term: "revenue > $1000"
  tasks:
    # Using cmd - requires careful quoting
    - name: Copy file with cmd
      ansible.builtin.command:
        cmd: "cp '/tmp/{{ filename }}' '/opt/reports/{{ filename }}'"

    # Using argv - no quoting needed
    - name: Copy file with argv
      ansible.builtin.command:
        argv:
          - cp
          - "/tmp/{{ filename }}"
          - "/opt/reports/{{ filename }}"

    # Using cmd - special characters need escaping
    - name: Search with cmd
      ansible.builtin.command:
        cmd: "grep -r '{{ search_term }}' /opt/data/"
      failed_when: false
      changed_when: false

    # Using argv - special characters handled naturally
    - name: Search with argv
      ansible.builtin.command:
        argv:
          - grep
          - -r
          - "{{ search_term }}"
          - /opt/data/
      failed_when: false
      changed_when: false
```

## Using argv with creates and removes

The `argv` parameter works alongside the `creates` and `removes` conditions that make the `command` module idempotent:

```yaml
# combine argv with creates/removes for idempotent commands
---
- name: Idempotent commands with argv
  hosts: all
  tasks:
    - name: Extract archive only if target does not exist
      ansible.builtin.command:
        argv:
          - tar
          - xzf
          - /tmp/app-v2.3.tar.gz
          - -C
          - /opt/app
        creates: /opt/app/bin/myapp

    - name: Initialize database only once
      ansible.builtin.command:
        argv:
          - /opt/app/bin/myapp
          - db
          - init
          - --config
          - /etc/myapp/database.yaml
        creates: /opt/app/data/.initialized
```

## Looping with argv

When you need to run similar commands with different arguments, you can loop over a list and use `argv`:

```yaml
# loop over a list and construct argv for each iteration
---
- name: Create multiple system users with argv
  hosts: all
  become: true
  vars:
    users:
      - name: app_deploy
        comment: "Application Deployment User"
        shell: /bin/bash
        groups: deploy,docker
      - name: app_monitor
        comment: "Monitoring Service Account"
        shell: /usr/sbin/nologin
        groups: monitor
      - name: app_backup
        comment: "Backup Service Account"
        shell: /usr/sbin/nologin
        groups: backup
  tasks:
    - name: Create users
      ansible.builtin.command:
        argv:
          - useradd
          - -c
          - "{{ item.comment }}"
          - -s
          - "{{ item.shell }}"
          - -G
          - "{{ item.groups }}"
          - -m
          - "{{ item.name }}"
      loop: "{{ users }}"
      register: user_creation
      failed_when: user_creation.rc != 0 and 'already exists' not in user_creation.stderr
      changed_when: user_creation.rc == 0
```

## Security Benefits of argv

From a security perspective, `argv` is safer than `cmd` because it prevents shell injection. If a variable contains malicious content, `cmd` might execute it, while `argv` passes it as a literal argument:

```yaml
# argv prevents shell injection attacks
---
- name: Security comparison
  hosts: all
  vars:
    # imagine this came from user input or an external source
    user_input: "test; rm -rf /"
  tasks:
    # DANGEROUS with shell module - the semicolon would be interpreted
    # - name: Unsafe approach
    #   ansible.builtin.shell:
    #     cmd: "echo {{ user_input }}"

    # SAFE with command module and argv - treated as a literal string
    - name: Safe approach with argv
      ansible.builtin.command:
        argv:
          - echo
          - "{{ user_input }}"
      register: safe_output
      changed_when: false

    # The output will be literally: test; rm -rf /
    - name: Show output
      ansible.builtin.debug:
        var: safe_output.stdout
```

## When Not to Use argv

The `argv` parameter is part of the `command` module, which does not support shell features. If you need pipes, redirects, or globbing, you cannot use `argv`. In those cases, use the `shell` module with `cmd`:

```yaml
# argv does not support shell features - use shell module instead
---
- name: When you need shell features
  hosts: all
  tasks:
    # This will NOT work with argv (no pipe support)
    # - name: Broken pipe attempt
    #   ansible.builtin.command:
    #     argv:
    #       - ls
    #       - -la
    #       - "|"
    #       - grep
    #       - log

    # Use shell module for pipes
    - name: Working pipe with shell module
      ansible.builtin.shell:
        cmd: "ls -la /var/log | grep syslog"
      changed_when: false
```

## Summary

The `argv` parameter in Ansible's `command` module provides a safer and more predictable way to pass arguments to commands. It eliminates quoting headaches, prevents shell injection, and handles special characters naturally. Use `argv` whenever you are working with filenames that might contain spaces, arguments with shell metacharacters, or data from untrusted sources. Stick with `cmd` or the `shell` module when you need shell features like pipes and redirects. For most automated tasks, `argv` is the better default choice.
