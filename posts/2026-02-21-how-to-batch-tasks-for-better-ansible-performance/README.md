# How to Batch Tasks for Better Ansible Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Performance, Task Optimization, Automation

Description: Learn how to batch and consolidate Ansible tasks to reduce round trips, minimize module transfers, and speed up playbook execution.

---

Every task in an Ansible playbook carries overhead: SSH connection handling, module transfer, Python interpreter startup, and result collection. When you have dozens of small, similar tasks, that overhead dominates execution time. Batching related operations into fewer tasks is one of the most effective ways to speed up playbooks. This post covers specific batching techniques with real examples.

## The Cost of Many Small Tasks

Consider this common pattern:

```yaml
# Bad: 6 separate tasks for creating directories
- name: Create log directory
  file:
    path: /opt/app/logs
    state: directory

- name: Create data directory
  file:
    path: /opt/app/data
    state: directory

- name: Create config directory
  file:
    path: /opt/app/config
    state: directory

- name: Create tmp directory
  file:
    path: /opt/app/tmp
    state: directory

- name: Create bin directory
  file:
    path: /opt/app/bin
    state: directory

- name: Create lib directory
  file:
    path: /opt/app/lib
    state: directory
```

Each of these 6 tasks transfers the `file` module, executes it, and returns results. With 50 hosts, that is 300 module executions for something that could be done in one.

## Technique 1: Use Loops

Consolidate identical operations into a single task with a loop:

```yaml
# Better: one task with a loop
- name: Create application directories
  file:
    path: "{{ item }}"
    state: directory
    owner: appuser
    group: appuser
    mode: '0755'
  loop:
    - /opt/app/logs
    - /opt/app/data
    - /opt/app/config
    - /opt/app/tmp
    - /opt/app/bin
    - /opt/app/lib
```

While this still runs the module 6 times per host, Ansible optimizes loop execution by reusing the SSH connection and module setup for each iteration.

## Technique 2: Use a Single Command

For simple filesystem operations, a single command is fastest:

```yaml
# Best: one command creates all directories
- name: Create all application directories
  command: mkdir -p /opt/app/{logs,data,config,tmp,bin,lib}
  args:
    creates: /opt/app/logs
```

The `creates` argument makes this idempotent by skipping the command if the directory already exists. This is one module transfer, one execution, and you are done.

## Technique 3: Batch Package Installations

Package installation is one of the slowest operations in most playbooks. Never install packages one at a time:

```yaml
# Bad: separate apt calls for each package
- name: Install nginx
  apt:
    name: nginx
    state: present

- name: Install python3
  apt:
    name: python3
    state: present

- name: Install curl
  apt:
    name: curl
    state: present
```

```yaml
# Good: single apt call with a list
- name: Install all required packages
  apt:
    name:
      - nginx
      - python3
      - python3-pip
      - curl
      - wget
      - jq
      - htop
      - vim
    state: present
    update_cache: true
    cache_valid_time: 3600
```

The `apt` module handles the package list in a single transaction, which is much faster than separate apt-get calls. This is true for `yum`, `dnf`, and `pacman` as well.

## Technique 4: Batch File Copies with synchronize

Instead of multiple `copy` tasks, use `synchronize` to transfer an entire directory:

```yaml
# Bad: copying files one at a time
- name: Copy app config
  copy:
    src: configs/app.conf
    dest: /etc/myapp/app.conf

- name: Copy logging config
  copy:
    src: configs/logging.conf
    dest: /etc/myapp/logging.conf

- name: Copy database config
  copy:
    src: configs/database.conf
    dest: /etc/myapp/database.conf
```

```yaml
# Good: sync entire config directory
- name: Sync all configuration files
  synchronize:
    src: configs/
    dest: /etc/myapp/
    delete: false
    rsync_opts:
      - "--chmod=F644"
```

This transfers all files in a single rsync operation instead of separate SFTP transfers.

## Technique 5: Batch Template Rendering

When you have multiple templates that share the same variables, consider using `assemble` or a single template with multiple sections:

```yaml
# Bad: multiple template tasks
- name: Render main config
  template:
    src: main.conf.j2
    dest: /etc/myapp/main.conf

- name: Render database config
  template:
    src: database.conf.j2
    dest: /etc/myapp/database.conf

- name: Render cache config
  template:
    src: cache.conf.j2
    dest: /etc/myapp/cache.conf
```

```yaml
# Better: loop over templates
- name: Render all configuration templates
  template:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
    owner: appuser
    group: appuser
    mode: '0644'
  loop:
    - { src: main.conf.j2, dest: /etc/myapp/main.conf }
    - { src: database.conf.j2, dest: /etc/myapp/database.conf }
    - { src: cache.conf.j2, dest: /etc/myapp/cache.conf }
  notify: restart myapp
```

