# How to Use the handlers_from Parameter in Ansible Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Handlers, Event-Driven Automation

Description: Learn how to use the handlers_from parameter in Ansible roles to load specific handler files for different service management scenarios.

---

Handlers in Ansible are special tasks that only run when notified by other tasks. They are typically used for actions like restarting a service after a configuration change or reloading a firewall after adding new rules. By default, Ansible loads handlers from `handlers/main.yml` in a role. The `handlers_from` parameter lets you load a different handler file, which is useful when your role needs different handler behavior depending on the context.

## Why You Might Need Different Handler Files

Consider a role that manages Nginx. On a standard deployment, you want configuration changes to trigger a graceful reload. But during a migration or major upgrade, you might want a full restart instead. Or maybe your role needs to work across different init systems where the handler commands differ.

Another scenario: you have a role that can be used both as a standalone service and as part of a containerized setup. In a container, restarting a service with systemd does not make sense. You might want to use a different mechanism entirely, like sending a signal to the process.

## Basic Handler Setup

Here is a role with the default handler file:

```yaml
# roles/nginx/handlers/main.yml
# Default handlers - graceful reload and restart via systemd
- name: reload nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded

- name: restart nginx
  ansible.builtin.systemd:
    name: nginx
    state: restarted

- name: validate nginx config
  ansible.builtin.command: nginx -t
  changed_when: false
```

The tasks file notifies these handlers:

```yaml
# roles/nginx/tasks/main.yml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify:
    - validate nginx config
    - reload nginx

- name: Deploy virtual host configurations
  ansible.builtin.template:
    src: "vhost.conf.j2"
    dest: "/etc/nginx/sites-available/{{ item.name }}.conf"
  loop: "{{ nginx_vhosts }}"
  notify:
    - validate nginx config
    - reload nginx
```

## Creating Alternative Handler Files

Now let's add handler files for different scenarios:

```
roles/nginx/
  handlers/
    main.yml           # Default - systemd-based handlers
    container.yml      # For containerized environments
    upgrade.yml        # For upgrade scenarios (full restart)
    sysvinit.yml       # For legacy systems using SysVinit
```

```yaml
# roles/nginx/handlers/container.yml
# Handlers for containerized Nginx (no systemd)
- name: reload nginx
  ansible.builtin.command: nginx -s reload

- name: restart nginx
  ansible.builtin.shell: |
    nginx -s quit
    sleep 2
    nginx
  changed_when: true

- name: validate nginx config
  ansible.builtin.command: nginx -t
  changed_when: false
```

```yaml
# roles/nginx/handlers/upgrade.yml
# Handlers for upgrade scenarios - always do full restart, never reload
- name: reload nginx
  ansible.builtin.systemd:
    name: nginx
    state: restarted
    daemon_reload: yes

- name: restart nginx
  ansible.builtin.systemd:
    name: nginx
    state: restarted
    daemon_reload: yes

- name: validate nginx config
  ansible.builtin.command: nginx -t
  changed_when: false
```

```yaml
# roles/nginx/handlers/sysvinit.yml
# Handlers for legacy systems using SysVinit
- name: reload nginx
  ansible.builtin.service:
    name: nginx
    state: reloaded

- name: restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted

- name: validate nginx config
  ansible.builtin.command: nginx -t
  changed_when: false
```

Notice that every handler file defines the same handler names. This is critical. The tasks in the role notify handlers by name, so the names must match regardless of which handler file is loaded.

## Using handlers_from with include_role

Here is how you specify which handler file to use:

```yaml
# deploy-containers.yml
# Use container-specific handlers since there is no systemd
- hosts: container_hosts
  tasks:
    - name: Configure nginx in containers
      ansible.builtin.include_role:
        name: nginx
        handlers_from: container.yml
      vars:
        nginx_vhosts:
          - name: api
            server_name: api.example.com
```

```yaml
# upgrade-nginx.yml
# Use upgrade handlers that always do a full restart
- hosts: webservers
  become: yes
  serial: 1
  tasks:
    - name: Upgrade nginx with restart handlers
      ansible.builtin.include_role:
        name: nginx
        handlers_from: upgrade.yml
      vars:
        nginx_version: "1.26.0"
```

## Combining handlers_from with Other Parameters

You can use `handlers_from` together with `tasks_from` and `vars_from`:

```yaml
# Full control over which files the role uses
- hosts: webservers
  become: yes
  tasks:
    - name: Run nginx SSL setup with container handlers
      ansible.builtin.include_role:
        name: nginx
        tasks_from: ssl_setup.yml
        vars_from: production.yml
        handlers_from: container.yml
```

This combination gives you fine-grained control. You pick the tasks to run, the variables to use, and the handlers to register.

## Auto-Detecting the Right Handler File

Instead of requiring the playbook to specify `handlers_from`, you can build detection logic into the role itself:

```yaml
# roles/nginx/tasks/main.yml
# Detect the init system and load appropriate handlers
- name: Check if running in a container
  ansible.builtin.stat:
    path: /.dockerenv
  register: docker_check

- name: Set handler file based on environment
  ansible.builtin.set_fact:
    _nginx_handler_file: >-
      {{ 'container.yml' if docker_check.stat.exists
         else ('sysvinit.yml' if ansible_service_mgr == 'sysvinit'
         else 'main.yml') }}

- name: Load appropriate handlers
  ansible.builtin.include_role:
    name: nginx
    handlers_from: "{{ _nginx_handler_file }}"
    tasks_from: configure.yml
```

This approach is more sophisticated. The role figures out the right handlers on its own, and the playbook does not need to know about the implementation details.

## Handler Naming Conventions

When creating multiple handler files, follow these conventions to avoid confusion:

1. Every handler file must define handlers with the same names
2. Use descriptive, namespaced handler names to avoid collisions with other roles
3. Keep the number of handlers small and consistent across files

```yaml
# Good - namespaced and consistent across all handler files
- name: nginx | reload service
  # ...

- name: nginx | restart service
  # ...

- name: nginx | validate configuration
  # ...
```

## Practical Example: Multi-Environment Deployment

Here is a complete example showing how a single role adapts to three different environments:

```yaml
# roles/app_server/handlers/main.yml
# Production and staging - systemd based
- name: restart application
  ansible.builtin.systemd:
    name: myapp
    state: restarted
    daemon_reload: yes

- name: reload application
  ansible.builtin.systemd:
    name: myapp
    state: reloaded
```

```yaml
# roles/app_server/handlers/docker.yml
# Docker environments - use docker commands
- name: restart application
  community.docker.docker_container:
    name: myapp
    state: started
    restart: yes

- name: reload application
  ansible.builtin.command: docker exec myapp kill -HUP 1
  changed_when: true
```

```yaml
# roles/app_server/handlers/supervisor.yml
# Legacy environments using supervisor
- name: restart application
  community.general.supervisorctl:
    name: myapp
    state: restarted

- name: reload application
  community.general.supervisorctl:
    name: myapp
    state: restarted
```

The playbook picks the right handlers based on the target environment:

```yaml
# deploy.yml
- hosts: production
  become: yes
  tasks:
    - name: Deploy to production (systemd)
      ansible.builtin.include_role:
        name: app_server

- hosts: docker_hosts
  tasks:
    - name: Deploy to Docker hosts
      ansible.builtin.include_role:
        name: app_server
        handlers_from: docker.yml

- hosts: legacy_servers
  become: yes
  tasks:
    - name: Deploy to legacy supervisor hosts
      ansible.builtin.include_role:
        name: app_server
        handlers_from: supervisor.yml
```

## Important Notes About Handler Behavior

Handlers loaded via `handlers_from` follow the same rules as regular handlers: they run once at the end of the play, they run in the order they are defined (not the order they were notified), and they only run if at least one task notified them. If you use `include_role` instead of the `roles` directive, handlers are scoped to the include and might behave slightly differently regarding when they flush.

If you need handlers to run immediately rather than at the end of the play, use `meta: flush_handlers`:

```yaml
- name: Deploy configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
  notify: restart application

# Force handlers to run now before continuing
- name: Flush handlers
  ansible.builtin.meta: flush_handlers

- name: Verify application is healthy
  ansible.builtin.uri:
    url: "http://localhost:8080/health"
    status_code: 200
  retries: 5
  delay: 3
```

The `handlers_from` parameter is a small feature that solves a real problem when your role needs to work across different environments with fundamentally different service management approaches. Use it when different handler implementations are genuinely needed, and keep the handler names consistent across all your handler files.
