# How to Control Task Execution Order in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Task Execution, Playbook, Ordering

Description: Control the order of task execution in Ansible using pre_tasks, post_tasks, roles, handlers, blocks, and host ordering for predictable deployments.

---

Ansible tasks run in a specific order, and understanding that order is critical for building reliable playbooks. Tasks do not just execute top to bottom when you add roles, handlers, pre_tasks, and post_tasks into the mix. This guide covers the complete execution order and techniques for controlling exactly when things run.

## The Play Execution Order

Within a single play, Ansible executes in this order:

1. `pre_tasks`
2. Handlers triggered by pre_tasks
3. `roles`
4. `tasks`
5. Handlers triggered by roles and tasks
6. `post_tasks`
7. Handlers triggered by post_tasks

Here is a playbook demonstrating all sections:

```yaml
# execution-order.yml - Shows the complete execution order
---
- name: Demonstrate execution order
  hosts: webservers

  pre_tasks:
    - name: "1. Pre-task: Disable monitoring alerts"
      debug:
        msg: "Disabling alerts before changes"
      changed_when: true
      notify: Pre-task handler

  roles:
    - role: webserver  # "3. Role tasks execute here"

  tasks:
    - name: "4. Task: Deploy application"
      debug:
        msg: "Deploying application"
      changed_when: true
      notify: Task handler

  post_tasks:
    - name: "6. Post-task: Re-enable monitoring"
      debug:
        msg: "Re-enabling monitoring"
      changed_when: true
      notify: Post-task handler

  handlers:
    - name: "Pre-task handler"
      debug:
        msg: "2. Handler from pre_task"

    - name: Task handler
      debug:
        msg: "5. Handler from task/role"

    - name: Post-task handler
      debug:
        msg: "7. Handler from post_task"
```

This produces:

```
1. Pre-task: Disable monitoring alerts
2. Handler from pre_task
3. Role tasks (webserver role)
4. Task: Deploy application
5. Handler from task/role
6. Post-task: Re-enable monitoring
7. Handler from post_task
```

## Using pre_tasks and post_tasks

The most common use of `pre_tasks` and `post_tasks` is load balancer coordination during rolling updates:

```yaml
# rolling-deploy.yml
---
- name: Rolling deployment
  hosts: webservers
  serial: 5

  pre_tasks:
    # Remove from load balancer BEFORE any changes
    - name: Remove from load balancer
      community.general.haproxy:
        state: disabled
        backend: webservers
        host: "{{ inventory_hostname }}"
      delegate_to: lb-01

    - name: Wait for connections to drain
      wait_for:
        timeout: 30

  roles:
    - deploy

  tasks:
    - name: Verify application health
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 10
      delay: 3
      register: health
      until: health.status == 200

  post_tasks:
    # Re-add to load balancer AFTER all changes and verification
    - name: Add back to load balancer
      community.general.haproxy:
        state: enabled
        backend: webservers
        host: "{{ inventory_hostname }}"
      delegate_to: lb-01
```

## Controlling Handler Execution Order

By default, handlers run in the order they are defined (not the order they are notified). To control this:

```yaml
# handler-order.yml
---
- name: Handler ordering
  hosts: webservers

  tasks:
    - name: Update nginx config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify:
        - Validate nginx config
        - Reload nginx

    - name: Update application config
      template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      notify:
        - Restart application

  handlers:
    # Handlers run in this definition order
    - name: Validate nginx config
      command: nginx -t

    - name: Reload nginx
      service:
        name: nginx
        state: reloaded

    - name: Restart application
      service:
        name: myapp
        state: restarted
```

Handlers fire in the order: Validate nginx, Reload nginx, Restart application, regardless of which task notified them.

## Forcing Handlers to Run Early

Use `meta: flush_handlers` to force handlers to run at a specific point:

```yaml
- name: Deploy with handler flush
  hosts: webservers

  tasks:
    - name: Deploy new config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Reload nginx

    # Force the handler to run NOW, before the next task
    - meta: flush_handlers

    # This task needs nginx to be reloaded first
    - name: Verify nginx is serving
      uri:
        url: "http://localhost/health"
        status_code: 200
      retries: 3
      delay: 2

  handlers:
    - name: Reload nginx
      service:
        name: nginx
        state: reloaded
```

Without `flush_handlers`, the health check would run before nginx reloads.

## Task Ordering with Blocks

Use `block`, `rescue`, and `always` for ordered error handling:

```yaml
- name: Ordered deployment with error handling
  hosts: webservers

  tasks:
    - name: Deploy with rollback capability
      block:
        # These run in order
        - name: Backup current version
          command: cp -r /opt/app/current /opt/app/backup

        - name: Deploy new version
          copy:
            src: app-new.tar.gz
            dest: /opt/app/current/

        - name: Restart service
          service:
            name: myapp
            state: restarted

        - name: Verify health
          uri:
            url: "http://localhost:8080/health"
            status_code: 200

      rescue:
        # These run in order if ANY task in block fails
        - name: Rollback to backup
          command: cp -r /opt/app/backup /opt/app/current

        - name: Restart with old version
          service:
            name: myapp
            state: restarted

      always:
        # These ALWAYS run, regardless of success or failure
        - name: Clean up backup
          file:
            path: /opt/app/backup
            state: absent
```

## Ordering with include_tasks and import_tasks

`import_tasks` is processed at playbook parse time (static). Tasks are inserted in place and follow the normal order:

```yaml
- name: Static import (processed at parse time)
  import_tasks: setup.yml

- name: This runs after ALL tasks from setup.yml
  debug:
    msg: "Setup complete"
```

`include_tasks` is processed at runtime (dynamic). The included tasks run when the include task is reached:

```yaml
- name: Dynamic include (processed at runtime)
  include_tasks: "setup-{{ ansible_os_family }}.yml"

- name: This runs after the included tasks complete
  debug:
    msg: "OS-specific setup complete"
```

## Role Ordering

Roles execute in the order they are listed:

```yaml
- name: Apply roles in order
  hosts: webservers
  roles:
    - common       # First
    - security     # Second
    - webserver    # Third
    - monitoring   # Fourth
```

Use role dependencies for automatic ordering:

```yaml
# roles/webserver/meta/main.yml
dependencies:
  - role: common   # common runs BEFORE webserver
  - role: security # security runs BEFORE webserver
```

## Task Ordering with the order Parameter

Control host execution order with the `order` parameter:

```yaml
# Hosts execute tasks in sorted order (alphabetical)
- name: Ordered host execution
  hosts: all
  order: sorted

  tasks:
    - name: Process hosts alphabetically
      debug:
        msg: "Processing {{ inventory_hostname }}"
```

Options:
- `inventory` - use inventory order (default)
- `reverse_inventory` - reverse of inventory order
- `sorted` - alphabetical by hostname
- `reverse_sorted` - reverse alphabetical
- `shuffle` - random order each run

## Multiple Plays for Ordering

When you need tasks on different host groups to run in a specific order, use multiple plays:

```yaml
# multi-play-ordering.yml
---
# First: update database servers
- name: Update databases
  hosts: db_servers
  tasks:
    - name: Run migrations
      command: /opt/db/migrate.sh

# Second: update app servers (AFTER databases)
- name: Update application servers
  hosts: app_servers
  tasks:
    - name: Deploy new version
      copy:
        src: app.tar.gz
        dest: /opt/app/

# Third: update cache servers (AFTER app servers)
- name: Clear caches
  hosts: cache_servers
  tasks:
    - name: Flush cache
      command: redis-cli FLUSHALL
```

Plays execute sequentially. All database tasks finish before any app server task starts.

Ansible's execution ordering is designed around the common deployment pattern of prepare, apply, verify. Understanding the order lets you build playbooks that handle real-world deployment workflows reliably.
