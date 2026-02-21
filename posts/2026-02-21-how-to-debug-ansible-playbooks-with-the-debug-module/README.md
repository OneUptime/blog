# How to Debug Ansible Playbooks with the debug Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Troubleshooting, DevOps

Description: Learn how to use the Ansible debug module to inspect variables, display messages, and troubleshoot playbook issues during development and execution.

---

When an Ansible playbook does not do what you expect, you need visibility into what is happening. The `debug` module is your primary tool for this. It lets you print variable values, display messages, and inspect the state of your playbook at any point during execution. Combined with verbosity levels and the `register` directive, it gives you everything you need to find and fix problems.

## Basic debug Usage

The `debug` module has two main parameters: `msg` for displaying messages and `var` for displaying variable contents:

```yaml
# basic-debug.yml - Show messages and variables
---
- name: Debug module basics
  hosts: all
  gather_facts: yes

  tasks:
    - name: Display a simple message
      debug:
        msg: "Running on {{ inventory_hostname }}"

    - name: Display a variable
      debug:
        var: ansible_distribution

    - name: Display multiple facts
      debug:
        msg: "OS: {{ ansible_distribution }} {{ ansible_distribution_version }}, Arch: {{ ansible_architecture }}"
```

The output looks like:

```
TASK [Display a simple message] ************************************************
ok: [web1.example.com] => {
    "msg": "Running on web1.example.com"
}

TASK [Display a variable] ******************************************************
ok: [web1.example.com] => {
    "ansible_distribution": "Ubuntu"
}
```

## Inspecting Registered Variables

The most common debugging pattern is registering a task result and then displaying it:

```yaml
# debug-register.yml - Inspect task results
---
- name: Debug registered variables
  hosts: all
  become: yes

  tasks:
    - name: Check disk usage
      command: df -h /
      register: disk_usage
      changed_when: false

    - name: Show full registered variable
      debug:
        var: disk_usage

    - name: Show just the stdout
      debug:
        var: disk_usage.stdout_lines

    - name: Show return code
      debug:
        msg: "Command exited with code: {{ disk_usage.rc }}"

    - name: Check a service status
      command: systemctl status nginx
      register: nginx_status
      ignore_errors: yes
      changed_when: false

    - name: Show service details
      debug:
        msg:
          - "Return code: {{ nginx_status.rc }}"
          - "Running: {{ nginx_status.rc == 0 }}"
          - "Output: {{ nginx_status.stdout_lines[:5] }}"
```

## Debugging Complex Data Structures

When working with lists, dictionaries, and nested data, the debug module helps you understand the structure:

```yaml
# debug-complex.yml - Inspect complex data structures
---
- name: Debug complex variables
  hosts: localhost
  connection: local

  vars:
    users:
      - name: alice
        role: admin
        ssh_keys:
          - ssh-ed25519 AAAA...1
          - ssh-ed25519 AAAA...2
      - name: bob
        role: developer
        ssh_keys:
          - ssh-ed25519 AAAA...3

    server_config:
      listen:
        address: "0.0.0.0"
        port: 8080
      database:
        host: db.example.com
        pool_size: 20
      features:
        - name: api
          enabled: true
        - name: webhooks
          enabled: false

  tasks:
    - name: Show entire users list
      debug:
        var: users

    - name: Show first user
      debug:
        var: users[0]

    - name: Show first user's name
      debug:
        var: users[0].name

    - name: Show all user names
      debug:
        msg: "{{ users | map(attribute='name') | list }}"

    - name: Show nested config value
      debug:
        msg: "Database host: {{ server_config.database.host }}"

    - name: Show enabled features
      debug:
        msg: "{{ server_config.features | selectattr('enabled', 'equalto', true) | map(attribute='name') | list }}"

    - name: Pretty print entire config
      debug:
        var: server_config
        verbosity: 0  # Show at any verbosity level
```

## Conditional Debugging

Use `when` to only show debug output under certain conditions:

