# How to Use Ansible to Pipe Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Shell Module, Pipes, Command Chaining

Description: Learn how to use pipes in Ansible to chain commands together for filtering, processing, and transforming data on remote hosts using the shell module.

---

Pipes are one of the most powerful features of Unix shells. They let you connect the output of one command to the input of another, building complex data processing pipelines from simple tools. In Ansible, using pipes means reaching for the `shell` module instead of `command`, because the `command` module does not process shell metacharacters.

## Why the shell Module for Pipes

The `command` module executes commands directly without a shell interpreter. Since pipes (`|`) are a shell feature, they do not work with `command`. You need the `shell` module, which passes your command through `/bin/sh`.

```yaml
# pipe_basics.yml - Basic pipe usage in Ansible
---
- name: Basic pipe examples
  hosts: all
  become: yes

  tasks:
    # This fails because command module doesn't process pipes
    - name: WRONG - command module with pipe
      ansible.builtin.command:
        cmd: "ps aux | grep nginx"
      register: wrong_way
      ignore_errors: yes

    # This works because shell module processes pipes
    - name: RIGHT - shell module with pipe
      ansible.builtin.shell:
        cmd: "ps aux | grep nginx | grep -v grep"
      register: right_way
      changed_when: false
      failed_when: false

    - name: Show the output
      ansible.builtin.debug:
        msg: "{{ right_way.stdout_lines }}"
```

## Common Pipe Patterns

Here are the pipe patterns you will use most often in Ansible playbooks.

### Filtering Output

```yaml
# filtering.yml - Filter command output with pipes
---
- name: Filtering with pipes
  hosts: all
  become: yes

  tasks:
    - name: Find listening ports
      ansible.builtin.shell:
        cmd: "ss -tlnp | grep LISTEN"
      register: listening_ports
      changed_when: false

    - name: Get only error lines from a log
      ansible.builtin.shell:
        cmd: "cat /var/log/syslog | grep -i error | tail -20"
      register: error_lines
      changed_when: false
      failed_when: false

    - name: Find large files in /var
      ansible.builtin.shell:
        cmd: "find /var -type f -size +100M 2>/dev/null | head -10"
      register: large_files
      changed_when: false
```

### Counting and Aggregating

```yaml
# counting.yml - Count and aggregate data with pipes
---
- name: Counting and aggregation
  hosts: all
  become: yes

  tasks:
    - name: Count running processes
      ansible.builtin.shell:
        cmd: "ps aux | wc -l"
      register: process_count
      changed_when: false

    - name: Count unique logged-in users
      ansible.builtin.shell:
        cmd: "who | awk '{print $1}' | sort -u | wc -l"
      register: user_count
      changed_when: false

    - name: Count files by extension in a directory
      ansible.builtin.shell:
        cmd: |
          find /opt/myapp -type f | \
            sed 's/.*\.//' | \
            sort | \
            uniq -c | \
            sort -rn
      register: file_types
      changed_when: false

    - name: Sum disk usage across mount points
      ansible.builtin.shell:
        cmd: "df -BG --output=used | tail -n +2 | tr -d 'G' | paste -sd+ | bc"
      register: total_disk
      changed_when: false
      failed_when: false
```

### Sorting and Selecting

```yaml
# sorting.yml - Sort and select data with pipes
---
- name: Sorting and selection
  hosts: all
  become: yes

  tasks:
    - name: Top 10 processes by memory
      ansible.builtin.shell:
        cmd: "ps aux --sort=-%mem | head -11"
      register: top_mem
      changed_when: false

    - name: Top 10 processes by CPU
      ansible.builtin.shell:
        cmd: "ps aux --sort=-%cpu | head -11"
      register: top_cpu
      changed_when: false

    - name: Most recently modified files
      ansible.builtin.shell:
        cmd: "find /opt/myapp -type f -printf '%T@ %p\n' | sort -rn | head -10 | cut -d' ' -f2-"
      register: recent_files
      changed_when: false

    - name: Largest directories
      ansible.builtin.shell:
        cmd: "du -sh /var/log/* 2>/dev/null | sort -rh | head -10"
      register: large_dirs
      changed_when: false
```

