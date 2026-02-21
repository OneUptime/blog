# How to Use the Ansible debug Module with verbosity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Playbooks, Logging

Description: Learn how to use the verbosity parameter in the Ansible debug module to control when debug output appears based on the playbook run verbosity level.

---

Every Ansible playbook eventually accumulates debug tasks. During development, you add them to inspect variables, trace execution flow, and verify data structures. But when it is time to run the playbook in production, all that debug output clutters the logs and makes it harder to see what matters. The `verbosity` parameter on the debug module solves this by letting you control when debug output appears based on the `-v` flags you pass to `ansible-playbook`.

## How Verbosity Levels Work in Ansible

When you run an Ansible playbook, you can add `-v` flags to increase the verbosity of the output:

```bash
# Standard output (verbosity 0)
ansible-playbook deploy.yml

# Verbose output (verbosity 1)
ansible-playbook deploy.yml -v

# More verbose (verbosity 2)
ansible-playbook deploy.yml -vv

# Debug level (verbosity 3)
ansible-playbook deploy.yml -vvv

# Connection debugging (verbosity 4)
ansible-playbook deploy.yml -vvvv
```

Each `-v` flag increases the verbosity level by 1. At higher levels, Ansible shows more internal details about task execution, variable values, and connection handling.

## The verbosity Parameter on debug

The debug module accepts a `verbosity` parameter that sets the minimum verbosity level required for the task output to appear:

```yaml
# This only prints when running with -vv or higher
- name: Show database connection details
  ansible.builtin.debug:
    msg: "DB host: {{ db_host }}, port: {{ db_port }}, user: {{ db_user }}"
    verbosity: 2
```

When you run the playbook without any `-v` flags, this task is silently skipped. Add `-vv` and the output appears. This lets you leave debug tasks in your playbook permanently without cluttering normal output.

## Verbosity Levels Explained

Here is how I typically organize debug output across verbosity levels:

```yaml
---
- name: Deploy application
  hosts: webservers
  become: true

  vars:
    app_version: "3.5.0"
    deploy_env: production

  tasks:
    # Always visible: critical status messages
    - name: Show deployment starting
      ansible.builtin.debug:
        msg: "Starting deployment of v{{ app_version }} to {{ deploy_env }}"
      # verbosity: 0 (default, always shown)

    # -v: useful context for operators
    - name: Show target host details
      ansible.builtin.debug:
        msg: "Target: {{ inventory_hostname }} ({{ ansible_default_ipv4.address }})"
        verbosity: 1

    # -vv: developer-level debugging info
    - name: Show full variable state
      ansible.builtin.debug:
        var: ansible_env
        verbosity: 2

    # -vvv: deep debugging for troubleshooting
    - name: Show all hostvars
      ansible.builtin.debug:
        var: hostvars[inventory_hostname]
        verbosity: 3
```

## A Practical Tiered Debugging System

In larger projects, I set up a tiered system where each verbosity level has a clear purpose:

```yaml
---
- name: Configure web servers
  hosts: webservers
  become: true

  vars:
    nginx_worker_processes: auto
    nginx_worker_connections: 1024
    ssl_certificate: /etc/ssl/certs/app.crt
    ssl_key: /etc/ssl/private/app.key

  tasks:
    - name: Display configuration summary
      ansible.builtin.debug:
        msg: |
          Nginx Configuration:
            Workers: {{ nginx_worker_processes }}
            Connections per worker: {{ nginx_worker_connections }}
        verbosity: 0

    - name: Show SSL configuration paths
      ansible.builtin.debug:
        msg: |
          SSL Certificate: {{ ssl_certificate }}
          SSL Key: {{ ssl_key }}
        verbosity: 1

    - name: Deploy nginx configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      register: nginx_config

    - name: Show template deployment result
      ansible.builtin.debug:
        var: nginx_config
        verbosity: 2

    - name: Validate nginx configuration
      ansible.builtin.command:
        cmd: nginx -t
      register: nginx_test
      changed_when: false

    - name: Show nginx validation output
      ansible.builtin.debug:
        msg: |
          Validation stdout: {{ nginx_test.stdout }}
          Validation stderr: {{ nginx_test.stderr }}
        verbosity: 1

    - name: Show full validation result object
      ansible.builtin.debug:
        var: nginx_test
        verbosity: 3
```

Running this playbook at different verbosity levels:

```bash
# Normal run: just the configuration summary
ansible-playbook configure-nginx.yml

# Operator view: summary + SSL paths + validation output
ansible-playbook configure-nginx.yml -v

# Developer debug: all of the above + template result structure
ansible-playbook configure-nginx.yml -vv

# Deep debug: everything including full result objects
ansible-playbook configure-nginx.yml -vvv
```

## Using verbosity with Loops

When you have debug tasks inside loops, the verbosity parameter prevents them from flooding the output:

```yaml
# This would produce a lot of output for every host in the loop
- name: Show per-host deployment details
  ansible.builtin.debug:
    msg: |
      Host: {{ item }}
      IP: {{ hostvars[item]['ansible_default_ipv4']['address'] | default('unknown') }}
      Groups: {{ hostvars[item]['group_names'] | join(', ') }}
  loop: "{{ groups['all'] }}"
  verbosity: 2
```

Without the verbosity setting, this would print a block for every host on every run. With `verbosity: 2`, it only appears when you are actively debugging.

## Combining verbosity with when

You can combine `verbosity` with `when` conditions for very targeted output:

```yaml
# Only show memory warning in verbose mode AND when memory is low
- name: Low memory debug info
  ansible.builtin.debug:
    msg: |
      Memory alert on {{ inventory_hostname }}:
        Total: {{ ansible_memtotal_mb }}MB
        Free: {{ ansible_memfree_mb }}MB
        Used: {{ ansible_memtotal_mb - ansible_memfree_mb }}MB
        Swap used: {{ ansible_swaptotal_mb - ansible_swapfree_mb }}MB
    verbosity: 1
  when: ansible_memfree_mb < 512
```

## Role-Level Debug Tasks

When writing reusable roles, verbosity is especially valuable. You can include debug output that helps users troubleshoot the role without cluttering normal usage:

```yaml
# roles/postgresql/tasks/main.yml
---
- name: Show PostgreSQL role parameters
  ansible.builtin.debug:
    msg:
      postgresql_version: "{{ postgresql_version }}"
      postgresql_data_dir: "{{ postgresql_data_dir }}"
      postgresql_max_connections: "{{ postgresql_max_connections }}"
      postgresql_shared_buffers: "{{ postgresql_shared_buffers }}"
    verbosity: 1

- name: Install PostgreSQL packages
  ansible.builtin.apt:
    name: "postgresql-{{ postgresql_version }}"
    state: present
  register: pg_install

- name: Show installation result
  ansible.builtin.debug:
    var: pg_install
    verbosity: 2

- name: Initialize database cluster
  ansible.builtin.command:
    cmd: "pg_ctlcluster {{ postgresql_version }} main start"
    creates: "{{ postgresql_data_dir }}/PG_VERSION"
  register: pg_init

- name: Show initialization details
  ansible.builtin.debug:
    msg: |
      Init stdout: {{ pg_init.stdout | default('N/A') }}
      Init stderr: {{ pg_init.stderr | default('N/A') }}
      Changed: {{ pg_init.changed }}
    verbosity: 2
```

Users of your role can run with `-v` to see what parameters were used, or `-vv` to see detailed execution results, without any of that appearing in normal production runs.

## Setting Default Verbosity in ansible.cfg

You can set a default verbosity level in your configuration file, which affects when debug output appears:

```ini
# ansible.cfg
[defaults]
# Run at verbosity 1 by default (equivalent to -v)
verbosity = 1
```

This means debug tasks with `verbosity: 1` will always appear, and you need `-vv` on the command line to reach level 2 (which is actually level 1 + 1). I generally do not recommend this because it changes the baseline expectation, but it can be useful in CI/CD pipelines where you always want some extra output.

## Environment-Specific Verbosity

A useful pattern is adjusting what you show based on the target environment:

```yaml
# Show more detail in non-production environments
- name: Show detailed deployment variables
  ansible.builtin.debug:
    msg:
      version: "{{ app_version }}"
      config_hash: "{{ config_content | hash('sha256') }}"
      feature_flags: "{{ feature_flags }}"
      endpoints: "{{ api_endpoints }}"
    verbosity: "{{ 0 if deploy_env != 'production' else 2 }}"
```

In non-production environments, this always prints. In production, it only appears with `-vv`. This gives developers more visibility during staging deployments while keeping production runs clean.

## What Happens at Each Ansible Verbosity Level

For reference, here is what Ansible itself shows at each verbosity level (in addition to your debug tasks):

```
Level 0 (no -v):     Task names and status (ok/changed/failed)
Level 1 (-v):        Task results with key return values
Level 2 (-vv):       Input parameters for each task
Level 3 (-vvv):      Connection and execution details
Level 4 (-vvvv):     Full SSH/connection debugging output
```

Your debug tasks should complement these levels. At level 1, you want the same kind of information Ansible itself provides: key results and summaries. At level 2, parameter details. At level 3 and above, raw data dumps for deep troubleshooting.

## Summary

The `verbosity` parameter on the debug module lets you build a layered debugging system into your playbooks. Leave debug tasks in permanently by assigning them appropriate verbosity levels: level 0 for critical status messages, level 1 for operational context, level 2 for developer debugging, and level 3+ for deep troubleshooting. This way, normal runs produce clean output while `-v` flags progressively reveal more detail when you need it. It is one of those small features that makes a big difference in maintaining production playbooks.
