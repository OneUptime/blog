# How to Use Ansible to Redirect Command Output to Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Shell Module, Output Redirection, File Management

Description: Learn how to redirect command stdout and stderr to files in Ansible using the shell module with practical examples for logging and reporting.

---

Redirecting command output to files is a fundamental shell operation. In Ansible, this means using the `shell` module since redirection operators (`>`, `>>`, `2>`) are shell features that the `command` module does not support. This guide covers all the redirection patterns you need for logging, reporting, data export, and error capture.

## Basic Output Redirection

The `>` operator writes stdout to a file, overwriting any existing content. The `>>` operator appends instead of overwriting.

```yaml
# basic_redirect.yml - Basic output redirection
---
- name: Basic output redirection examples
  hosts: all
  become: yes

  tasks:
    - name: Write system info to a file (overwrite)
      ansible.builtin.shell:
        cmd: "uname -a > /tmp/system_info.txt"

    - name: Append hostname to the file
      ansible.builtin.shell:
        cmd: "hostname >> /tmp/system_info.txt"

    - name: Append disk usage to the file
      ansible.builtin.shell:
        cmd: "df -h >> /tmp/system_info.txt"

    - name: Append memory info to the file
      ansible.builtin.shell:
        cmd: "free -m >> /tmp/system_info.txt"
```

## Separating stdout and stderr

Different redirect operators handle stdout and stderr independently.

```yaml
# separate_streams.yml - Redirect stdout and stderr separately
---
- name: Separate stdout and stderr
  hosts: all
  become: yes

  tasks:
    - name: Redirect stdout to one file, stderr to another
      ansible.builtin.shell:
        cmd: "find / -name '*.conf' > /tmp/conf_files.txt 2> /tmp/find_errors.txt"

    - name: Redirect only stderr to a file, keep stdout for Ansible
      ansible.builtin.shell:
        cmd: "apt-get update 2> /tmp/apt_errors.txt"
      register: apt_output

    - name: Redirect stderr to stdout (combine both streams)
      ansible.builtin.shell:
        cmd: "nginx -t 2>&1"
      register: nginx_test
      changed_when: false
      failed_when: false

    - name: Redirect both stdout and stderr to the same file
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/migrate > /var/log/migration.log 2>&1"
      register: migration
      # The log file captures everything, but we can still check rc
      failed_when: migration.rc != 0

    - name: Append both streams to a log file
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/daily-job >> /var/log/daily_job.log 2>&1"
```

## Logging Command Execution

Build structured log files from command output.

```yaml
# logging.yml - Structured logging with redirection
---
- name: Structured command logging
  hosts: all
  become: yes

  tasks:
    - name: Create log directory
      ansible.builtin.file:
        path: /var/log/ansible-ops
        state: directory
        mode: '0755'

    - name: Log deployment steps with timestamps
      ansible.builtin.shell:
        cmd: |
          {
            echo "=========================================="
            echo "Deployment started at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
            echo "Host: $(hostname)"
            echo "=========================================="
            echo ""
            echo "--- Step 1: Pull latest code ---"
            cd /opt/myapp && git pull origin main 2>&1
            echo ""
            echo "--- Step 2: Install dependencies ---"
            npm install --production 2>&1
            echo ""
            echo "--- Step 3: Run migrations ---"
            npm run migrate 2>&1
            echo ""
            echo "--- Step 4: Restart service ---"
            systemctl restart myapp 2>&1
            echo ""
            echo "=========================================="
            echo "Deployment completed at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
            echo "=========================================="
          } > /var/log/ansible-ops/deploy_$(date +%Y%m%d_%H%M%S).log 2>&1
      register: deploy_result
```

## Generating Reports

Use redirection to create report files on remote hosts.

