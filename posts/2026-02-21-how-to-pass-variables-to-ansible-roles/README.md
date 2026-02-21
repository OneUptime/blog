# How to Pass Variables to Ansible Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Variables, DevOps

Description: Learn every method for passing variables to Ansible roles including role parameters, defaults, vars files, and dependency variables.

---

Ansible roles are the primary unit of reusable automation. A well-written role works across different projects and environments because its behavior is controlled by variables. But passing variables to roles is not as simple as just defining them in your playbook. There are multiple methods, each with different precedence levels and use cases. Choosing the wrong method can lead to variables being silently overridden or ignored. In this post, I will cover every way to pass variables to roles and explain when to use each one.

## Role Variable Structure

Before diving into how to pass variables, let us look at where roles define their own variables:

```
roles/
  webserver/
    defaults/
      main.yml      # Default values (lowest precedence, easily overridden)
    vars/
      main.yml      # Role-internal variables (high precedence, hard to override)
    tasks/
      main.yml
    templates/
    handlers/
    meta/
      main.yml      # Role dependencies
```

### defaults/main.yml

These are the intended customization points of the role. They have the lowest precedence, so almost any other variable definition will override them:

```yaml
# roles/webserver/defaults/main.yml
# These values are defaults. Users of this role should override these.

webserver_port: 80
webserver_user: www-data
webserver_group: www-data
webserver_document_root: /var/www/html
webserver_max_clients: 256
webserver_log_level: warn
webserver_ssl_enabled: false
webserver_ssl_port: 443
```

### vars/main.yml

These are internal variables the role needs to function. They have high precedence and are not meant to be overridden by users:

```yaml
# roles/webserver/vars/main.yml
# Internal variables. Do not override these from outside the role.

webserver_config_dir: /etc/nginx
webserver_service_name: nginx
webserver_pid_file: /var/run/nginx.pid
webserver_modules_dir: /etc/nginx/modules-enabled
```

## Method 1: Passing Variables in the roles Block

The most common method. Variables passed here override `defaults/main.yml` but not `vars/main.yml`:

```yaml
---
# deploy.yml
# Pass role variables directly when including the role

- hosts: webservers
  become: yes
  roles:
    - role: webserver
      webserver_port: 8080
      webserver_ssl_enabled: true
      webserver_max_clients: 512
      webserver_log_level: info
```

You can also use the `vars` keyword for clarity:

```yaml
- hosts: webservers
  become: yes
  roles:
    - role: webserver
      vars:
        webserver_port: 8080
        webserver_ssl_enabled: true
        webserver_max_clients: 512
```

## Method 2: Using include_role with vars

When including roles dynamically, pass variables with the `vars` parameter:

```yaml
---
# dynamic-include.yml
# Dynamically include a role with variables

- hosts: webservers
  become: yes
  tasks:
    - name: Set up web server
      include_role:
        name: webserver
      vars:
        webserver_port: 8080
        webserver_ssl_enabled: true

    - name: Set up web server with different port for admin
      include_role:
        name: webserver
      vars:
        webserver_port: 9090
        webserver_document_root: /var/www/admin
```

This is particularly useful when you need to call the same role multiple times with different parameters.

## Method 3: Group and Host Variables

Variables from `group_vars` and `host_vars` override role defaults automatically:

```yaml
# inventory/group_vars/webservers.yml
# These override the webserver role's defaults/main.yml

webserver_port: 8080
webserver_max_clients: 1024
webserver_ssl_enabled: true
```

```yaml
# inventory/host_vars/web01.yml
# Host-specific overrides

webserver_max_clients: 2048    # This host handles more traffic
```

The playbook does not need any variable passing at all:

```yaml
---
# deploy.yml
# Variables come from group_vars and host_vars automatically

- hosts: webservers
  become: yes
  roles:
    - webserver
```

## Method 4: Play-Level vars and vars_files

Variables defined in the play also override role defaults:

```yaml
---
# deploy.yml
# Play-level vars override role defaults

- hosts: webservers
  become: yes
  vars:
    webserver_port: 8080
    webserver_ssl_enabled: true
  vars_files:
    - vars/webserver-config.yml
  roles:
    - webserver
```

## Method 5: Role Dependencies

Roles can depend on other roles and pass variables to them through `meta/main.yml`:

