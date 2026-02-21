# How to Override Role Files in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Configuration Management, Overrides

Description: Learn how to override templates, tasks, variables, and other files in Ansible roles without modifying the original role source code.

---

When you pull in an Ansible role from Galaxy or from a shared team repository, you rarely want to modify it directly. Editing the role source creates merge conflicts, makes upgrades painful, and breaks the whole point of reusable automation. Instead, Ansible provides several mechanisms to override parts of a role from outside. This post walks through each approach with concrete examples.

## The Problem with Direct Modifications

Imagine you installed a community Nginx role via `ansible-galaxy`. It works great, but the default `nginx.conf` template does not match your organization's requirements. If you edit the template inside the role directory, you lose that change every time you run `ansible-galaxy install --force` to update the role.

The same issue applies to internal shared roles. If three teams use the same PostgreSQL role but each needs slightly different configuration, you do not want three forks of that role.

## Override Strategy 1: Variable Overrides

The most common and simplest override is through variables. Well-written roles expose configuration through default variables in `defaults/main.yml`. These have the lowest precedence in Ansible's variable hierarchy, which means almost anything will override them.

Here is a role with sensible defaults:

```yaml
# roles/nginx/defaults/main.yml
nginx_worker_processes: auto
nginx_worker_connections: 1024
nginx_keepalive_timeout: 65
nginx_client_max_body_size: "1m"
nginx_log_format: combined
```

You can override these from your playbook:

```yaml
# playbook.yml
- hosts: webservers
  become: yes
  roles:
    - role: nginx
      vars:
        nginx_worker_connections: 4096
        nginx_client_max_body_size: "50m"
        nginx_keepalive_timeout: 120
```

Or from group variables:

```yaml
# group_vars/webservers.yml
# Override nginx defaults for all webservers
nginx_worker_connections: 4096
nginx_client_max_body_size: "50m"
```

Or from host variables for a specific server:

```yaml
# host_vars/web01.example.com.yml
# This server handles large file uploads
nginx_client_max_body_size: "500m"
```

## Override Strategy 2: Template Overrides Using Variables

Many roles let you specify a custom template path via a variable. This is a design pattern you should adopt in your own roles:

```yaml
# roles/nginx/defaults/main.yml
nginx_config_template: "nginx.conf.j2"
```

```yaml
# roles/nginx/tasks/main.yml
- name: Deploy nginx configuration
  ansible.builtin.template:
    src: "{{ nginx_config_template }}"
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
  notify: reload nginx
```

To override the template, create your own template file and point the variable to it:

```yaml
# playbook.yml
- hosts: webservers
  become: yes
  roles:
    - role: nginx
      vars:
        nginx_config_template: "{{ playbook_dir }}/templates/custom-nginx.conf.j2"
```

Then place your custom template at `templates/custom-nginx.conf.j2` relative to your playbook. This gives you full control over the configuration file without touching the role.

## Override Strategy 3: Ansible's Template Search Path

Ansible searches for templates in a specific order. When a role uses `template: src=myfile.j2`, Ansible looks in:

1. The playbook's `templates/` directory
2. The role's `templates/` directory

This means you can override a role's template simply by placing a file with the same name in your playbook's `templates/` directory.

```
project/
  templates/
    nginx.conf.j2          # This takes priority
  roles/
    nginx/
      templates/
        nginx.conf.j2      # This is the role's default
  playbook.yml
```

The same search path applies to files used with `copy: src=` and the `files/` directory.

This is powerful but also a bit dangerous. It is an implicit override, so someone reading your project might not realize that a role's template has been replaced. Document this clearly when you use it.

## Override Strategy 4: Pre and Post Tasks

If a role performs an action and you want to modify the result, you can run tasks before or after the role:

```yaml
# playbook.yml
- hosts: webservers
  become: yes
  pre_tasks:
    # Run before any roles - ensure a clean state
    - name: Remove old nginx configuration
      ansible.builtin.file:
        path: /etc/nginx/conf.d/legacy.conf
        state: absent

  roles:
    - nginx

  post_tasks:
    # Run after all roles - add custom configuration on top
    - name: Add custom rate limiting configuration
      ansible.builtin.template:
        src: templates/rate-limiting.conf.j2
        dest: /etc/nginx/conf.d/rate-limiting.conf
      notify: reload nginx

    - name: Add custom security headers
      ansible.builtin.template:
        src: templates/security-headers.conf.j2
        dest: /etc/nginx/conf.d/security-headers.conf
      notify: reload nginx
```

## Override Strategy 5: Overriding Role Handlers

Handlers follow the same search path as tasks. If a role notifies a handler called `reload nginx`, you can define a handler with the same name in your playbook, and your version takes precedence:

```yaml
# playbook.yml
- hosts: webservers
  become: yes
  roles:
    - nginx

  handlers:
    # This overrides the role's "reload nginx" handler
    - name: reload nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
      listen: "reload nginx"
```

Be careful with this approach. If the role's handler name changes in a future version, your override silently stops working.

## Override Strategy 6: Wrapping Roles

For complex overrides, create a wrapper role that includes the original role and adds your customizations:

```yaml
# roles/custom_nginx/meta/main.yml
# Pull in the base nginx role as a dependency
dependencies:
  - role: nginx
    vars:
      nginx_worker_connections: 4096
```

```yaml
# roles/custom_nginx/tasks/main.yml
# Additional tasks that run after the nginx dependency
- name: Deploy custom virtual host configurations
  ansible.builtin.template:
    src: "{{ item }}.conf.j2"
    dest: "/etc/nginx/sites-available/{{ item }}.conf"
  loop: "{{ custom_nginx_vhosts }}"
  notify: reload nginx

- name: Enable custom virtual hosts
  ansible.builtin.file:
    src: "/etc/nginx/sites-available/{{ item }}.conf"
    dest: "/etc/nginx/sites-enabled/{{ item }}.conf"
    state: link
  loop: "{{ custom_nginx_vhosts }}"
  notify: reload nginx
```

```yaml
# roles/custom_nginx/defaults/main.yml
custom_nginx_vhosts: []
```

Now your playbooks use `custom_nginx` instead of `nginx` directly:

```yaml
# playbook.yml
- hosts: webservers
  become: yes
  roles:
    - role: custom_nginx
      vars:
        custom_nginx_vhosts:
          - api
          - admin
```

## Override Precedence Summary

Understanding the variable precedence order matters when combining override strategies. From lowest to highest:

```yaml
# Precedence (lowest to highest):
# 1. Role defaults (defaults/main.yml)
# 2. Group vars (group_vars/*)
# 3. Host vars (host_vars/*)
# 4. Play vars
# 5. Role vars (vars/main.yml) - harder to override
# 6. Block vars
# 7. Task vars
# 8. Extra vars (-e on command line) - always wins
```

The practical takeaway: role defaults are easy to override from almost anywhere. Role vars (in `vars/main.yml`) are hard to override and should only contain values that genuinely should not change.

## Best Practices

When building roles that others will use, make everything overridable through `defaults/main.yml`. Avoid hardcoding paths, package names, or service names. Use variables for template paths so consumers can supply their own templates. When consuming third-party roles, prefer variable overrides first, template path overrides second, and wrapper roles for anything more complex. Always document which approach you used and why, so the next person on the team can follow your reasoning.
