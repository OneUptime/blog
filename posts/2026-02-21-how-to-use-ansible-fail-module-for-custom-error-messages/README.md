# How to Use Ansible fail Module for Custom Error Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Fail Module, Automation

Description: Learn how to use the Ansible fail module to stop playbook execution with descriptive custom error messages based on specific conditions.

---

The `fail` module in Ansible does exactly what its name says: it makes a task fail on purpose. But the real value is in the `msg` parameter, which lets you provide a clear, descriptive error message explaining why the playbook is stopping. Instead of letting Ansible fail with a generic or confusing error deeper in the playbook, you can catch problems early and tell the operator exactly what went wrong and how to fix it.

## Basic fail Module Usage

At its simplest, the fail module stops execution with a message.

```yaml
# Basic fail module usage
---
- name: Fail module basics
  hosts: localhost
  gather_facts: false

  vars:
    target_environment: "invalid"

  tasks:
    - name: Validate environment
      ansible.builtin.fail:
        msg: >
          Invalid target environment: '{{ target_environment }}'.
          Must be one of: development, staging, production.
          Usage: ansible-playbook deploy.yml -e "target_environment=production"
      when: target_environment not in ['development', 'staging', 'production']
```

When this task runs and the condition is true, the playbook stops and the operator sees the exact message explaining the problem and how to fix it. This is infinitely better than a cryptic "undefined variable" or "template error" five tasks later.

## Conditional Failure Based on System State

Use the fail module after gathering information to stop when the system is in a bad state.

```yaml
# Fail based on system state
---
- name: Pre-flight system checks
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Check available disk space
      ansible.builtin.command:
        cmd: df --output=avail -BG /
      register: disk_space
      changed_when: false

    - name: Parse available space
      ansible.builtin.set_fact:
        available_gb: "{{ disk_space.stdout_lines[-1] | regex_search('(\\d+)', '\\1') | first | int }}"

    - name: Fail if disk space is too low
      ansible.builtin.fail:
        msg: >
          Insufficient disk space on {{ inventory_hostname }}.
          Available: {{ available_gb }}GB. Required: 10GB minimum.
          Free up disk space before running this playbook.
      when: available_gb | int < 10

    - name: Check system load
      ansible.builtin.command:
        cmd: cat /proc/loadavg
      register: load_info
      changed_when: false

    - name: Parse load average
      ansible.builtin.set_fact:
        load_1min: "{{ load_info.stdout.split()[0] | float }}"

    - name: Fail if system is under heavy load
      ansible.builtin.fail:
        msg: >
          System load is too high on {{ inventory_hostname }}.
          Current 1-min load average: {{ load_1min }}.
          Maximum allowed: {{ ansible_processor_vcpus * 2 }}.
          Wait for the system load to decrease before deploying.
      when: load_1min | float > (ansible_processor_vcpus * 2)
```

## Multi-Line Error Messages

For complex validations, multi-line error messages help the operator understand what went wrong.

```yaml
# Detailed multi-line error messages
---
- name: Comprehensive validation
  hosts: all
  become: true

  tasks:
    - name: Gather validation data
      block:
        - name: Check Java version
          ansible.builtin.command:
            cmd: java -version
          register: java_check
          changed_when: false
          failed_when: false

        - name: Check Docker status
          ansible.builtin.command:
            cmd: docker info
          register: docker_check
          changed_when: false
          failed_when: false

        - name: Check PostgreSQL connectivity
          ansible.builtin.command:
            cmd: pg_isready -h {{ db_host | default('localhost') }}
          register: pg_check
          changed_when: false
          failed_when: false

    - name: Build validation report
      ansible.builtin.set_fact:
        validation_failures: >-
          {{
            ([] if java_check.rc == 0 else ['Java is not installed or not in PATH']) +
            ([] if docker_check.rc == 0 else ['Docker is not running or not accessible']) +
            ([] if pg_check.rc == 0 else ['PostgreSQL is not reachable at ' + db_host | default('localhost')])
          }}

    - name: Fail with detailed validation report
      ansible.builtin.fail:
        msg: |
          ========================================
          DEPLOYMENT PREREQUISITES CHECK FAILED
          ========================================
          Host: {{ inventory_hostname }}

          The following checks failed:
          {% for failure in validation_failures %}
            - {{ failure }}
          {% endfor %}

          Please resolve these issues and run the playbook again.
          ========================================
      when: validation_failures | length > 0
```

## Using fail as a Guard Clause

Guard clauses at the top of playbooks or roles prevent execution when conditions are not met.

```yaml
# Guard clauses with fail module
---
- name: Production deployment
  hosts: production
  become: true

  tasks:
    # Guard: Prevent running during business hours
    - name: Check deployment window
      ansible.builtin.fail:
        msg: >
          Deployments to production are not allowed during business hours (9 AM - 6 PM).
          Current time: {{ ansible_date_time.hour }}:{{ ansible_date_time.minute }}.
          Please schedule this deployment outside business hours or use
          -e "force_deploy=true" to override.
      when:
        - ansible_date_time.hour | int >= 9
        - ansible_date_time.hour | int < 18
        - not (force_deploy | default(false) | bool)

    # Guard: Require approval tag
    - name: Check approval
      ansible.builtin.fail:
        msg: >
          Production deployments require an approval ticket.
          Please provide: -e "approval_ticket=DEPLOY-1234"
      when: approval_ticket is not defined or approval_ticket | length == 0

    # Guard: Prevent deploying to all servers at once
    - name: Check batch size
      ansible.builtin.fail:
        msg: >
          Cannot deploy to all production servers simultaneously.
          Current host count: {{ ansible_play_hosts | length }}.
          Maximum allowed: {{ max_batch_size | default(5) }}.
          Use --limit or increase max_batch_size.
      when: ansible_play_hosts | length > (max_batch_size | default(5)) | int

    - name: Proceed with deployment
      ansible.builtin.debug:
        msg: "All guards passed, proceeding with deployment"
```

