# How to Use the defaults_from Parameter in Ansible Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Variables, Defaults

Description: Learn how to use the defaults_from parameter in Ansible roles to load different default variable files based on deployment context.

---

Every well-designed Ansible role has a `defaults/main.yml` file that sets baseline values for all the variables the role uses. These defaults sit at the very bottom of Ansible's variable precedence hierarchy, making them easy to override from inventory, playbooks, or the command line. The `defaults_from` parameter lets you choose which defaults file gets loaded, enabling a single role to provide different baseline configurations for different scenarios.

## Understanding defaults_from

By default, Ansible loads `defaults/main.yml` from a role. When you specify `defaults_from`, it loads a different file from the `defaults/` directory instead. Because defaults have the lowest precedence, any other variable source can still override these values. This makes `defaults_from` ideal for setting up sensible starting points that vary by context.

The syntax is straightforward:

```yaml
- hosts: webservers
  tasks:
    - name: Include role with custom defaults
      ansible.builtin.include_role:
        name: webserver
        defaults_from: high_traffic.yml
```

## When to Use defaults_from vs vars_from

This is a common question. The key difference is precedence:

- **defaults_from** loads variables with the lowest precedence. Users can easily override them from group_vars, host_vars, or play vars.
- **vars_from** loads variables with a much higher precedence. They override group_vars and host_vars.

Use `defaults_from` when you want to provide suggested values that users are expected to customize. Use `vars_from` when you want to set values that should not be casually overridden.

## Setting Up a Role with Multiple Default Files

Let's build an application deployment role with different default profiles:

```
roles/app_deploy/
  defaults/
    main.yml             # Balanced defaults (loaded by default)
    minimal.yml          # Minimal resource usage for dev/test
    high_traffic.yml     # Tuned for high-traffic production
    high_availability.yml # HA configuration defaults
  tasks/
    main.yml
  templates/
    app.conf.j2
  handlers/
    main.yml
```

Here are the default files:

```yaml
# roles/app_deploy/defaults/main.yml
# Balanced defaults - good starting point for most environments
app_name: myapp
app_user: appuser
app_group: appgroup
app_port: 8080
app_workers: 4
app_threads_per_worker: 2
app_max_requests: 1000
app_max_memory_mb: 512
app_log_level: info
app_health_check_interval: 30
app_graceful_timeout: 30
app_request_timeout: 60
app_enable_metrics: true
app_enable_debug: false
```

```yaml
# roles/app_deploy/defaults/minimal.yml
# Minimal resource defaults for development and testing
app_name: myapp
app_user: appuser
app_group: appgroup
app_port: 8080
app_workers: 1
app_threads_per_worker: 1
app_max_requests: 0
app_max_memory_mb: 128
app_log_level: debug
app_health_check_interval: 10
app_graceful_timeout: 5
app_request_timeout: 120
app_enable_metrics: false
app_enable_debug: true
```

```yaml
# roles/app_deploy/defaults/high_traffic.yml
# Defaults tuned for high-traffic production workloads
app_name: myapp
app_user: appuser
app_group: appgroup
app_port: 8080
app_workers: "{{ ansible_processor_vcpus * 2 }}"
app_threads_per_worker: 4
app_max_requests: 10000
app_max_memory_mb: 2048
app_log_level: warning
app_health_check_interval: 10
app_graceful_timeout: 60
app_request_timeout: 30
app_enable_metrics: true
app_enable_debug: false
```

```yaml
# roles/app_deploy/defaults/high_availability.yml
# Defaults for HA deployments with aggressive health checking
app_name: myapp
app_user: appuser
app_group: appgroup
app_port: 8080
app_workers: "{{ ansible_processor_vcpus }}"
app_threads_per_worker: 2
app_max_requests: 5000
app_max_memory_mb: 1024
app_log_level: info
app_health_check_interval: 5
app_graceful_timeout: 120
app_request_timeout: 30
app_enable_metrics: true
app_enable_debug: false
```

## Using defaults_from in Playbooks

Now you can write playbooks that select the appropriate profile:

```yaml
# deploy-dev.yml
# Development deployment - minimal resources
- hosts: dev_servers
  become: yes
  tasks:
    - name: Deploy application with minimal defaults
      ansible.builtin.include_role:
        name: app_deploy
        defaults_from: minimal.yml
```

```yaml
# deploy-production.yml
# Production deployment - high traffic profile
- hosts: production_servers
  become: yes
  tasks:
    - name: Deploy application with high traffic defaults
      ansible.builtin.include_role:
        name: app_deploy
        defaults_from: high_traffic.yml
```

