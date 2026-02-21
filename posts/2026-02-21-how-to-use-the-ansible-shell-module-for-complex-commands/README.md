# How to Use the Ansible shell Module for Complex Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Shell Module, Automation, DevOps

Description: Master the Ansible shell module for running complex commands with pipes, redirects, environment variables, and multi-step operations on remote hosts.

---

The Ansible `shell` module is your tool for running commands that need actual shell processing. While the `command` module handles simple binary execution, the `shell` module shines when you need pipes, redirects, environment variables, globbing, or any other feature that requires a shell interpreter. Let me walk through the full range of what you can do with it.

## Basic Shell Module Usage

At its simplest, the shell module runs a command through `/bin/sh` on the remote host.

```yaml
# basic_shell.yml - Basic shell module examples
---
- name: Basic shell module usage
  hosts: all
  become: yes

  tasks:
    - name: Count files in a directory using pipe
      ansible.builtin.shell:
        cmd: "ls -1 /var/log | wc -l"
      register: file_count
      changed_when: false

    - name: Display the result
      ansible.builtin.debug:
        msg: "Found {{ file_count.stdout }} files in /var/log"
```

## Using Pipes and Chained Commands

Pipes are the most common reason to reach for the shell module over command.

```yaml
# pipes_and_chains.yml - Piping and chaining commands
---
- name: Complex pipe and chain examples
  hosts: all
  become: yes

  tasks:
    - name: Find top memory-consuming processes
      ansible.builtin.shell:
        cmd: "ps aux --sort=-%mem | head -11"
      register: top_mem
      changed_when: false

    - name: Get disk usage sorted by size
      ansible.builtin.shell:
        cmd: "du -sh /var/log/* 2>/dev/null | sort -rh | head -10"
      register: disk_usage
      changed_when: false

    - name: Count unique IP addresses in access log
      ansible.builtin.shell:
        cmd: "awk '{print $1}' /var/log/nginx/access.log | sort -u | wc -l"
      register: unique_ips
      changed_when: false
      failed_when: false

    - name: Find and count error lines in logs
      ansible.builtin.shell:
        cmd: "grep -c 'ERROR' /var/log/syslog 2>/dev/null || echo 0"
      register: error_count
      changed_when: false
```

## Environment Variables

The shell module expands environment variables, but you can also set them explicitly.

```yaml
# environment_vars.yml - Working with environment variables
---
- name: Shell module with environment variables
  hosts: all

  tasks:
    - name: Use inline environment variables
      ansible.builtin.shell:
        cmd: "DATABASE_URL=postgres://localhost/mydb /opt/myapp/bin/migrate"
      environment:
        RAILS_ENV: production
        NODE_ENV: production

    - name: Access existing environment variables
      ansible.builtin.shell:
        cmd: "echo $HOME && echo $PATH"
      register: env_output
      changed_when: false

    - name: Set multiple env vars with the environment parameter
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/healthcheck"
      environment:
        APP_PORT: "8080"
        APP_HOST: "0.0.0.0"
        LOG_LEVEL: "debug"
        DATABASE_HOST: "{{ db_host | default('localhost') }}"
      register: health_result
      changed_when: false
```

## Output Redirection and File Operations

Redirecting output is another shell-only feature.

```yaml
# redirection.yml - Output redirection examples
---
- name: Shell module with output redirection
  hosts: all
  become: yes

  tasks:
    - name: Write command output to a file
      ansible.builtin.shell:
        cmd: "df -h > /tmp/disk_report.txt"

    - name: Append to an existing file
      ansible.builtin.shell:
        cmd: "echo '--- Report generated at $(date) ---' >> /tmp/disk_report.txt"

    - name: Redirect stderr to a separate file
      ansible.builtin.shell:
        cmd: "find / -name '*.conf' > /tmp/configs.txt 2>/tmp/find_errors.txt"

    - name: Redirect stderr to stdout for combined capture
      ansible.builtin.shell:
        cmd: "nginx -t 2>&1"
      register: nginx_test
      changed_when: false
      failed_when: false

    - name: Use tee to write to file and capture output
      ansible.builtin.shell:
        cmd: "dmesg | tail -50 | tee /tmp/recent_kernel_messages.txt"
      register: kernel_msgs
      changed_when: false
```

## Glob Patterns and Wildcards

Shell globbing lets you work with multiple files matching a pattern.

```yaml
# globbing.yml - Using glob patterns with shell module
---
- name: Shell module with glob patterns
  hosts: all
  become: yes

  tasks:
    - name: Count log files matching a pattern
      ansible.builtin.shell:
        cmd: "ls /var/log/nginx/*.log 2>/dev/null | wc -l"
      register: nginx_logs
      changed_when: false

    - name: Get total size of all backup files
      ansible.builtin.shell:
        cmd: "du -ch /backup/*.tar.gz 2>/dev/null | tail -1"
      register: backup_size
      changed_when: false
      failed_when: false

    - name: Archive old logs
      ansible.builtin.shell:
        cmd: "tar czf /backup/old_logs_$(date +%Y%m%d).tar.gz /var/log/*.log.1 2>/dev/null"
      args:
        creates: "/backup/old_logs_{{ ansible_date_time.date | replace('-','') }}.tar.gz"
```

## Working Directory and Executable

Control where commands run and which shell interprets them.

