# How to Configure Ansible Task Timeout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Timeout, Task Configuration, Error Handling

Description: Configure Ansible task timeouts at the global, play, and task level to prevent hung tasks from blocking playbook execution indefinitely.

---

Tasks that hang indefinitely are one of the most frustrating Ansible problems. A network call that never returns, a package install that gets stuck, or a service that will not start can block your entire playbook forever. Ansible provides timeout settings at multiple levels to protect against this, from global connection timeouts to per-task execution limits.

## Connection Timeout

The most basic timeout controls how long Ansible waits to establish a connection to a host:

```ini
# ansible.cfg - Connection timeout settings
[defaults]
# How long to wait for SSH connections (seconds)
timeout = 30

[ssh_connection]
# SSH-specific timeout
ssh_args = -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=3
```

The `timeout` setting in `[defaults]` controls the overall connection timeout. The SSH-specific settings provide finer control over keep-alive and dead connection detection.

## Task-Level Timeout

Set a timeout on individual tasks using the `timeout` keyword:

```yaml
# task-timeout.yml - Per-task timeout settings
---
- name: Deploy with task timeouts
  hosts: webservers

  tasks:
    # Wait up to 60 seconds for package installation
    - name: Install application packages
      apt:
        name:
          - nginx
          - python3-pip
        state: present
      timeout: 60

    # Wait up to 120 seconds for the service to start
    - name: Start application
      service:
        name: myapp
        state: started
      timeout: 120

    # Wait up to 30 seconds for health check response
    - name: Verify application health
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
      timeout: 30
```

When a task exceeds its timeout, Ansible kills the task and marks it as failed. The error message indicates a timeout occurred.

## Play-Level Timeout

Set a timeout for the entire play:

```yaml
# play-timeout.yml - Limit the entire play duration
---
- name: Quick configuration check
  hosts: all
  timeout: 300  # 5 minutes for the entire play

  tasks:
    - name: Check disk space
      command: df -h /
      changed_when: false

    - name: Check memory
      command: free -m
      changed_when: false

    - name: Check services
      service_facts:
```

If the play does not complete within 300 seconds, it aborts.

## Async Tasks with Timeouts

For long-running tasks, use `async` with `poll` for non-blocking execution with a timeout:

```yaml
# async-timeout.yml - Long-running tasks with async
---
- name: Long-running operations
  hosts: webservers

  tasks:
    # Run a build that might take up to 10 minutes
    - name: Build application from source
      command: make -j4
      args:
        chdir: /opt/src/myapp
      async: 600    # Maximum 600 seconds (10 minutes)
      poll: 30      # Check every 30 seconds

    # Fire and forget - start a process without waiting
    - name: Start background indexing
      command: /opt/app/reindex.sh
      async: 3600   # Maximum 1 hour
      poll: 0       # Do not wait for completion
      register: reindex_job

    # Do other tasks while reindex runs...
    - name: Update configuration
      template:
        src: app.conf.j2
        dest: /etc/app/config.yml

    # Check on the async job later
    - name: Wait for reindex to complete
      async_status:
        jid: "{{ reindex_job.ansible_job_id }}"
      register: reindex_result
      until: reindex_result.finished
      retries: 60
      delay: 60     # Check every minute for up to 60 minutes
```

The difference between `timeout` and `async`:

- `timeout`: Hard kill after N seconds. Task fails.
- `async`: Maximum runtime of N seconds. You control the polling behavior.

## Module-Specific Timeouts

Many Ansible modules have their own timeout parameters:

```yaml
# module-timeouts.yml - Module-specific timeout settings
---
- name: Tasks with module-level timeouts
  hosts: webservers

  tasks:
    # URI module has its own timeout parameter
    - name: Call external API
      uri:
        url: "https://api.example.com/deploy"
        method: POST
        timeout: 30  # HTTP request timeout
        body_format: json
        body:
          version: "{{ app_version }}"

    # wait_for module with timeout
    - name: Wait for port to be available
      wait_for:
        port: 8080
        host: "{{ ansible_host }}"
        timeout: 120  # Wait up to 2 minutes

    # Docker module timeout
    - name: Pull Docker image
      docker_image:
        name: "myapp:{{ version }}"
        source: pull
        timeout: 300  # 5 minutes for image pull

    # Get URL with download timeout
    - name: Download artifact
      get_url:
        url: "https://artifacts.example.com/app.tar.gz"
        dest: /tmp/app.tar.gz
        timeout: 180  # 3 minutes for download
```

## Command Module Timeouts

For shell and command modules, combine `timeout` with wrapper scripts:

```yaml
# command-timeouts.yml
---
- name: Command tasks with timeouts
  hosts: all

  tasks:
    # Using the task-level timeout
    - name: Run a potentially slow command
      command: /opt/scripts/data-export.sh
      timeout: 300

    # Using the system timeout command as a fallback
    - name: Run with system timeout
      command: timeout 300 /opt/scripts/data-export.sh
      register: export_result
      failed_when: export_result.rc not in [0, 124]
      # rc 124 means timeout killed the process
```

## Retry with Timeout

Combine timeout with retries for resilient operations:

```yaml
# retry-timeout.yml - Retry failed timeout operations
---
- name: Resilient operations
  hosts: webservers

  tasks:
    # Retry a task that might timeout
    - name: Wait for service to become healthy
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
        timeout: 10  # Each attempt times out after 10 seconds
      retries: 6     # Try up to 6 times
      delay: 10      # Wait 10 seconds between retries
      register: health
      until: health.status == 200

    # Total maximum wait: 6 attempts * (10s timeout + 10s delay) = 120 seconds
```

## Global Timeout via Environment

Override timeout settings via environment variables:

```bash
# Set connection timeout via environment
export ANSIBLE_TIMEOUT=60

# For SSH specifically
export ANSIBLE_SSH_TIMEOUT=30

# Run with extended timeout for slow networks
ANSIBLE_TIMEOUT=120 ansible-playbook -i inventory/remote site.yml
```

## Detecting and Handling Timeouts

Handle timeout failures gracefully:

```yaml
# handle-timeout.yml - Graceful timeout handling
---
- name: Handle timeouts gracefully
  hosts: webservers

  tasks:
    - name: Attempt service start with timeout
      block:
        - name: Start application
          service:
            name: myapp
            state: started
          timeout: 60

      rescue:
        - name: Timeout recovery
          debug:
            msg: "Service start timed out on {{ inventory_hostname }}, attempting recovery"

        - name: Kill any hung processes
          command: pkill -9 -f myapp
          ignore_errors: true

        - name: Try starting again
          service:
            name: myapp
            state: started
          timeout: 120  # Give more time on retry
```

## Practical Timeout Guidelines

Set timeouts based on expected task duration plus a safety margin:

```yaml
# Reasonable timeouts for common operations
tasks:
  # Package operations: 60-120 seconds
  - name: Install packages
    apt:
      name: nginx
    timeout: 120

  # File transfers: depends on size, 30-300 seconds
  - name: Copy application archive (50MB)
    copy:
      src: app.tar.gz
      dest: /opt/app/
    timeout: 300

  # Service operations: 30-60 seconds
  - name: Restart service
    service:
      name: nginx
      state: restarted
    timeout: 60

  # Health checks: 5-30 seconds per attempt
  - name: Verify health
    uri:
      url: "http://localhost/health"
      timeout: 10
    retries: 6
    delay: 5

  # Database migrations: 300-1800 seconds
  - name: Run migrations
    command: /opt/app/migrate.sh
    timeout: 900
```

Always set timeouts on tasks that involve network calls, service starts, or any external dependency. A playbook without timeouts is a playbook that can hang forever, and that is a much worse outcome than a clean timeout failure that you can investigate.
