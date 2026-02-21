# How to Use the loop Keyword in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Automation, Playbooks

Description: A complete guide to using the loop keyword in Ansible to iterate over lists, dictionaries, and complex data structures in your playbooks.

---

The `loop` keyword is the modern way to iterate in Ansible playbooks. It replaced the older `with_*` syntax (like `with_items`, `with_dict`, `with_nested`) starting in Ansible 2.5, and it is now the recommended approach for all new playbooks. If you are writing Ansible today, `loop` should be your go-to tool for any kind of iteration.

## Basic Loop Syntax

At its simplest, `loop` takes a list and executes the task once for each item. The current item is available as the `item` variable:

```yaml
# Install multiple packages in a single task using loop
- name: Install required packages
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop:
    - nginx
    - curl
    - git
    - htop
    - vim
```

Each iteration of the loop calls the `apt` module with a different package name. This is functionally equivalent to writing five separate tasks, but much cleaner.

Note that for the `package`, `apt`, `yum`, and `dnf` modules specifically, you can pass a list directly to the `name` parameter. This is actually more efficient because it makes a single call to the package manager:

```yaml
# More efficient: pass the list directly to the name parameter
- name: Install required packages efficiently
  ansible.builtin.apt:
    name:
      - nginx
      - curl
      - git
      - htop
      - vim
    state: present
```

But for other modules that do not accept lists, `loop` is the way to go.

## Looping Over a List of Dictionaries

Lists of simple strings are just the start. You can loop over lists of dictionaries to pass multiple parameters per iteration:

```yaml
# Create multiple users with different properties
- name: Create application users
  ansible.builtin.user:
    name: "{{ item.name }}"
    shell: "{{ item.shell }}"
    groups: "{{ item.groups }}"
    state: present
  loop:
    - { name: "deploy", shell: "/bin/bash", groups: "sudo" }
    - { name: "appuser", shell: "/bin/bash", groups: "www-data" }
    - { name: "monitoring", shell: "/usr/sbin/nologin", groups: "prometheus" }
```

Each `item` is a dictionary, and you access its keys with dot notation (`item.name`, `item.shell`, etc.).

## Using loop with Variables

You do not have to hardcode the list in the task. You can reference variables:

```yaml
# Loop over a variable defined elsewhere
- name: Configure application
  hosts: app_servers
  vars:
    firewall_ports:
      - 80
      - 443
      - 8080
      - 9090

  tasks:
    - name: Open firewall ports
      ansible.posix.firewalld:
        port: "{{ item }}/tcp"
        permanent: yes
        state: enabled
      loop: "{{ firewall_ports }}"
```

This is the typical pattern in production playbooks. The list is defined in variables (often loaded from a vars file or group_vars), and the task references it with `loop`.

## Loop with Filters

Ansible lets you apply Jinja2 filters to the loop list. This is where `loop` really shines compared to the old `with_*` syntax:

```yaml
# Flatten a nested list before looping
- name: Install all packages from nested groups
  ansible.builtin.package:
    name: "{{ item }}"
    state: present
  loop: "{{ package_groups | flatten }}"
  vars:
    package_groups:
      - [nginx, curl]
      - [postgresql, redis]
      - [git, vim]
```

The `flatten` filter turns the nested list into a flat list: `[nginx, curl, postgresql, redis, git, vim]`.

## Loop with range

You can generate numeric sequences using the `range` function:

```yaml
# Create numbered directories using range
- name: Create data directories
  ansible.builtin.file:
    path: "/data/volume{{ item }}"
    state: directory
    mode: '0755'
  loop: "{{ range(1, 6) | list }}"
  # Creates /data/volume1 through /data/volume5
```

The `range(1, 6)` function generates numbers 1 through 5. You pipe it to `list` because `range` returns a generator.

## Registering Loop Results

When you register a variable inside a loop, Ansible stores all the results in a `.results` list:

```yaml
# Run commands in a loop and capture all results
- name: Check if services are running
  ansible.builtin.command: systemctl status {{ item }}
  loop:
    - nginx
    - postgresql
    - redis
  register: service_status
  changed_when: false
  failed_when: false

- name: Show failed services
  ansible.builtin.debug:
    msg: "{{ item.item }} is not running"
  loop: "{{ service_status.results }}"
  when: item.rc != 0
```

Each entry in `service_status.results` has an `.item` attribute that tells you which loop item produced that result, plus all the standard return values from the module.

## Loop with Conditional when

You can combine `loop` with `when` to selectively process items:

```yaml
# Only create users that are marked as active
- name: Create active users only
  ansible.builtin.user:
    name: "{{ item.name }}"
    state: present
  loop:
    - { name: "alice", active: true }
    - { name: "bob", active: false }
    - { name: "charlie", active: true }
  when: item.active
```

