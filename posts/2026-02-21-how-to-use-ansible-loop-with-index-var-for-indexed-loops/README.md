# How to Use Ansible loop with index_var for Indexed Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, loop_control, Automation

Description: Learn how to use index_var in Ansible loop_control to access the current loop index for numbered resources, sequential operations, and more.

---

When you loop over items in Ansible, you sometimes need to know the position of the current item in the list. Maybe you are creating numbered configuration files, assigning sequential port numbers, or building ordered data structures. The `index_var` option in `loop_control` gives you access to the current loop index as a variable.

## Basic index_var Usage

The `index_var` option creates a variable that holds the zero-based index of the current iteration:

```yaml
# Print each item along with its index position
- name: Show items with their index
  ansible.builtin.debug:
    msg: "Index {{ my_index }}: {{ item }}"
  loop:
    - alpha
    - bravo
    - charlie
    - delta
  loop_control:
    index_var: my_index
```

Output:

```
"Index 0: alpha"
"Index 1: bravo"
"Index 2: charlie"
"Index 3: delta"
```

The index starts at 0. You can name the variable anything you want. I typically use descriptive names like `server_idx` or `port_offset` rather than just `idx` to make the playbook self-documenting.

## Creating Numbered Resources

One of the most common uses for `index_var` is creating sequentially numbered resources:

```yaml
# Create numbered worker processes with sequential ports
- name: Deploy worker configurations
  ansible.builtin.template:
    src: worker.conf.j2
    dest: "/etc/myapp/workers/worker-{{ worker_num }}.conf"
  loop:
    - { queue: "emails", concurrency: 5 }
    - { queue: "reports", concurrency: 3 }
    - { queue: "notifications", concurrency: 10 }
    - { queue: "imports", concurrency: 2 }
  loop_control:
    index_var: worker_num
    label: "worker-{{ worker_num }} ({{ item.queue }})"
```

Inside the Jinja2 template `worker.conf.j2`, you can use both the item data and the index:

```jinja2
; Worker {{ worker_num }} configuration
[worker]
name = worker-{{ worker_num }}
queue = {{ item.queue }}
concurrency = {{ item.concurrency }}
port = {{ 9000 + worker_num }}
pid_file = /var/run/myapp/worker-{{ worker_num }}.pid
```

Each worker gets a unique port number calculated from the base port plus the index.

## Assigning Sequential Port Numbers

A common infrastructure pattern is assigning ports from a base number:

```yaml
# Assign sequential ports to services starting from a base port
- name: Configure service ports
  ansible.builtin.template:
    src: service.conf.j2
    dest: "/etc/services.d/{{ item.name }}.conf"
  loop:
    - { name: "api", workers: 4 }
    - { name: "auth", workers: 2 }
    - { name: "search", workers: 3 }
    - { name: "websocket", workers: 1 }
  loop_control:
    index_var: svc_idx
    label: "{{ item.name }} -> port {{ 8080 + svc_idx }}"
  vars:
    base_port: 8080

- name: Show port assignments
  ansible.builtin.debug:
    msg: "{{ item.name }} will listen on port {{ base_port + svc_idx }}"
  loop:
    - { name: "api" }
    - { name: "auth" }
    - { name: "search" }
    - { name: "websocket" }
  loop_control:
    index_var: svc_idx
  vars:
    base_port: 8080
```

## Using index_var for Conditional Logic

You can use the index variable in `when` clauses to process only certain positions:

```yaml
# Deploy to servers in batches: first half, then second half
- name: Deploy to first batch (even indices)
  ansible.builtin.debug:
    msg: "Deploying to {{ item }} (batch 1)"
  loop:
    - web-01
    - web-02
    - web-03
    - web-04
    - web-05
    - web-06
  loop_control:
    index_var: server_idx
  when: server_idx < 3

- name: Deploy to second batch (remaining indices)
  ansible.builtin.debug:
    msg: "Deploying to {{ item }} (batch 2)"
  loop:
    - web-01
    - web-02
    - web-03
    - web-04
    - web-05
    - web-06
  loop_control:
    index_var: server_idx
  when: server_idx >= 3
```

This splits the list into two batches. The first task processes items at indices 0-2, the second processes indices 3-5.

## Building Ordered Data Structures

When you need to create ordered configurations where position matters:

```yaml
# Create priority-ordered DNS entries
- name: Configure DNS resolvers with priority
  ansible.builtin.lineinfile:
    path: /etc/resolv.conf
    line: "nameserver {{ item }}"
    insertafter: "^# DNS servers"
  loop:
    - 10.0.0.2
    - 10.0.0.3
    - 8.8.8.8
  loop_control:
    index_var: dns_priority

- name: Generate HAProxy backend config with server priorities
  ansible.builtin.lineinfile:
    path: /etc/haproxy/haproxy.cfg
    line: "    server backend-{{ server_idx }} {{ item.host }}:{{ item.port }} weight {{ 100 - (server_idx * 10) }} check"
    insertafter: "^backend app_servers"
  loop:
    - { host: "10.0.1.10", port: 8080 }
    - { host: "10.0.1.11", port: 8080 }
    - { host: "10.0.1.12", port: 8080 }
  loop_control:
    index_var: server_idx
    label: "backend-{{ server_idx }} ({{ item.host }})"
```

