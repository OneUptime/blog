# How to Use Ansible loop_control for Custom Loop Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, loop_control, Playbook Design

Description: Master Ansible loop_control to customize loop variable names, output labels, indexing, and pauses for cleaner and more maintainable playbooks.

---

When Ansible runs a loop, it uses the variable name `item` to represent the current element. This works fine for simple playbooks, but it breaks down when you have nested loops, included tasks with their own loops, or complex playbooks where `item` is ambiguous. The `loop_control` directive lets you customize every aspect of loop behavior, from the variable name to the output format.

## The loop_var Option

The most important `loop_control` option is `loop_var`, which renames the `item` variable to something more descriptive:

```yaml
# Use a descriptive loop variable instead of the generic 'item'
- name: Create application users
  ansible.builtin.user:
    name: "{{ user.name }}"
    shell: "{{ user.shell }}"
    groups: "{{ user.groups | join(',') }}"
  loop:
    - { name: "deploy", shell: "/bin/bash", groups: ["sudo", "docker"] }
    - { name: "appuser", shell: "/bin/bash", groups: ["www-data"] }
    - { name: "monitor", shell: "/usr/sbin/nologin", groups: ["prometheus"] }
  loop_control:
    loop_var: user
```

Instead of writing `item.name`, `item.shell`, etc., you write `user.name`, `user.shell`. This reads much better and makes the task self-documenting.

## Why loop_var Matters for Included Tasks

The real necessity for `loop_var` shows up when you include tasks that have their own loops. Consider this scenario:

```yaml
# Main playbook that loops over applications and includes setup tasks
- name: Setup applications
  hosts: app_servers
  tasks:
    - name: Configure each application
      ansible.builtin.include_tasks: setup-app.yml
      loop:
        - { name: "api", port: 8080 }
        - { name: "web", port: 3000 }
      loop_control:
        loop_var: app
```

And the included file `setup-app.yml`:

```yaml
# setup-app.yml - tasks that also use loops internally
- name: Install packages for {{ app.name }}
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop:
    - "{{ app.name }}-server"
    - "{{ app.name }}-utils"

- name: Create directories for {{ app.name }}
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
  loop:
    - "/opt/{{ app.name }}"
    - "/var/log/{{ app.name }}"
    - "/etc/{{ app.name }}"
```

Without `loop_var: app` in the outer loop, both the outer loop and inner loops would use `item`, causing a collision. The outer `item` would be overwritten by the inner `item`, and the playbook would fail or produce wrong results.

## The label Option

When you loop over complex data structures, Ansible prints the entire structure for each iteration, making the output noisy and hard to read. The `label` option lets you control what gets displayed:

```yaml
# Show only the service name in output instead of the full dictionary
- name: Restart services
  ansible.builtin.systemd:
    name: "{{ service.name }}"
    state: restarted
  loop:
    - { name: "nginx", config: "/etc/nginx/nginx.conf", port: 80, workers: 4, ssl: true }
    - { name: "postgresql", config: "/etc/postgresql/14/main/postgresql.conf", port: 5432, max_connections: 200 }
    - { name: "redis", config: "/etc/redis/redis.conf", port: 6379, maxmemory: "2gb" }
  loop_control:
    loop_var: service
    label: "{{ service.name }}"
```

Without the label, each iteration would print the entire dictionary. With the label, you see just the service name, keeping your terminal output clean and scannable.

## The index_var Option

`index_var` gives you access to the zero-based index of the current iteration:

```yaml
# Create numbered configuration files
- name: Deploy worker configs with sequence numbers
  ansible.builtin.template:
    src: worker.conf.j2
    dest: "/etc/workers/worker-{{ worker_idx }}.conf"
  loop:
    - { queue: "default", threads: 4 }
    - { queue: "priority", threads: 8 }
    - { queue: "background", threads: 2 }
  loop_control:
    loop_var: worker
    index_var: worker_idx
    label: "worker-{{ worker_idx }} ({{ worker.queue }})"
```

## The pause Option

The `pause` option adds a delay (in seconds) between loop iterations. This is useful for rate-limited APIs or rolling operations:

```yaml
# Restart containers one at a time with a 10 second pause between each
- name: Rolling restart of containers
  community.docker.docker_container:
    name: "{{ container.name }}"
    state: started
    restart: yes
  loop:
    - { name: "app-1", image: "myapp:latest" }
    - { name: "app-2", image: "myapp:latest" }
    - { name: "app-3", image: "myapp:latest" }
  loop_control:
    loop_var: container
    label: "{{ container.name }}"
    pause: 10
```

This gives each container 10 seconds to come up and stabilize before the next one is restarted.

## The extended Option

Setting `extended` to `true` provides additional loop information variables:

```yaml
# Access extended loop information
- name: Show extended loop variables
  ansible.builtin.debug:
    msg: >
      Processing {{ item }} -
      First: {{ ansible_loop.first }},
      Last: {{ ansible_loop.last }},
      Index: {{ ansible_loop.index0 }},
      Length: {{ ansible_loop.length }},
      Remaining: {{ ansible_loop.revindex0 }}
  loop:
    - alpha
    - bravo
    - charlie
  loop_control:
    extended: true
```

