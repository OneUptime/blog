# How to Start and Stop Services with the Ansible service Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Services, Linux, System Administration

Description: Learn how to start, stop, and manage Linux services using the Ansible service module, with practical examples for common service management scenarios.

---

Managing services is one of the most fundamental tasks in system administration. Every application you deploy, every database you run, every web server you configure needs its service started, stopped, or restarted at some point. The Ansible `service` module provides a simple, cross-platform interface for managing services across different init systems (systemd, SysV init, Upstart).

This post focuses on the practical patterns for starting and stopping services with Ansible.

## Basic Service Management

The `service` module has a clean interface. The two most important parameters are `name` (the service name) and `state` (what you want the service to be).

### Starting a Service

```yaml
# Start the nginx service
- name: Start nginx
  ansible.builtin.service:
    name: nginx
    state: started
```

This is idempotent. If nginx is already running, Ansible reports "ok" and does nothing. If it is stopped, Ansible starts it and reports "changed."

### Stopping a Service

```yaml
# Stop the nginx service
- name: Stop nginx
  ansible.builtin.service:
    name: nginx
    state: stopped
```

Again, idempotent. If the service is already stopped, nothing happens.

## Starting Multiple Services

Use a loop when you need to start several services.

```yaml
# Start all application services
- name: Start application stack services
  ansible.builtin.service:
    name: "{{ item }}"
    state: started
  loop:
    - nginx
    - postgresql
    - redis-server
    - myapp
```

## Conditional Service Management

Often you want to start or stop services based on conditions.

```yaml
# Start a service only if its configuration file exists
- name: Check if nginx config exists
  ansible.builtin.stat:
    path: /etc/nginx/nginx.conf
  register: nginx_conf

- name: Start nginx only if configured
  ansible.builtin.service:
    name: nginx
    state: started
  when: nginx_conf.stat.exists
```

### Start/Stop Based on Server Role

```yaml
# Start services based on the server's role
- name: Start web server
  ansible.builtin.service:
    name: nginx
    state: started
  when: "'web_servers' in group_names"

- name: Start database server
  ansible.builtin.service:
    name: postgresql
    state: started
  when: "'db_servers' in group_names"

- name: Start Redis cache
  ansible.builtin.service:
    name: redis-server
    state: started
  when: "'cache_servers' in group_names"
```

## Stopping Services Gracefully

When stopping services, the order matters. You typically want to stop application services before infrastructure services.

```yaml
# Stop services in the correct order (reverse of start order)
- name: Stop application first
  ansible.builtin.service:
    name: myapp
    state: stopped

- name: Stop web server
  ansible.builtin.service:
    name: nginx
    state: stopped

- name: Stop cache
  ansible.builtin.service:
    name: redis-server
    state: stopped

- name: Stop database last
  ansible.builtin.service:
    name: postgresql
    state: stopped
```

## Using Handlers for Service Management

The most common pattern in Ansible is using handlers to start or stop services in response to configuration changes.

```yaml
# tasks/main.yml
- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
  notify: start nginx

- name: Deploy application configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/config.yml
    mode: '0644'
  notify: start myapp
```

```yaml
# handlers/main.yml
- name: start nginx
  ansible.builtin.service:
    name: nginx
    state: started

- name: start myapp
  ansible.builtin.service:
    name: myapp
    state: started
```

Handlers only run when notified, and they run at the end of the play (or when explicitly flushed).

## Checking Service Status

Sometimes you need to check the status of a service before deciding what to do.

```yaml
# Check if a service is running
- name: Check nginx status
  ansible.builtin.command:
    cmd: systemctl is-active nginx
  register: nginx_status
  changed_when: false
  failed_when: false

- name: Report nginx status
  ansible.builtin.debug:
    msg: "nginx is {{ 'running' if nginx_status.rc == 0 else 'not running' }}"

# Take action based on status
- name: Start backup service only if primary is down
  ansible.builtin.service:
    name: nginx-backup
    state: started
  when: nginx_status.rc != 0
```