```yaml
# reports.yml - Generate report files
---
- name: Generate system reports
  hosts: all
  become: yes

  vars:
    report_date: "{{ ansible_date_time.date }}"
    report_dir: /var/reports

  tasks:
    - name: Ensure report directory exists
      ansible.builtin.file:
        path: "{{ report_dir }}"
        state: directory
        mode: '0755'

    - name: Generate security report
      ansible.builtin.shell:
        cmd: |
          {
            echo "Security Report - {{ report_date }}"
            echo "Host: $(hostname)"
            echo ""
            echo "=== Failed Login Attempts ==="
            grep "Failed password" /var/log/auth.log 2>/dev/null | tail -20 || echo "No auth.log found"
            echo ""
            echo "=== Users with Sudo Access ==="
            getent group sudo 2>/dev/null || getent group wheel 2>/dev/null || echo "No sudo group found"
            echo ""
            echo "=== Open Ports ==="
            ss -tlnp | grep LISTEN
            echo ""
            echo "=== Recent Package Changes ==="
            grep -E "install|upgrade|remove" /var/log/dpkg.log 2>/dev/null | tail -20 || echo "No dpkg.log found"
          } > {{ report_dir }}/security_{{ report_date }}.txt
      changed_when: true

    - name: Generate performance report
      ansible.builtin.shell:
        cmd: |
          {
            echo "Performance Report - {{ report_date }}"
            echo "Host: $(hostname)"
            echo ""
            echo "=== CPU Load ==="
            uptime
            echo ""
            echo "=== Memory Usage ==="
            free -h
            echo ""
            echo "=== Disk Usage ==="
            df -h
            echo ""
            echo "=== Top Processes by CPU ==="
            ps aux --sort=-%cpu | head -11
            echo ""
            echo "=== Top Processes by Memory ==="
            ps aux --sort=-%mem | head -11
          } > {{ report_dir }}/performance_{{ report_date }}.txt
      changed_when: true

    - name: Fetch reports to control node
      ansible.builtin.fetch:
        src: "{{ report_dir }}/{{ item }}_{{ report_date }}.txt"
        dest: "reports/{{ inventory_hostname }}/"
        flat: yes
      loop:
        - security
        - performance
```

## Using tee for Dual Output

The `tee` command writes to a file AND to stdout, so you capture the output in both a file and in Ansible's registered variable.

```yaml
# tee_redirect.yml - Write to file and capture in Ansible
---
- name: Dual output with tee
  hosts: all
  become: yes

  tasks:
    - name: Run command, log to file, and capture in Ansible
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/healthcheck 2>&1 | tee /var/log/healthcheck.log"
      register: health_output
      changed_when: false

    - name: Show the captured output
      ansible.builtin.debug:
        msg: "{{ health_output.stdout_lines }}"

    - name: Append to log file and capture
      ansible.builtin.shell:
        cmd: "df -h 2>&1 | tee -a /var/log/disk_monitoring.log"
      register: disk_output
      changed_when: false

    - name: Write to multiple files simultaneously
      ansible.builtin.shell:
        cmd: "dmesg | tee /tmp/dmesg_full.log | grep -i error | tee /tmp/dmesg_errors.log"
      register: kernel_errors
      changed_when: false
```

## Redirecting to /dev/null

Suppress output you do not care about.

```yaml
# devnull.yml - Suppress unwanted output
---
- name: Suppressing output with /dev/null
  hosts: all
  become: yes

  tasks:
    - name: Suppress stdout, keep stderr
      ansible.builtin.shell:
        cmd: "apt-get update > /dev/null"
      register: apt_update
      # stderr is still captured by Ansible

    - name: Suppress stderr, keep stdout
      ansible.builtin.shell:
        cmd: "find / -name '*.log' 2>/dev/null"
      register: log_files
      changed_when: false

    - name: Suppress all output
      ansible.builtin.shell:
        cmd: "some-noisy-command > /dev/null 2>&1"
      register: quiet_result
      # Only the return code is useful here

    - name: Suppress output but check return code
      ansible.builtin.shell:
        cmd: "grep -q 'pattern' /etc/config.ini 2>/dev/null"
      register: grep_result
      changed_when: false
      failed_when: false
      # rc == 0 means pattern found, rc == 1 means not found
```