The extended variables include:

- `ansible_loop.first` - true if this is the first iteration
- `ansible_loop.last` - true if this is the last iteration
- `ansible_loop.index0` - zero-based index
- `ansible_loop.index` - one-based index
- `ansible_loop.length` - total number of items
- `ansible_loop.revindex` - reverse index (one-based)
- `ansible_loop.revindex0` - reverse index (zero-based)
- `ansible_loop.previtem` - the previous item (undefined on first)
- `ansible_loop.nextitem` - the next item (undefined on last)

## Practical Use of Extended Loop Variables

Extended loop variables are great for tasks that need to behave differently on the first or last iteration:

```yaml
# Build a comma-separated list with proper formatting
- name: Generate upstream config
  ansible.builtin.lineinfile:
    path: /etc/nginx/upstream.conf
    line: "    server {{ item }}:8080{{ '' if ansible_loop.last else ';' }}"
    insertafter: "upstream backend {"
  loop:
    - 10.0.1.10
    - 10.0.1.11
    - 10.0.1.12
  loop_control:
    extended: true

# Add a separator between sections except after the last one
- name: Generate config sections
  ansible.builtin.blockinfile:
    path: /etc/myapp/config.ini
    marker: "# {mark} {{ item.name }}"
    block: |
      [{{ item.name }}]
      host = {{ item.host }}
      port = {{ item.port }}
      {{ '---' if not ansible_loop.last else '' }}
  loop:
    - { name: "database", host: "db.local", port: 5432 }
    - { name: "cache", host: "cache.local", port: 6379 }
    - { name: "queue", host: "queue.local", port: 5672 }
  loop_control:
    extended: true
    label: "{{ item.name }}"
```

## The extended_allitems Option

By default, `extended` does not include `ansible_loop.allitems` because it can be memory-intensive for large lists. If you need access to the full list during iteration, enable it explicitly:

```yaml
# Access the full list during iteration (use sparingly on large lists)
- name: Compare current item with full list
  ansible.builtin.debug:
    msg: "{{ item }} is one of {{ ansible_loop.length }} items"
  loop:
    - web
    - api
    - worker
  loop_control:
    extended: true
    extended_allitems: true
```

## Combining All loop_control Options

Here is a task that uses every `loop_control` option together:

```yaml
# Full loop_control example with all options
- name: Deploy application instances
  ansible.builtin.template:
    src: instance.conf.j2
    dest: "/etc/myapp/instance-{{ inst_idx }}.conf"
  loop:
    - { name: "primary", memory: "1g", port: 8080 }
    - { name: "secondary", memory: "512m", port: 8081 }
    - { name: "background", memory: "256m", port: 8082 }
  loop_control:
    loop_var: instance
    index_var: inst_idx
    label: "{{ instance.name }} (port {{ instance.port }})"
    pause: 2
    extended: true
```

## Practical Example: Rolling Service Deployment

Here is a complete playbook that uses `loop_control` extensively for a controlled rolling deployment:

```yaml
# Rolling deployment with full loop control
- name: Rolling deployment
  hosts: localhost
  vars:
    services:
      - { name: "api-gateway", port: 8080, health_path: "/health", priority: 1 }
      - { name: "auth-service", port: 8081, health_path: "/status", priority: 2 }
      - { name: "data-service", port: 8082, health_path: "/ping", priority: 3 }
      - { name: "notification-svc", port: 8083, health_path: "/health", priority: 4 }

  tasks:
    - name: Deploy services in priority order
      ansible.builtin.include_tasks: deploy-service.yml
      loop: "{{ services | sort(attribute='priority') }}"
      loop_control:
        loop_var: svc
        index_var: svc_idx
        label: "[{{ svc_idx + 1 }}/{{ services | length }}] {{ svc.name }}"
        pause: 5
        extended: true
```

The `deploy-service.yml` file:

```yaml
# deploy-service.yml - deploys a single service
- name: "Pull latest image for {{ svc.name }}"
  ansible.builtin.command: docker pull myregistry/{{ svc.name }}:latest
  changed_when: true

- name: "Deploy {{ svc.name }}"
  ansible.builtin.command: >
    docker run -d
    --name {{ svc.name }}
    -p {{ svc.port }}:{{ svc.port }}
    myregistry/{{ svc.name }}:latest
  changed_when: true

- name: "Wait for {{ svc.name }} health check"
  ansible.builtin.uri:
    url: "http://localhost:{{ svc.port }}{{ svc.health_path }}"
    status_code: 200
  register: health
  until: health.status == 200
  retries: 10
  delay: 3

- name: "Log deployment progress"
  ansible.builtin.debug:
    msg: >
      Deployed {{ svc.name }} successfully.
      {{ 'This was the last service.' if ansible_loop.last else 'Moving to next service in 5 seconds...' }}
```

## Summary

`loop_control` transforms how Ansible loops behave and how their output reads. Use `loop_var` to avoid variable collisions in nested includes, `label` for clean output, `index_var` for positional awareness, `pause` for rate limiting, and `extended` for first/last detection and access to the full loop context. Together, these options turn basic loops into sophisticated, production-ready iteration logic.
