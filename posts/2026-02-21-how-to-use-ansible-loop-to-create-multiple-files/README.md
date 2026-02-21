# How to Use Ansible loop to Create Multiple Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Automation, Linux

Description: Learn how to use Ansible loop to create multiple files and directories efficiently with the file, copy, and template modules.

---

Creating files one at a time in Ansible is fine when you have two or three. But when you need to set up a dozen config files, log directories, or placeholder files across your fleet, writing individual tasks for each one gets old fast. The `loop` keyword lets you handle all of that in a single task block.

This guide covers how to loop through file creation using the `file`, `copy`, and `template` modules, along with patterns for setting permissions, ownership, and content on each file.

## Creating Multiple Empty Files

The most basic use case is creating several empty files. The `file` module with `state: touch` handles this.

```yaml
# create-files.yml
# Creates multiple empty log files with specific ownership
- name: Create empty log files
  hosts: webservers
  become: true
  tasks:
    - name: Create application log files
      ansible.builtin.file:
        path: "/var/log/myapp/{{ item }}"
        state: touch
        owner: www-data
        group: www-data
        mode: '0644'
      loop:
        - access.log
        - error.log
        - debug.log
        - audit.log
        - slow-query.log
```

Each iteration creates one file under `/var/log/myapp/` with the specified ownership and permissions.

## Creating Multiple Directories

You can use the same pattern with `state: directory` to create folder structures.

```yaml
# create-dirs.yml
# Sets up the directory structure for a web application
- name: Set up application directory structure
  hosts: appservers
  become: true
  tasks:
    - name: Create application directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: directory
        owner: "{{ item.owner }}"
        group: "{{ item.group }}"
        mode: "{{ item.mode }}"
      loop:
        - { path: "/opt/myapp/config", owner: "deploy", group: "deploy", mode: "0755" }
        - { path: "/opt/myapp/logs", owner: "deploy", group: "deploy", mode: "0755" }
        - { path: "/opt/myapp/data", owner: "deploy", group: "deploy", mode: "0700" }
        - { path: "/opt/myapp/tmp", owner: "deploy", group: "deploy", mode: "0755" }
        - { path: "/opt/myapp/backups", owner: "root", group: "deploy", mode: "0750" }
```

Notice that each item is a dictionary, which lets you set different ownership and permissions per directory. This is one of the strengths of using `loop` over simple variable expansion.

## Creating Files with Content Using the copy Module

When you need to create files with specific content (not from templates), the `copy` module with the `content` parameter works well inside a loop.

```yaml
# create-config-files.yml
# Creates multiple configuration files with inline content
- name: Create configuration files
  hosts: webservers
  become: true
  tasks:
    - name: Create config files with content
      ansible.builtin.copy:
        dest: "{{ item.dest }}"
        content: "{{ item.content }}"
        owner: root
        group: root
        mode: '0644'
      loop:
        - dest: /etc/myapp/database.conf
          content: |
            [database]
            host=db.internal
            port=5432
            name=myapp_production
            pool_size=25
        - dest: /etc/myapp/cache.conf
          content: |
            [cache]
            backend=redis
            host=redis.internal
            port=6379
            ttl=3600
        - dest: /etc/myapp/logging.conf
          content: |
            [logging]
            level=INFO
            format=json
            output=/var/log/myapp/app.log
```

## Using loop with the template Module

For more complex files, you can loop over templates. Each iteration can pass different variables to the same template.

