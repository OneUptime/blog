# How to Use Ansible loop with flatten Filter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Jinja2 Filters, Data Transformation

Description: Learn how to use the flatten filter with Ansible loops to iterate over nested lists and simplify complex data structures in your playbooks.

---

Nested lists are common in Ansible. You might have a group of servers where each server has a list of packages, or a set of applications each with multiple configuration files. The `flatten` filter converts these nested lists into a single flat list that `loop` can iterate over cleanly.

## The Problem with Nested Lists

Consider this variable structure where different roles have different required packages:

```yaml
package_groups:
  - [nginx, certbot]
  - [postgresql, postgresql-contrib]
  - [redis-server, redis-tools]
```

If you try to loop over `package_groups` directly, each `item` would be a list, not a package name. You need to flatten it first.

## Basic flatten Usage

The `flatten` filter turns nested lists into a single flat list:

```yaml
# Flatten nested package lists and install everything
- name: Install all packages from grouped lists
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop: "{{ package_groups | flatten }}"
  vars:
    package_groups:
      - [nginx, certbot]
      - [postgresql, postgresql-contrib]
      - [redis-server, redis-tools]
```

After flattening, the loop iterates over: `nginx`, `certbot`, `postgresql`, `postgresql-contrib`, `redis-server`, `redis-tools`. Each item is a simple string.

## Controlling Flatten Depth

By default, `flatten` recursively flattens all levels of nesting. You can limit the depth by passing a parameter:

```yaml
# Flatten only one level deep
- name: Show flatten depth behavior
  ansible.builtin.debug:
    msg: "{{ item }}"
  loop: "{{ nested_data | flatten(levels=1) }}"
  vars:
    nested_data:
      - [1, [2, 3]]
      - [4, [5, 6]]
      - [7, 8]
```

With `flatten(levels=1)`, the output would be: `1`, `[2, 3]`, `4`, `[5, 6]`, `7`, `8`. The inner lists `[2, 3]` and `[5, 6]` remain as lists because we only flattened one level.

With `flatten` (no depth limit), the output would be: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`. Everything is fully flat.

## Flattening Variable-Source Lists

A common pattern is combining lists from multiple sources:

```yaml
# Combine and flatten package lists from multiple variable sources
- name: Install packages from all sources
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop: "{{ all_packages | flatten }}"
  vars:
    common_packages:
      - curl
      - wget
      - vim
      - htop
    role_packages:
      - nginx
      - python3
    extra_packages:
      - jq
      - tree
    all_packages:
      - "{{ common_packages }}"
      - "{{ role_packages }}"
      - "{{ extra_packages }}"
```

The `all_packages` variable is a list of lists (each variable reference expands to a list). Flattening it produces a single list of all package names.

## Flattening with group_vars and host_vars

This pattern is particularly useful when packages are defined across multiple group_vars files:

```yaml
# group_vars/all.yml
base_packages:
  - curl
  - wget
  - git

# group_vars/webservers.yml
web_packages:
  - nginx
  - certbot

# group_vars/dbservers.yml
db_packages:
  - postgresql
  - postgresql-contrib
```

In your playbook:

```yaml
# Flatten packages from multiple group_vars into a single loop
- name: Install all role-specific packages
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop: >-
    {{
      [
        base_packages | default([]),
        web_packages | default([]),
        db_packages | default([])
      ] | flatten
    }}
```

The `default([])` ensures that undefined variables do not cause errors. On a webserver, `db_packages` is undefined, but `default([])` provides an empty list that flattens harmlessly.

## Flattening Dynamic Data from Registered Results

When you gather information from multiple tasks, you often end up with nested result structures:

```yaml
# Gather package lists from multiple hosts and flatten for processing
- name: Get installed packages on each host
  ansible.builtin.command: dpkg --get-selections | grep -w install | awk '{print $1}'
  register: installed_pkgs
  changed_when: false
  delegate_to: "{{ item }}"
  loop: "{{ groups['webservers'] }}"

- name: Build flat list of all packages across hosts
  ansible.builtin.set_fact:
    all_installed: "{{ installed_pkgs.results | map(attribute='stdout_lines') | flatten | unique | sort }}"

- name: Show total unique packages
  ansible.builtin.debug:
    msg: "Found {{ all_installed | length }} unique packages across all web servers"
