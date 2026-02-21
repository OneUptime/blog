# How to Use Ansible to Run Commands with Pipes and Redirects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Shell, Pipes, Redirects

Description: Learn how to use shell pipes and file redirects in Ansible playbooks using the shell module for data processing tasks.

---

Pipes and redirects are fundamental building blocks in Unix shell scripting. Piping the output of one command into another, redirecting output to files, appending logs, and combining stderr with stdout are everyday operations for anyone managing Linux systems. However, these features only work through a shell interpreter, which means Ansible's `command` module cannot handle them. You need the `shell` module.

This post covers how to use pipes, output redirection, input redirection, and various combinations in Ansible playbooks.

## Why the command Module Does Not Support Pipes

The `command` module executes binaries directly without invoking a shell. Pipe characters, redirect operators, and other shell metacharacters are just passed as literal arguments to the command. This is safer but limits what you can do:

```yaml
# command module treats pipe as a literal argument (this will NOT work as expected)
- name: This will not pipe output to grep
  ansible.builtin.command:
    cmd: "ps aux | grep nginx"
  # The command module will try to run "ps" with arguments "aux", "|", "grep", "nginx"
  # It will likely fail or produce unexpected results
```

Use the `shell` module instead:

```yaml
# shell module processes pipes and redirects through the shell interpreter
- name: This correctly pipes ps output to grep
  ansible.builtin.shell:
    cmd: "ps aux | grep nginx | grep -v grep"
  register: nginx_procs
  changed_when: false
```

## Basic Pipe Operations

Pipes connect the stdout of one command to the stdin of the next. Here are common patterns:

```yaml
# common pipe patterns for system administration
---
- name: Pipe examples
  hosts: all
  tasks:
    # Count files matching a pattern
    - name: Count log files larger than 100MB
      ansible.builtin.shell:
        cmd: "find /var/log -type f -size +100M | wc -l"
      register: big_files
      changed_when: false

    # Sort and deduplicate
    - name: Get unique logged-in users
      ansible.builtin.shell:
        cmd: "who | awk '{print $1}' | sort -u"
      register: active_users
      changed_when: false

    # Filter and format
    - name: Get top 5 memory-consuming processes
      ansible.builtin.shell:
        cmd: "ps aux --sort=-%mem | head -6 | awk '{printf \"%-10s %5s %5s %s\\n\", $1, $3, $4, $11}'"
      register: top_procs
      changed_when: false

    - name: Show results
      ansible.builtin.debug:
        msg:
          - "Large log files: {{ big_files.stdout }}"
          - "Active users: {{ active_users.stdout_lines }}"
          - "Top processes by memory:"
          - "{{ top_procs.stdout_lines }}"
```

## Multi-Stage Pipes

You can chain as many pipes as needed for complex data processing:

```yaml
# multi-stage pipe for log analysis
- name: Analyze Apache access logs
  ansible.builtin.shell:
    cmd: |
      cat /var/log/apache2/access.log |
      awk '{print $1}' |
      sort |
      uniq -c |
      sort -rn |
      head -20
  register: top_ips
  changed_when: false

- name: Show top 20 IPs by request count
  ansible.builtin.debug:
    var: top_ips.stdout_lines
```

## Output Redirection

Output redirection sends command output to files instead of the terminal. Ansible supports all standard redirect operators through the `shell` module.

### Redirect stdout to a file (overwrite):

```yaml
# redirect stdout to a file, overwriting existing content
- name: Save system info to file
  ansible.builtin.shell:
    cmd: |
      echo "=== System Report ===" > /tmp/system_report.txt
      echo "Date: $(date)" >> /tmp/system_report.txt
      echo "Hostname: $(hostname)" >> /tmp/system_report.txt
      echo "Uptime: $(uptime)" >> /tmp/system_report.txt
      uname -a >> /tmp/system_report.txt
      echo "=== Disk Usage ===" >> /tmp/system_report.txt
      df -h >> /tmp/system_report.txt
      echo "=== Memory ===" >> /tmp/system_report.txt
      free -h >> /tmp/system_report.txt
```

### Redirect stderr:

```yaml
# redirect stderr separately from stdout
---
- name: Redirect stderr examples
  hosts: all
  tasks:
    # Redirect stderr to a log file, keep stdout
    - name: Run command with stderr logged
      ansible.builtin.shell:
        cmd: "apt-get update 2>/var/log/apt_update_errors.log"
      become: true

    # Redirect both stdout and stderr to different files
    - name: Capture stdout and stderr separately
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/healthcheck 1>/tmp/health_stdout.log 2>/tmp/health_stderr.log"

    # Redirect stderr to stdout (combine them)
    - name: Combine stdout and stderr
      ansible.builtin.shell:
        cmd: "/opt/scripts/backup.sh 2>&1"
      register: backup_output

    # Redirect both to the same file
    - name: Log everything to one file
      ansible.builtin.shell:
        cmd: "/opt/scripts/deploy.sh > /var/log/deploy.log 2>&1"
```

## Input Redirection

Input redirection feeds file contents to a command's stdin:

```yaml
# use input redirection to feed files to commands
---
- name: Input redirection examples
  hosts: db_servers
  tasks:
    # Feed SQL file to MySQL
    - name: Import database schema
      ansible.builtin.shell:
        cmd: "mysql -u admin -p{{ db_pass }} mydb < /opt/sql/schema.sql"
      no_log: true

    # Use a here-string (bash feature)
    - name: Process data with here-string
      ansible.builtin.shell:
        cmd: 'wc -w <<< "count the words in this string"'
        executable: /bin/bash
      register: word_count
      changed_when: false
```

## Combining Pipes and Redirects

The real power comes from combining pipes with redirects:

```yaml
# combine pipes and redirects for log processing
---
- name: Log analysis and reporting
  hosts: webservers
  tasks:
    # Extract error data, process it, and save to file
    - name: Generate error report from logs
      ansible.builtin.shell:
        cmd: |
          grep -i "error\|critical\|fatal" /var/log/app/application.log |
          awk '{print $1, $2, $NF}' |
          sort |
          uniq -c |
          sort -rn > /tmp/error_report.txt 2>/dev/null
      changed_when: false

    # Pipe through multiple transformations and redirect
    - name: Extract and format nginx status codes
      ansible.builtin.shell:
        cmd: |
          awk '{print $9}' /var/log/nginx/access.log |
          sort |
          uniq -c |
          sort -rn |
          awk '{printf "%s responses: %s\n", $2, $1}' > /tmp/status_codes.txt
      changed_when: false

    # Tee to both file and stdout (captured by register)
    - name: Process and save while capturing output
      ansible.builtin.shell:
        cmd: |
          df -h |
          grep -E "^/dev" |
          awk '{print $1, $5, $6}' |
          tee /tmp/disk_usage.txt
      register: disk_output
      changed_when: false

    - name: Show captured disk output
      ansible.builtin.debug:
        var: disk_output.stdout_lines
```

## Using tee for Dual Output

The `tee` command is incredibly useful in Ansible because it lets you save output to a file while also capturing it with `register`:

```yaml
# use tee to save output to file and capture it in a variable
- name: Run backup with tee for logging and capturing
  ansible.builtin.shell:
    cmd: |
      /opt/scripts/full_backup.sh 2>&1 | tee /var/log/backup_$(date +%Y%m%d).log
  register: backup_output

- name: Check backup result
  ansible.builtin.debug:
    msg: "Backup completed with {{ backup_output.stdout_lines | length }} lines of output"
```

## Process Substitution (Bash Only)

Process substitution is a bash feature that lets you treat command output as a file. You need `executable: /bin/bash` for this:

```yaml
# use bash process substitution to compare command outputs
- name: Compare two directory listings
  ansible.builtin.shell:
    cmd: "diff <(ls -la /opt/app/current/) <(ls -la /opt/app/previous/) || true"
    executable: /bin/bash
  register: diff_output
  changed_when: false

- name: Compare sorted outputs of two commands
  ansible.builtin.shell:
    cmd: |
      comm -23 \
        <(dpkg -l | awk '/^ii/{print $2}' | sort) \
        <(cat /opt/baseline/required_packages.txt | sort)
    executable: /bin/bash
  register: extra_packages
  changed_when: false

- name: Show packages not in baseline
  ansible.builtin.debug:
    var: extra_packages.stdout_lines
```

## Named Pipes (FIFOs)

For more complex inter-process communication in Ansible tasks:

```yaml
# create and use a named pipe for parallel processing
- name: Process large log file in parallel
  ansible.builtin.shell:
    cmd: |
      FIFO=$(mktemp -u)
      mkfifo "$FIFO"

      # Producer: read log and send to FIFO
      grep "ERROR" /var/log/large_application.log > "$FIFO" &

      # Consumer: count and categorize errors from FIFO
      awk -F'[][]' '{print $2}' < "$FIFO" | sort | uniq -c | sort -rn

      rm -f "$FIFO"
    executable: /bin/bash
  register: error_categories
  changed_when: false
```

## Handling Pipe Failures

By default, a pipe returns the exit code of the last command. This means failures in earlier pipe stages go unnoticed. Use `pipefail` in bash to catch them:

```yaml
# use pipefail to detect failures in any stage of a pipe
- name: Safe pipe with pipefail
  ansible.builtin.shell:
    cmd: |
      set -o pipefail
      cat /var/log/app/important.log | grep "CRITICAL" | wc -l
    executable: /bin/bash
  register: critical_count
  changed_when: false
  failed_when: critical_count.rc != 0 and critical_count.rc != 1
  # grep returns 1 when no matches found, which is expected
```

## Practical Example: Automated Log Rotation Report

Here is a complete playbook that demonstrates pipes and redirects in a real scenario:

```yaml
# generate a comprehensive log rotation report using pipes and redirects
---
- name: Log rotation report
  hosts: all
  become: true
  tasks:
    - name: Generate log rotation report
      ansible.builtin.shell:
        cmd: |
          set -o pipefail

          REPORT_FILE="/tmp/log_report_$(hostname)_$(date +%Y%m%d).txt"

          {
            echo "Log Report for $(hostname) - $(date)"
            echo "========================================="
            echo ""

            echo "Top 10 largest log files:"
            find /var/log -type f -name "*.log" -exec du -h {} + 2>/dev/null |
              sort -rh |
              head -10

            echo ""
            echo "Log files not rotated in 30 days:"
            find /var/log -type f -name "*.log" -mtime +30 2>/dev/null |
              while read f; do
                echo "  $(ls -lh "$f" | awk '{print $5, $6, $7, $8, $9}')"
              done

            echo ""
            echo "Total log disk usage:"
            du -sh /var/log 2>/dev/null

          } > "$REPORT_FILE" 2>&1

          cat "$REPORT_FILE"
        executable: /bin/bash
      register: report
      changed_when: false

    - name: Display report
      ansible.builtin.debug:
        var: report.stdout_lines
```

## Summary

Pipes and redirects in Ansible require the `shell` module since the `command` module does not invoke a shell interpreter. Use pipes to chain commands for data processing, `>` and `>>` for output redirection, `2>` for stderr, and `2>&1` to combine streams. Always use `set -o pipefail` with bash to catch failures in pipe chains. The `tee` command is particularly useful for simultaneously logging and capturing output. For complex data processing, combine multi-stage pipes with redirects to build powerful one-liner transformations right in your playbooks.
