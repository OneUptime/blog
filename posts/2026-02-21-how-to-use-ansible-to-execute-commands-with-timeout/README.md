# How to Use Ansible to Execute Commands with Timeout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Timeout, Async, Command Execution

Description: Learn multiple approaches to setting timeouts on Ansible command execution, including async/poll, the timeout command, and connection-level timeouts.

---

Commands that run too long can stall your entire Ansible playbook. A hung process, a network issue, or a slow database query can leave you staring at your terminal wondering if something is still working or if it has stalled completely. Ansible gives you several ways to enforce time limits on command execution, from task-level timeouts to connection-level settings.

## Method 1: Using async and poll

The `async` and `poll` parameters let you run tasks with a maximum time limit. Setting `async` to a number of seconds defines the maximum runtime, and `poll` controls how often Ansible checks if the task is done.

```yaml
# async_timeout.yml - Use async for task-level timeouts
---
- name: Commands with async timeout
  hosts: all
  become: yes

  tasks:
    - name: Run command with 5-minute timeout
      ansible.builtin.command:
        cmd: /opt/myapp/bin/reindex
      async: 300    # Maximum of 300 seconds (5 minutes)
      poll: 15      # Check every 15 seconds
      register: reindex_result

    - name: Run command with 2-minute timeout
      ansible.builtin.shell:
        cmd: "pg_dump mydb | gzip > /backup/mydb.sql.gz"
      async: 120
      poll: 10
      register: backup_result

    - name: Show results
      ansible.builtin.debug:
        msg: "Backup completed in {{ backup_result.delta | default('unknown') }}"
```

If the command exceeds the `async` timeout, Ansible kills it and the task fails. The `poll` value does not affect the timeout; it just controls how frequently Ansible checks the status.

## Method 2: Using the timeout Command

The Linux `timeout` command is a simpler approach that works with the `shell` module.

```yaml
# linux_timeout.yml - Use the Linux timeout command
---
- name: Commands with Linux timeout utility
  hosts: all
  become: yes

  tasks:
    - name: Run command with 60-second timeout
      ansible.builtin.shell:
        cmd: "timeout 60 /opt/myapp/bin/long-task"
      register: task_result
      # timeout returns exit code 124 when the command is killed
      failed_when: task_result.rc != 0 and task_result.rc != 124

    - name: Handle timeout specifically
      ansible.builtin.debug:
        msg: "Task timed out!"
      when: task_result.rc == 124

    - name: Run with timeout and specific signal
      ansible.builtin.shell:
        cmd: "timeout --signal=SIGTERM --kill-after=10 30 /opt/myapp/bin/worker"
      register: worker_result
      failed_when: false
      # --signal=SIGTERM sends SIGTERM first
      # --kill-after=10 sends SIGKILL if still running 10 seconds after SIGTERM

    - name: Report worker status
      ansible.builtin.debug:
        msg: >
          Worker status: {{ 'completed normally' if worker_result.rc == 0
          else ('timed out' if worker_result.rc == 124
          else 'failed with rc=' + worker_result.rc | string) }}
```

## Method 3: Ansible's timeout Task Parameter

Ansible 2.10 and later support a `timeout` parameter directly on tasks.

```yaml
# task_timeout.yml - Use Ansible's built-in task timeout
---
- name: Commands with task timeout parameter
  hosts: all
  become: yes

  tasks:
    - name: Quick health check with 10-second timeout
      ansible.builtin.command:
        cmd: curl -s http://localhost:8080/health
      timeout: 10
      register: health_result
      changed_when: false

    - name: Database query with 30-second timeout
      ansible.builtin.shell:
        cmd: "psql -d mydb -c 'SELECT count(*) FROM large_table;'"
      timeout: 30
      become_user: postgres
      register: query_result
      changed_when: false

    - name: File transfer with 5-minute timeout
      ansible.builtin.command:
        cmd: "rsync -avz /data/backup/ backup-server:/backup/"
      timeout: 300
      register: rsync_result
```

The `timeout` parameter is clean and straightforward. When the time limit is reached, Ansible kills the task and reports a failure.

## Method 4: Connection-Level Timeouts

Ansible has several connection timeout settings that affect how long it waits for SSH connections and command responses.

```yaml
# connection_timeouts.yml - Connection-level timeout configuration
---
- name: Connection timeouts
  hosts: all
  become: yes

  vars:
    ansible_connect_timeout: 30    # SSH connection timeout in seconds
    ansible_command_timeout: 60    # Command execution timeout

  tasks:
    - name: Command that respects connection timeout
      ansible.builtin.command:
        cmd: /opt/myapp/bin/check
      register: check_result
      changed_when: false
```

You can also set these in `ansible.cfg`:

```ini
# ansible.cfg - Timeout configuration
[defaults]
# Timeout for connection plugins to use
timeout = 30

[ssh_connection]
# SSH connection timeout
timeout = 30

# How long to wait for a command to complete
# (Note: this is different from the task timeout)
```

## Combining Timeouts with Retries

Timeouts work well with retry logic for transient failures.

