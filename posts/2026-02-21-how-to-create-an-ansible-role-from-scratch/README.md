# How to Create an Ansible Role from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Automation, DevOps

Description: Learn how to create an Ansible role from scratch with hands-on examples covering tasks, handlers, variables, templates, and more.

---

If you have been writing Ansible playbooks for a while, you have probably noticed how quickly they grow into unmaintainable walls of YAML. Roles solve that problem by giving you a standard way to organize tasks, variables, handlers, and templates into reusable units. In this post, I will walk through building an Ansible role from scratch without relying on `ansible-galaxy init`, so you understand every file and directory that makes a role tick.

## Why Build a Role Manually?

Scaffolding tools are great once you know what each piece does. But if you have never built a role by hand, you miss the intuition for *why* the directory layout exists. Building one manually forces you to think about which files go where and why Ansible looks for them in a specific order.

## Step 1: Create the Role Directory

Ansible expects roles to live inside a `roles/` directory relative to your playbook (or in a path listed in `roles_path` in your `ansible.cfg`). Let's create a role called `webserver`.

```bash
# Create the minimal directory structure for a role
mkdir -p roles/webserver/tasks
mkdir -p roles/webserver/handlers
mkdir -p roles/webserver/templates
mkdir -p roles/webserver/files
mkdir -p roles/webserver/vars
mkdir -p roles/webserver/defaults
mkdir -p roles/webserver/meta
```

Each of these directories has a specific purpose. The `tasks` directory holds the main logic. The `handlers` directory holds actions triggered by `notify`. The `templates` directory stores Jinja2 templates. The `files` directory stores static files for `copy` or `script` modules. The `vars` directory holds high-priority variables. The `defaults` directory holds low-priority variables. The `meta` directory stores role metadata and dependency declarations.

## Step 2: Write the Main Task File

Ansible automatically loads `tasks/main.yml` when the role is applied. Let's write a task file that installs and configures Nginx.

```yaml
# roles/webserver/tasks/main.yml
# This is the entry point for the role - Ansible loads this automatically
---
- name: Install Nginx
  ansible.builtin.apt:
    name: nginx
    state: present
    update_cache: yes
  when: ansible_os_family == "Debian"

- name: Install Nginx on RHEL-based systems
  ansible.builtin.yum:
    name: nginx
    state: present
  when: ansible_os_family == "RedHat"

- name: Deploy Nginx configuration from template
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
  notify: Restart Nginx

- name: Ensure Nginx is running and enabled
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: yes
```

Notice how we use `notify: Restart Nginx` to trigger a handler only when the configuration file actually changes. This prevents unnecessary service restarts.

## Step 3: Define Handlers

Handlers run once at the end of a play (or when explicitly flushed) and only when notified.

```yaml
# roles/webserver/handlers/main.yml
# Handlers only fire when notified by a task that made a change
---
- name: Restart Nginx
  ansible.builtin.service:
    name: nginx
    state: restarted

- name: Reload Nginx
  ansible.builtin.service:
    name: nginx
    state: reloaded
```

## Step 4: Set Default Variables

Defaults have the lowest priority of any variable in Ansible, which makes them perfect for providing sensible fallback values that consumers of your role can override easily.

```yaml
# roles/webserver/defaults/main.yml
# These values can be overridden by inventory, playbook, or extra-vars
---
webserver_port: 80
webserver_worker_processes: auto
webserver_worker_connections: 1024
webserver_server_name: localhost
webserver_document_root: /var/www/html
```

## Step 5: Create a Template

Templates use Jinja2 syntax and pull in variables at runtime.

```nginx
# roles/webserver/templates/nginx.conf.j2
# Jinja2 template that renders with role variables at deploy time
worker_processes {{ webserver_worker_processes }};

events {
    worker_connections {{ webserver_worker_connections }};
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen {{ webserver_port }};
        server_name {{ webserver_server_name }};

        root {{ webserver_document_root }};
        index index.html;

        location / {
            try_files $uri $uri/ =404;
        }
    }
}
```

## Step 6: Add Role Metadata

The `meta/main.yml` file declares the role's metadata, including dependencies, supported platforms, and the minimum Ansible version.

```yaml
# roles/webserver/meta/main.yml
# Metadata about this role - used by Galaxy and dependency resolution
---
galaxy_info:
  author: nawazdhandala
  description: Installs and configures Nginx as a web server
  license: MIT
  min_ansible_version: "2.14"
  platforms:
    - name: Ubuntu
      versions:
        - focal
        - jammy
    - name: EL
      versions:
        - "8"
        - "9"
  galaxy_tags:
    - nginx
    - webserver

dependencies: []
```

## Step 7: Add Static Files

If you need to copy a static file (one that does not need variable substitution), put it in the `files` directory.

```html
<!-- roles/webserver/files/index.html -->
<!-- A simple landing page deployed as a static file -->
<!DOCTYPE html>
<html>
<head><title>Welcome</title></head>
<body>
  <h1>Server is running</h1>
</body>
</html>
```

Then reference it in your tasks:

```yaml
# Add this to roles/webserver/tasks/main.yml
- name: Deploy default landing page
  ansible.builtin.copy:
    src: index.html
    dest: "{{ webserver_document_root }}/index.html"
    owner: www-data
    group: www-data
    mode: '0644'
```

Notice that `src: index.html` does not need a full path. Ansible automatically looks in `roles/webserver/files/` when you reference files from within a role.

## Step 8: Use the Role in a Playbook

With the role built, using it is straightforward.

```yaml
# site.yml
# Apply the webserver role to all hosts in the "web" group
---
- name: Configure web servers
  hosts: web
  become: yes
  roles:
    - role: webserver
      vars:
        webserver_port: 8080
        webserver_server_name: myapp.example.com
```

## The Overall Structure

Here is the final directory tree:

```
roles/
  webserver/
    tasks/
      main.yml
    handlers/
      main.yml
    templates/
      nginx.conf.j2
    files/
      index.html
    vars/
      main.yml
    defaults/
      main.yml
    meta/
      main.yml
```

## Testing Your Role Quickly

Before committing, do a quick syntax check and a dry run:

```bash
# Check for YAML syntax errors
ansible-playbook site.yml --syntax-check

# Dry-run to see what would change without making changes
ansible-playbook site.yml --check --diff
```

## Common Mistakes to Avoid

1. **Hardcoding values in tasks** instead of using variables from `defaults/main.yml`. This makes your role inflexible.
2. **Putting variables in `vars/` when they should be in `defaults/`**. The `vars` directory has high priority and is hard to override. Use it only for internal constants.
3. **Forgetting the `notify` directive** and instead restarting services unconditionally. This causes unnecessary downtime.
4. **Not namespacing variable names**. Prefix all role variables with the role name (like `webserver_port`) to avoid collisions when multiple roles are applied to the same host.

## Wrapping Up

Building a role from scratch teaches you the mechanics that tools like `ansible-galaxy init` abstract away. You now know that `tasks/main.yml` is the entry point, `defaults/main.yml` provides overridable variables, `handlers/main.yml` holds event-driven actions, and `templates/` stores Jinja2 files. Once you internalize this structure, you will find yourself naturally organizing playbooks into roles, which keeps your automation clean, testable, and shareable.