The weight decreases with each index, giving earlier servers in the list higher priority.

## Generating Unique IDs

Some resources need unique numeric identifiers:

```yaml
# Create database shards with unique IDs
- name: Initialize database shards
  ansible.builtin.command: >
    create-shard
    --shard-id {{ shard_id }}
    --name {{ item.name }}
    --host {{ item.host }}
    --port {{ 5432 + shard_id }}
  loop:
    - { name: "users", host: "db-01" }
    - { name: "orders", host: "db-02" }
    - { name: "products", host: "db-03" }
    - { name: "analytics", host: "db-04" }
  loop_control:
    index_var: shard_id
    label: "shard-{{ shard_id }} ({{ item.name }})"
  changed_when: true
```

## Combining index_var with Arithmetic

You can perform arithmetic on the index variable directly in Jinja2 expressions:

```yaml
# Create staggered cron jobs to avoid thundering herd
- name: Schedule backup cron jobs at staggered times
  ansible.builtin.cron:
    name: "backup-{{ item }}"
    minute: "{{ (backup_idx * 15) % 60 }}"
    hour: "2"
    job: "/usr/local/bin/backup.sh {{ item }}"
  loop:
    - database
    - files
    - configs
    - logs
  loop_control:
    index_var: backup_idx
    label: "{{ item }} at 2:{{ '%02d' | format((backup_idx * 15) % 60) }}"
```

This schedules backups at 2:00, 2:15, 2:30, and 2:45, spacing them 15 minutes apart using the index.

## Practical Example: Multi-Instance Application Deployment

Here is a complete playbook that deploys multiple instances of an application, each on a different port:

```yaml
# Deploy multiple application instances with sequential ports and IDs
- name: Deploy application instances
  hosts: app_servers
  become: yes
  vars:
    app_name: myapi
    base_port: 8080
    instances:
      - { memory: "512m", cpu_shares: 1024 }
      - { memory: "512m", cpu_shares: 1024 }
      - { memory: "256m", cpu_shares: 512 }
      - { memory: "256m", cpu_shares: 512 }

  tasks:
    - name: Create instance directories
      ansible.builtin.file:
        path: "/opt/{{ app_name }}/instance-{{ inst_id }}"
        state: directory
        owner: appuser
        group: appuser
        mode: '0755'
      loop: "{{ instances }}"
      loop_control:
        index_var: inst_id
        label: "instance-{{ inst_id }}"

    - name: Deploy instance configuration
      ansible.builtin.template:
        src: instance.conf.j2
        dest: "/opt/{{ app_name }}/instance-{{ inst_id }}/config.yml"
        owner: appuser
        group: appuser
        mode: '0640'
      loop: "{{ instances }}"
      loop_control:
        index_var: inst_id
        label: "instance-{{ inst_id }}"

    - name: Create systemd service files for each instance
      ansible.builtin.template:
        src: app-instance.service.j2
        dest: "/etc/systemd/system/{{ app_name }}-{{ inst_id }}.service"
      loop: "{{ instances }}"
      loop_control:
        index_var: inst_id
        label: "{{ app_name }}-{{ inst_id }}"
      notify: reload systemd

    - name: Start all application instances
      ansible.builtin.systemd:
        name: "{{ app_name }}-{{ inst_id }}"
        state: started
        enabled: yes
      loop: "{{ instances }}"
      loop_control:
        index_var: inst_id
        label: "{{ app_name }}-{{ inst_id }}"

    - name: Generate HAProxy backend entries
      ansible.builtin.lineinfile:
        path: /etc/haproxy/haproxy.cfg
        line: "    server {{ app_name }}-{{ inst_id }} 127.0.0.1:{{ base_port + inst_id }} check"
        insertafter: "backend {{ app_name }}_servers"
      loop: "{{ instances }}"
      loop_control:
        index_var: inst_id
        label: "{{ app_name }}-{{ inst_id }} -> port {{ base_port + inst_id }}"
      notify: reload haproxy

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: yes

    - name: reload haproxy
      ansible.builtin.service:
        name: haproxy
        state: reloaded
```

This playbook creates four instances of the application, each with a unique ID (0-3), a unique port (8080-8083), its own directory, configuration, and systemd service file. The HAProxy configuration is updated to load-balance across all instances.

## Starting Index from 1 Instead of 0

Since `index_var` is zero-based and you sometimes need one-based numbering, just add 1 in your expressions:

```yaml
# Create one-based numbered items
- name: Create numbered partitions
  ansible.builtin.debug:
    msg: "Partition {{ partition_idx + 1 }}: {{ item }}"
  loop:
    - /dev/sdb
    - /dev/sdc
    - /dev/sdd
  loop_control:
    index_var: partition_idx
```

## Summary

The `index_var` option in `loop_control` provides a simple but powerful way to access the current loop position. Use it for creating numbered resources, calculating sequential port assignments, building priority-ordered configurations, generating unique IDs, and implementing batch processing logic. It is one of those features that seems minor until you need it, and then it saves you from writing awkward workarounds.