```

Each host returns its installed packages as `stdout_lines` (a list). We extract those lists with `map`, flatten them into one big list, and then deduplicate with `unique`.

## Flattening Subelement Lists

When you have objects that each contain a list attribute:

```yaml
# Flatten all allowed ports from service definitions
- name: Define services
  ansible.builtin.set_fact:
    services:
      - name: web
        ports: [80, 443]
      - name: api
        ports: [8080, 8443]
      - name: monitoring
        ports: [9090, 9093, 3000]

- name: Open all service ports
  ansible.posix.firewalld:
    port: "{{ item }}/tcp"
    permanent: yes
    state: enabled
  loop: "{{ services | map(attribute='ports') | flatten }}"
```

The `map(attribute='ports')` extracts the ports list from each service, producing `[[80, 443], [8080, 8443], [9090, 9093, 3000]]`. Then `flatten` turns it into `[80, 443, 8080, 8443, 9090, 9093, 3000]`.

## Combining flatten with selectattr

You can filter before or after flattening:

```yaml
# Only open ports for enabled services
- name: Define services with enabled flag
  ansible.builtin.set_fact:
    services:
      - name: web
        ports: [80, 443]
        enabled: true
      - name: legacy-api
        ports: [8080]
        enabled: false
      - name: monitoring
        ports: [9090, 3000]
        enabled: true

# Filter first, then flatten
- name: Open ports for enabled services only
  ansible.posix.firewalld:
    port: "{{ item }}/tcp"
    permanent: yes
    state: enabled
  loop: >-
    {{
      services
      | selectattr('enabled')
      | map(attribute='ports')
      | flatten
      | list
    }}
```

This filters to enabled services first, then extracts and flattens their port lists. Only ports 80, 443, 9090, and 3000 will be opened.

## flatten vs. with_flattened

The old `with_flattened` lookup is equivalent to `loop` with `flatten`:

```yaml
# Old syntax (still works but not recommended for new playbooks)
- name: Old way
  ansible.builtin.debug:
    msg: "{{ item }}"
  with_flattened:
    - [1, 2]
    - [3, [4, 5]]

# Modern syntax using loop with flatten
- name: New way
  ansible.builtin.debug:
    msg: "{{ item }}"
  loop: "{{ [[1, 2], [3, [4, 5]]] | flatten }}"
```

## Practical Example: Multi-Tier Application Deployment

Here is a complete playbook that uses flatten extensively:

```yaml
# Deploy a multi-tier application using flatten for cross-cutting concerns
- name: Multi-tier deployment
  hosts: all
  become: yes
  vars:
    tiers:
      - name: frontend
        hosts: "{{ groups['frontend'] | default([]) }}"
        packages:
          - nginx
          - nodejs
          - npm
        configs:
          - { src: "nginx-frontend.conf.j2", dest: "/etc/nginx/sites-available/frontend.conf" }
      - name: backend
        hosts: "{{ groups['backend'] | default([]) }}"
        packages:
          - python3
          - python3-pip
          - gunicorn
        configs:
          - { src: "gunicorn.conf.j2", dest: "/etc/gunicorn/config.py" }
          - { src: "backend-env.j2", dest: "/etc/myapp/backend.env" }
      - name: database
        hosts: "{{ groups['database'] | default([]) }}"
        packages:
          - postgresql
          - postgresql-contrib
          - pgbouncer
        configs:
          - { src: "postgresql.conf.j2", dest: "/etc/postgresql/14/main/postgresql.conf" }
          - { src: "pgbouncer.ini.j2", dest: "/etc/pgbouncer/pgbouncer.ini" }

  tasks:
    - name: Get tiers for this host
      ansible.builtin.set_fact:
        my_tiers: >-
          {{
            tiers | selectattr('hosts', 'contains', inventory_hostname) | list
          }}

    - name: Install all packages for applicable tiers
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop: "{{ my_tiers | map(attribute='packages') | flatten | unique }}"

    - name: Deploy all configs for applicable tiers
      ansible.builtin.template:
        src: "{{ item.src }}"
        dest: "{{ item.dest }}"
      loop: "{{ my_tiers | map(attribute='configs') | flatten }}"
      loop_control:
        label: "{{ item.dest }}"
```

Each host determines which tiers it belongs to, then flattens the package lists from all its tiers into a single installation loop. The `unique` filter prevents duplicate package installations if multiple tiers share a package.

## Summary

The `flatten` filter is a simple but essential tool for working with nested lists in Ansible. Use it whenever you need to combine multiple lists into a single loop, extract sub-lists from objects and iterate over them, or merge data from multiple variable sources. Combined with `map`, `selectattr`, and `unique`, it lets you build powerful data transformation pipelines that keep your playbooks concise and free of redundant loops.
