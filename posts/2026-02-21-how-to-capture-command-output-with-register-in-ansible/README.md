# How to Capture Command Output with register in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Register, Variables, Automation

Description: Master the register keyword in Ansible to capture command output, use it in conditionals, parse structured data, and build dynamic workflows.

---

The `register` keyword in Ansible captures the result of a task into a variable. This variable holds the return code, stdout, stderr, and other metadata that you can reference in later tasks. It is one of the most powerful features in Ansible because it lets you build dynamic playbooks that react to the state of your systems.

## What register Captures

When you register a variable from a command or shell task, the variable contains a dictionary with several fields.

```yaml
# what_register_captures.yml - Inspect the registered variable structure
---
- name: Explore registered variable contents
  hosts: localhost
  connection: local

  tasks:
    - name: Run a simple command
      ansible.builtin.command:
        cmd: echo "hello world"
      register: result

    - name: Display the full registered variable
      ansible.builtin.debug:
        var: result

    - name: Display individual fields
      ansible.builtin.debug:
        msg: |
          stdout: {{ result.stdout }}
          stdout_lines: {{ result.stdout_lines }}
          stderr: {{ result.stderr }}
          stderr_lines: {{ result.stderr_lines }}
          rc (return code): {{ result.rc }}
          changed: {{ result.changed }}
          cmd: {{ result.cmd }}
          start: {{ result.start }}
          end: {{ result.end }}
          delta: {{ result.delta }}
```

The key fields are:

- `stdout` - The standard output as a single string
- `stdout_lines` - The standard output split into a list of lines
- `stderr` - The standard error as a single string
- `stderr_lines` - Standard error split into lines
- `rc` - The return code (0 for success)
- `changed` - Whether Ansible considers the task as having made changes
- `failed` - Whether the task failed

## Using Registered Variables in Conditionals

The most common use of `register` is making decisions based on command output.

```yaml
# register_conditionals.yml - Use registered output for decisions
---
- name: Conditional task execution based on output
  hosts: all
  become: yes

  tasks:
    - name: Check if nginx is installed
      ansible.builtin.command:
        cmd: which nginx
      register: nginx_check
      changed_when: false
      failed_when: false

    - name: Install nginx if not found
      ansible.builtin.apt:
        name: nginx
        state: present
      when: nginx_check.rc != 0

    - name: Check nginx configuration
      ansible.builtin.command:
        cmd: nginx -t
      register: nginx_config_test
      changed_when: false
      failed_when: false
      when: nginx_check.rc == 0

    - name: Reload nginx if config is valid
      ansible.builtin.service:
        name: nginx
        state: reloaded
      when:
        - nginx_check.rc == 0
        - nginx_config_test.rc == 0
```

## Parsing Command Output

Extract specific information from command output using Ansible filters.

```yaml
# parse_output.yml - Parse and extract data from command output
---
- name: Parse command output
  hosts: all
  become: yes

  tasks:
    - name: Get disk usage percentage for root partition
      ansible.builtin.shell:
        cmd: "df / | tail -1 | awk '{print $5}' | tr -d '%'"
      register: disk_usage
      changed_when: false

    - name: Convert disk usage to integer and check threshold
      ansible.builtin.debug:
        msg: "Disk usage is {{ disk_usage.stdout | int }}%"

    - name: Alert if disk usage is high
      ansible.builtin.debug:
        msg: "WARNING: Disk usage on {{ inventory_hostname }} is {{ disk_usage.stdout }}%!"
      when: disk_usage.stdout | int > 80

    - name: Get system memory information
      ansible.builtin.shell:
        cmd: "free -m | grep Mem | awk '{print $2, $3, $4}'"
      register: memory_info
      changed_when: false

    - name: Parse memory values
      ansible.builtin.set_fact:
        total_mem: "{{ memory_info.stdout.split()[0] | int }}"
        used_mem: "{{ memory_info.stdout.split()[1] | int }}"
        free_mem: "{{ memory_info.stdout.split()[2] | int }}"

    - name: Report memory status
      ansible.builtin.debug:
        msg: "Memory - Total: {{ total_mem }}MB, Used: {{ used_mem }}MB, Free: {{ free_mem }}MB"
```

## Register with Loops

When using `register` with loops, the variable contains a `results` list with one entry per iteration.

```yaml
# register_with_loops.yml - Register variables in loops
---
- name: Register with loops
  hosts: all
  become: yes

  vars:
    services:
      - nginx
      - postgresql
      - redis

  tasks:
    - name: Check status of each service
      ansible.builtin.command:
        cmd: "systemctl is-active {{ item }}"
      register: service_status
      loop: "{{ services }}"
      changed_when: false
      failed_when: false

    - name: Display status for each service
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.stdout }}"
      loop: "{{ service_status.results }}"
      loop_control:
        label: "{{ item.item }}"

    - name: List services that are not running
      ansible.builtin.debug:
        msg: "{{ item.item }} is NOT running"
      loop: "{{ service_status.results }}"
      loop_control:
        label: "{{ item.item }}"
      when: item.rc != 0
```

## Working with JSON Output

