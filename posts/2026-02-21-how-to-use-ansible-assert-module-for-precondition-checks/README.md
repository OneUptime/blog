# How to Use Ansible assert Module for Precondition Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Assert, Validation, DevOps

Description: Learn how to use the Ansible assert module to validate preconditions, check variable values, and enforce requirements before tasks execute.

---

The `assert` module is Ansible's built-in way to verify that certain conditions are true before continuing with a playbook. Think of it as putting guardrails around your automation. Before deploying to production, you can assert that the target host has enough disk space, the right OS version, and all required variables set. If any assertion fails, the playbook stops with a clear error message instead of failing halfway through a deployment with a cryptic error.

## Basic assert Usage

The assert module takes a list of conditions in the `that` parameter. All conditions must be true for the assertion to pass.

```yaml
# Basic assertion examples
---
- name: Precondition checks
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Verify basic system requirements
      ansible.builtin.assert:
        that:
          - ansible_memtotal_mb >= 2048
          - ansible_processor_vcpus >= 2
          - ansible_os_family == "Debian"
        fail_msg: "System does not meet minimum requirements"
        success_msg: "System meets all requirements"
```

If any condition evaluates to false, the task fails with the `fail_msg`. If all pass, it shows the `success_msg` (if provided) and continues.

## Validating Variables

One of the most important uses of assert is checking that all required variables are defined and have valid values before using them.

```yaml
# Variable validation with assert
---
- name: Validate deployment variables
  hosts: all
  gather_facts: false

  tasks:
    - name: Check required variables are defined
      ansible.builtin.assert:
        that:
          - app_version is defined
          - app_version | length > 0
          - deploy_environment is defined
          - deploy_environment in ['development', 'staging', 'production']
          - db_host is defined
          - db_port is defined
          - db_port | int > 0
          - db_port | int < 65536
        fail_msg: |
          Missing or invalid required variables. Please ensure:
          - app_version is set (current: {{ app_version | default('UNDEFINED') }})
          - deploy_environment is one of: development, staging, production (current: {{ deploy_environment | default('UNDEFINED') }})
          - db_host is set (current: {{ db_host | default('UNDEFINED') }})
          - db_port is a valid port number (current: {{ db_port | default('UNDEFINED') }})

    - name: Validate optional variables have correct format
      ansible.builtin.assert:
        that:
          - app_replicas | int > 0
          - app_replicas | int <= 10
        fail_msg: "app_replicas must be between 1 and 10 (got {{ app_replicas }})"
      when: app_replicas is defined
```

## Pre-Deployment Assertions

Before deploying an application, run a set of assertions to catch problems early.

```yaml
# Pre-deployment checklist
---
- name: Pre-deployment validation
  hosts: app_servers
  become: true
  gather_facts: true

  tasks:
    - name: Check disk space requirements
      ansible.builtin.assert:
        that:
          - item.size_available > 5368709120  # 5GB in bytes
        fail_msg: "Insufficient disk space on {{ item.mount }} ({{ (item.size_available / 1073741824) | round(1) }}GB free, need 5GB)"
      loop: "{{ ansible_mounts | selectattr('mount', 'equalto', '/') | list }}"

    - name: Check if required services are running
      ansible.builtin.command:
        cmd: "systemctl is-active {{ item }}"
      loop:
        - nginx
        - postgresql
      register: service_checks
      changed_when: false
      failed_when: false

    - name: Assert required services are active
      ansible.builtin.assert:
        that:
          - item.rc == 0
        fail_msg: "Service {{ item.item }} is not running"
      loop: "{{ service_checks.results }}"
      loop_control:
        label: "{{ item.item }}"

    - name: Check network connectivity to dependencies
      ansible.builtin.command:
        cmd: "nc -z {{ item.host }} {{ item.port }}"
      loop:
        - { host: "db.example.com", port: 5432 }
        - { host: "redis.example.com", port: 6379 }
        - { host: "api.example.com", port: 443 }
      register: connectivity_checks
      changed_when: false
      failed_when: false

    - name: Assert all dependencies are reachable
      ansible.builtin.assert:
        that:
          - item.rc == 0
        fail_msg: "Cannot reach {{ item.item.host }}:{{ item.item.port }}"
      loop: "{{ connectivity_checks.results }}"
      loop_control:
        label: "{{ item.item.host }}:{{ item.item.port }}"
```

## Assert with Custom Messages

Detailed failure messages make debugging much easier. Include the actual values in your messages.

```yaml
# Assertions with detailed messages
---
- name: Detailed assertions
  hosts: all
  become: true
  gather_facts: true

  vars:
    required_python_version: "3.8"
    required_ansible_version: "2.14"

  tasks:
    - name: Get Python version
      ansible.builtin.command:
        cmd: python3 --version
      register: python_ver
      changed_when: false

    - name: Assert Python version
      ansible.builtin.assert:
        that:
          - python_ver.stdout | regex_search('Python (\\S+)', '\\1') | first is version(required_python_version, '>=')
        fail_msg: >
          Python version check failed.
          Required: >= {{ required_python_version }}
          Found: {{ python_ver.stdout }}
          Please upgrade Python on {{ inventory_hostname }}
        success_msg: "Python version OK: {{ python_ver.stdout }}"

    - name: Assert Ansible version
      ansible.builtin.assert:
        that:
          - ansible_version.full is version(required_ansible_version, '>=')
        fail_msg: >
          Ansible version check failed.
          Required: >= {{ required_ansible_version }}
          Found: {{ ansible_version.full }}
        success_msg: "Ansible version OK: {{ ansible_version.full }}"
```

