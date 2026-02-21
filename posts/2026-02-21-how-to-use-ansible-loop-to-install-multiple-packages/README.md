# How to Use Ansible loop to Install Multiple Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Package Management, Automation, DevOps

Description: Learn how to use Ansible loop to install multiple packages efficiently across your infrastructure with practical examples and best practices.

---

If you have ever written an Ansible playbook that installs packages one task at a time, you know how quickly the file grows out of control. Twenty packages means twenty nearly identical tasks. That is not just tedious to write, it is painful to maintain. The `loop` keyword in Ansible solves this problem by letting you iterate over a list of items within a single task.

In this post, we will walk through how to use `loop` to install multiple packages on Debian/Ubuntu and RHEL/CentOS systems, cover some common patterns, and look at how to handle conditional installs.

## The Basic Pattern

The simplest form of a loop-based package install looks like this. We define a list of packages and iterate over them using the `loop` keyword.

```yaml
# install-packages.yml
# Installs a list of common packages on Debian/Ubuntu systems
- name: Install common packages on Debian
  hosts: webservers
  become: true
  tasks:
    - name: Install required packages
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
        update_cache: true
      loop:
        - nginx
        - curl
        - git
        - htop
        - vim
        - unzip
        - python3-pip
```

When Ansible runs this task, it iterates through the list and installs each package. The special variable `{{ item }}` holds the current value from the list on each pass.

## A More Efficient Approach

While the above works, the `apt` and `yum` modules actually accept a list directly in the `name` parameter. This is significantly faster because it runs a single package manager transaction instead of one per package.

```yaml
# efficient-install.yml
# Uses the name parameter directly with a list for better performance
- name: Install packages efficiently
  hosts: webservers
  become: true
  vars:
    common_packages:
      - nginx
      - curl
      - git
      - htop
      - vim
      - unzip
      - python3-pip
      - wget
      - jq
  tasks:
    - name: Install all common packages in one transaction
      ansible.builtin.apt:
        name: "{{ common_packages }}"
        state: present
        update_cache: true
```

This runs `apt-get install nginx curl git htop vim unzip python3-pip wget jq` as a single command. On a system with 20+ packages, the time savings are noticeable.

However, there are cases where you genuinely need the loop, for example when you want to track each package individually in your output, or when you need to run additional logic per package.

## Using loop with Variables from Group Vars

In real infrastructure, different server groups need different packages. You can define package lists in your group variables and reference them in your playbook.

```yaml
# group_vars/webservers.yml
# Package list for web server nodes
packages_to_install:
  - nginx
  - certbot
  - python3-certbot-nginx
  - logrotate

# group_vars/dbservers.yml
# Package list for database server nodes
packages_to_install:
  - postgresql-14
  - postgresql-client-14
  - pgbouncer
  - libpq-dev
```

Then your playbook stays clean and generic.

```yaml
# site.yml
# Installs group-specific packages using the variable defined in group_vars
- name: Install group-specific packages
  hosts: all
  become: true
  tasks:
    - name: Install packages for this server role
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop: "{{ packages_to_install }}"
```

## Handling Multiple Package Managers

Sometimes you manage both Debian and RHEL systems from the same playbook. You can use conditionals inside the loop to pick the right module.

```yaml
# cross-platform-install.yml
# Installs packages on both Debian and RHEL family systems
- name: Install packages across distros
  hosts: all
  become: true
  vars:
    packages:
      - name: nginx
        apt_name: nginx
        yum_name: nginx
      - name: git
        apt_name: git
        yum_name: git
      - name: process viewer
        apt_name: htop
        yum_name: htop
  tasks:
    - name: Install on Debian/Ubuntu
      ansible.builtin.apt:
        name: "{{ item.apt_name }}"
        state: present
      loop: "{{ packages }}"
      when: ansible_os_family == "Debian"

    - name: Install on RHEL/CentOS
      ansible.builtin.yum:
        name: "{{ item.yum_name }}"
        state: present
      loop: "{{ packages }}"
      when: ansible_os_family == "RedHat"
```

## Installing Packages with Specific Versions

When you need to pin package versions (which you should in production), the loop pattern works well with dictionaries.

```yaml
# pinned-versions.yml
# Installs specific package versions for reproducible environments
- name: Install pinned package versions
  hosts: production
  become: true
  tasks:
    - name: Install packages with version pinning
      ansible.builtin.apt:
        name: "{{ item.name }}={{ item.version }}"
        state: present
        allow_downgrade: true
      loop:
        - { name: "nginx", version: "1.24.0-1ubuntu1" }
        - { name: "redis-server", version: "7.0.11-1" }
        - { name: "postgresql-14", version: "14.10-1.pgdg22.04+1" }
```

## Combining loop with register

You often want to know what happened during installation. The `register` keyword captures results for each loop iteration.

```yaml
# install-and-check.yml
# Installs packages and reports which ones were newly installed
- name: Install and report changes
  hosts: webservers
  become: true
  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop:
        - nginx
        - redis-server
        - memcached
      register: install_results

    - name: Show which packages were newly installed
      ansible.builtin.debug:
        msg: "{{ item.item }} was installed (changed: {{ item.changed }})"
      loop: "{{ install_results.results }}"
      when: item.changed
```

The registered variable `install_results.results` contains a list of result objects, one per loop iteration. Each result has an `.item` attribute referencing the original loop value.

## Loop with flatten for Merged Lists

If you have multiple package lists that you want to combine, use the `flatten` filter.

```yaml
# merged-lists.yml
# Combines multiple package lists and installs everything in one loop
- name: Install from multiple lists
  hosts: all
  become: true
  vars:
    base_packages:
      - curl
      - wget
      - vim
    monitoring_packages:
      - prometheus-node-exporter
      - collectd
    security_packages:
      - fail2ban
      - ufw
  tasks:
    - name: Install all packages from merged lists
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop: "{{ (base_packages + monitoring_packages + security_packages) | flatten }}"
```

## Error Handling in Package Loops

Sometimes a package might not be available in the repository. You can handle this gracefully with `ignore_errors` or `failed_when`.

```yaml
# safe-install.yml
# Attempts to install each package, continuing even if some fail
- name: Install packages with error handling
  hosts: all
  become: true
  tasks:
    - name: Try installing each package
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop:
        - nginx
        - some-possibly-missing-package
        - git
      register: pkg_result
      ignore_errors: true

    - name: Report failed installations
      ansible.builtin.debug:
        msg: "Failed to install: {{ item.item }}"
      loop: "{{ pkg_result.results }}"
      when: item.failed
```

## Performance Comparison

Here is a rough comparison of the two approaches when installing 15 packages on a fresh Ubuntu 22.04 system.

| Approach | Time (approx) | Package Manager Calls |
|----------|---------------|----------------------|
| Loop with `item` | 45-60 seconds | 15 separate calls |
| Direct list in `name` | 10-15 seconds | 1 single call |

The direct list approach wins on speed every time. Use `loop` when you need per-item logic, and the direct list when you just need them all installed.

## Summary

Using `loop` for package installation in Ansible gives you flexibility when you need per-package control, version pinning with dictionaries, conditional installs, or result tracking. For straightforward bulk installs, passing a list directly to the `name` parameter is faster. Choose the approach that fits your use case, and keep your package lists in group variables so your playbooks stay clean and reusable.