## Multi-Stage Pipelines

Chain multiple commands for complex data processing.

```yaml
# multi_stage.yml - Complex multi-stage pipelines
---
- name: Multi-stage pipe processing
  hosts: all
  become: yes

  tasks:
    - name: Analyze nginx access log for top IPs and request counts
      ansible.builtin.shell:
        cmd: |
          cat /var/log/nginx/access.log | \
            awk '{print $1}' | \
            sort | \
            uniq -c | \
            sort -rn | \
            head -20 | \
            awk '{printf "%-8s %s\n", $1, $2}'
      register: top_ips
      changed_when: false
      failed_when: false

    - name: Show top IPs
      ansible.builtin.debug:
        msg: "{{ top_ips.stdout }}"
      when: top_ips.rc == 0

    - name: Get HTTP status code distribution
      ansible.builtin.shell:
        cmd: |
          awk '{print $9}' /var/log/nginx/access.log | \
            grep -E '^[0-9]{3}$' | \
            sort | \
            uniq -c | \
            sort -rn | \
            awk '{
              total += $1
              codes[$2] = $1
            }
            END {
              for (code in codes) {
                pct = (codes[code] / total) * 100
                printf "%s: %d (%.1f%%)\n", code, codes[code], pct
              }
            }' | sort -t: -k1n
      register: status_dist
      changed_when: false
      failed_when: false

    - name: Find users with failed SSH login attempts
      ansible.builtin.shell:
        cmd: |
          grep "Failed password" /var/log/auth.log 2>/dev/null | \
            awk '{print $(NF-5)}' | \
            sort | \
            uniq -c | \
            sort -rn | \
            head -10
      register: failed_logins
      changed_when: false
      failed_when: false
```

## Pipes with Error Handling

In a pipeline, the exit code is the exit code of the last command by default. This can mask errors.

```yaml
# pipe_errors.yml - Handling errors in pipelines
---
- name: Pipeline error handling
  hosts: all
  become: yes

  tasks:
    - name: Pipeline where first command might fail (default behavior)
      ansible.builtin.shell:
        cmd: "cat /nonexistent/file 2>/dev/null | wc -l"
      register: default_behavior
      changed_when: false
      # This succeeds because wc -l returns 0 (exit code 0)
      # even though cat failed

    - name: Pipeline with pipefail (catch first command failure)
      ansible.builtin.shell:
        cmd: |
          set -o pipefail
          cat /nonexistent/file | wc -l
        executable: /bin/bash
      register: pipefail_behavior
      changed_when: false
      failed_when: false
      # This fails because set -o pipefail makes the pipeline
      # return the exit code of the first failing command

    - name: Safe pipeline with fallback
      ansible.builtin.shell:
        cmd: |
          set -o pipefail
          grep "ERROR" /var/log/myapp/app.log 2>/dev/null | wc -l || echo "0"
        executable: /bin/bash
      register: error_count
      changed_when: false
```

## Pipes for Data Transformation

Transform data into formats you need.

```yaml
# data_transform.yml - Transform data with pipes
---
- name: Data transformation pipelines
  hosts: all
  become: yes

  tasks:
    - name: Convert process list to JSON-like format
      ansible.builtin.shell:
        cmd: |
          ps aux --no-headers | \
            awk '{printf "{\"user\":\"%s\",\"pid\":%s,\"cpu\":%s,\"mem\":%s,\"command\":\"%s\"}\n", $1, $2, $3, $4, $11}' | \
            head -20
      register: process_json
      changed_when: false

    - name: Extract specific fields from CSV
      ansible.builtin.shell:
        cmd: |
          cat /opt/data/report.csv | \
            cut -d',' -f1,3,5 | \
            tail -n +2 | \
            sort -t',' -k3 -rn | \
            head -10
      register: csv_extract
      changed_when: false
      failed_when: false

    - name: Transform key=value config to environment format
      ansible.builtin.shell:
        cmd: |
          cat /etc/myapp/app.conf | \
            grep -v '^#' | \
            grep -v '^$' | \
            sed 's/\s*=\s*/=/' | \
            awk -F= '{print toupper($1) "=" $2}'
      register: env_format
      changed_when: false
      failed_when: false
```