```yaml
# chdir_and_executable.yml - Working directory and shell selection
---
- name: Control working directory and shell
  hosts: all

  tasks:
    - name: Run command in a specific directory
      ansible.builtin.shell:
        cmd: "npm run build 2>&1"
        chdir: /opt/myapp

    - name: Use bash for bash-specific features
      ansible.builtin.shell:
        cmd: |
          shopt -s nullglob
          files=( /var/log/*.log )
          echo "Found ${#files[@]} log files"
        executable: /bin/bash

    - name: Use bash process substitution
      ansible.builtin.shell:
        cmd: "diff <(sort /etc/hosts) <(sort /etc/hosts.bak) || true"
        executable: /bin/bash
      register: hosts_diff
      changed_when: false
```

## Conditional Execution with Shell Operators

Use `&&` and `||` for conditional command execution.

```yaml
# conditional_execution.yml - Using shell operators for conditions
---
- name: Conditional command execution
  hosts: all
  become: yes

  tasks:
    - name: Only restart if config test passes
      ansible.builtin.shell:
        cmd: "nginx -t && systemctl reload nginx"
      register: nginx_reload
      changed_when: "'signal process started' in nginx_reload.stdout"

    - name: Create directory only if it doesn't exist
      ansible.builtin.shell:
        cmd: "test -d /opt/myapp/data || mkdir -p /opt/myapp/data"
      register: dir_result
      changed_when: "'mkdir' in dir_result.cmd"

    - name: Try primary command, fall back to secondary
      ansible.builtin.shell:
        cmd: "curl -s http://primary-api:8080/health || curl -s http://backup-api:8080/health"
      register: api_health
      changed_when: false
      failed_when: api_health.rc != 0
```

## Handling Complex Data Processing

The shell module is useful for data processing tasks where you need multiple pipes.

```yaml
# data_processing.yml - Complex data processing with shell
---
- name: Complex data processing tasks
  hosts: all
  become: yes

  tasks:
    - name: Get top 10 largest files in /var
      ansible.builtin.shell:
        cmd: "find /var -type f -exec du -h {} + 2>/dev/null | sort -rh | head -10"
      register: largest_files
      changed_when: false

    - name: Parse nginx access log for HTTP status codes
      ansible.builtin.shell:
        cmd: |
          awk '{print $9}' /var/log/nginx/access.log | \
          sort | uniq -c | sort -rn | head -10
      register: status_codes
      changed_when: false
      failed_when: false

    - name: Calculate average response time from access log
      ansible.builtin.shell:
        cmd: |
          awk '{sum += $NF; count++} END {if (count > 0) printf "%.2f ms\n", sum/count; else print "no data"}' \
          /var/log/nginx/access.log
      register: avg_response
      changed_when: false
      failed_when: false

    - name: Get unique user agents from the last 1000 requests
      ansible.builtin.shell:
        cmd: |
          tail -1000 /var/log/nginx/access.log | \
          awk -F'"' '{print $6}' | \
          sort -u | head -20
      register: user_agents
      changed_when: false
      failed_when: false
```

## Making Shell Commands Idempotent

The biggest challenge with the shell module is idempotency. Here are patterns to handle it.

```yaml
# idempotent_shell.yml - Making shell commands idempotent
---
- name: Idempotent shell command patterns
  hosts: all
  become: yes

  tasks:
    - name: Only run if a file does not exist (creates parameter)
      ansible.builtin.shell:
        cmd: "/opt/setup/initialize.sh > /var/log/init.log 2>&1"
        creates: /opt/myapp/.initialized

    - name: Only run if a file exists (removes parameter)
      ansible.builtin.shell:
        cmd: "/opt/cleanup/teardown.sh > /var/log/teardown.log 2>&1"
        removes: /opt/myapp/.needs_cleanup

    - name: Check before acting
      ansible.builtin.shell:
        cmd: |
          if ! grep -q 'custom_setting' /etc/myapp/config.ini; then
            echo 'custom_setting=true' >> /etc/myapp/config.ini
            echo 'CHANGED'
          else
            echo 'OK'
          fi
      register: config_result
      changed_when: "'CHANGED' in config_result.stdout"
```

## Error Handling

Control how failures are detected and handled.

```yaml
# error_handling.yml - Shell module error handling
---
- name: Shell module error handling
  hosts: all

  tasks:
    - name: Ignore specific exit codes
      ansible.builtin.shell:
        cmd: "grep 'PATTERN' /var/log/syslog"
      register: grep_result
      # grep returns 1 when no match found, which is not an error
      failed_when: grep_result.rc > 1

    - name: Custom failure detection based on output
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/check-status"
      register: status
      failed_when: "'CRITICAL' in status.stdout"

    - name: Capture both stdout and stderr
      ansible.builtin.shell:
        cmd: "some_command 2>&1"
      register: output
      changed_when: false
      failed_when: false

    - name: Act on the result
      ansible.builtin.debug:
        msg: "stdout: {{ output.stdout }}, stderr: {{ output.stderr }}, rc: {{ output.rc }}"
```

## Summary

The shell module is essential when you need shell features that the command module cannot provide. Use it for pipes, redirects, environment variable expansion, glob patterns, and command chaining. Always set `changed_when` appropriately to maintain idempotency, use `creates`/`removes` for file-based idempotency, and redirect stderr to stdout with `2>&1` when you want to capture all output. And remember to quote variables properly when they might contain special characters.
