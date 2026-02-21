# How to Use the Ansible indexed_items Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Loops, Indexing

Description: Learn how to use the Ansible indexed_items lookup plugin to iterate over lists with automatic index numbers in your Ansible playbooks.

---

When looping over a list in Ansible, you sometimes need to know the position of each item. Maybe you are assigning sequential port numbers, creating numbered configuration files, or building ordered lists. The `indexed_items` lookup plugin adds a zero-based index to each item in a list, giving you both the position and the value in every iteration.

## What indexed_items Does

The `indexed_items` lookup takes a list and returns pairs of `(index, value)` for each element. The index starts at 0 and increments by 1 for each item. This is similar to Python's `enumerate()` function.

## Basic Usage

The simplest form adds indices to a list of items.

This playbook shows indexed iteration:

```yaml
# playbook.yml - Basic indexed iteration
---
- name: Iterate with indices
  hosts: localhost
  vars:
    servers:
      - web-frontend
      - api-gateway
      - background-worker
      - cache-server
  tasks:
    - name: Show each server with its index
      ansible.builtin.debug:
        msg: "Server #{{ item.0 }}: {{ item.1 }}"
      loop: "{{ lookup('indexed_items', servers, wantlist=True) }}"
```

Output:

```
Server #0: web-frontend
Server #1: api-gateway
Server #2: background-worker
Server #3: cache-server
```

## Assigning Sequential Ports

One practical use is assigning sequential port numbers to services.

```yaml
# playbook.yml - Assign sequential ports using indices
---
- name: Deploy multiple service instances with sequential ports
  hosts: appservers
  vars:
    base_port: 8080
    app_instances:
      - frontend
      - api
      - admin
      - docs
  tasks:
    - name: Create config for each instance with a unique port
      ansible.builtin.template:
        src: instance.conf.j2
        dest: "/etc/myapp/instances/{{ item.1 }}.conf"
        mode: '0644'
      vars:
        instance_name: "{{ item.1 }}"
        instance_port: "{{ base_port | int + item.0 | int }}"
        instance_id: "{{ item.0 }}"
      loop: "{{ lookup('indexed_items', app_instances, wantlist=True) }}"

    - name: Show port assignments
      ansible.builtin.debug:
        msg: "{{ item.1 }}: port {{ base_port | int + item.0 | int }}"
      loop: "{{ lookup('indexed_items', app_instances, wantlist=True) }}"
```

Output:

```
frontend: port 8080
api: port 8081
admin: port 8082
docs: port 8083
```

## Creating Numbered Files

When you need to create configuration files with a specific order:

```yaml
# playbook.yml - Create ordered configuration snippets
---
- name: Create ordered Nginx server blocks
  hosts: webservers
  vars:
    server_blocks:
      - domain: example.com
        root: /var/www/example
      - domain: api.example.com
        root: /var/www/api
      - domain: docs.example.com
        root: /var/www/docs
  tasks:
    - name: Create numbered server block configs
      ansible.builtin.template:
        src: server_block.j2
        dest: "/etc/nginx/conf.d/{{ '%02d' | format(item.0 | int) }}-{{ item.1.domain }}.conf"
        mode: '0644'
      vars:
        server_config: "{{ item.1 }}"
        priority: "{{ item.0 }}"
      loop: "{{ lookup('indexed_items', server_blocks, wantlist=True) }}"
      notify: reload nginx
```

This creates files like `00-example.com.conf`, `01-api.example.com.conf`, `02-docs.example.com.conf`, ensuring they load in a specific order.

## IP Address Assignment

Assign sequential IP addresses within a subnet:

```yaml
# playbook.yml - Assign sequential IPs from a subnet
---
- name: Assign IP addresses to cluster nodes
  hosts: localhost
  vars:
    subnet: "10.0.1"
    ip_offset: 10
    cluster_nodes:
      - master-1
      - master-2
      - master-3
      - worker-1
      - worker-2
      - worker-3
      - worker-4
      - worker-5
  tasks:
    - name: Generate IP assignments
      ansible.builtin.debug:
        msg: "{{ item.1 }}: {{ subnet }}.{{ ip_offset + item.0 | int }}"
      loop: "{{ lookup('indexed_items', cluster_nodes, wantlist=True) }}"

    - name: Write hosts file entries
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: ".*{{ item.1 }}$"
        line: "{{ subnet }}.{{ ip_offset + item.0 | int }}  {{ item.1 }}"
      loop: "{{ lookup('indexed_items', cluster_nodes, wantlist=True) }}"
```

## Priority-Based Processing

Use indices to set priorities for processing order:

```yaml
# playbook.yml - Set processing priorities
---
- name: Configure backup jobs with priority ordering
  hosts: backupserver
  vars:
    backup_targets:
      - name: database
        path: /var/lib/postgresql
        type: full
      - name: application
        path: /opt/myapp
        type: incremental
      - name: logs
        path: /var/log
        type: incremental
      - name: configs
        path: /etc
        type: full
  tasks:
    - name: Create prioritized backup configurations
      ansible.builtin.copy:
        content: |
          [backup_{{ item.1.name }}]
          priority = {{ item.0 }}
          source = {{ item.1.path }}
          type = {{ item.1.type }}
          schedule = daily
        dest: "/etc/backup.d/{{ '%02d' | format(item.0 | int) }}_{{ item.1.name }}.conf"
        mode: '0644'
      loop: "{{ lookup('indexed_items', backup_targets, wantlist=True) }}"
```