## Pipes with tee for Logging

Use `tee` to capture intermediate pipeline output.

```yaml
# tee_pipes.yml - Use tee in pipelines for logging
---
- name: Pipeline with tee for logging
  hosts: all
  become: yes

  tasks:
    - name: Process data and log intermediate results
      ansible.builtin.shell:
        cmd: |
          cat /var/log/nginx/access.log | \
            tee /tmp/raw_access.log | \
            awk '{print $1, $9}' | \
            tee /tmp/ip_status.log | \
            grep ' 5[0-9][0-9]' | \
            tee /tmp/server_errors.log | \
            awk '{print $1}' | \
            sort | uniq -c | sort -rn
      register: error_ips
      changed_when: false
      failed_when: false

    - name: Show IPs causing server errors
      ansible.builtin.debug:
        msg: "{{ error_ips.stdout }}"
      when: error_ips.stdout | length > 0
```

## Piping Command Output into Other Commands

Use pipes to feed data into commands that process stdin.

```yaml
# stdin_pipes.yml - Feed data via pipes
---
- name: Pipe data into processing commands
  hosts: all
  become: yes

  tasks:
    - name: Import SQL via pipe
      ansible.builtin.shell:
        cmd: "cat /tmp/schema.sql | psql -d mydb"
      become_user: postgres
      register: sql_import
      failed_when: false

    - name: Compress and transfer via pipe
      ansible.builtin.shell:
        cmd: "tar cf - /opt/myapp/data | gzip | ssh backup@nas.example.com 'cat > /backup/myapp_data.tar.gz'"
      register: backup_result
      changed_when: true

    - name: Base64 encode a file via pipe
      ansible.builtin.shell:
        cmd: "cat /etc/myapp/cert.pem | base64 -w 0"
      register: cert_b64
      changed_when: false
      no_log: true

    - name: Decode and write via pipe
      ansible.builtin.shell:
        cmd: "echo '{{ encoded_config }}' | base64 -d > /etc/myapp/config.yml"
      when: encoded_config is defined
      no_log: true
```

## Using xargs in Pipes

The `xargs` command builds and executes commands from piped input.

```yaml
# xargs_pipes.yml - Using xargs in pipelines
---
- name: Pipe with xargs
  hosts: all
  become: yes

  tasks:
    - name: Kill all processes matching a pattern
      ansible.builtin.shell:
        cmd: "pgrep -f 'myapp-worker' | xargs -r kill -TERM"
      register: kill_result
      changed_when: kill_result.rc == 0
      failed_when: false

    - name: Remove old Docker images
      ansible.builtin.shell:
        cmd: "docker images --filter 'dangling=true' -q | xargs -r docker rmi"
      register: docker_cleanup
      changed_when: docker_cleanup.stdout | length > 0
      failed_when: false

    - name: Batch rename files
      ansible.builtin.shell:
        cmd: |
          find /opt/logs -name '*.log.old' | \
            xargs -I{} sh -c 'mv "{}" "$(echo {} | sed s/.old/.archived/)"'
      register: rename_result
      changed_when: rename_result.rc == 0
```

## Summary

Pipes in Ansible require the `shell` module since the `command` module does not process shell metacharacters. Use pipes for filtering (`grep`), counting (`wc`), sorting (`sort`), selecting (`head`/`tail`), and transforming (`awk`/`sed`) data. Always set `changed_when: false` on read-only pipelines, use `set -o pipefail` with `/bin/bash` to catch errors in any stage of the pipeline, and use `tee` when you need to capture intermediate results. Remember that in a default pipeline, only the exit code of the last command is returned, so explicit error handling is important for reliable playbooks.
