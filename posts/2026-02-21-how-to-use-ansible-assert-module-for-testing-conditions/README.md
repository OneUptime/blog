# How to Use Ansible assert Module for Testing Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Validation, Playbooks

Description: Learn how to use the Ansible assert module to validate conditions, enforce requirements, and build self-checking playbooks with clear error messages.

---

The Ansible `assert` module lets you test conditions and fail with a custom message when they are not met. It is like a safety gate in your playbook: before doing something potentially dangerous (like deploying to production or running a migration), you verify that all prerequisites are in place. This post covers how to use assert for input validation, environment checks, post-deployment verification, and building self-testing playbooks.

## Basic Usage

The assert module takes a list of conditions in the `that` parameter. All conditions must be true for the task to pass:

```yaml
# Basic assertion - verify a variable is defined and has a value
- name: Verify deployment version is specified
  ansible.builtin.assert:
    that:
      - deploy_version is defined
      - deploy_version | length > 0
    fail_msg: "deploy_version must be specified. Use -e deploy_version=x.y.z"
    success_msg: "Deploying version {{ deploy_version }}"
```

If any condition in `that` is false, the task fails with the `fail_msg`. If all conditions pass, it shows the `success_msg`.

## Validating Input Variables

Use assert at the beginning of your playbook to catch missing or invalid variables early:

```yaml
---
- name: Deploy application
  hosts: webservers
  become: true

  tasks:
    - name: Validate required variables
      ansible.builtin.assert:
        that:
          - app_name is defined
          - app_version is defined
          - deploy_env is defined
          - deploy_env in ['staging', 'production']
          - app_port | int > 0
          - app_port | int < 65536
        fail_msg: |
          Invalid deployment parameters:
            app_name: {{ app_name | default('MISSING') }}
            app_version: {{ app_version | default('MISSING') }}
            deploy_env: {{ deploy_env | default('MISSING') }} (must be staging or production)
            app_port: {{ app_port | default('MISSING') }} (must be 1-65535)

    # Rest of deployment tasks only run if assertions pass
    - name: Deploy the application
      ansible.builtin.debug:
        msg: "Deploying {{ app_name }} v{{ app_version }} to {{ deploy_env }}"
```

## Checking System Requirements

Before deploying, verify the target system meets minimum requirements:

```yaml
- name: Check system requirements
  ansible.builtin.assert:
    that:
      - ansible_memtotal_mb >= 2048
      - ansible_processor_vcpus >= 2
    fail_msg: |
      System does not meet minimum requirements:
        Memory: {{ ansible_memtotal_mb }}MB (need 2048MB)
        CPUs: {{ ansible_processor_vcpus }} (need 2)
    success_msg: "System meets requirements: {{ ansible_memtotal_mb }}MB RAM, {{ ansible_processor_vcpus }} CPUs"
```

Checking disk space:

```yaml
- name: Get root partition info
  ansible.builtin.set_fact:
    root_free_gb: "{{ (ansible_mounts | selectattr('mount', 'equalto', '/') | first).size_available / (1024 * 1024 * 1024) }}"

- name: Check available disk space
  ansible.builtin.assert:
    that:
      - root_free_gb | float >= 5.0
    fail_msg: "Only {{ root_free_gb }}GB free on /. Need at least 5GB."
    success_msg: "{{ root_free_gb }}GB available on /"
```

## Validating Network Connectivity

Check that the host can reach required services before deploying:

```yaml
- name: Check database connectivity
  ansible.builtin.wait_for:
    host: "{{ db_host }}"
    port: "{{ db_port }}"
    timeout: 5
  register: db_check
  ignore_errors: true

- name: Check cache connectivity
  ansible.builtin.wait_for:
    host: "{{ redis_host }}"
    port: "{{ redis_port }}"
    timeout: 5
  register: cache_check
  ignore_errors: true

- name: Assert all required services are reachable
  ansible.builtin.assert:
    that:
      - db_check is succeeded
      - cache_check is succeeded
    fail_msg: |
      Required services are not reachable:
        Database ({{ db_host }}:{{ db_port }}): {{ 'OK' if db_check is succeeded else 'UNREACHABLE' }}
        Cache ({{ redis_host }}:{{ redis_port }}): {{ 'OK' if cache_check is succeeded else 'UNREACHABLE' }}
```

