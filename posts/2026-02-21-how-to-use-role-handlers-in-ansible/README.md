# How to Use Role Handlers in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Handlers, Service Management

Description: Learn how to define and use handlers within Ansible roles for efficient event-driven service management and configuration reloads.

---

Handlers are one of the more elegant features in Ansible. They let you define actions that only fire when something actually changes, and they run at most once per play regardless of how many tasks trigger them. Inside roles, handlers become even more powerful because they are scoped and organized cleanly. This post covers how to define handlers in a role, trigger them correctly, and deal with edge cases like flushing, listening, and cross-role handler invocation.

## Where Role Handlers Live

Handlers go in `handlers/main.yml` inside your role:

```
roles/
  nginx/
    handlers/
      main.yml    <-- handlers defined here
    tasks/
      main.yml
```

Ansible loads `handlers/main.yml` automatically when the role is applied. You do not need to import or include it.

## Basic Handler Definition

Handlers look exactly like tasks, but they only run when notified:

```yaml
# roles/nginx/handlers/main.yml
# These run only when a task with "notify" makes an actual change
---
- name: Restart Nginx
  ansible.builtin.systemd:
    name: nginx
    state: restarted

- name: Reload Nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded

- name: Validate Nginx config
  ansible.builtin.command: nginx -t
  changed_when: false
```

## Triggering Handlers with notify

In your tasks, use the `notify` keyword to trigger a handler when the task produces a change:

```yaml
# roles/nginx/tasks/main.yml
# Tasks that trigger handlers when they make changes
---
- name: Install Nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Deploy main Nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
  notify: Restart Nginx

- name: Deploy virtual host configuration
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: /etc/nginx/sites-available/myapp.conf
    owner: root
    group: root
    mode: '0644'
  notify: Reload Nginx

- name: Enable virtual host
  ansible.builtin.file:
    src: /etc/nginx/sites-available/myapp.conf
    dest: /etc/nginx/sites-enabled/myapp.conf
    state: link
  notify: Reload Nginx
```

If the template module detects that the file content has not changed, it reports `ok` (not `changed`), and the handler is not notified. This means your services only restart when there is actually a new configuration to pick up.

## Handler Deduplication

A key behavior: if multiple tasks notify the same handler, it runs exactly once at the end of the play. In the example above, if both the virtual host configuration and the symlink change, the "Reload Nginx" handler still runs just once.

## Notifying Multiple Handlers

A single task can notify multiple handlers:

```yaml
# Trigger both a config validation and a reload
- name: Deploy Nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify:
    - Validate Nginx config
    - Reload Nginx
```

Handlers run in the order they are defined in `handlers/main.yml`, not in the order they appear in the `notify` list. This is important because it means you can define "Validate Nginx config" before "Reload Nginx" in your handlers file to ensure validation always runs first.

## Handler Execution Order

Handlers execute in the order they are listed in the handlers file. Use this to create a pipeline:

```yaml
# roles/nginx/handlers/main.yml
# Order matters - validation runs before reload
---
- name: Validate Nginx config
  ansible.builtin.command: nginx -t
  changed_when: false

- name: Reload Nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded

- name: Restart Nginx
  ansible.builtin.systemd:
    name: nginx
    state: restarted
```

If a task notifies both "Validate Nginx config" and "Reload Nginx", validation runs first because it appears first in the file.

## Flushing Handlers Mid-Play

Normally handlers run at the end of a play. But sometimes you need a handler to fire immediately, for example when a later task depends on a restarted service. Use `meta: flush_handlers`:

```yaml
# roles/database/tasks/main.yml
# Flush handlers to ensure the service restarts before we proceed
---
- name: Deploy database configuration
  ansible.builtin.template:
    src: postgresql.conf.j2
    dest: /etc/postgresql/15/main/postgresql.conf
  notify: Restart PostgreSQL

- name: Flush handlers to restart PostgreSQL now
  ansible.builtin.meta: flush_handlers

- name: Wait for PostgreSQL to be ready
  ansible.builtin.wait_for:
    port: 5432
    delay: 5
    timeout: 30

- name: Create application database
  community.postgresql.postgresql_db:
    name: myapp
    state: present
```

