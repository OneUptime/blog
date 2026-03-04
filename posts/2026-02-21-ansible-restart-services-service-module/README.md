# How to Restart Services with the Ansible service Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Services, Linux, Deployment, Configuration Management

Description: Learn the best practices for restarting services with Ansible, including handler patterns, rolling restarts, health checks, and graceful reload strategies.

---

Restarting services is the most common operation triggered during deployments and configuration changes. But doing it wrong can cause downtime, dropped connections, and angry users. Ansible provides several patterns for restarting services, from basic restarts to sophisticated rolling restart strategies that maintain availability.

Let me walk through the different approaches and when to use each one.

## Basic Service Restart

The simplest restart uses the `service` module with `state: restarted`.

```yaml
# Restart nginx
- name: Restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
```

Unlike `state: started` (which is idempotent and does nothing if the service is already running), `state: restarted` always restarts the service regardless of its current state. This means it will cause a brief interruption every time the task runs. Use it deliberately.

## Restarting vs Reloading

Many services support reloading their configuration without a full restart. This is preferable because it avoids dropping active connections.

```yaml
# Reload nginx configuration (no downtime)
- name: Reload nginx configuration
  ansible.builtin.service:
    name: nginx
    state: reloaded
```

Not all services support reloading. When you use `state: reloaded` on a service that does not support it, the behavior depends on the init system. Systemd will typically fall back to a restart.

Here is a pattern that tries reload first and falls back to restart.

```yaml
# Try reload, fall back to restart
- name: Reload nginx (graceful)
  ansible.builtin.service:
    name: nginx
    state: reloaded
  register: reload_result
  ignore_errors: true

- name: Restart nginx if reload failed
  ansible.builtin.service:
    name: nginx
    state: restarted
  when: reload_result is failed
```

## The Handler Pattern

The most Ansible-idiomatic way to restart services is through handlers. A handler runs only when notified by a task that made a change.

```yaml
# tasks/main.yml
- name: Update nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
  notify: restart nginx

- name: Update nginx virtual hosts
  ansible.builtin.template:
    src: "{{ item }}.conf.j2"
    dest: "/etc/nginx/sites-available/{{ item }}.conf"
    mode: '0644'
  loop: "{{ nginx_sites }}"
  notify: restart nginx

- name: Update SSL certificates
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/nginx/ssl/
    mode: '0600'
  loop:
    - server.crt
    - server.key
  notify: restart nginx
```

```yaml
# handlers/main.yml
- name: restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
```

Even if multiple tasks notify the same handler, the handler only runs once at the end of the play. This avoids unnecessary multiple restarts.

### Flushing Handlers

Sometimes you need a service to restart before a subsequent task runs. Use `meta: flush_handlers`.

```yaml
# Force handlers to run immediately
- name: Deploy new application configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/config.yml
  notify: restart myapp

- name: Flush handlers to restart the app now
  ansible.builtin.meta: flush_handlers

- name: Run database migration (requires app to be restarted)
  ansible.builtin.command:
    cmd: /opt/myapp/bin/migrate
  changed_when: true
```

## Restart with Health Check

Blindly restarting a service without verifying it came back healthy is risky. Here is a pattern that validates the restart.

```yaml
# Restart with health verification
- name: Restart the application
  ansible.builtin.service:
    name: myapp
    state: restarted

- name: Wait for application to be healthy
  ansible.builtin.uri:
    url: "http://localhost:8080/health"
  register: health_check
  until: health_check.status == 200
  retries: 30
  delay: 2
```

For TCP-only services (no HTTP endpoint), use `wait_for`.

```yaml
# Restart PostgreSQL and verify it accepts connections
- name: Restart PostgreSQL
  ansible.builtin.service:
    name: postgresql
    state: restarted

- name: Wait for PostgreSQL to accept connections
  ansible.builtin.wait_for:
    port: 5432
    host: 127.0.0.1
    delay: 5
    timeout: 60
    state: started
```

## Rolling Restarts

For clusters where you cannot afford downtime, use rolling restarts with `serial`.

