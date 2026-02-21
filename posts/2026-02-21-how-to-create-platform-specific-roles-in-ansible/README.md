# How to Create Platform-Specific Roles in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Cross-Platform, Multi-OS

Description: Learn how to build Ansible roles that work across multiple operating systems using OS-specific tasks, variables, and templates.

---

When you manage a mixed environment with Debian, Ubuntu, CentOS, Rocky Linux, and maybe even FreeBSD or macOS, you need roles that adapt to whatever platform they land on. Package names differ, service managers vary, file paths change, and sometimes entire workflows are different between operating systems. This post shows you how to build platform-specific Ansible roles that handle these differences cleanly.

## The Core Pattern: OS-Specific Variables

The foundation of any cross-platform role is loading different variables based on the target OS. The `ansible_os_family` and `ansible_distribution` facts are your primary tools:

```yaml
# roles/nginx/vars/Debian.yml
# Variables for Debian-based systems (Debian, Ubuntu)
---
nginx_package_name: nginx
nginx_config_dir: /etc/nginx
nginx_service_name: nginx
nginx_user: www-data
nginx_log_dir: /var/log/nginx
nginx_default_site: /etc/nginx/sites-enabled/default
```

```yaml
# roles/nginx/vars/RedHat.yml
# Variables for RHEL-based systems (CentOS, Rocky, Alma, Fedora)
---
nginx_package_name: nginx
nginx_config_dir: /etc/nginx
nginx_service_name: nginx
nginx_user: nginx
nginx_log_dir: /var/log/nginx
nginx_default_site: /etc/nginx/conf.d/default.conf
```

```yaml
# roles/nginx/vars/FreeBSD.yml
# Variables for FreeBSD
---
nginx_package_name: nginx
nginx_config_dir: /usr/local/etc/nginx
nginx_service_name: nginx
nginx_user: www
nginx_log_dir: /var/log/nginx
nginx_default_site: /usr/local/etc/nginx/conf.d/default.conf
```

Load the right file at the start of your tasks:

```yaml
# roles/nginx/tasks/main.yml
# Load platform-specific variables first, then run common tasks
---
- name: Load OS-specific variables
  ansible.builtin.include_vars: "{{ ansible_os_family }}.yml"

- name: Install Nginx
  ansible.builtin.package:
    name: "{{ nginx_package_name }}"
    state: present

- name: Deploy configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: "{{ nginx_config_dir }}/nginx.conf"
    owner: root
    group: root
    mode: '0644'
  notify: Reload Nginx
```

The `package` module (not `apt` or `yum`) is platform-agnostic and works on any system with a supported package manager.

## OS-Specific Task Files

Sometimes the differences between platforms go beyond variable values. Different systems might need entirely different task sequences:

```yaml
# roles/nginx/tasks/main.yml
# Route to OS-specific task files
---
- name: Load OS-specific variables
  ansible.builtin.include_vars: "{{ ansible_os_family }}.yml"

- name: Include OS-specific tasks
  ansible.builtin.include_tasks: "{{ ansible_os_family }}.yml"

- name: Deploy common configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: "{{ nginx_config_dir }}/nginx.conf"
  notify: Reload Nginx

- name: Ensure Nginx is running
  ansible.builtin.service:
    name: "{{ nginx_service_name }}"
    state: started
    enabled: yes
```

```yaml
# roles/nginx/tasks/Debian.yml
# Debian-specific: add official Nginx repo for latest version
---
- name: Install prerequisites
  ansible.builtin.apt:
    name:
      - curl
      - gnupg2
    state: present

- name: Add Nginx signing key
  ansible.builtin.apt_key:
    url: https://nginx.org/keys/nginx_signing.key
    state: present

- name: Add Nginx repository
  ansible.builtin.apt_repository:
    repo: "deb http://nginx.org/packages/{{ ansible_distribution | lower }} {{ ansible_distribution_release }} nginx"
    state: present
    filename: nginx

- name: Install Nginx
  ansible.builtin.apt:
    name: nginx
    state: present
    update_cache: yes
```