## Using assert with Registered Results

Assert is powerful when combined with registered task results:

```yaml
- name: Check current application health
  ansible.builtin.uri:
    url: "http://localhost:{{ app_port }}/health"
    return_content: true
  register: health_check
  ignore_errors: true

- name: Assert application is healthy before proceeding
  ansible.builtin.assert:
    that:
      - health_check.status == 200
      - health_check.json.status == 'healthy'
      - health_check.json.database == 'connected'
    fail_msg: |
      Application health check failed:
        HTTP Status: {{ health_check.status | default('N/A') }}
        Response: {{ health_check.json | default('No response') | to_nice_json }}
    success_msg: "Application is healthy"
```

## Post-Deployment Verification

After deploying, use assert to verify everything is working:

```yaml
---
- name: Post-deployment verification
  hosts: webservers
  gather_facts: false

  tasks:
    - name: Check application is responding
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:{{ app_port }}/api/status"
        return_content: true
      register: status_check

    - name: Check application version matches
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:{{ app_port }}/api/version"
        return_content: true
      register: version_check

    - name: Check application service is running
      ansible.builtin.command:
        cmd: systemctl is-active {{ app_service_name }}
      register: service_check
      changed_when: false

    - name: Verify deployment
      ansible.builtin.assert:
        that:
          - status_check.status == 200
          - version_check.json.version == deploy_version
          - service_check.stdout == 'active'
        fail_msg: |
          Deployment verification FAILED:
            API Status: {{ status_check.status }} (expected 200)
            Version: {{ version_check.json.version | default('unknown') }} (expected {{ deploy_version }})
            Service: {{ service_check.stdout }} (expected active)
        success_msg: "Deployment verified: v{{ deploy_version }} is running correctly"
```

## Using assert in Loops

You can use assert inside loops to validate multiple items:

```yaml
# Verify all required services are running
- name: Check service status
  ansible.builtin.command:
    cmd: "systemctl is-active {{ item }}"
  loop:
    - nginx
    - postgresql
    - redis-server
    - app-worker
  register: service_checks
  failed_when: false
  changed_when: false

- name: Assert all services are running
  ansible.builtin.assert:
    that:
      - item.stdout == 'active'
    fail_msg: "Service {{ item.item }} is {{ item.stdout }}, expected active"
    success_msg: "Service {{ item.item }} is active"
  loop: "{{ service_checks.results }}"
```

## Using quiet Mode

When running many assertions, the success messages can be noisy. Use `quiet: true` to suppress them:

```yaml
# Only show output on failure, stay quiet on success
- name: Validate configuration parameters
  ansible.builtin.assert:
    that:
      - max_connections | int > 0
      - max_connections | int <= 10000
    fail_msg: "max_connections must be between 1 and 10000"
    quiet: true
```

## Building a Pre-flight Check Playbook

Here is a complete pre-flight check playbook that runs before deployments:

```yaml
---
- name: Pre-flight deployment checks
  hosts: "{{ target_hosts }}"
  gather_facts: true

  vars:
    min_memory_mb: 2048
    min_disk_gb: 5
    min_cpu_count: 2
    required_ports:
      - { host: "{{ db_host }}", port: 5432, name: "PostgreSQL" }
      - { host: "{{ redis_host }}", port: 6379, name: "Redis" }
      - { host: "{{ rabbitmq_host }}", port: 5672, name: "RabbitMQ" }

  tasks:
    - name: Assert deployment variables are defined
      ansible.builtin.assert:
        that:
          - deploy_version is defined
          - deploy_env is defined
          - db_host is defined
          - redis_host is defined
        fail_msg: "Missing required deployment variables"
        quiet: true

    - name: Assert system meets hardware requirements
      ansible.builtin.assert:
        that:
          - ansible_memtotal_mb >= min_memory_mb
          - ansible_processor_vcpus >= min_cpu_count
        fail_msg: |
          Hardware requirements not met on {{ inventory_hostname }}:
            Memory: {{ ansible_memtotal_mb }}MB (need {{ min_memory_mb }}MB)
            CPUs: {{ ansible_processor_vcpus }} (need {{ min_cpu_count }})
        quiet: true

    - name: Check disk space
      ansible.builtin.set_fact:
        root_free_gb: "{{ (ansible_mounts | selectattr('mount', 'equalto', '/') | first).size_available / (1024**3) }}"

    - name: Assert sufficient disk space
      ansible.builtin.assert:
        that:
          - root_free_gb | float >= min_disk_gb
        fail_msg: "Only {{ root_free_gb | float | round(1) }}GB free, need {{ min_disk_gb }}GB"
        quiet: true

    - name: Check connectivity to required services
      ansible.builtin.wait_for:
        host: "{{ item.host }}"
        port: "{{ item.port }}"
        timeout: 5
      loop: "{{ required_ports }}"
      register: connectivity_checks
      ignore_errors: true

    - name: Assert all services are reachable
      ansible.builtin.assert:
        that:
          - item is succeeded
        fail_msg: "Cannot reach {{ item.item.name }} at {{ item.item.host }}:{{ item.item.port }}"
        quiet: true
      loop: "{{ connectivity_checks.results }}"

    - name: Assert OS is supported
      ansible.builtin.assert:
        that:
          - ansible_distribution in ['Ubuntu', 'Debian']
          - ansible_distribution_major_version | int >= 20
        fail_msg: "Unsupported OS: {{ ansible_distribution }} {{ ansible_distribution_version }}"
        quiet: true

    - name: All pre-flight checks passed
      ansible.builtin.debug:
        msg: |
          Pre-flight checks PASSED for {{ inventory_hostname }}
            OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
            Memory: {{ ansible_memtotal_mb }}MB
            Disk: {{ root_free_gb | float | round(1) }}GB free
            CPUs: {{ ansible_processor_vcpus }}
            All {{ required_ports | length }} services reachable
```

Run the pre-flight checks before deployment:

```bash
# Run pre-flight checks
ansible-playbook preflight.yml -e "target_hosts=webservers deploy_version=3.2.0 deploy_env=production"

# If checks pass, run the actual deployment
ansible-playbook deploy.yml -e "deploy_version=3.2.0 deploy_env=production"
```

## Assert vs fail with when

You can achieve similar results with `fail` and `when`, but assert is cleaner for multiple conditions:

```yaml
# Using fail/when (more verbose)
- name: Check memory
  ansible.builtin.fail:
    msg: "Not enough memory"
  when: ansible_memtotal_mb < 2048

- name: Check CPUs
  ansible.builtin.fail:
    msg: "Not enough CPUs"
  when: ansible_processor_vcpus < 2

# Using assert (cleaner)
- name: Check system requirements
  ansible.builtin.assert:
    that:
      - ansible_memtotal_mb >= 2048
      - ansible_processor_vcpus >= 2
    fail_msg: "System does not meet requirements"
```

Assert bundles related checks into a single task, making the playbook shorter and the intent clearer.

## Using assert for Role Validation

In roles, use assert in the first task to validate that required variables are provided:

```yaml
# roles/postgresql/tasks/main.yml
---
- name: Validate role parameters
  ansible.builtin.assert:
    that:
      - postgresql_version is defined
      - postgresql_version in ['14', '15', '16']
      - postgresql_data_dir is defined
      - postgresql_max_connections | int > 0
    fail_msg: |
      Invalid PostgreSQL role parameters:
        postgresql_version: {{ postgresql_version | default('MISSING') }} (must be 14, 15, or 16)
        postgresql_data_dir: {{ postgresql_data_dir | default('MISSING') }}
        postgresql_max_connections: {{ postgresql_max_connections | default('MISSING') }}

# Proceed with installation only if validation passes
- name: Install PostgreSQL
  ansible.builtin.apt:
    name: "postgresql-{{ postgresql_version }}"
    state: present
```

## Summary

The assert module is a validation tool that should be in every production playbook. Use it to validate input variables before execution starts, check system requirements before deploying, verify network connectivity to dependencies, and confirm successful deployment afterward. The `fail_msg` parameter is critical for making failures actionable. Include the actual values and expected values so whoever sees the error knows exactly what went wrong and what to fix. Keep assertions at the top of playbooks and at the entry point of roles to catch problems before they cause partial deployments.