## Assert for Configuration Validation

Validate configuration files after generating them but before applying them.

```yaml
# Validate generated configuration
---
- name: Config validation workflow
  hosts: webservers
  become: true

  tasks:
    - name: Generate nginx config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf.new

    - name: Test nginx configuration syntax
      ansible.builtin.command:
        cmd: nginx -t -c /etc/nginx/nginx.conf.new
      register: nginx_test
      changed_when: false
      failed_when: false

    - name: Assert nginx config is valid
      ansible.builtin.assert:
        that:
          - nginx_test.rc == 0
        fail_msg: |
          Generated nginx configuration is invalid:
          {{ nginx_test.stderr }}
        success_msg: "Nginx configuration syntax is valid"

    - name: Apply validated configuration
      ansible.builtin.copy:
        src: /etc/nginx/nginx.conf.new
        dest: /etc/nginx/nginx.conf
        remote_src: true
        backup: true
      when: nginx_test.rc == 0

    - name: Remove temporary config file
      ansible.builtin.file:
        path: /etc/nginx/nginx.conf.new
        state: absent
```

## Assert with Loops for Bulk Validation

When you need to validate multiple items, combine assert with loops.

```yaml
# Bulk validation with assert and loops
---
- name: Validate inventory data
  hosts: localhost
  gather_facts: false

  vars:
    servers:
      - name: web-01
        role: web
        ip: "10.0.1.10"
        port: 8080
      - name: db-01
        role: database
        ip: "10.0.2.10"
        port: 5432
      - name: cache-01
        role: cache
        ip: "10.0.3.10"
        port: 6379

    valid_roles:
      - web
      - database
      - cache
      - worker

  tasks:
    - name: Validate each server entry
      ansible.builtin.assert:
        that:
          - item.name is defined and item.name | length > 0
          - item.role in valid_roles
          - item.ip is regex('^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')
          - item.port | int > 0 and item.port | int < 65536
        fail_msg: "Invalid server configuration: {{ item | to_json }}"
        success_msg: "Server {{ item.name }} configuration is valid"
      loop: "{{ servers }}"
      loop_control:
        label: "{{ item.name }}"
```

## Assert in Roles

Placing assertions at the beginning of a role ensures that the role has everything it needs before executing.

```yaml
# roles/webserver/tasks/main.yml
---
- name: Validate role requirements
  ansible.builtin.assert:
    that:
      - webserver_port is defined
      - webserver_port | int > 0
      - webserver_document_root is defined
      - webserver_server_name is defined
      - webserver_ssl_cert is defined or not webserver_enable_ssl | default(false) | bool
      - webserver_ssl_key is defined or not webserver_enable_ssl | default(false) | bool
    fail_msg: |
      The webserver role requires the following variables:
      - webserver_port (integer, required)
      - webserver_document_root (string, required)
      - webserver_server_name (string, required)
      - webserver_ssl_cert (string, required if SSL enabled)
      - webserver_ssl_key (string, required if SSL enabled)

- name: Install web server packages
  ansible.builtin.apt:
    name:
      - nginx
      - certbot
    state: present
# ... rest of role tasks
```

## quiet Parameter

For assertions that you want to check silently (no output on success), use the `quiet` parameter.

```yaml
# Silent assertions
---
- name: Silent validation
  hosts: all
  gather_facts: true

  tasks:
    - name: Quick system checks (silent on success)
      ansible.builtin.assert:
        that:
          - ansible_memtotal_mb >= 1024
          - ansible_processor_vcpus >= 1
          - ansible_os_family in ['Debian', 'RedHat']
        fail_msg: "System does not meet minimum requirements"
        quiet: true
```

## Combining assert with Blocks

Use assert inside a block to make failures rescuable.

```yaml
# Rescuable assertions
---
- name: Assertions with recovery
  hosts: all
  become: true

  tasks:
    - name: Check and fix system state
      block:
        - name: Assert NTP is configured
          ansible.builtin.command:
            cmd: timedatectl show --property=NTPSynchronized
          register: ntp_status
          changed_when: false

        - name: Verify NTP sync
          ansible.builtin.assert:
            that:
              - "'yes' in ntp_status.stdout"
            fail_msg: "NTP is not synchronized"

      rescue:
        - name: Fix NTP configuration
          ansible.builtin.systemd:
            name: systemd-timesyncd
            state: started
            enabled: true

        - name: Force NTP sync
          ansible.builtin.command:
            cmd: timedatectl set-ntp true
```

The assert module is your first line of defense against misconfigured deployments. By catching problems at the start of a playbook run, you avoid the scenario where a deployment fails halfway through, leaving your system in a partially updated state. Make it a habit to start every deployment playbook with an assertion section that validates all prerequisites. Your future self, debugging a failed deployment at 2 AM, will thank you.