```yaml
# roles/nginx/tasks/RedHat.yml
# RHEL-specific: enable EPEL and install from there
---
- name: Install EPEL repository
  ansible.builtin.yum:
    name: epel-release
    state: present
  when: ansible_distribution != "Fedora"

- name: Install Nginx
  ansible.builtin.yum:
    name: nginx
    state: present

- name: Configure SELinux for Nginx
  ansible.posix.seboolean:
    name: httpd_can_network_connect
    state: yes
    persistent: yes
  when: ansible_selinux.status == "enabled"
```

## Graceful Fallback for Unsupported Platforms

Handle cases where the role does not support the target platform:

```yaml
# roles/nginx/tasks/main.yml
# Fail early if the platform is not supported
---
- name: Check platform support
  ansible.builtin.assert:
    that: ansible_os_family in ['Debian', 'RedHat', 'FreeBSD']
    fail_msg: >
      This role does not support {{ ansible_os_family }}.
      Supported platforms: Debian, RedHat, FreeBSD
    quiet: yes

- name: Load OS-specific variables
  ansible.builtin.include_vars: "{{ ansible_os_family }}.yml"
```

Or use a softer approach with a default:

```yaml
# Try OS-specific vars, fall back to a default
- name: Load OS-specific variables
  ansible.builtin.include_vars: "{{ lookup('first_found', params) }}"
  vars:
    params:
      files:
        - "{{ ansible_distribution }}-{{ ansible_distribution_major_version }}.yml"
        - "{{ ansible_distribution }}.yml"
        - "{{ ansible_os_family }}.yml"
        - default.yml
      paths:
        - vars
```

This tries the most specific match first (like `Ubuntu-22.yml`), then the distribution (`Ubuntu.yml`), then the family (`Debian.yml`), and finally falls back to `default.yml`.

## Distribution-Specific Variables

Sometimes you need finer granularity than OS family. Different versions of the same distribution might need different settings:

```
roles/postgresql/vars/
  Debian.yml          # Generic Debian family
  Ubuntu.yml          # Ubuntu-specific overrides
  Ubuntu-22.yml       # Ubuntu 22.04-specific
  RedHat.yml          # Generic RHEL family
  Rocky-9.yml         # Rocky Linux 9-specific
```

Load them with the `first_found` lookup:

```yaml
# roles/postgresql/tasks/main.yml
# Load the most specific variable file available
---
- name: Load platform variables
  ansible.builtin.include_vars: "{{ lookup('first_found', params) }}"
  vars:
    params:
      files:
        - "{{ ansible_distribution }}-{{ ansible_distribution_major_version }}.yml"
        - "{{ ansible_distribution }}.yml"
        - "{{ ansible_os_family }}.yml"
      paths:
        - "{{ role_path }}/vars"
```

## Platform-Specific Templates

If configuration file formats differ significantly between platforms, use separate templates:

```yaml
# roles/nginx/tasks/main.yml
# Choose the right template based on the OS
---
- name: Deploy platform-specific configuration
  ansible.builtin.template:
    src: "nginx-{{ ansible_os_family | lower }}.conf.j2"
    dest: "{{ nginx_config_dir }}/nginx.conf"
  notify: Reload Nginx
```

Or use a single template with conditionals:

```jinja2
{# roles/nginx/templates/nginx.conf.j2 #}
{# Single template that adapts to the platform #}
user {{ nginx_user }};
worker_processes auto;
pid /run/nginx.pid;

{% if ansible_os_family == "Debian" %}
include /etc/nginx/modules-enabled/*.conf;
{% elif ansible_os_family == "RedHat" %}
include /usr/share/nginx/modules/*.conf;
{% endif %}

events {
    worker_connections {{ nginx_worker_connections }};
}

http {
    include {{ nginx_config_dir }}/mime.types;
    default_type application/octet-stream;

    access_log {{ nginx_log_dir }}/access.log;
    error_log {{ nginx_log_dir }}/error.log;

{% if ansible_os_family == "Debian" %}
    include /etc/nginx/sites-enabled/*;
{% else %}
    include {{ nginx_config_dir }}/conf.d/*.conf;
{% endif %}
}
```