The `when` clause is evaluated for each iteration. Items that do not match are skipped with a "skipping" message in the output.

## Loop with dict2items

To iterate over a dictionary, convert it to a list of key-value pairs with `dict2items`:

```yaml
# Set sysctl parameters from a dictionary
- name: Configure sysctl values
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    state: present
    reload: yes
  loop: "{{ sysctl_params | dict2items }}"
  vars:
    sysctl_params:
      net.core.somaxconn: 1024
      net.ipv4.tcp_max_syn_backlog: 2048
      vm.swappiness: 10
```

## Loop Control Options

The `loop_control` parameter gives you fine-grained control over loop behavior:

```yaml
# Customize loop variable name and output label
- name: Deploy configuration files
  ansible.builtin.template:
    src: "{{ config.src }}"
    dest: "{{ config.dest }}"
  loop:
    - { src: "nginx.conf.j2", dest: "/etc/nginx/nginx.conf" }
    - { src: "php.ini.j2", dest: "/etc/php/8.1/fpm/php.ini" }
    - { src: "redis.conf.j2", dest: "/etc/redis/redis.conf" }
  loop_control:
    loop_var: config
    label: "{{ config.dest }}"
```

The `loop_var` option renames `item` to `config` (useful in nested loops or included tasks). The `label` option controls what Ansible prints in the output for each iteration, keeping logs clean when items are complex dictionaries.

## When to Use loop vs with_*

The `with_*` syntax still works and is not deprecated, but `loop` is the modern standard. Here is a quick conversion guide:

```yaml
# Old syntax
- name: Old way with_items
  ansible.builtin.debug:
    msg: "{{ item }}"
  with_items:
    - one
    - two

# New syntax using loop
- name: New way with loop
  ansible.builtin.debug:
    msg: "{{ item }}"
  loop:
    - one
    - two

# Old syntax with_dict
- name: Old way with_dict
  ansible.builtin.debug:
    msg: "{{ item.key }}={{ item.value }}"
  with_dict: "{{ my_dict }}"

# New syntax using loop and dict2items
- name: New way with loop
  ansible.builtin.debug:
    msg: "{{ item.key }}={{ item.value }}"
  loop: "{{ my_dict | dict2items }}"
```

## Practical Example: Complete Server Setup

Here is a playbook that uses several loop patterns together:

```yaml
# Set up a web server with multiple loop patterns
- name: Web server provisioning
  hosts: web_servers
  become: yes
  vars:
    packages:
      - nginx
      - certbot
      - python3-certbot-nginx
    virtual_hosts:
      - { domain: "api.example.com", port: 8080 }
      - { domain: "app.example.com", port: 3000 }
      - { domain: "admin.example.com", port: 8443 }
    cron_jobs:
      certbot_renew:
        minute: "0"
        hour: "3"
        job: "certbot renew --quiet"
      log_cleanup:
        minute: "30"
        hour: "2"
        job: "find /var/log/nginx -name '*.gz' -mtime +30 -delete"

  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name: "{{ packages }}"
        state: present
        update_cache: yes

    - name: Deploy virtual host configs
      ansible.builtin.template:
        src: vhost.conf.j2
        dest: "/etc/nginx/sites-available/{{ item.domain }}.conf"
      loop: "{{ virtual_hosts }}"
      loop_control:
        label: "{{ item.domain }}"
      notify: reload nginx

    - name: Enable virtual hosts
      ansible.builtin.file:
        src: "/etc/nginx/sites-available/{{ item.domain }}.conf"
        dest: "/etc/nginx/sites-enabled/{{ item.domain }}.conf"
        state: link
      loop: "{{ virtual_hosts }}"
      loop_control:
        label: "{{ item.domain }}"

    - name: Configure cron jobs
      ansible.builtin.cron:
        name: "{{ item.key }}"
        minute: "{{ item.value.minute }}"
        hour: "{{ item.value.hour }}"
        job: "{{ item.value.job }}"
      loop: "{{ cron_jobs | dict2items }}"
      loop_control:
        label: "{{ item.key }}"

  handlers:
    - name: reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

This shows `loop` with a simple list for virtual hosts, `loop` with `dict2items` for cron jobs, and `loop_control` with `label` to keep the output readable.

## Summary

The `loop` keyword is Ansible's Swiss Army knife for iteration. It handles simple lists, lists of dictionaries, dictionary iteration via `dict2items`, numeric ranges, and filtered/transformed lists through Jinja2 filters. Combined with `when` for conditional processing, `register` for capturing results, and `loop_control` for output customization, it covers every iteration scenario you will encounter in real-world automation.