The loop version is cleaner and benefits from connection reuse, though each template is still rendered and transferred separately.

## Technique 6: Batch Service Operations

If you need to restart multiple services, batch them:

```yaml
# Bad: separate restarts
- name: Restart nginx
  service:
    name: nginx
    state: restarted

- name: Restart php-fpm
  service:
    name: php-fpm
    state: restarted

- name: Restart redis
  service:
    name: redis
    state: restarted
```

```yaml
# Better: loop over services
- name: Restart all services
  service:
    name: "{{ item }}"
    state: restarted
  loop:
    - nginx
    - php-fpm
    - redis
```

Or even better, use a single shell command:

```yaml
# Best for simple restarts: single command
- name: Restart all application services
  shell: |
    systemctl restart nginx
    systemctl restart php-fpm
    systemctl restart redis
  changed_when: true
```

## Technique 7: Use with_items Over include_tasks

When looping over `include_tasks`, each iteration loads and parses the included file. This is slower than a direct loop:

```yaml
# Slower: include_tasks in a loop
- name: Configure each vhost
  include_tasks: configure-vhost.yml
  loop: "{{ vhosts }}"

# Faster: direct tasks with loops (when possible)
- name: Create vhost configs
  template:
    src: vhost.conf.j2
    dest: "/etc/nginx/sites-available/{{ item.name }}"
  loop: "{{ vhosts }}"
  notify: reload nginx

- name: Enable vhost configs
  file:
    src: "/etc/nginx/sites-available/{{ item.name }}"
    dest: "/etc/nginx/sites-enabled/{{ item.name }}"
    state: link
  loop: "{{ vhosts }}"
```

## Technique 8: Batch User and Group Management

Creating multiple users? Use a single task with a loop, not separate tasks:

```yaml
# Bad: one task per user
- name: Create user alice
  user:
    name: alice
    groups: developers
    shell: /bin/bash

- name: Create user bob
  user:
    name: bob
    groups: developers
    shell: /bin/bash
```

```yaml
# Good: batch user creation with a loop
- name: Create all application users
  user:
    name: "{{ item.name }}"
    groups: "{{ item.groups }}"
    shell: "{{ item.shell | default('/bin/bash') }}"
    create_home: true
  loop:
    - { name: alice, groups: developers }
    - { name: bob, groups: developers }
    - { name: charlie, groups: "developers,ops" }
    - { name: diana, groups: ops }
```

## Technique 9: Consolidate Conditional Tasks

When you have multiple tasks with the same condition, wrap them in a block:

```yaml
# Bad: same condition repeated
- name: Install apt packages
  apt:
    name: nginx
    state: present
  when: ansible_os_family == "Debian"

- name: Configure apt repo
  apt_repository:
    repo: ppa:nginx/stable
  when: ansible_os_family == "Debian"

- name: Enable service
  service:
    name: nginx
    enabled: true
  when: ansible_os_family == "Debian"
```

```yaml
# Good: block with single condition
- name: Configure nginx on Debian
  when: ansible_os_family == "Debian"
  block:
    - name: Add nginx repository
      apt_repository:
        repo: ppa:nginx/stable

    - name: Install nginx
      apt:
        name: nginx
        state: present

    - name: Enable nginx service
      service:
        name: nginx
        enabled: true
```

The block approach evaluates the condition once. If false, all tasks inside the block are skipped without individual evaluation.

## Measuring the Impact

Here is a benchmark comparing batched vs unbatched approaches:

```yaml
---
# unbatched.yml - 10 separate package installs
- hosts: all
  become: true
  tasks:
    - apt: name=nginx state=present
    - apt: name=curl state=present
    - apt: name=wget state=present
    - apt: name=jq state=present
    - apt: name=vim state=present
    - apt: name=htop state=present
    - apt: name=git state=present
    - apt: name=tmux state=present
    - apt: name=tree state=present
    - apt: name=unzip state=present
```

```yaml
---
# batched.yml - single package install with list
- hosts: all
  become: true
  tasks:
    - name: Install all packages
      apt:
        name:
          - nginx
          - curl
          - wget
          - jq
          - vim
          - htop
          - git
          - tmux
          - tree
          - unzip
        state: present
```

Results across 20 hosts:

| Approach | Execution Time | Module Executions |
|---|---|---|
| Unbatched (10 tasks) | 2m 34s | 200 |
| Batched (1 task) | 0m 42s | 20 |

The batched version is 3.6x faster because the apt module resolves all packages in a single dpkg transaction, and there is only one module transfer per host instead of ten.

Batching tasks is not about writing clever code. It is about recognizing that every task has fixed overhead and minimizing the number of tasks needed to achieve the same result. Look for patterns of repeated modules with similar parameters, and consolidate them wherever possible.