## Maintenance Mode Workflow

A common pattern is stopping services for maintenance and starting them back up afterward.

```yaml
---
# playbook: maintenance.yml
# Stop services, perform maintenance, start services
- hosts: web_servers
  become: true
  serial: 1

  tasks:
    - name: Remove from load balancer
      ansible.builtin.uri:
        url: "http://lb.internal/api/servers/{{ inventory_hostname }}/disable"
        method: POST
      delegate_to: localhost

    - name: Wait for active connections to drain
      ansible.builtin.pause:
        seconds: 30

    - name: Stop application services
      ansible.builtin.service:
        name: "{{ item }}"
        state: stopped
      loop:
        - myapp
        - nginx

    - name: Perform maintenance tasks
      ansible.builtin.apt:
        upgrade: safe
        update_cache: true

    - name: Start application services
      ansible.builtin.service:
        name: "{{ item }}"
        state: started
      loop:
        - nginx
        - myapp

    - name: Wait for application to be healthy
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
      register: health_check
      until: health_check.status == 200
      retries: 30
      delay: 5

    - name: Re-add to load balancer
      ansible.builtin.uri:
        url: "http://lb.internal/api/servers/{{ inventory_hostname }}/enable"
        method: POST
      delegate_to: localhost
```

The `serial: 1` ensures only one server is taken out of service at a time.

## Service Management in Roles

When building roles, the pattern is to start the service after configuration is complete.

```yaml
# roles/nginx/tasks/main.yml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Deploy configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
  notify: restart nginx

- name: Ensure nginx is started
  ansible.builtin.service:
    name: nginx
    state: started
```

The final task ensures the service is running even on the first run when there may not be a handler notification.

## Dealing with Service Dependencies

Some services depend on others. Handle this explicitly.

```yaml
# Start services respecting dependencies
- name: Start PostgreSQL (database must be up first)
  ansible.builtin.service:
    name: postgresql
    state: started

- name: Wait for PostgreSQL to accept connections
  ansible.builtin.wait_for:
    port: 5432
    delay: 5
    timeout: 60

- name: Start the application (depends on database)
  ansible.builtin.service:
    name: myapp
    state: started

- name: Wait for application to be ready
  ansible.builtin.wait_for:
    port: 8080
    delay: 5
    timeout: 60

- name: Start nginx (depends on application backend)
  ansible.builtin.service:
    name: nginx
    state: started
```

The `wait_for` module is crucial here. It ensures each service is actually ready before starting the next one, not just that the process has been launched.

## Error Handling

Wrap service operations in blocks for proper error handling.

```yaml
# Handle service start failures gracefully
- name: Manage application service
  block:
    - name: Start the application
      ansible.builtin.service:
        name: myapp
        state: started

    - name: Verify application is responding
      ansible.builtin.uri:
        url: http://localhost:8080/health
      register: health
      retries: 5
      delay: 3
      until: health.status == 200

  rescue:
    - name: Application failed to start, check logs
      ansible.builtin.command:
        cmd: journalctl -u myapp --no-pager -n 50
      register: service_logs
      changed_when: false

    - name: Display failure logs
      ansible.builtin.debug:
        var: service_logs.stdout_lines

    - name: Fail with useful message
      ansible.builtin.fail:
        msg: "Application failed to start. Check the logs above."
```

## Wrapping Up

Starting and stopping services with the Ansible `service` module is straightforward, but doing it well requires thinking about ordering, dependencies, health checks, and error handling. The patterns in this post cover the common scenarios: basic start/stop, conditional management, maintenance workflows, and proper dependency handling. The `service` module works across init systems, so these patterns apply whether your hosts use systemd, SysV init, or Upstart. For systemd-specific features (like daemon_reload), you will want to use the `systemd` module instead, but for basic start/stop operations, `service` is the right tool.
