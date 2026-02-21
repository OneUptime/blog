# How to Use ansible-galaxy role init to Start a Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Roles, Development, Scaffolding

Description: How to scaffold a new Ansible role using ansible-galaxy role init with proper structure, metadata, and ready-to-use templates.

---

Every Ansible role follows a specific directory structure with tasks, handlers, defaults, templates, and metadata. Creating all these directories and boilerplate files by hand is tedious and error-prone. The `ansible-galaxy role init` command generates the entire skeleton for you in one step. This post covers how to use it, what it creates, and how to customize the output.

## The Basic Command

To create a new role called `webserver`:

```bash
# Initialize a new role skeleton
ansible-galaxy role init webserver
```

This creates a directory named `webserver` with the following structure:

```
webserver/
    defaults/
        main.yml
    files/
    handlers/
        main.yml
    meta/
        main.yml
    tasks/
        main.yml
    templates/
    tests/
        inventory
        test.yml
    vars/
        main.yml
    README.md
```

Every directory has a purpose, and each `main.yml` file contains a placeholder comment so the file is not empty.

## Specifying an Init Path

By default, the role is created in the current directory. Use `--init-path` to place it elsewhere:

```bash
# Create the role inside a specific directory
ansible-galaxy role init webserver --init-path ~/projects/ansible-roles/
```

This is useful when you keep all roles in a central location.

## Using a Custom Skeleton

The default skeleton is minimal. You can provide your own template using `--role-skeleton`:

```bash
# Use a custom skeleton template
ansible-galaxy role init webserver --role-skeleton ~/templates/role-skeleton/
```

This is powerful for organizations that want every role to include specific files like a Molecule configuration, CI pipeline, or license file. The skeleton directory is copied as-is, with Jinja2 template variables expanded.

### Creating a Custom Skeleton

Here is a skeleton that includes Molecule testing and a GitHub Actions CI pipeline:

```bash
# Create the skeleton directory structure
mkdir -p ~/templates/role-skeleton/{defaults,files,handlers,meta,molecule/default,tasks,templates,vars,.github/workflows}
```

The skeleton `meta/main.yml` with template variables:

```yaml
# ~/templates/role-skeleton/meta/main.yml
---
galaxy_info:
  role_name: {{ role_name }}
  author: devops_team
  description: {{ role_name }} role
  company: MyOrg
  license: MIT
  min_ansible_version: "2.14"
  platforms:
    - name: Ubuntu
      versions:
        - jammy
    - name: EL
      versions:
        - "9"
  galaxy_tags: []

dependencies: []
```

The skeleton Molecule config:

```yaml
# ~/templates/role-skeleton/molecule/default/molecule.yml
---
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: instance
    image: ubuntu:22.04
    pre_build_image: true
provisioner:
  name: ansible
verifier:
  name: ansible
```

```yaml
# ~/templates/role-skeleton/molecule/default/converge.yml
---
- name: Converge
  hosts: all
  roles:
    - role: {{ role_name }}
```

Now every role you init includes Molecule testing out of the box:

```bash
# New roles automatically get Molecule and CI configs
ansible-galaxy role init my_database --role-skeleton ~/templates/role-skeleton/
```

## What Each Generated File Does

Let me go through each part of the generated skeleton.

### defaults/main.yml

This is where you define variables that users can override:

```yaml
# defaults/main.yml - variables users can customize
---
webserver_port: 80
webserver_document_root: /var/www/html
webserver_server_name: localhost
webserver_max_connections: 256
webserver_log_level: warn
```

Variables in `defaults/` have the lowest precedence, which is exactly what you want for user-configurable settings.

### vars/main.yml

This is for internal variables that should not be overridden by users:

```yaml
# vars/main.yml - internal role variables
---
webserver_packages:
  Debian:
    - nginx
    - nginx-extras
  RedHat:
    - nginx
    - nginx-mod-stream

webserver_config_path:
  Debian: /etc/nginx
  RedHat: /etc/nginx

webserver_service_name: nginx
```