## Redirecting to Named Pipes and Process Substitution

Advanced redirection patterns using bash features.

```yaml
# advanced_redirect.yml - Advanced redirection patterns
---
- name: Advanced redirection with bash
  hosts: all
  become: yes

  tasks:
    - name: Process substitution for comparing outputs
      ansible.builtin.shell:
        cmd: "diff <(sort /etc/hosts) <(sort /etc/hosts.bak) > /tmp/hosts_diff.txt || true"
        executable: /bin/bash
      changed_when: false

    - name: Here document redirect
      ansible.builtin.shell:
        cmd: |
          cat > /etc/myapp/config.ini << 'EOF'
          [database]
          host = {{ db_host | default('localhost') }}
          port = {{ db_port | default(5432) }}
          name = {{ db_name | default('myapp') }}
          EOF
      args:
        creates: /etc/myapp/config.ini

    - name: Here string redirect
      ansible.builtin.shell:
        cmd: "base64 <<< 'secret_value' > /tmp/encoded_secret.txt"
        executable: /bin/bash
      no_log: true
```

## Rotating Output Files

Prevent log files from growing indefinitely.

```yaml
# rotate_output.yml - Manage output file rotation
---
- name: Output with rotation
  hosts: all
  become: yes

  tasks:
    - name: Rotate old output file before writing new one
      ansible.builtin.shell:
        cmd: |
          LOG="/var/log/myapp/daily_check.log"
          if [ -f "$LOG" ]; then
            mv "$LOG" "$LOG.$(date -r "$LOG" +%Y%m%d)"
          fi
          {
            echo "Daily Check - $(date)"
            /opt/myapp/bin/daily-check
          } > "$LOG" 2>&1
      changed_when: true

    - name: Write output with automatic size rotation
      ansible.builtin.shell:
        cmd: |
          LOG="/var/log/myapp/audit.log"
          MAX_SIZE=$((10 * 1024 * 1024))  # 10 MB

          if [ -f "$LOG" ]; then
            SIZE=$(stat -c%s "$LOG" 2>/dev/null || stat -f%z "$LOG" 2>/dev/null)
            if [ "$SIZE" -gt "$MAX_SIZE" ]; then
              mv "$LOG" "$LOG.$(date +%Y%m%d%H%M%S)"
              gzip "$LOG."* 2>/dev/null
            fi
          fi

          echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Audit entry" >> "$LOG"
      changed_when: false
```

## Fetching Output Files to Control Node

After generating output files on remote hosts, pull them to your control node.

```yaml
# fetch_output.yml - Fetch output files to control node
---
- name: Generate and fetch output files
  hosts: all
  become: yes

  tasks:
    - name: Generate system inventory file
      ansible.builtin.shell:
        cmd: |
          {
            echo "hostname,ip,os,kernel,uptime"
            echo "$(hostname),$(hostname -I | awk '{print $1}'),$(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2),$(uname -r),$(uptime -p)"
          } > /tmp/inventory_{{ inventory_hostname }}.csv
      changed_when: true

    - name: Fetch inventory file to control node
      ansible.builtin.fetch:
        src: "/tmp/inventory_{{ inventory_hostname }}.csv"
        dest: "reports/inventory/"
        flat: yes

    - name: Clean up remote file
      ansible.builtin.file:
        path: "/tmp/inventory_{{ inventory_hostname }}.csv"
        state: absent
```

## Summary

Output redirection in Ansible requires the `shell` module since redirect operators are shell features. Use `>` for overwriting and `>>` for appending. Separate stdout and stderr with `2>` or combine them with `2>&1`. Use `tee` when you need output in both a file and a registered variable. Redirect to `/dev/null` to suppress noise. For structured logging, wrap your commands in curly braces `{}` to group their output into a single stream. And always use `ansible.builtin.fetch` to pull generated reports back to your control node for centralized analysis.
