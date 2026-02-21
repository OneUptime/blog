# How to Iterate Over a List of Items in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Lists, Automation

Description: Learn how to iterate over lists in Ansible using the loop keyword with practical examples for packages, files, users, and services.

---

Iterating over a list is the most fundamental loop operation in Ansible. Whether you are installing packages, creating users, copying files, or configuring services, you will constantly find yourself needing to repeat a task for multiple items. Ansible makes this straightforward with the `loop` keyword.

## Simple List Iteration

The basic pattern is to add a `loop` key to your task with a list of values. Each value becomes available as `{{ item }}` inside the task:

```yaml
# Create multiple directories from a simple list
- name: Create application directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    mode: '0755'
    owner: appuser
    group: appuser
  loop:
    - /opt/myapp
    - /opt/myapp/config
    - /opt/myapp/logs
    - /opt/myapp/data
    - /opt/myapp/tmp
```

Ansible executes the `file` module five times, once for each directory in the list. The output shows each iteration separately so you can see which items changed and which were already in the desired state.

## Iterating Over a List Variable

In practice, you rarely hardcode lists in the task itself. Instead, you define them in variables:

```yaml
# Install packages from a variable list
- name: Setup development environment
  hosts: dev_servers
  vars:
    dev_packages:
      - build-essential
      - git
      - curl
      - wget
      - jq
      - unzip
      - python3-pip
      - docker.io

  tasks:
    - name: Install development packages
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop: "{{ dev_packages }}"
```

The variable can come from anywhere Ansible loads variables: the playbook, group_vars, host_vars, inventory, extra_vars on the command line, or even dynamically from a previous task using `set_fact`.

## List of Dictionaries

When each item needs multiple attributes, use a list of dictionaries:

```yaml
# Create system users with specific properties
- name: Create application service accounts
  ansible.builtin.user:
    name: "{{ item.name }}"
    comment: "{{ item.comment }}"
    shell: "{{ item.shell }}"
    home: "{{ item.home }}"
    system: yes
    create_home: yes
  loop:
    - name: nginx
      comment: "Nginx web server"
      shell: /usr/sbin/nologin
      home: /var/lib/nginx
    - name: postgres
      comment: "PostgreSQL database"
      shell: /bin/bash
      home: /var/lib/postgresql
    - name: redis
      comment: "Redis cache server"
      shell: /usr/sbin/nologin
      home: /var/lib/redis
```

You access dictionary keys with `item.key_name`. This pattern is extremely common for managing resources that have multiple properties.

## Iterating Over Lists from Registered Variables

A powerful pattern is to run a task, register the output, and then loop over the results:

```yaml
# Find all config files and set permissions on each one
- name: Find configuration files
  ansible.builtin.find:
    paths: /etc/myapp/conf.d
    patterns: "*.conf"
  register: config_files

- name: Set correct permissions on config files
  ansible.builtin.file:
    path: "{{ item.path }}"
    owner: root
    group: myapp
    mode: '0640'
  loop: "{{ config_files.files }}"
  loop_control:
    label: "{{ item.path }}"
```

The `find` module returns a list of file objects in `.files`. We loop over that list and set permissions on each file. The `loop_control` with `label` keeps the output clean by showing just the file path instead of the entire file object.

## Building Lists Dynamically with set_fact

You can construct lists at runtime based on conditions:

```yaml
# Build a list of services to restart based on what changed
- name: Check if nginx config changed
  ansible.builtin.stat:
    path: /etc/nginx/.config_updated
  register: nginx_flag

- name: Check if php config changed
  ansible.builtin.stat:
    path: /etc/php/.config_updated
  register: php_flag

- name: Build list of services to restart
  ansible.builtin.set_fact:
    services_to_restart: >-
      {{
        ([] +
         (['nginx'] if nginx_flag.stat.exists else []) +
         (['php8.1-fpm'] if php_flag.stat.exists else []))
      }}

- name: Restart affected services
  ansible.builtin.systemd:
    name: "{{ item }}"
    state: restarted
  loop: "{{ services_to_restart }}"
  when: services_to_restart | length > 0
```

This dynamically builds a list of services that need restarting and then loops over just those services.

## Filtering Lists Before Iterating

You can filter a list before passing it to `loop` using Jinja2 filters:

```yaml
# Only process active items from a list
- name: Define servers
  ansible.builtin.set_fact:
    all_servers:
      - { name: "web01", env: "production", active: true }
      - { name: "web02", env: "production", active: true }
      - { name: "web03", env: "staging", active: false }
      - { name: "db01", env: "production", active: true }
      - { name: "db02", env: "staging", active: true }

# Filter to only active production servers before looping
- name: Configure production servers
  ansible.builtin.debug:
    msg: "Configuring {{ item.name }}"
  loop: >-
    {{
      all_servers
      | selectattr('active')
      | selectattr('env', 'equalto', 'production')
      | list
    }}
  loop_control:
    label: "{{ item.name }}"
```

