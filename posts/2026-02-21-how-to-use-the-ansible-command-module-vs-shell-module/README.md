# How to Use the Ansible command Module vs shell Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Command Module, Shell Module, Automation

Description: Understand the differences between Ansible command and shell modules, when to use each, and the security implications of choosing one over the other.

---

One of the most common questions from people getting started with Ansible is: "What is the difference between the `command` module and the `shell` module?" They look similar, they both run commands on remote hosts, but they behave quite differently under the hood. Picking the wrong one can lead to subtle bugs or security issues.

Let me break down the differences and give you clear guidance on when to use each.

## The Core Difference

The `command` module executes a command directly without a shell. It does not pass the command through `/bin/sh`. This means shell features like pipes, redirects, environment variable expansion, and wildcards do not work.

The `shell` module passes the command through a shell (defaults to `/bin/sh`). This means you get all shell features: pipes, redirects, globbing, environment variables, and everything else the shell provides.

Here is the simplest way to see the difference:

```yaml
# command_vs_shell_basic.yml - Demonstrate the core difference
---
- name: Show difference between command and shell
  hosts: localhost
  connection: local

  tasks:
    # This works fine with command module
    - name: Simple command - works with both
      ansible.builtin.command:
        cmd: ls /tmp
      register: cmd_result

    # This FAILS with command module because pipes need a shell
    - name: Piped command - fails with command module
      ansible.builtin.command:
        cmd: "ls /tmp | wc -l"
      register: pipe_result
      ignore_errors: yes

    - name: Show the error
      ansible.builtin.debug:
        msg: "Command module with pipe failed: {{ pipe_result.msg | default('') }}"
      when: pipe_result is failed

    # This works because shell module processes pipes
    - name: Piped command - works with shell module
      ansible.builtin.shell:
        cmd: "ls /tmp | wc -l"
      register: shell_result

    - name: Show the result
      ansible.builtin.debug:
        msg: "Shell module with pipe succeeded: {{ shell_result.stdout }}"
```

## What Works with command vs. shell

Here is a practical breakdown of what each module supports:

```yaml
# features_comparison.yml - What works where
---
- name: Feature comparison between command and shell
  hosts: localhost
  connection: local

  tasks:
    # COMMAND MODULE - these work
    - name: command - simple binary execution
      ansible.builtin.command:
        cmd: whoami

    - name: command - passing arguments
      ansible.builtin.command:
        cmd: "ls -la /var/log"

    - name: command - using argv form for clarity
      ansible.builtin.command:
        argv:
          - /usr/bin/find
          - /var/log
          - -name
          - "*.log"
          - -mtime
          - "+7"

    # SHELL MODULE - these require shell features
    - name: shell - pipe commands
      ansible.builtin.shell:
        cmd: "ps aux | grep nginx | grep -v grep"

    - name: shell - output redirection
      ansible.builtin.shell:
        cmd: "echo 'test' > /tmp/output.txt"

    - name: shell - environment variable expansion
      ansible.builtin.shell:
        cmd: "echo $HOME"

    - name: shell - glob patterns
      ansible.builtin.shell:
        cmd: "ls /var/log/*.log"

    - name: shell - command substitution
      ansible.builtin.shell:
        cmd: "echo \"Today is $(date)\""

    - name: shell - logical operators
      ansible.builtin.shell:
        cmd: "test -f /etc/nginx/nginx.conf && echo 'exists' || echo 'missing'"

    - name: shell - here strings and here documents
      ansible.builtin.shell:
        cmd: "cat <<< 'hello world'"
```

## Security Implications

The `command` module is safer because it does not process shell metacharacters. This matters when your command includes variables that might contain user input or untrusted data.

```yaml
# security_comparison.yml - Security implications
---
- name: Security comparison
  hosts: localhost
  connection: local

  vars:
    # Imagine this came from user input or an external source
    safe_filename: "myfile.txt"
    dangerous_filename: "myfile.txt; rm -rf /tmp/*"

  tasks:
    # SAFE - command module treats the whole string as a single argument
    - name: command module - safe even with shell metacharacters
      ansible.builtin.command:
        cmd: "ls {{ dangerous_filename }}"
      ignore_errors: yes
      # This will try to list a file literally named "myfile.txt; rm -rf /tmp/*"
      # It won't execute the rm command

    # DANGEROUS - shell module would interpret the semicolon
    # DO NOT run this example - it's here to illustrate the risk
    # - name: shell module - dangerous with untrusted input
    #   ansible.builtin.shell:
    #     cmd: "ls {{ dangerous_filename }}"
    #   # This would execute: ls myfile.txt; rm -rf /tmp/*
    #   # The rm command WOULD execute!

    # SAFE - if you must use shell, quote your variables
    - name: shell module - safer with proper quoting
      ansible.builtin.shell:
        cmd: "ls '{{ safe_filename }}'"
      ignore_errors: yes
```

## When to Use command

Use the `command` module when:

- You are running a single binary with arguments
- You do not need pipes, redirects, or shell features
- You are working with variables that might contain untrusted data
- You want the safest option by default

```yaml
# command_use_cases.yml - Good use cases for command module
---
- name: Appropriate uses of command module
  hosts: all
  become: yes

  tasks:
    - name: Check disk usage
      ansible.builtin.command:
        cmd: df -h /
      register: disk_usage
      changed_when: false

    - name: Get service status
      ansible.builtin.command:
        cmd: systemctl is-active nginx
      register: nginx_status
      changed_when: false
      failed_when: false

    - name: Run a specific binary
      ansible.builtin.command:
        cmd: /opt/myapp/bin/healthcheck
      register: health
      changed_when: false

    - name: Use creates for idempotency
      ansible.builtin.command:
        cmd: /usr/local/bin/setup-database
        creates: /var/lib/myapp/db_initialized
```

## When to Use shell

Use the `shell` module when:

- You need pipes to chain commands
- You need output redirection
- You need environment variable expansion
- You need glob patterns
- You need logical operators (&&, ||)

```yaml
# shell_use_cases.yml - Good use cases for shell module
---
- name: Appropriate uses of shell module
  hosts: all
  become: yes

  tasks:
    - name: Count running processes
      ansible.builtin.shell:
        cmd: "ps aux | wc -l"
      register: process_count
      changed_when: false

    - name: Find and clean old log files
      ansible.builtin.shell:
        cmd: "find /var/log -name '*.log' -mtime +30 -exec rm {} +"
      changed_when: true

    - name: Export data and compress
      ansible.builtin.shell:
        cmd: "pg_dump mydb | gzip > /backup/mydb_$(date +%Y%m%d).sql.gz"

    - name: Check multiple conditions
      ansible.builtin.shell:
        cmd: "test -f /etc/nginx/nginx.conf && nginx -t 2>&1"
      register: nginx_check
      changed_when: false
      failed_when: false
```

## Using a Different Shell

The `shell` module defaults to `/bin/sh`, but you can specify a different shell.

```yaml
# different_shells.yml - Using alternative shells
---
- name: Use different shells
  hosts: all

  tasks:
    - name: Use bash explicitly
      ansible.builtin.shell:
        cmd: |
          shopt -s nullglob
          files=(/var/log/*.log)
          echo "${#files[@]} log files found"
        executable: /bin/bash

    - name: Use zsh if available
      ansible.builtin.shell:
        cmd: "print -l /var/log/**/*.log(.)"
        executable: /bin/zsh
      when: "'/bin/zsh' is file"
```

## Performance Considerations

The `command` module is slightly faster because it does not need to spawn a shell process. For a single task this is negligible, but across thousands of hosts or hundreds of tasks, it adds up.

```yaml
# performance_example.yml - Prefer command for simple operations
---
- name: Performance-conscious approach
  hosts: all
  become: yes

  tasks:
    # Faster - no shell overhead
    - name: Get hostname with command
      ansible.builtin.command:
        cmd: hostname
      register: host_cmd
      changed_when: false

    # Slightly slower - spawns shell first, then runs hostname
    - name: Get hostname with shell
      ansible.builtin.shell:
        cmd: hostname
      register: host_shell
      changed_when: false
```

## The Decision Flowchart

Use this mental model when choosing:

```mermaid
graph TD
    A[Need to run a command?] --> B{Need pipes, redirects, or shell features?}
    B -->|No| C{Working with untrusted variables?}
    B -->|Yes| D[Use shell module]
    C -->|Yes| E[Use command module]
    C -->|No| F[Use command module - safer default]
    D --> G{Can you use a dedicated Ansible module instead?}
    E --> G
    F --> G
    G -->|Yes| H[Use the dedicated module - best option]
    G -->|No| I[Stick with command or shell]
```

## The Best Option: Dedicated Modules

Before reaching for either `command` or `shell`, check if Ansible has a dedicated module for what you need. Dedicated modules are idempotent, properly report changes, and handle edge cases.

```yaml
# prefer_dedicated.yml - Use dedicated modules when available
---
- name: Prefer dedicated modules
  hosts: all
  become: yes

  tasks:
    # Instead of: command: systemctl restart nginx
    - name: Use service module
      ansible.builtin.service:
        name: nginx
        state: restarted

    # Instead of: shell: "useradd -m -s /bin/bash deploy"
    - name: Use user module
      ansible.builtin.user:
        name: deploy
        shell: /bin/bash
        create_home: yes

    # Instead of: shell: "cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak"
    - name: Use copy module
      ansible.builtin.copy:
        src: /etc/nginx/nginx.conf
        dest: /etc/nginx/nginx.conf.bak
        remote_src: yes
```

## Summary

Default to the `command` module for simple binary execution. Switch to `shell` only when you need shell features like pipes, redirects, or globbing. And before using either one, check if a dedicated Ansible module exists for the task. The `command` module is safer, slightly faster, and should be your go-to choice for running commands that do not need shell processing.