## Overriding Specific Values on Top of a Profile

Because defaults have low precedence, you can easily override specific values while keeping the rest of the profile intact:

```yaml
# deploy-staging.yml
# Staging uses the high_traffic profile but with debug logging
- hosts: staging_servers
  become: yes
  vars:
    app_log_level: debug
    app_enable_debug: true
  tasks:
    - name: Deploy with high traffic defaults but debug logging
      ansible.builtin.include_role:
        name: app_deploy
        defaults_from: high_traffic.yml
```

The `app_log_level` and `app_enable_debug` from play vars override the defaults. Everything else comes from `high_traffic.yml`.

## Dynamic Profile Selection

You can dynamically choose the defaults file based on a variable:

```yaml
# deploy.yml
# Select the profile at runtime
- hosts: app_servers
  become: yes
  tasks:
    - name: Deploy application
      ansible.builtin.include_role:
        name: app_deploy
        defaults_from: "{{ app_profile | default('main') }}.yml"
```

Run it with different profiles:

```bash
# Use the minimal profile for dev
ansible-playbook deploy.yml -e "app_profile=minimal" -l dev_servers

# Use high_traffic for production
ansible-playbook deploy.yml -e "app_profile=high_traffic" -l production_servers

# Use the default profile (main.yml)
ansible-playbook deploy.yml -l staging_servers
```

## Combining defaults_from with Other Parameters

You can pair `defaults_from` with `tasks_from`, `vars_from`, and `handlers_from` for full control:

```yaml
- hosts: production_servers
  become: yes
  tasks:
    - name: Run upgrade tasks with HA defaults and upgrade handlers
      ansible.builtin.include_role:
        name: app_deploy
        tasks_from: upgrade.yml
        defaults_from: high_availability.yml
        handlers_from: rolling_restart.yml
```

## Role Template Using Defaults

Here is a template that works with any of the default profiles:

```jinja2
# roles/app_deploy/templates/app.conf.j2
# Application configuration - generated by Ansible
[server]
port = {{ app_port }}
workers = {{ app_workers }}
threads_per_worker = {{ app_threads_per_worker }}
max_requests = {{ app_max_requests }}
graceful_timeout = {{ app_graceful_timeout }}
request_timeout = {{ app_request_timeout }}

[resources]
max_memory_mb = {{ app_max_memory_mb }}

[logging]
level = {{ app_log_level }}
debug = {{ app_enable_debug | lower }}

[monitoring]
metrics_enabled = {{ app_enable_metrics | lower }}
health_check_interval = {{ app_health_check_interval }}
```

And the task file that uses it:

```yaml
# roles/app_deploy/tasks/main.yml
- name: Create application user
  ansible.builtin.user:
    name: "{{ app_user }}"
    group: "{{ app_group }}"
    system: yes
    shell: /usr/sbin/nologin

- name: Create configuration directory
  ansible.builtin.file:
    path: "/etc/{{ app_name }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'

- name: Deploy application configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: "/etc/{{ app_name }}/app.conf"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0640'
  notify: restart application

- name: Ensure application is running
  ansible.builtin.systemd:
    name: "{{ app_name }}"
    state: started
    enabled: yes
```

## Design Patterns for Default Files

Here are some patterns that work well in practice:

**Profile-based defaults**: Name files after deployment profiles (minimal, standard, high_performance). Each file defines the complete set of defaults for that profile.

**OS-based defaults**: Name files after operating systems (debian.yml, redhat.yml). Load the right one based on `ansible_os_family`.

```yaml
- name: Load OS-specific defaults
  ansible.builtin.include_role:
    name: app_deploy
    defaults_from: "{{ ansible_os_family | lower }}.yml"
```

**Version-based defaults**: Name files after application versions when defaults change between versions.

```yaml
- name: Load version-specific defaults
  ansible.builtin.include_role:
    name: postgresql
    defaults_from: "pg{{ pg_major_version }}.yml"
```

## Important Caveats

The `defaults_from` parameter is only available with `include_role` and `import_role`. You cannot use it with the `roles` directive in a play. If you need to select defaults from the `roles` directive, use a variable-based approach inside the role's `tasks/main.yml` with `include_vars` and a `first_found` lookup.

Also note that `defaults_from` replaces the loading of `defaults/main.yml`. If your alternative defaults file does not define a variable that `main.yml` does, that variable will be undefined. Make sure every defaults file defines the complete set of variables the role needs.

Keep your default files consistent and complete. Think of them as configuration profiles where each profile is self-contained. This makes the role predictable regardless of which defaults file is selected.