```yaml
---
# playbook: rolling-restart.yml
# Restart application servers one at a time to maintain availability
- hosts: app_servers
  become: true
  serial: 1

  tasks:
    - name: Remove from load balancer
      ansible.builtin.uri:
        url: "http://lb.internal/api/backend/{{ inventory_hostname }}/disable"
        method: POST
      delegate_to: localhost

    - name: Wait for connections to drain
      ansible.builtin.pause:
        seconds: 15

    - name: Restart application service
      ansible.builtin.service:
        name: myapp
        state: restarted

    - name: Wait for application health check
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
      register: health
      until: health.status == 200
      retries: 30
      delay: 3

    - name: Re-add to load balancer
      ansible.builtin.uri:
        url: "http://lb.internal/api/backend/{{ inventory_hostname }}/enable"
        method: POST
      delegate_to: localhost

    - name: Wait before proceeding to next server
      ansible.builtin.pause:
        seconds: 10
```

### Rolling Restart with Percentage

You can also restart a percentage of servers at a time.

```yaml
# Restart 25% of servers at a time
- hosts: app_servers
  become: true
  serial: "25%"
  max_fail_percentage: 10

  tasks:
    - name: Restart the application
      ansible.builtin.service:
        name: myapp
        state: restarted

    - name: Verify health
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
      register: health
      until: health.status == 200
      retries: 20
      delay: 5
```

The `max_fail_percentage` stops the rolling restart if too many servers fail, preventing a cascading failure.

## Conditional Restart

Sometimes a restart should only happen under certain conditions.

```yaml
# Only restart if the configuration actually changed
- name: Deploy configuration
  ansible.builtin.template:
    src: myapp.conf.j2
    dest: /etc/myapp/config.yml
  register: config_deployed

- name: Restart only if configuration changed
  ansible.builtin.service:
    name: myapp
    state: restarted
  when: config_deployed.changed
```

This is functionally similar to using a handler, but gives you more explicit control in the task list.

## Restart with Pre-Check

Before restarting, validate the new configuration.

```yaml
# Validate configuration before restarting
- name: Deploy new nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
  register: nginx_config

- name: Test nginx configuration syntax
  ansible.builtin.command:
    cmd: nginx -t
  register: nginx_test
  changed_when: false
  when: nginx_config.changed

- name: Restart nginx if configuration is valid
  ansible.builtin.service:
    name: nginx
    state: restarted
  when:
    - nginx_config.changed
    - nginx_test.rc == 0

- name: Fail if configuration is invalid
  ansible.builtin.fail:
    msg: "nginx configuration test failed: {{ nginx_test.stderr }}"
  when:
    - nginx_config.changed
    - nginx_test.rc != 0
```

## Restart with Rollback

For critical services, implement a rollback if the restart fails.

```yaml
# Restart with automatic rollback on failure
- name: Backup current configuration
  ansible.builtin.copy:
    src: /etc/myapp/config.yml
    dest: /etc/myapp/config.yml.bak
    remote_src: true
    mode: '0644'

- name: Deploy new configuration
  ansible.builtin.template:
    src: config.yml.j2
    dest: /etc/myapp/config.yml
    mode: '0644'

- name: Restart and verify
  block:
    - name: Restart the service
      ansible.builtin.service:
        name: myapp
        state: restarted

    - name: Verify service is healthy
      ansible.builtin.uri:
        url: http://localhost:8080/health
      register: health
      until: health.status == 200
      retries: 10
      delay: 3

  rescue:
    - name: Restore previous configuration
      ansible.builtin.copy:
        src: /etc/myapp/config.yml.bak
        dest: /etc/myapp/config.yml
        remote_src: true
        mode: '0644'

    - name: Restart with old configuration
      ansible.builtin.service:
        name: myapp
        state: restarted

    - name: Report rollback
      ansible.builtin.fail:
        msg: "Deployment failed, rolled back to previous configuration"
```

## Delayed Restart

Sometimes you want to schedule a restart for a maintenance window rather than doing it immediately.

```yaml
# Schedule a service restart via a systemd timer (deferred restart)
- name: Create a one-shot restart service
  ansible.builtin.copy:
    dest: /etc/systemd/system/restart-myapp.service
    content: |
      [Unit]
      Description=Restart MyApp Service

      [Service]
      Type=oneshot
      ExecStart=/bin/systemctl restart myapp
    mode: '0644'

- name: Schedule restart for 3 AM
  ansible.builtin.command:
    cmd: systemd-run --on-calendar="03:00" systemctl restart myapp
  changed_when: true
```

## Wrapping Up

Restarting services with Ansible is more nuanced than it first appears. The basic restart is fine for development, but production environments need health checks, rolling restart strategies, configuration validation, and rollback mechanisms. Use handlers for configuration-triggered restarts, rolling restarts for zero-downtime deployments, and always verify the service is healthy after a restart. These patterns keep your deployments safe and your users happy.