```yaml
# roles/webapp/meta/main.yml
# This role depends on the webserver role and passes configuration to it

dependencies:
  - role: webserver
    vars:
      webserver_port: 8080
      webserver_ssl_enabled: true
      webserver_document_root: /opt/webapp/public

  - role: database_client
    vars:
      db_host: "{{ database_host }}"
      db_port: 5432
```

When you apply the `webapp` role, it automatically applies the `webserver` role first with the specified variables:

```yaml
---
# deploy.yml
- hosts: app_servers
  become: yes
  roles:
    - webapp    # This automatically includes webserver and database_client
```

## Method 6: Extra Variables

Command-line extra variables override everything except `vars/main.yml` in the role:

```bash
# Override the role's default port at runtime
ansible-playbook deploy.yml -e "webserver_port=9999"
```

Extra vars have the highest precedence, making them useful for emergency overrides.

## Calling the Same Role Multiple Times

By default, Ansible only executes a role once per play, even if you list it multiple times. To run it multiple times with different variables, use `include_role` or set `allow_duplicates: true`:

```yaml
---
# multi-instance.yml
# Deploy multiple application instances using the same role

- hosts: app_servers
  become: yes
  tasks:
    # First instance on port 8001
    - name: Deploy frontend instance
      include_role:
        name: webapp
      vars:
        webapp_name: frontend
        webapp_port: 8001
        webapp_workers: 4

    # Second instance on port 8002
    - name: Deploy backend instance
      include_role:
        name: webapp
      vars:
        webapp_name: backend
        webapp_port: 8002
        webapp_workers: 8

    # Third instance on port 8003
    - name: Deploy API instance
      include_role:
        name: webapp
      vars:
        webapp_name: api
        webapp_port: 8003
        webapp_workers: 6
```

Or in the role's `meta/main.yml`:

```yaml
# roles/webapp/meta/main.yml
allow_duplicates: true
```

## A Complete Working Example

Here is a role and playbook that demonstrates proper variable passing:

Role defaults:

```yaml
# roles/app_deploy/defaults/main.yml
# All of these can be overridden by the playbook user

app_name: myapp
app_version: latest
app_user: appuser
app_group: appuser
app_port: 8080
app_workers: "{{ ansible_processor_vcpus }}"
app_memory_limit: 512M
app_log_level: info
app_health_check_path: /health
app_deploy_dir: "/opt/{{ app_name }}"
```

Role tasks:

```yaml
# roles/app_deploy/tasks/main.yml
- name: Create application user
  user:
    name: "{{ app_user }}"
    group: "{{ app_group }}"
    system: yes

- name: Create deployment directory
  file:
    path: "{{ app_deploy_dir }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'

- name: Deploy application configuration
  template:
    src: config.yml.j2
    dest: "{{ app_deploy_dir }}/config.yml"
    owner: "{{ app_user }}"
    mode: '0644'
  notify: restart {{ app_name }}

- name: Deploy systemd service
  template:
    src: app.service.j2
    dest: "/etc/systemd/system/{{ app_name }}.service"
  notify:
    - reload systemd
    - restart {{ app_name }}

- name: Ensure application is running
  service:
    name: "{{ app_name }}"
    state: started
    enabled: yes
```

The playbook that uses this role:

```yaml
---
# deploy-all.yml
# Deploy multiple applications with different configurations

- hosts: frontend_servers
  become: yes
  roles:
    - role: app_deploy
      vars:
        app_name: frontend
        app_version: "3.2.1"
        app_port: 3000
        app_workers: 4
        app_memory_limit: 256M

- hosts: api_servers
  become: yes
  roles:
    - role: app_deploy
      vars:
        app_name: api
        app_version: "2.8.0"
        app_port: 8080
        app_workers: 8
        app_memory_limit: 1G
        app_log_level: warn
```

## Wrapping Up

The golden rule for role variables is: put customization points in `defaults/main.yml` and internal implementation details in `vars/main.yml`. Pass overrides through role parameters, group_vars, or host_vars depending on your organizational structure. Use `include_role` when you need to call a role multiple times with different configurations. And reserve extra vars (`-e`) for runtime overrides that should not be committed to code. Following these patterns keeps your roles genuinely reusable across projects and teams.
