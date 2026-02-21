# How to Create Directories with the Ansible file Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Linux, DevOps

Description: Learn how to create single and nested directories on remote hosts using the Ansible file module with proper permissions and ownership.

---

Creating directories is one of the most common tasks in server provisioning. Whether you are setting up application directories, log folders, or configuration paths, the Ansible `file` module with `state: directory` handles it all. It is the Ansible equivalent of `mkdir -p`, but with built-in idempotency and the ability to set permissions, ownership, and SELinux context in the same task.

This post covers everything you need to know about creating directories with the `file` module, from simple single-directory creation to complex nested structures.

## Basic Directory Creation

The simplest case is creating a single directory:

```yaml
# Create a single directory on the remote host
- name: Create the application directory
  ansible.builtin.file:
    path: /opt/myapp
    state: directory
```

This creates `/opt/myapp` with default permissions (usually 0755) and owned by the user running the playbook. If the directory already exists, Ansible does nothing and reports "ok" instead of "changed". That is the idempotency you get for free.

## Setting Permissions and Ownership

In most cases, you want to specify the owner, group, and permissions explicitly:

```yaml
# Create a directory with specific permissions and ownership
- name: Create application data directory
  ansible.builtin.file:
    path: /var/lib/myapp/data
    state: directory
    owner: myapp
    group: myapp
    mode: "0755"
```

A few notes on the `mode` parameter:

- Always quote the mode value as a string (`"0755"`, not `0755`). If you do not quote it, YAML interprets it as an integer and the leading zero gets stripped, resulting in wrong permissions.
- You can use symbolic modes too: `mode: "u=rwx,g=rx,o=rx"` is equivalent to `"0755"`.

```yaml
# Create a directory with symbolic permissions
- name: Create secure config directory
  ansible.builtin.file:
    path: /etc/myapp
    state: directory
    owner: root
    group: myapp
    mode: "u=rwx,g=rx,o="
```

That symbolic mode translates to `0750`, giving the owner full access, the group read and execute, and others no access at all.

## Creating Nested Directories

The `file` module automatically creates parent directories when you specify a deep path, similar to `mkdir -p`:

```yaml
# Create a nested directory structure - parent dirs are created automatically
- name: Create nested log directory
  ansible.builtin.file:
    path: /var/log/myapp/archives/2024
    state: directory
    owner: myapp
    group: myapp
    mode: "0755"
```

This creates `/var/log/myapp`, `/var/log/myapp/archives`, and `/var/log/myapp/archives/2024` if any of them do not exist. However, only the final directory (`2024`) will have the specified owner, group, and mode. The intermediate directories will be created with the default umask of the user running the task.

If you need specific permissions on every level of the hierarchy, create each directory explicitly:

```yaml
# Create each level of the directory tree with explicit permissions
- name: Create log base directory
  ansible.builtin.file:
    path: /var/log/myapp
    state: directory
    owner: myapp
    group: myapp
    mode: "0755"

- name: Create log archives directory
  ansible.builtin.file:
    path: /var/log/myapp/archives
    state: directory
    owner: myapp
    group: myapp
    mode: "0750"

- name: Create year-specific archive directory
  ansible.builtin.file:
    path: /var/log/myapp/archives/2024
    state: directory
    owner: myapp
    group: myapp
    mode: "0750"
```

## Creating Multiple Directories with a Loop

When you need to create several directories, use a loop instead of repeating the task:

```yaml
# Create multiple directories using a simple list loop
- name: Create application directory structure
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: myapp
    group: myapp
    mode: "0755"
  loop:
    - /opt/myapp
    - /opt/myapp/bin
    - /opt/myapp/config
    - /opt/myapp/data
    - /opt/myapp/logs
    - /opt/myapp/tmp
```

For directories that need different permissions, use a list of dictionaries:

```yaml
# Create directories with varying permissions using a dictionary loop
- name: Create directories with different permissions
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: directory
    owner: "{{ item.owner }}"
    group: "{{ item.group }}"
    mode: "{{ item.mode }}"
  loop:
    - { path: "/opt/myapp", owner: "root", group: "myapp", mode: "0755" }
    - { path: "/opt/myapp/config", owner: "root", group: "myapp", mode: "0750" }
    - { path: "/opt/myapp/data", owner: "myapp", group: "myapp", mode: "0700" }
    - { path: "/opt/myapp/logs", owner: "myapp", group: "myapp", mode: "0755" }
    - { path: "/opt/myapp/secrets", owner: "myapp", group: "myapp", mode: "0700" }
```