```yaml
# create-vhosts.yml
# Generates multiple Nginx virtual host configs from one template
- name: Create Nginx virtual host configurations
  hosts: webservers
  become: true
  tasks:
    - name: Generate vhost configs from template
      ansible.builtin.template:
        src: vhost.conf.j2
        dest: "/etc/nginx/sites-available/{{ item.domain }}.conf"
        owner: root
        group: root
        mode: '0644'
      loop:
        - { domain: "api.example.com", port: 8080, root: "/var/www/api" }
        - { domain: "app.example.com", port: 3000, root: "/var/www/app" }
        - { domain: "admin.example.com", port: 9090, root: "/var/www/admin" }
      notify: Reload Nginx

  handlers:
    - name: Reload Nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

The corresponding Jinja2 template would reference `item.domain`, `item.port`, and `item.root`.

```jinja2
{# templates/vhost.conf.j2 #}
{# Nginx virtual host configuration template #}
server {
    listen 80;
    server_name {{ item.domain }};
    root {{ item.root }};

    location / {
        proxy_pass http://127.0.0.1:{{ item.port }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    access_log /var/log/nginx/{{ item.domain }}-access.log;
    error_log /var/log/nginx/{{ item.domain }}-error.log;
}
```

## Defining File Lists in Variables

For production playbooks, you want your file definitions in variables, not hardcoded in tasks. This makes them reusable and easier to manage per environment.

```yaml
# group_vars/webservers.yml
# File definitions for web server setup
app_files:
  - path: /etc/myapp/app.conf
    content: "{{ lookup('file', 'files/app.conf') }}"
    mode: '0644'
  - path: /etc/myapp/secrets.conf
    content: "{{ vault_secrets_content }}"
    mode: '0600'
  - path: /etc/logrotate.d/myapp
    content: "{{ lookup('template', 'templates/logrotate.j2') }}"
    mode: '0644'

app_directories:
  - { path: "/opt/myapp", mode: "0755" }
  - { path: "/opt/myapp/releases", mode: "0755" }
  - { path: "/opt/myapp/shared", mode: "0755" }
  - { path: "/opt/myapp/shared/log", mode: "0755" }
  - { path: "/opt/myapp/shared/pids", mode: "0755" }
```

```yaml
# setup-files.yml
# Uses variable-defined file lists for flexible file creation
- name: Set up application files
  hosts: webservers
  become: true
  tasks:
    - name: Create directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: directory
        mode: "{{ item.mode }}"
      loop: "{{ app_directories }}"

    - name: Create config files
      ansible.builtin.copy:
        dest: "{{ item.path }}"
        content: "{{ item.content }}"
        mode: "{{ item.mode }}"
      loop: "{{ app_files }}"
```

## Creating Files Conditionally

Sometimes you only want to create a file if certain conditions are met. Combine `loop` with `when` for this.

```yaml
# conditional-files.yml
# Creates files only when specific conditions match
- name: Conditionally create files
  hosts: all
  become: true
  vars:
    config_files:
      - name: ssl.conf
        path: /etc/myapp/ssl.conf
        content: "ssl_enabled=true\ncert_path=/etc/ssl/certs/myapp.pem"
        create_when: "{{ use_ssl | default(false) }}"
      - name: proxy.conf
        path: /etc/myapp/proxy.conf
        content: "proxy_host=proxy.internal\nproxy_port=3128"
        create_when: "{{ behind_proxy | default(false) }}"
      - name: app.conf
        path: /etc/myapp/app.conf
        content: "workers=4\ntimeout=30"
        create_when: true
  tasks:
    - name: Create files based on conditions
      ansible.builtin.copy:
        dest: "{{ item.path }}"
        content: "{{ item.content }}"
        mode: '0644'
      loop: "{{ config_files }}"
      when: item.create_when | bool
```

## Tracking Changes with register

When creating files in a loop, you can capture the results and act on them.

```yaml
# create-and-track.yml
# Creates files and reports which ones were newly created or changed
- name: Create files and track changes
  hosts: all
  become: true
  tasks:
    - name: Create application files
      ansible.builtin.copy:
        dest: "/etc/myapp/{{ item }}"
        content: "# Managed by Ansible\n"
        mode: '0644'
        force: false  # Only create if file does not exist
      loop:
        - app.conf
        - db.conf
        - cache.conf
        - queue.conf
      register: file_results

    - name: List newly created files
      ansible.builtin.debug:
        msg: "Created: {{ item.item }}"
      loop: "{{ file_results.results }}"
      when: item.changed
```

The `force: false` parameter is key here. It tells the `copy` module to only write the file if it does not already exist, making the task safe to run repeatedly without overwriting manual changes.

## Cleaning Up Old Files with loop

You can also use `loop` to remove files that should no longer exist.

```yaml
# cleanup-files.yml
# Removes deprecated configuration files
- name: Remove deprecated config files
  hosts: all
  become: true
  tasks:
    - name: Remove old config files
      ansible.builtin.file:
        path: "{{ item }}"
        state: absent
      loop:
        - /etc/myapp/legacy.conf
        - /etc/myapp/deprecated.conf
        - /etc/myapp/old-format.ini
        - /tmp/myapp-setup.lock
```

## Full Workflow Example

Here is a complete playbook that combines directory creation, file creation, and template rendering in one run.

```yaml
# full-setup.yml
# Complete file setup workflow for a new application deployment
- name: Full application file setup
  hosts: appservers
  become: true
  vars:
    app_name: myapp
    app_user: deploy
    directories:
      - config
      - logs
      - data
      - tmp
      - pids
    static_files:
      - { name: ".env", content: "APP_ENV=production\nDEBUG=false\n" }
      - { name: "VERSION", content: "1.4.2\n" }
  tasks:
    - name: Create base directory
      ansible.builtin.file:
        path: "/opt/{{ app_name }}"
        state: directory
        owner: "{{ app_user }}"
        mode: '0755'

    - name: Create subdirectories
      ansible.builtin.file:
        path: "/opt/{{ app_name }}/{{ item }}"
        state: directory
        owner: "{{ app_user }}"
        mode: '0755'
      loop: "{{ directories }}"

    - name: Create static files
      ansible.builtin.copy:
        dest: "/opt/{{ app_name }}/{{ item.name }}"
        content: "{{ item.content }}"
        owner: "{{ app_user }}"
        mode: '0644'
      loop: "{{ static_files }}"
```

## Summary

Using `loop` to create files in Ansible keeps your playbooks compact and maintainable. Whether you are creating empty files, writing content inline, or rendering templates, the pattern stays consistent: define a list of items (either inline or in variables), iterate with `loop`, and reference `{{ item }}` in your task parameters. For production use, store your file definitions in group or host variables so different server roles get the right files without duplicating playbook logic.