Many modern CLI tools output JSON. Parse it directly in Ansible.

```yaml
# register_json.yml - Parse JSON output from commands
---
- name: Parse JSON command output
  hosts: all
  become: yes

  tasks:
    - name: Get Docker container information
      ansible.builtin.command:
        cmd: docker inspect myapp-container
      register: docker_inspect
      changed_when: false
      failed_when: false

    - name: Parse Docker JSON output
      ansible.builtin.set_fact:
        container_info: "{{ docker_inspect.stdout | from_json }}"
      when: docker_inspect.rc == 0

    - name: Display container IP address
      ansible.builtin.debug:
        msg: "Container IP: {{ container_info[0].NetworkSettings.IPAddress }}"
      when: docker_inspect.rc == 0

    - name: Get kubectl output as JSON
      ansible.builtin.command:
        cmd: kubectl get pods -n default -o json
      register: pods_json
      changed_when: false
      failed_when: false

    - name: Parse pod information
      ansible.builtin.set_fact:
        pod_names: "{{ (pods_json.stdout | from_json).items | map(attribute='metadata.name') | list }}"
      when: pods_json.rc == 0

    - name: Show running pods
      ansible.builtin.debug:
        msg: "Pods: {{ pod_names }}"
      when: pods_json.rc == 0
```

## Using Register for changed_when and failed_when

Control how Ansible reports task status based on the actual output.

```yaml
# register_status_control.yml - Custom change and failure detection
---
- name: Custom status detection with register
  hosts: all
  become: yes

  tasks:
    - name: Run idempotent update script
      ansible.builtin.shell:
        cmd: /opt/myapp/bin/update-config
      register: update_result
      # Only mark as changed if the script actually modified something
      changed_when: "'Configuration updated' in update_result.stdout"
      # Fail only on specific error messages, not just non-zero exit
      failed_when: "'CRITICAL ERROR' in update_result.stderr"

    - name: Apply database migration
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate
      register: migrate_result
      changed_when: "'Applied' in migrate_result.stdout"
      # "No pending migrations" returns exit code 0, which is fine
      # "Migration failed" returns exit code 1, which should fail

    - name: Check application health
      ansible.builtin.shell:
        cmd: "curl -s http://localhost:8080/health"
      register: health_check
      changed_when: false
      failed_when: >
        health_check.rc != 0 or
        'unhealthy' in health_check.stdout | lower
      retries: 5
      delay: 10
      until: health_check is not failed
```

## Building Dynamic Inventories with Register

Use registered output to build data structures for later use.

```yaml
# register_dynamic_data.yml - Build data structures from output
---
- name: Build dynamic data from command output
  hosts: all
  become: yes

  tasks:
    - name: Get list of running Docker containers
      ansible.builtin.shell:
        cmd: "docker ps --format '{{ '{{' }}.Names{{ '}}' }}:{{ '{{' }}.Status{{ '}}' }}'"
      register: docker_ps
      changed_when: false
      failed_when: false

    - name: Build container status dictionary
      ansible.builtin.set_fact:
        container_statuses: >-
          {{ container_statuses | default({}) | combine({
            item.split(':')[0]: item.split(':')[1]
          }) }}
      loop: "{{ docker_ps.stdout_lines | default([]) }}"

    - name: Show container statuses
      ansible.builtin.debug:
        var: container_statuses

    - name: Get listening ports
      ansible.builtin.shell:
        cmd: "ss -tlnp | grep LISTEN | awk '{print $4}' | rev | cut -d: -f1 | rev | sort -nu"
      register: listening_ports
      changed_when: false

    - name: Store ports as a list
      ansible.builtin.set_fact:
        open_ports: "{{ listening_ports.stdout_lines | map('int') | list }}"

    - name: Check if expected ports are open
      ansible.builtin.debug:
        msg: "Port {{ item }} is {{ 'OPEN' if item in open_ports else 'CLOSED' }}"
      loop:
        - 22
        - 80
        - 443
        - 5432
        - 6379
```

## Register Across Plays

Registered variables are scoped to the host they ran on. To share data between hosts, use `set_fact` with `delegate_to` or `hostvars`.

```yaml
# register_across_hosts.yml - Share registered data between hosts
---
- name: Gather data from database server
  hosts: db_servers
  become: yes

  tasks:
    - name: Get database version
      ansible.builtin.command:
        cmd: psql --version
      register: db_version
      changed_when: false

- name: Use database info on app servers
  hosts: app_servers

  tasks:
    - name: Display database version from db server
      ansible.builtin.debug:
        msg: "Database version: {{ hostvars[groups['db_servers'][0]]['db_version']['stdout'] }}"
```

## Summary

The `register` keyword is fundamental to building reactive Ansible playbooks. It captures `stdout`, `stderr`, return codes, and timing information from tasks. Use it with `when` for conditional execution, with `changed_when` and `failed_when` for accurate status reporting, with `from_json` for parsing structured output, and with loops to collect results from multiple iterations. The variable persists for the duration of the play on that host, making it available to any subsequent task. Master `register` and you unlock the ability to make your playbooks respond intelligently to the actual state of your systems.