```yaml
# conditional-debug.yml - Debug based on conditions
---
- name: Conditional debugging
  hosts: all
  become: yes

  tasks:
    - name: Check memory usage
      shell: free -m | awk '/Mem:/{printf "%.0f", $3/$2 * 100}'
      register: memory_pct
      changed_when: false

    - name: Warn about high memory usage
      debug:
        msg: "WARNING: Memory usage on {{ inventory_hostname }} is {{ memory_pct.stdout }}%!"
      when: memory_pct.stdout | int > 80

    - name: Check disk usage
      shell: df / | awk 'NR==2{print $5}' | tr -d '%'
      register: disk_pct
      changed_when: false

    - name: Warn about high disk usage
      debug:
        msg: "WARNING: Disk usage on {{ inventory_hostname }} is {{ disk_pct.stdout }}%!"
      when: disk_pct.stdout | int > 85

    - name: Check if required service is running
      command: systemctl is-active myapp
      register: svc_check
      changed_when: false
      failed_when: false

    - name: Alert if service is down
      debug:
        msg: "ALERT: myapp is not running on {{ inventory_hostname }}"
      when: svc_check.rc != 0
```

## Verbosity Levels

The `verbosity` parameter controls when debug output appears based on the `-v` flags:

```yaml
# verbosity-levels.yml - Different debug levels
---
- name: Debug with verbosity levels
  hosts: all

  tasks:
    # Always shown (verbosity: 0 is the default)
    - name: Always visible message
      debug:
        msg: "Deployment starting on {{ inventory_hostname }}"
      # verbosity: 0 (default)

    # Only shown with -v or higher
    - name: Verbose details
      debug:
        msg: "Using Python: {{ ansible_python_interpreter | default('/usr/bin/python3') }}"
        verbosity: 1

    # Only shown with -vv or higher
    - name: More verbose details
      debug:
        var: ansible_all_ipv4_addresses
        verbosity: 2

    # Only shown with -vvv or higher
    - name: Very verbose details
      debug:
        var: hostvars[inventory_hostname]
        verbosity: 3
```

Run with different verbosity:

```bash
# Normal run - only verbosity:0 debug messages
ansible-playbook verbosity-levels.yml

# Verbose - shows verbosity:0 and verbosity:1
ansible-playbook -v verbosity-levels.yml

# Very verbose - shows 0, 1, and 2
ansible-playbook -vv verbosity-levels.yml

# Debug level - shows everything
ansible-playbook -vvv verbosity-levels.yml
```

## Debugging Loops

When tasks use loops, debug helps you see what each iteration is doing:

```yaml
# debug-loops.yml - Debug loop iterations
---
- name: Debug loop behavior
  hosts: localhost
  connection: local

  vars:
    packages:
      - name: nginx
        state: present
        config: /etc/nginx/nginx.conf
      - name: redis
        state: present
        config: /etc/redis/redis.conf
      - name: postgresql
        state: absent
        config: null

  tasks:
    - name: Show each package to be processed
      debug:
        msg: "Package: {{ item.name }}, Action: {{ item.state }}, Config: {{ item.config | default('none') }}"
      loop: "{{ packages }}"

    - name: Show only packages being installed
      debug:
        msg: "Will install: {{ item.name }}"
      loop: "{{ packages }}"
      when: item.state == "present"

    - name: Show loop index
      debug:
        msg: "Item {{ ansible_loop.index }} of {{ ansible_loop.length }}: {{ item.name }}"
      loop: "{{ packages }}"
      loop_control:
        extended: yes
```

## Debugging Jinja2 Expressions

When Jinja2 expressions produce unexpected results, debug them step by step:

```yaml
# debug-jinja.yml - Debug Jinja2 expressions
---
- name: Debug Jinja2 expressions
  hosts: localhost
  connection: local

  vars:
    servers:
      - host: web1
        port: 8080
        weight: 3
      - host: web2
        port: 8080
        weight: 1
      - host: web3
        port: 8081
        weight: 2

  tasks:
    - name: Debug a filter chain step by step
      debug:
        msg:
          - "Raw list: {{ servers }}"
          - "Just hosts: {{ servers | map(attribute='host') | list }}"
          - "Sorted by weight: {{ servers | sort(attribute='weight', reverse=true) | map(attribute='host') | list }}"
          - "Hosts on port 8080: {{ servers | selectattr('port', 'equalto', 8080) | map(attribute='host') | list }}"
          - "Total weight: {{ servers | map(attribute='weight') | sum }}"

    - name: Debug a conditional expression
      debug:
        msg:
          - "servers | length = {{ servers | length }}"
          - "servers | length > 2 = {{ servers | length > 2 }}"
          - "Expression result: {{ 'multi-server' if servers | length > 2 else 'single-server' }}"
```

## Practical Debugging Workflow

Here is how I typically debug a failing playbook:

```yaml
# debug-workflow.yml - Real debugging workflow
---
- name: Debug a deployment issue
  hosts: webservers
  become: yes

  tasks:
    - name: Gather custom facts
      setup:
        gather_subset:
          - hardware
          - network

    - name: Debug connection details
      debug:
        msg:
          - "Host: {{ inventory_hostname }}"
          - "IP: {{ ansible_default_ipv4.address | default('unknown') }}"
          - "CPUs: {{ ansible_processor_vcpus | default('unknown') }}"
          - "Memory: {{ ansible_memtotal_mb | default('unknown') }} MB"
          - "OS: {{ ansible_distribution }} {{ ansible_distribution_version }}"
        verbosity: 1

    - name: Test template rendering
      debug:
        msg: |
          # Generated config preview:
          server {
              listen {{ app_port | default(8080) }};
              server_name {{ domain | default('localhost') }};
              root {{ app_dir | default('/opt/myapp') }}/public;
              worker_connections {{ (ansible_processor_vcpus | default(1)) * 1024 }};
          }

    - name: Check if required variables are defined
      debug:
        msg: "MISSING: {{ item }} is not defined!"
      when: vars[item] is not defined
      loop:
        - app_version
        - db_host
        - db_password
        - domain

    - name: Verify file exists before using it
      stat:
        path: "{{ item }}"
      register: file_checks
      loop:
        - /opt/myapp/config.yml
        - /etc/ssl/certs/myapp.crt
        - /etc/ssl/private/myapp.key

    - name: Report missing files
      debug:
        msg: "File missing: {{ item.item }}"
      loop: "{{ file_checks.results }}"
      when: not item.stat.exists
      loop_control:
        label: "{{ item.item }}"
```

## Using assert Instead of debug for Validation

For production playbooks, replace debug with `assert` for validation:

```yaml
# assert-validation.yml - Assert instead of debug for checks
---
- name: Validate environment before deployment
  hosts: all
  become: yes

  tasks:
    - name: Check available disk space
      shell: df / --output=avail | tail -1
      register: disk_avail
      changed_when: false

    - name: Validate sufficient disk space
      assert:
        that:
          - disk_avail.stdout | int > 1048576  # > 1GB free
        fail_msg: "Insufficient disk space: {{ disk_avail.stdout | int // 1024 }}MB free, need 1024MB"
        success_msg: "Disk space OK: {{ disk_avail.stdout | int // 1024 }}MB free"

    - name: Check required variables
      assert:
        that:
          - app_version is defined
          - app_version | length > 0
          - db_host is defined
        fail_msg: "Required variables are missing. Check your variable files."
```

## Summary

The `debug` module is your primary tool for understanding what Ansible is doing. Use `msg` for formatted output, `var` for raw variable inspection, and `verbosity` to control when messages appear. Always register task results and debug them when troubleshooting. For production validation, graduate from `debug` to `assert`. The key to effective debugging is making the invisible visible: print the variable, check the condition, inspect the data structure.