## fail vs assert: When to Use Which

Both `fail` and `assert` can stop a playbook, but they serve different purposes. Use `assert` when checking multiple conditions at once (it evaluates all conditions and reports which failed). Use `fail` when you need complex conditional logic or want to provide very specific error messages.

```yaml
# When to use assert vs fail
---
- name: Assert vs fail comparison
  hosts: all
  gather_facts: true

  tasks:
    # assert is better for checking multiple simple conditions
    - name: Validate system requirements (assert)
      ansible.builtin.assert:
        that:
          - ansible_memtotal_mb >= 2048
          - ansible_processor_vcpus >= 2
          - ansible_distribution == "Ubuntu"
        fail_msg: "System requirements not met"

    # fail is better for complex conditional messages
    - name: Check database version (fail with specific guidance)
      ansible.builtin.command:
        cmd: psql --version
      register: psql_ver
      changed_when: false
      failed_when: false

    - name: Provide specific database guidance
      ansible.builtin.fail:
        msg: >
          {% if psql_ver.rc != 0 %}
          PostgreSQL client is not installed.
          Install it with: sudo apt install postgresql-client
          {% elif '14' not in psql_ver.stdout and '15' not in psql_ver.stdout and '16' not in psql_ver.stdout %}
          PostgreSQL client version is too old: {{ psql_ver.stdout }}
          This application requires PostgreSQL 14 or newer.
          {% endif %}
      when: psql_ver.rc != 0 or ('14' not in psql_ver.stdout and '15' not in psql_ver.stdout and '16' not in psql_ver.stdout)
```

## Using fail in Loops

You can use fail inside a loop to check multiple items and fail on the first one that does not meet criteria.

```yaml
# Fail in loops for item validation
---
- name: Validate configuration entries
  hosts: localhost
  gather_facts: false

  vars:
    services:
      - name: api
        port: 8080
        health_endpoint: /health
      - name: worker
        port: -1  # Invalid port
        health_endpoint: /health
      - name: web
        port: 3000
        health_endpoint: ""  # Missing endpoint

  tasks:
    - name: Validate service port numbers
      ansible.builtin.fail:
        msg: "Service '{{ item.name }}' has invalid port: {{ item.port }}. Port must be between 1 and 65535."
      loop: "{{ services }}"
      when: item.port | int < 1 or item.port | int > 65535
      loop_control:
        label: "{{ item.name }}"

    - name: Validate health endpoints
      ansible.builtin.fail:
        msg: "Service '{{ item.name }}' is missing a health_endpoint configuration."
      loop: "{{ services }}"
      when: item.health_endpoint | length == 0
      loop_control:
        label: "{{ item.name }}"
```

## Fail with Rescue for Graceful Degradation

Combine fail with block/rescue to create graceful degradation paths.

```yaml
# Graceful degradation with fail and rescue
---
- name: Feature-dependent deployment
  hosts: app_servers
  become: true

  tasks:
    - name: Check for GPU support
      block:
        - name: Detect GPU
          ansible.builtin.command:
            cmd: nvidia-smi
          register: gpu_check
          changed_when: false

        - name: Fail if no GPU for ML workload
          ansible.builtin.fail:
            msg: "No NVIDIA GPU detected, cannot run ML inference workload"
          when: gpu_check.rc != 0

        - name: Deploy GPU-accelerated version
          ansible.builtin.copy:
            src: app-gpu
            dest: /opt/app/app
            mode: '0755'

      rescue:
        - name: Deploy CPU-only version as fallback
          ansible.builtin.copy:
            src: app-cpu
            dest: /opt/app/app
            mode: '0755'

        - name: Note the degraded deployment
          ansible.builtin.debug:
            msg: "Deployed CPU-only version on {{ inventory_hostname }} (no GPU available)"
```

## Dynamic Error Messages with Facts

Build error messages that include relevant system information to help with troubleshooting.

```yaml
# Dynamic error messages with system context
---
- name: Context-rich error messages
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Check available memory for application
      ansible.builtin.fail:
        msg: |
          Insufficient memory for application deployment.

          Current system: {{ inventory_hostname }}
          OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
          Total RAM: {{ ansible_memtotal_mb }}MB
          Free RAM: {{ ansible_memfree_mb }}MB
          Required: 4096MB total

          Options:
          1. Add more memory to this host
          2. Reduce app_memory_limit variable (current: {{ app_memory_limit | default('not set') }})
          3. Use -e "skip_memory_check=true" to bypass this check
      when:
        - ansible_memtotal_mb < 4096
        - not (skip_memory_check | default(false) | bool)
```

The fail module is about intentional failure with clear communication. It transforms vague, mid-playbook crashes into precise, actionable error messages at the point where you detect the problem. Use it liberally at the beginning of playbooks and roles to validate prerequisites. Your operators will spend far less time debugging failed runs when the errors tell them exactly what is wrong and how to fix it.
