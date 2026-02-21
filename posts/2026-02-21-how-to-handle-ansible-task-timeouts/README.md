# How to Handle Ansible Task Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Timeouts, Error Handling, DevOps

Description: Learn how to configure and handle task-level timeouts in Ansible to prevent playbooks from hanging on slow or stuck tasks.

---

Every Ansible engineer has experienced a playbook that just hangs. Maybe a package install is waiting for a lock, a service restart is stuck, or a shell command is blocked on network I/O. Without timeouts, your playbook sits there forever, and if this is running in a CI/CD pipeline, it can block your entire deployment queue.

Ansible provides several mechanisms to handle task timeouts. Understanding them helps you write playbooks that fail fast and fail clearly instead of hanging indefinitely.

## The async and poll Mechanism

The primary way to set a timeout on an individual Ansible task is by using `async` and `poll`. The `async` parameter sets the maximum time (in seconds) that a task is allowed to run. The `poll` parameter controls how often Ansible checks if the task is done.

This example runs a long package update with a 5-minute timeout:

```yaml
# task-timeout-basic.yml - Using async/poll for task-level timeouts
---
- name: Update packages with timeout
  hosts: webservers
  tasks:
    - name: Run apt upgrade with 5 minute timeout
      ansible.builtin.apt:
        upgrade: dist
        update_cache: true
      async: 300       # Maximum 300 seconds (5 minutes)
      poll: 15          # Check every 15 seconds
      become: true
```

If the task takes longer than 300 seconds, Ansible will kill the background job and report a failure. The `poll: 15` means Ansible checks the status every 15 seconds, so you get periodic updates in your output.

## Fire-and-Forget with poll: 0

Setting `poll: 0` launches the task in the background and moves on immediately. This is not a timeout pattern per se, but it is useful when you want to start something and check on it later.

This example starts a database backup in the background and checks on it later:

```yaml
# fire-and-forget.yml - Launch task and check later
---
- name: Background task with later check
  hosts: db_servers
  tasks:
    - name: Start database backup in background
      ansible.builtin.shell: |
        # Run pg_dump for the main application database
        pg_dump -Fc myapp_db > /var/backups/myapp_$(date +%Y%m%d).dump
      async: 1800        # Allow up to 30 minutes
      poll: 0            # Do not wait, move on immediately
      register: backup_job

    - name: Run other tasks while backup runs
      ansible.builtin.debug:
        msg: "Doing other work while backup runs in the background"

    - name: Wait for backup to complete (with timeout)
      ansible.builtin.async_status:
        jid: "{{ backup_job.ansible_job_id }}"
      register: backup_result
      until: backup_result.finished
      retries: 60         # Check 60 times
      delay: 30           # Wait 30 seconds between checks
      # Total max wait: 60 * 30 = 1800 seconds (30 minutes)
```

## Using the timeout Command in Shell Tasks

For shell and command tasks, you can wrap your command with the Linux `timeout` utility. This gives you OS-level timeout control.

This approach is useful when you need to timeout a specific command within a larger script:

```yaml
# shell-timeout.yml - Using the timeout command for shell tasks
---
- name: Shell tasks with OS-level timeouts
  hosts: appservers
  tasks:
    - name: Test connectivity to external API with timeout
      ansible.builtin.shell: |
        # timeout will kill curl after 10 seconds
        timeout 10 curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health
      register: api_check
      failed_when: api_check.rc != 0

    - name: Run database migration with timeout
      ansible.builtin.shell: |
        # Give the migration 10 minutes to complete
        timeout 600 python /opt/myapp/manage.py migrate --no-input
      register: migration_result
      become: true
      become_user: appuser
```

## Handling Timeout Failures Gracefully

When a timeout occurs, you usually want to do cleanup rather than just stopping. You can use `block`, `rescue`, and `always` to handle timeout failures.

This playbook attempts a deployment and cleans up if it times out:

```yaml
# timeout-with-rescue.yml - Graceful handling of timeout failures
---
- name: Deploy with timeout handling
  hosts: appservers
  vars:
    deploy_timeout: 300
  tasks:
    - name: Deployment with timeout protection
      block:
        - name: Pull new container image
          ansible.builtin.shell: |
            docker pull myregistry.example.com/myapp:{{ app_version }}
          async: "{{ deploy_timeout }}"
          poll: 10
          register: pull_result

        - name: Restart application service
          ansible.builtin.systemd:
            name: myapp
            state: restarted
          async: 120
          poll: 5

      rescue:
        - name: Log timeout or failure
          ansible.builtin.debug:
            msg: "Deployment failed or timed out. Rolling back."

        - name: Rollback to previous version
          ansible.builtin.shell: |
            # Switch back to the previous container tag
            docker tag myregistry.example.com/myapp:previous myregistry.example.com/myapp:current
            systemctl restart myapp
          become: true

      always:
        - name: Send notification about deployment status
          ansible.builtin.uri:
            url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
            method: POST
            body_format: json
            body:
              text: "Deployment of {{ app_version }} to {{ inventory_hostname }}: {{ 'SUCCESS' if pull_result is defined and pull_result is succeeded else 'FAILED/TIMED OUT' }}"
          delegate_to: localhost
```

## Setting Default Timeouts in ansible.cfg

You can set default timeout values in your `ansible.cfg` to apply baseline timeouts across all tasks.

```ini
# ansible.cfg - Default timeout settings
[defaults]
# Timeout for connection plugins (SSH, WinRM, etc.)
timeout = 30

# Default async timeout when using async without specifying a value
# Note: This does not automatically make all tasks async

[persistent_connection]
# Timeout for persistent connections (network devices)
command_timeout = 30
connect_timeout = 30
```

These settings affect connection-level timeouts, not individual task execution times. For task-level timeouts, you still need `async`/`poll` on each task.

## Timeout Patterns for Common Scenarios

Different operations need different timeout strategies. Here are patterns I use regularly.

This playbook shows timeouts tuned for various real-world tasks:

```yaml
# common-timeout-patterns.yml - Timeout values for typical operations
---
- name: Common timeout patterns
  hosts: all
  tasks:
    # Package operations: can be slow on first run due to cache updates
    - name: Install packages (generous timeout)
      ansible.builtin.apt:
        name:
          - nginx
          - postgresql-client
          - redis-tools
        state: present
        update_cache: true
      async: 600        # 10 minutes - package downloads can be slow
      poll: 20
      become: true

    # Service health checks: should be fast
    - name: Wait for service to be healthy
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      register: health_check
      until: health_check.status == 200
      retries: 30       # Try 30 times
      delay: 10         # Every 10 seconds
      # Total max wait: 5 minutes

    # File transfers: depends on file size and network
    - name: Copy large artifact to server
      ansible.builtin.copy:
        src: /builds/myapp-2.0.tar.gz
        dest: /opt/releases/myapp-2.0.tar.gz
      async: 900        # 15 minutes for large files
      poll: 30

    # Script execution: should be bounded
    - name: Run data processing script
      ansible.builtin.script: /opt/scripts/process_data.sh
      async: 3600       # 1 hour maximum
      poll: 60          # Check every minute
      register: script_result
```

## Monitoring Task Duration

Sometimes you want to track how long tasks take without necessarily enforcing a hard timeout. This is useful for identifying tasks that are getting slower over time.

```yaml
# track-duration.yml - Measure task execution time
---
- name: Track task duration
  hosts: appservers
  tasks:
    - name: Record start time
      ansible.builtin.set_fact:
        task_start: "{{ now(utc=true) }}"

    - name: Run the potentially slow operation
      ansible.builtin.shell: |
        /opt/myapp/bin/rebuild-indexes.sh
      register: rebuild_result

    - name: Calculate and report duration
      ansible.builtin.debug:
        msg: >
          Index rebuild took {{ ((now(utc=true) - task_start | to_datetime('%Y-%m-%d %H:%M:%S.%f+00:00')).total_seconds()) | int }} seconds
          on {{ inventory_hostname }}

    - name: Warn if task took too long
      ansible.builtin.debug:
        msg: "WARNING: Index rebuild exceeded 5 minute threshold on {{ inventory_hostname }}"
      when: ((now(utc=true) - task_start | to_datetime('%Y-%m-%d %H:%M:%S.%f+00:00')).total_seconds()) > 300
```

## Summary

Task timeouts in Ansible boil down to a few key techniques: `async`/`poll` for Ansible-native timeout control, the OS `timeout` command for shell tasks, and `until`/`retries`/`delay` for polling patterns. Combine these with `block`/`rescue` for graceful failure handling, and you have a solid strategy for preventing hung playbooks. The specific timeout values depend on your environment, but the principle is always the same: every task that could hang should have a bounded execution time.