## Using Variables for Directory Definitions

For larger projects, define your directory structure in variables:

```yaml
# group_vars/all/vars.yml - define directory structure as a variable
app_directories:
  - path: "/opt/{{ app_name }}"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0755"
  - path: "/opt/{{ app_name }}/releases"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0755"
  - path: "/opt/{{ app_name }}/shared"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0755"
  - path: "/opt/{{ app_name }}/shared/config"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0750"
  - path: "/opt/{{ app_name }}/shared/log"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0755"
  - path: "/opt/{{ app_name }}/shared/tmp"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0755"
```

```yaml
# playbook.yml - use the variable to create all directories
- name: Set up application directory structure
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: directory
    owner: "{{ item.owner }}"
    group: "{{ item.group }}"
    mode: "{{ item.mode }}"
  loop: "{{ app_directories }}"
  loop_control:
    label: "{{ item.path }}"
```

The `loop_control` with `label` keeps the output clean by only showing the path instead of the entire dictionary for each iteration.

## Using become for Privileged Directories

When creating directories that require root access, use `become`:

```yaml
# Create system directories that require root privileges
- name: Create system-level directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: root
    group: root
    mode: "0755"
  loop:
    - /etc/myapp
    - /var/lib/myapp
    - /var/run/myapp
  become: true
```

## Conditional Directory Creation

Sometimes you only need to create a directory based on a condition:

```yaml
# Only create the backup directory on database servers
- name: Create database backup directory
  ansible.builtin.file:
    path: /var/backups/postgresql
    state: directory
    owner: postgres
    group: postgres
    mode: "0700"
  when: "'db_servers' in group_names"
```

```yaml
# Create a directory only if it does not already exist (using stat)
- name: Check if legacy directory exists
  ansible.builtin.stat:
    path: /opt/legacy_app
  register: legacy_dir

- name: Create migration directory only if legacy app exists
  ansible.builtin.file:
    path: /opt/legacy_app/migration
    state: directory
    owner: root
    group: root
    mode: "0755"
  when: legacy_dir.stat.exists
```

## SELinux Context

On systems with SELinux enabled, you may need to set the security context:

```yaml
# Create a directory with an SELinux context for web content
- name: Create web content directory with SELinux context
  ansible.builtin.file:
    path: /var/www/myapp
    state: directory
    owner: apache
    group: apache
    mode: "0755"
    setype: httpd_sys_content_t
```

## A Complete Example: Application Deployment Directory Structure

Here is a practical example that sets up a full deployment directory structure for a web application:

```yaml
# setup-app-dirs.yml - complete application directory structure
---
- name: Set up web application directories
  hosts: app_servers
  become: true
  vars:
    app_name: mywebapp
    app_user: deploy
    app_group: deploy

  tasks:
    # Create the application user first
    - name: Create application user
      ansible.builtin.user:
        name: "{{ app_user }}"
        group: "{{ app_group }}"
        shell: /bin/bash
        home: "/home/{{ app_user }}"
        create_home: true

    # Create the full directory tree
    - name: Create application directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: directory
        owner: "{{ item.owner | default(app_user) }}"
        group: "{{ item.group | default(app_group) }}"
        mode: "{{ item.mode | default('0755') }}"
      loop:
        - { path: "/opt/{{ app_name }}" }
        - { path: "/opt/{{ app_name }}/current" }
        - { path: "/opt/{{ app_name }}/releases" }
        - { path: "/opt/{{ app_name }}/shared" }
        - { path: "/opt/{{ app_name }}/shared/config", mode: "0750" }
        - { path: "/opt/{{ app_name }}/shared/log" }
        - { path: "/opt/{{ app_name }}/shared/tmp" }
        - { path: "/opt/{{ app_name }}/shared/pids" }
        - { path: "/var/log/{{ app_name }}" }
        - { path: "/etc/{{ app_name }}", owner: "root", mode: "0750" }
      loop_control:
        label: "{{ item.path }}"
```

## Summary

The Ansible `file` module with `state: directory` is your primary tool for creating directories on remote hosts. Remember to always quote mode values as strings, use loops for creating multiple directories, define directory structures in variables for reusability, set explicit ownership and permissions on each level of nested paths, and use `become: true` when root access is needed. The module is idempotent, so running it multiple times is safe and will only make changes when something is different from the desired state.