Without the flush, "Restart PostgreSQL" would not run until after "Create application database", which would fail because the database server is not yet running with the new config.

## The listen Directive

Since Ansible 2.2, handlers support `listen`, which lets multiple handlers subscribe to a single notification topic:

```yaml
# roles/nginx/handlers/main.yml
# Multiple handlers listening on the same topic
---
- name: Validate Nginx config
  ansible.builtin.command: nginx -t
  changed_when: false
  listen: "nginx config changed"

- name: Reload Nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded
  listen: "nginx config changed"

- name: Log config change
  ansible.builtin.debug:
    msg: "Nginx configuration was updated and reloaded"
  listen: "nginx config changed"
```

Now in your tasks:

```yaml
# Notify the topic, and all handlers listening to it will fire
- name: Deploy Nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: "nginx config changed"
```

This triggers all three handlers. The `listen` directive is particularly useful when you want a clean separation between the notification and the specific actions taken.

## Cross-Role Handler Notifications

Handlers defined in one role can be notified by tasks in another role, as long as both roles are applied in the same play:

```yaml
# roles/app/tasks/main.yml
# Task in the "app" role notifying a handler from the "nginx" role
---
- name: Deploy application code
  ansible.builtin.git:
    repo: https://github.com/example/myapp.git
    dest: /opt/myapp
    version: "{{ app_version }}"
  notify: Reload Nginx
```

This works because Ansible collects all handlers from all roles in the play into a single namespace. The handler name must match exactly (case-sensitive).

## Conditional Handlers

You can add conditions to handlers:

```yaml
# roles/nginx/handlers/main.yml
# Conditional handler - only restarts if the OS supports systemd
---
- name: Restart Nginx
  ansible.builtin.systemd:
    name: nginx
    state: restarted
  when: ansible_service_mgr == "systemd"

- name: Restart Nginx (sysvinit)
  ansible.builtin.service:
    name: nginx
    state: restarted
  when: ansible_service_mgr != "systemd"
```

## Handlers with Failures

If a handler fails, it stops the handler execution chain and the play fails. To handle this gracefully, you can use `block` and `rescue` within handlers (Ansible 2.14+) or validate configuration before restarting:

```yaml
# roles/nginx/handlers/main.yml
# Validate before restarting to prevent service outages
---
- name: Restart Nginx safely
  block:
    - name: Validate Nginx configuration
      ansible.builtin.command: nginx -t

    - name: Restart Nginx service
      ansible.builtin.systemd:
        name: nginx
        state: restarted
  rescue:
    - name: Report configuration error
      ansible.builtin.debug:
        msg: "WARNING: Nginx configuration is invalid, skipping restart"
```

## Practical Example: Full Role with Handlers

```yaml
# roles/haproxy/handlers/main.yml
---
- name: Check HAProxy config
  ansible.builtin.command: haproxy -c -f /etc/haproxy/haproxy.cfg
  changed_when: false
  listen: "haproxy config changed"

- name: Reload HAProxy
  ansible.builtin.systemd:
    name: haproxy
    state: reloaded
  listen: "haproxy config changed"
```

```yaml
# roles/haproxy/tasks/main.yml
---
- name: Install HAProxy
  ansible.builtin.apt:
    name: haproxy
    state: present

- name: Deploy HAProxy configuration
  ansible.builtin.template:
    src: haproxy.cfg.j2
    dest: /etc/haproxy/haproxy.cfg
    owner: root
    group: root
    mode: '0644'
  notify: "haproxy config changed"

- name: Ensure HAProxy is running
  ansible.builtin.service:
    name: haproxy
    state: started
    enabled: yes
```

## Wrapping Up

Role handlers keep your automation efficient by only performing actions when needed. The key points to remember are: handlers run once at the end of a play regardless of how many times they are notified, the `listen` directive lets you group multiple handlers under one topic, `meta: flush_handlers` forces immediate execution when you need it, and handler execution order follows the order in the handlers file. Using handlers properly prevents unnecessary service restarts and makes your roles both safer and faster.