```yaml
# timeout_with_retry.yml - Timeout combined with retries
---
- name: Timeout with automatic retries
  hosts: all
  become: yes

  tasks:
    - name: Wait for service to become healthy with timeout and retries
      ansible.builtin.command:
        cmd: "curl -sf http://localhost:8080/health"
      register: health_check
      retries: 10
      delay: 5
      until: health_check.rc == 0
      timeout: 10
      changed_when: false
      failed_when: false

    - name: Report final health status
      ansible.builtin.debug:
        msg: "Service health: {{ 'UP' if health_check.rc == 0 else 'DOWN after 10 retries' }}"

    - name: Database connection check with retries
      ansible.builtin.shell:
        cmd: "timeout 5 pg_isready -h {{ db_host | default('localhost') }}"
      register: db_check
      retries: 6
      delay: 10
      until: db_check.rc == 0
      changed_when: false

    - name: API call with exponential backoff
      ansible.builtin.shell:
        cmd: "timeout 30 curl -sf https://api.example.com/status"
      register: api_check
      retries: 5
      delay: "{{ item | int }}"
      with_sequence: start=2 end=32 stride=0
      until: api_check.rc == 0
      changed_when: false
      failed_when: false
```

## Timeout for Long-Running Background Tasks

For tasks that should run but not block the playbook, use async with `poll: 0` and check later.

```yaml
# background_with_timeout.yml - Fire-and-forget with timeout check
---
- name: Long-running background tasks with timeouts
  hosts: all
  become: yes

  tasks:
    - name: Start database reindex in background
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/reindex --full"
      async: 3600   # Allow up to 1 hour
      poll: 0       # Don't wait for completion
      register: reindex_job

    - name: Start log processing in background
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/process-logs --all"
      async: 1800   # Allow up to 30 minutes
      poll: 0
      register: log_job

    - name: Do other tasks while background jobs run
      ansible.builtin.command:
        cmd: /opt/myapp/bin/quick-task
      changed_when: true

    - name: Check on reindex job (with timeout)
      ansible.builtin.async_status:
        jid: "{{ reindex_job.ansible_job_id }}"
      register: reindex_status
      until: reindex_status.finished
      retries: 240  # Check for up to 240 * 15 = 3600 seconds (1 hour)
      delay: 15

    - name: Check on log processing job
      ansible.builtin.async_status:
        jid: "{{ log_job.ansible_job_id }}"
      register: log_status
      until: log_status.finished
      retries: 120  # 120 * 15 = 1800 seconds (30 minutes)
      delay: 15
```

## Timeout with Error Handling

Combine timeouts with block/rescue for graceful error handling.

```yaml
# timeout_error_handling.yml - Graceful timeout error handling
---
- name: Timeout with error handling
  hosts: all
  become: yes

  tasks:
    - name: Attempt operation with timeout and fallback
      block:
        - name: Try the primary approach
          ansible.builtin.shell:
            cmd: "timeout 60 /opt/myapp/bin/full-sync"
          register: sync_result

        - name: Verify sync completed
          ansible.builtin.command:
            cmd: /opt/myapp/bin/verify-sync
          changed_when: false

      rescue:
        - name: Log the timeout failure
          ansible.builtin.debug:
            msg: "Full sync timed out or failed, attempting incremental sync"

        - name: Fall back to incremental sync
          ansible.builtin.shell:
            cmd: "timeout 120 /opt/myapp/bin/incremental-sync"
          register: incremental_result

      always:
        - name: Record sync status
          ansible.builtin.copy:
            content: |
              sync_date: {{ ansible_date_time.iso8601 }}
              full_sync: {{ sync_result is defined and sync_result.rc == 0 }}
              incremental_sync: {{ incremental_result is defined and incremental_result.rc | default(1) == 0 }}
            dest: /var/lib/myapp/last_sync_status.yml
```

## Custom Timeout Wrapper Script

For complex timeout behavior, use a wrapper script.

```bash
# scripts/run_with_timeout.sh - Wrapper for complex timeout logic
#!/bin/bash
# Usage: run_with_timeout.sh <timeout_seconds> <command> [args...]
TIMEOUT=$1
shift
CMD="$@"

echo "Starting command with ${TIMEOUT}s timeout: $CMD"
START=$(date +%s)

# Run command in background
eval "$CMD" &
PID=$!

# Monitor the command
while kill -0 $PID 2>/dev/null; do
    ELAPSED=$(($(date +%s) - START))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "TIMEOUT: Command exceeded ${TIMEOUT}s limit"
        kill -TERM $PID 2>/dev/null
        sleep 5
        kill -KILL $PID 2>/dev/null
        exit 124
    fi
    sleep 1
done

wait $PID
EXIT_CODE=$?
ELAPSED=$(($(date +%s) - START))
echo "Command completed in ${ELAPSED}s with exit code ${EXIT_CODE}"
exit $EXIT_CODE
```

```yaml
# use_wrapper.yml - Use the timeout wrapper script
---
- name: Use custom timeout wrapper
  hosts: all
  become: yes

  tasks:
    - name: Copy timeout wrapper
      ansible.builtin.copy:
        src: scripts/run_with_timeout.sh
        dest: /usr/local/bin/run_with_timeout.sh
        mode: '0755'

    - name: Run command with custom timeout wrapper
      ansible.builtin.command:
        cmd: "/usr/local/bin/run_with_timeout.sh 120 /opt/myapp/bin/heavy-task"
      register: task_result
      failed_when: task_result.rc != 0 and task_result.rc != 124
```

## Summary

Ansible offers multiple timeout mechanisms for different situations. Use the `timeout` task parameter for simple task-level limits. Use `async`/`poll` when you need to fire off long-running jobs and check them later. Use the Linux `timeout` command within `shell` for precise control over signal handling. And use connection-level timeouts in `ansible.cfg` for SSH-related limits. Combine timeouts with `retries`/`until` for resilient operations, and use `block`/`rescue` for graceful fallback when timeouts occur. The right choice depends on whether you need the timeout on the connection layer, the task layer, or the command layer.