## Platform-Specific Handlers

Different init systems need different handler approaches:

```yaml
# roles/nginx/handlers/main.yml
# Handle different service managers
---
- name: Reload Nginx
  ansible.builtin.service:
    name: "{{ nginx_service_name }}"
    state: reloaded

- name: Restart Nginx
  ansible.builtin.service:
    name: "{{ nginx_service_name }}"
    state: restarted
```

The `service` module automatically detects whether the system uses systemd, sysvinit, or another init system. For cases where you need init-system-specific behavior:

```yaml
# roles/myapp/handlers/main.yml
---
- name: Reload systemd
  ansible.builtin.systemd:
    daemon_reload: yes
  when: ansible_service_mgr == "systemd"
  listen: "daemon config changed"

- name: Restart application
  ansible.builtin.service:
    name: myapp
    state: restarted
  listen: "daemon config changed"
```

## Complete Cross-Platform Role Example

Here is a full example of a cross-platform Node.js installation role:

```yaml
# roles/nodejs/defaults/main.yml
---
nodejs_version: "20"
```

```yaml
# roles/nodejs/vars/Debian.yml
---
nodejs_package: "nodejs"
nodejs_repo_key_url: "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key"
nodejs_repo: "deb https://deb.nodesource.com/node_{{ nodejs_version }}.x nodistro main"
```

```yaml
# roles/nodejs/vars/RedHat.yml
---
nodejs_package: "nodejs"
nodejs_repo_url: "https://rpm.nodesource.com/setup_{{ nodejs_version }}.x"
```

```yaml
# roles/nodejs/tasks/main.yml
---
- name: Check platform support
  ansible.builtin.assert:
    that: ansible_os_family in ['Debian', 'RedHat']
    fail_msg: "Unsupported platform: {{ ansible_os_family }}"

- name: Load OS-specific variables
  ansible.builtin.include_vars: "{{ ansible_os_family }}.yml"

- name: Include OS-specific setup
  ansible.builtin.include_tasks: "setup-{{ ansible_os_family }}.yml"

- name: Verify Node.js installation
  ansible.builtin.command: node --version
  register: node_version
  changed_when: false

- name: Display installed version
  ansible.builtin.debug:
    msg: "Node.js {{ node_version.stdout }} installed successfully"
```

```yaml
# roles/nodejs/tasks/setup-Debian.yml
---
- name: Install prerequisites
  ansible.builtin.apt:
    name: [ca-certificates, curl, gnupg]
    state: present

- name: Add NodeSource GPG key
  ansible.builtin.apt_key:
    url: "{{ nodejs_repo_key_url }}"
    state: present

- name: Add NodeSource repository
  ansible.builtin.apt_repository:
    repo: "{{ nodejs_repo }}"
    state: present

- name: Install Node.js
  ansible.builtin.apt:
    name: "{{ nodejs_package }}"
    state: present
    update_cache: yes
```

```yaml
# roles/nodejs/tasks/setup-RedHat.yml
---
- name: Run NodeSource setup script
  ansible.builtin.shell: "curl -fsSL {{ nodejs_repo_url }} | bash -"
  args:
    creates: /etc/yum.repos.d/nodesource-*.repo

- name: Install Node.js
  ansible.builtin.yum:
    name: "{{ nodejs_package }}"
    state: present
```

## Wrapping Up

Building platform-specific roles is about establishing a consistent pattern: load the right variables with `include_vars`, route to the right task files with `include_tasks`, and use the `first_found` lookup for graceful fallback. The `package` and `service` modules provide built-in abstraction for the most common operations. For everything else, separate task files and variable files per OS family keep your role organized and maintainable. Once you settle on a pattern, applying it to new roles becomes mechanical.