### tasks/main.yml

The main task file. It is common to break tasks into multiple files and include them:

```yaml
# tasks/main.yml - orchestrate task includes
---
- name: Include OS-specific variables
  ansible.builtin.include_vars: "{{ ansible_os_family }}.yml"

- name: Install webserver packages
  ansible.builtin.include_tasks: install.yml

- name: Configure webserver
  ansible.builtin.include_tasks: configure.yml

- name: Manage webserver service
  ansible.builtin.include_tasks: service.yml
```

```yaml
# tasks/install.yml - installation tasks
---
- name: Install required packages
  ansible.builtin.package:
    name: "{{ webserver_packages[ansible_os_family] }}"
    state: present
```

```yaml
# tasks/configure.yml - configuration tasks
---
- name: Deploy main configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: "{{ webserver_config_path[ansible_os_family] }}/nginx.conf"
    owner: root
    group: root
    mode: "0644"
  notify: Restart webserver

- name: Deploy virtual host configuration
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "{{ webserver_config_path[ansible_os_family] }}/conf.d/default.conf"
    owner: root
    group: root
    mode: "0644"
  notify: Reload webserver
```

### handlers/main.yml

Handlers respond to `notify` triggers from tasks:

```yaml
# handlers/main.yml - service handlers
---
- name: Restart webserver
  ansible.builtin.service:
    name: "{{ webserver_service_name }}"
    state: restarted

- name: Reload webserver
  ansible.builtin.service:
    name: "{{ webserver_service_name }}"
    state: reloaded
```

### meta/main.yml

Galaxy metadata and role dependencies:

```yaml
# meta/main.yml - role metadata
---
galaxy_info:
  role_name: webserver
  author: devops_team
  description: Install and configure Nginx as a webserver
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
    - web
    - webserver

dependencies: []
```

### tests/ Directory

The generated test files provide a basic way to test the role:

```ini
# tests/inventory
[testservers]
localhost ansible_connection=local
```

```yaml
# tests/test.yml
---
- hosts: testservers
  roles:
    - webserver
```

Run the basic test with:

```bash
# Quick test with the built-in test playbook
ansible-playbook tests/test.yml -i tests/inventory --check
```

## Adding Templates

The `templates/` directory starts empty. Add Jinja2 templates that your tasks reference:

```nginx
# templates/nginx.conf.j2 - Main Nginx configuration
worker_processes {{ webserver_max_connections }};
error_log /var/log/nginx/error.log {{ webserver_log_level }};

events {
    worker_connections {{ webserver_max_connections }};
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile on;
    keepalive_timeout 65;

    include conf.d/*.conf;
}
```

## Setting Up Molecule After Init

If you did not use a custom skeleton, add Molecule manually:

```bash
# Install Molecule
pip install molecule molecule-docker

# Initialize Molecule in the role directory
cd webserver
molecule init scenario --driver-name docker
```

This creates `molecule/default/` with test configuration. Edit `molecule/default/converge.yml` to use your role:

```yaml
# molecule/default/converge.yml - Molecule test playbook
---
- name: Converge
  hosts: all
  become: true
  roles:
    - role: webserver
      vars:
        webserver_port: 8080
        webserver_server_name: test.example.com
```

Run the tests:

```bash
# Run the full Molecule test lifecycle
molecule test
```

## Summary

The `ansible-galaxy role init` command gives you a standardized starting point for any new role. It creates all the required directories and placeholder files in seconds. For organizations with specific requirements, custom skeletons let you include CI pipelines, Molecule configs, and other boilerplate in every new role automatically. After initialization, fill in the defaults, write your tasks, add templates, configure metadata, and set up testing. The skeleton structure ensures your role is compatible with Galaxy, ansible-lint, and the broader Ansible ecosystem from day one.