## Generating Configuration with Position Awareness

Sometimes the configuration of one item depends on its position relative to others.

```yaml
# playbook.yml - Position-aware configuration generation
---
- name: Configure HAProxy backends
  hosts: loadbalancers
  vars:
    backend_servers:
      - hostname: app01.internal
        weight: 100
      - hostname: app02.internal
        weight: 100
      - hostname: app03.internal
        weight: 50
  tasks:
    - name: Generate HAProxy backend config
      ansible.builtin.copy:
        content: |
          backend app_servers
              balance roundrobin
          {% for idx_server in lookup('indexed_items', backend_servers, wantlist=True) %}
              server app{{ idx_server.0 }} {{ idx_server.1.hostname }}:8080 weight {{ idx_server.1.weight }} check
          {% endfor %}
        dest: /etc/haproxy/conf.d/backends.cfg
        mode: '0644'
      notify: reload haproxy
```

## indexed_items vs loop_control.index_var

Modern Ansible provides `loop_control` with `index_var` which offers the same functionality:

```yaml
# playbook.yml - Comparing indexed_items with loop_control
---
- name: Compare indexing approaches
  hosts: localhost
  vars:
    fruits: [apple, banana, cherry]
  tasks:
    # Using indexed_items lookup
    - name: With indexed_items
      ansible.builtin.debug:
        msg: "{{ item.0 }}: {{ item.1 }}"
      loop: "{{ lookup('indexed_items', fruits, wantlist=True) }}"

    # Using loop_control index_var (modern approach)
    - name: With loop_control
      ansible.builtin.debug:
        msg: "{{ my_idx }}: {{ item }}"
      loop: "{{ fruits }}"
      loop_control:
        index_var: my_idx
```

The `loop_control` approach is generally preferred in modern Ansible because:
- It keeps the loop variable clean (just `item` instead of `item.0` and `item.1`)
- It works with any loop source
- It is more readable

## Practical Example: Systemd Service Ordering

Create systemd services with ordering dependencies based on list position:

```yaml
# playbook.yml - Create ordered systemd services
---
- name: Deploy ordered services
  hosts: appservers
  vars:
    service_chain:
      - name: database-init
        command: /opt/myapp/bin/init-db
        type: oneshot
      - name: cache-warmup
        command: /opt/myapp/bin/warmup-cache
        type: oneshot
      - name: app-server
        command: /opt/myapp/bin/server
        type: simple
      - name: health-reporter
        command: /opt/myapp/bin/health-report
        type: simple
  tasks:
    - name: Create systemd service files with ordering
      ansible.builtin.copy:
        content: |
          [Unit]
          Description={{ item.1.name }}
          {% if item.0 | int > 0 %}
          After={{ service_chain[item.0 | int - 1].name }}.service
          Requires={{ service_chain[item.0 | int - 1].name }}.service
          {% endif %}

          [Service]
          Type={{ item.1.type }}
          ExecStart={{ item.1.command }}

          [Install]
          WantedBy=multi-user.target
        dest: "/etc/systemd/system/{{ item.1.name }}.service"
        mode: '0644'
      loop: "{{ lookup('indexed_items', service_chain, wantlist=True) }}"
      notify: reload systemd
```

This creates services where each one depends on the previous one in the list, forming a startup chain.

## Using Index for Conditional Logic

The index enables position-based conditionals.

```yaml
# playbook.yml - First/last item special handling
---
- name: Process list with special first and last handling
  hosts: localhost
  vars:
    pipeline_stages:
      - validate
      - build
      - test
      - deploy
      - notify
  tasks:
    - name: Process pipeline stages
      ansible.builtin.debug:
        msg: >-
          Stage {{ item.0 }}: {{ item.1 }}
          {{ '(FIRST)' if item.0 | int == 0 else '' }}
          {{ '(LAST)' if item.0 | int == (pipeline_stages | length - 1) else '' }}
      loop: "{{ lookup('indexed_items', pipeline_stages, wantlist=True) }}"
```

## Tips

1. **Zero-based indexing**: The index starts at 0, not 1. If you need 1-based numbering, add 1: `{{ item.0 | int + 1 }}`.

2. **Prefer loop_control**: In modern Ansible (2.5+), `loop_control` with `index_var` is the recommended way to get indices. It is cleaner and works with all loop sources.

3. **Index is a string**: The index value `item.0` is returned as a string. Use `| int` when doing arithmetic.

4. **Flattening behavior**: Like `items`, `indexed_items` flattens one level. Nested lists get flattened before indexing.

5. **Use for ordering**: The primary value of indexed_items is when the position of an item determines something about its configuration, like a port number offset, processing priority, or dependency chain.

The `indexed_items` lookup is a straightforward tool for position-aware iteration. While `loop_control` has largely replaced it in modern Ansible, understanding it helps when reading older playbooks and when you need to pass index-value pairs to templates or complex expressions.