Pre-filtering the list is cleaner than using `when` inside the loop because skipped iterations do not clutter the output.

## Iterating with Index Numbers

Sometimes you need the index position along with the item. Use `loop_control` with `index_var`:

```yaml
# Create numbered worker configuration files
- name: Generate worker configs
  ansible.builtin.template:
    src: worker.conf.j2
    dest: "/etc/workers/worker-{{ worker_index }}.conf"
  loop:
    - { queue: "emails", concurrency: 5 }
    - { queue: "reports", concurrency: 3 }
    - { queue: "notifications", concurrency: 10 }
  loop_control:
    index_var: worker_index
    label: "worker-{{ worker_index }} ({{ item.queue }})"
```

The `index_var` starts at 0 by default. The template can reference both `{{ item }}` for the data and `{{ worker_index }}` for the position.

## Iterating Over File Content

You can read a file and iterate over its lines:

```yaml
# Read a list of hostnames from a file and add them to /etc/hosts
- name: Read hostname list
  ansible.builtin.slurp:
    src: /opt/config/allowed_hosts.txt
  register: hosts_file

- name: Parse hostname list
  ansible.builtin.set_fact:
    allowed_hosts: "{{ (hosts_file.content | b64decode).split('\n') | select | list }}"

- name: Add hosts to /etc/hosts
  ansible.builtin.lineinfile:
    path: /etc/hosts
    line: "{{ item }}"
    state: present
  loop: "{{ allowed_hosts }}"
```

The `slurp` module reads the file content (base64 encoded), we decode it, split by newlines, and filter out empty lines with `select`.

## Practical Example: Deploying Multiple Web Applications

Here is a real-world playbook that deploys multiple applications using list iteration:

```yaml
# Deploy multiple web applications from a defined list
- name: Deploy web applications
  hosts: app_servers
  become: yes
  vars:
    applications:
      - name: api
        repo: https://github.com/company/api.git
        branch: main
        port: 8080
        workers: 4
      - name: frontend
        repo: https://github.com/company/frontend.git
        branch: main
        port: 3000
        workers: 2
      - name: admin
        repo: https://github.com/company/admin.git
        branch: release
        port: 8443
        workers: 2

  tasks:
    - name: Create application directories
      ansible.builtin.file:
        path: "/opt/apps/{{ item.name }}"
        state: directory
        owner: deploy
        group: deploy
        mode: '0755'
      loop: "{{ applications }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Clone application repositories
      ansible.builtin.git:
        repo: "{{ item.repo }}"
        dest: "/opt/apps/{{ item.name }}"
        version: "{{ item.branch }}"
      loop: "{{ applications }}"
      loop_control:
        label: "{{ item.name }}"
      become_user: deploy

    - name: Deploy systemd service files
      ansible.builtin.template:
        src: app.service.j2
        dest: "/etc/systemd/system/{{ item.name }}.service"
      loop: "{{ applications }}"
      loop_control:
        label: "{{ item.name }}"
      notify: reload systemd

    - name: Deploy nginx virtual host configs
      ansible.builtin.template:
        src: app-vhost.conf.j2
        dest: "/etc/nginx/sites-available/{{ item.name }}.conf"
      loop: "{{ applications }}"
      loop_control:
        label: "{{ item.name }}"
      notify: reload nginx

    - name: Enable and start application services
      ansible.builtin.systemd:
        name: "{{ item.name }}"
        state: started
        enabled: yes
      loop: "{{ applications }}"
      loop_control:
        label: "{{ item.name }}"

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: yes

    - name: reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

This playbook deploys three web applications with a single set of tasks. Adding a fourth application is as simple as adding another entry to the `applications` list. No task duplication needed.

## Performance Considerations

When looping over large lists, keep these things in mind. Each iteration is a separate module execution, which means a separate SSH connection or process. For package installation, always prefer passing the list directly to the `name` parameter when the module supports it. For file operations, consider using `synchronize` for bulk file copies instead of looping over `copy`. And if you are looping over hundreds of items, consider using `async` with `poll` to parallelize the work.

## Summary

List iteration in Ansible is built around the `loop` keyword and the `{{ item }}` variable. You can iterate over simple strings, dictionaries, registered results, dynamically built lists, and filtered subsets. Combined with `loop_control` for clean output and index tracking, this covers the vast majority of iteration needs in day-to-day Ansible work.
