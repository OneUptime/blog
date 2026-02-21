# How to Use Ansible loop with fileglob for File Iteration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, File Management, Lookups

Description: Learn how to use the fileglob lookup with Ansible loops to iterate over files matching glob patterns on the control node for bulk file operations.

---

The `fileglob` lookup plugin finds files on the Ansible control node that match a glob pattern. Combined with `loop`, it lets you iterate over those files to copy, template, or process them on target hosts. This is incredibly useful when you have a directory full of configuration files, scripts, or templates that need to be deployed to remote servers.

## Understanding fileglob

There is an important distinction to make: `fileglob` searches for files on the control node (the machine running Ansible), not on the target hosts. If you need to find files on remote hosts, use the `find` module instead.

```yaml
# Basic fileglob: find all .conf files in the files directory
- name: List configuration files
  ansible.builtin.debug:
    msg: "Found file: {{ item }}"
  loop: "{{ lookup('fileglob', 'files/configs/*.conf', wantlist=True) }}"
```

The `fileglob` lookup returns absolute paths to matching files on the control node. The `wantlist=True` parameter ensures the result is always a list (needed when using with `loop`).

## Alternatively: Using query Instead of lookup

The `query` function is the modern replacement for `lookup` when you need a list:

```yaml
# Using query (preferred syntax for loops)
- name: List configuration files
  ansible.builtin.debug:
    msg: "Found file: {{ item }}"
  loop: "{{ query('fileglob', 'files/configs/*.conf') }}"
```

`query` always returns a list, so you do not need `wantlist=True`. I recommend using `query` over `lookup` when feeding results into `loop`.

## Copying Files with fileglob

The most common use case is bulk copying files to remote hosts:

```yaml
# Copy all configuration files from a local directory to remote hosts
- name: Deploy configuration files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/etc/myapp/conf.d/{{ item | basename }}"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ query('fileglob', 'files/conf.d/*.conf') }}"
  loop_control:
    label: "{{ item | basename }}"
```

The `basename` filter extracts just the filename from the full path, which is what you typically want for the destination.

## Deploying Templates with fileglob

You can use fileglob to find template files and deploy them:

```yaml
# Find and deploy all Jinja2 templates from a directory
- name: Deploy all templates
  ansible.builtin.template:
    src: "{{ item }}"
    dest: "/etc/nginx/sites-available/{{ item | basename | regex_replace('\\.j2$', '') }}"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ query('fileglob', 'templates/nginx-sites/*.j2') }}"
  loop_control:
    label: "{{ item | basename }}"
  notify: reload nginx
```

The `regex_replace` strips the `.j2` extension from the destination filename, so `mysite.conf.j2` becomes `mysite.conf`.

## Deploying Scripts

```yaml
# Copy all shell scripts to the remote bin directory
- name: Deploy utility scripts
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/usr/local/bin/{{ item | basename }}"
    owner: root
    group: root
    mode: '0755'
  loop: "{{ query('fileglob', 'files/scripts/*.sh') }}"
  loop_control:
    label: "{{ item | basename }}"
```

Note that the mode is set to `0755` (executable) since these are scripts.

## Glob Patterns

fileglob supports standard glob patterns:

```yaml
# Different glob patterns
# Match all .yml files
- loop: "{{ query('fileglob', 'files/*.yml') }}"

# Match all files starting with 'config'
- loop: "{{ query('fileglob', 'files/config*') }}"

# Match files with single character before extension
- loop: "{{ query('fileglob', 'files/server?.conf') }}"

# Match all files (any extension)
- loop: "{{ query('fileglob', 'files/certs/*') }}"
```

However, `fileglob` does NOT support recursive globbing (`**`). It only searches the specified directory, not subdirectories.

## Working with Subdirectories

Since `fileglob` is not recursive, you need to handle subdirectories explicitly:

```yaml
# Copy files from multiple subdirectories
- name: Deploy configs from multiple directories
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/etc/myapp/{{ item | basename }}"
    owner: root
    group: root
    mode: '0644'
  loop: >-
    {{
      query('fileglob', 'files/base/*.conf') +
      query('fileglob', 'files/overrides/*.conf')
    }}
  loop_control:
    label: "{{ item | basename }}"
```

You can concatenate multiple fileglob results to cover several directories.

## Preserving Directory Structure

If you need to preserve the relative directory structure when copying:

```yaml
# Deploy files while preserving their subdirectory structure
- name: Copy SSL certificates maintaining directory structure
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/etc/ssl/{{ item | relpath('files/ssl/') }}"
    owner: root
    group: ssl-cert
    mode: '0640'
  loop: "{{ query('fileglob', 'files/ssl/certs/*.pem') + query('fileglob', 'files/ssl/private/*.key') }}"
  loop_control:
    label: "{{ item | relpath('files/ssl/') }}"
```

The `relpath` filter extracts the path relative to a base directory, preserving any subdirectory structure.

## Conditional File Deployment

Combine fileglob with conditions:

```yaml
# Deploy environment-specific configuration files
- name: Deploy environment configs
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/etc/myapp/{{ item | basename }}"
    owner: appuser
    group: appuser
    mode: '0640'
  loop: >-
    {{
      query('fileglob', 'files/common/*.conf') +
      query('fileglob', 'files/' + environment + '/*.conf')
    }}
  loop_control:
    label: "{{ item | basename }}"
```

This deploys common configs plus environment-specific ones. If `environment` is "production", it picks up files from `files/production/*.conf`.

## Using fileglob with Registered Variables

```yaml
# Find files and do something based on the results
- name: Find all migration files
  ansible.builtin.set_fact:
    migration_files: "{{ query('fileglob', 'files/migrations/*.sql') | sort }}"

- name: Show migration count
  ansible.builtin.debug:
    msg: "Found {{ migration_files | length }} migration files to apply"

- name: Apply migrations in order
  ansible.builtin.command: "psql -f {{ item }} mydb"
  loop: "{{ migration_files }}"
  loop_control:
    label: "{{ item | basename }}"
  changed_when: true
```

The `sort` filter ensures migrations are applied in alphabetical order, which is important when migration files are named with sequential numbers like `001_create_tables.sql`, `002_add_indexes.sql`.

## Handling Empty Results

If no files match the glob pattern, `query` returns an empty list. You can check for this:

```yaml
# Check if there are files to deploy before proceeding
- name: Find override configs
  ansible.builtin.set_fact:
    override_files: "{{ query('fileglob', 'files/overrides/*.conf') }}"

- name: Deploy overrides if they exist
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/etc/myapp/conf.d/{{ item | basename }}"
  loop: "{{ override_files }}"
  loop_control:
    label: "{{ item | basename }}"
  when: override_files | length > 0
```

## fileglob vs. find Module

Remember the distinction:

```yaml
# fileglob: searches the CONTROL NODE (where Ansible runs)
- name: Find local files
  ansible.builtin.debug:
    msg: "{{ item }}"
  loop: "{{ query('fileglob', 'files/*.conf') }}"

# find module: searches the TARGET HOST (remote server)
- name: Find remote files
  ansible.builtin.find:
    paths: /etc/myapp
    patterns: "*.conf"
  register: remote_files

- name: Process remote files
  ansible.builtin.debug:
    msg: "{{ item.path }}"
  loop: "{{ remote_files.files }}"
```

Use `fileglob` when you have files locally that you want to deploy. Use the `find` module when you need to discover files on remote hosts.

## Practical Example: Complete Config Management

```yaml
# Full configuration management using fileglob patterns
- name: Deploy application configuration
  hosts: app_servers
  become: yes
  tasks:
    - name: Ensure config directories exist
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        owner: appuser
        group: appuser
        mode: '0755'
      loop:
        - /etc/myapp
        - /etc/myapp/conf.d
        - /etc/myapp/certs
        - /etc/myapp/scripts

    - name: Deploy main configuration files
      ansible.builtin.template:
        src: "{{ item }}"
        dest: "/etc/myapp/{{ item | basename | regex_replace('\\.j2$', '') }}"
        owner: appuser
        group: appuser
        mode: '0640'
      loop: "{{ query('fileglob', 'templates/myapp/*.j2') }}"
      loop_control:
        label: "{{ item | basename }}"
      notify: restart myapp

    - name: Deploy additional config fragments
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: "/etc/myapp/conf.d/{{ item | basename }}"
        owner: appuser
        group: appuser
        mode: '0640'
      loop: "{{ query('fileglob', 'files/conf.d/*.conf') }}"
      loop_control:
        label: "{{ item | basename }}"
      notify: restart myapp

    - name: Deploy SSL certificates
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: "/etc/myapp/certs/{{ item | basename }}"
        owner: appuser
        group: appuser
        mode: '0600'
      loop: "{{ query('fileglob', 'files/certs/*.pem') }}"
      loop_control:
        label: "{{ item | basename }}"
      notify: restart myapp

    - name: Deploy management scripts
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: "/etc/myapp/scripts/{{ item | basename }}"
        owner: root
        group: root
        mode: '0755'
      loop: "{{ query('fileglob', 'files/scripts/*.sh') }}"
      loop_control:
        label: "{{ item | basename }}"

  handlers:
    - name: restart myapp
      ansible.builtin.systemd:
        name: myapp
        state: restarted
```

This playbook handles templates, static configs, certificates, and scripts all using fileglob patterns. Adding a new configuration file is as simple as dropping it into the right directory on the control node.

## Summary

The `fileglob` lookup (or `query('fileglob', ...)`) is the go-to tool for iterating over files on the Ansible control node. Use it to bulk-deploy configuration files, templates, scripts, and certificates. Remember that it searches the control node, not target hosts, and that it does not support recursive globbing. For clean output, always use `loop_control` with a `label` that shows just the `basename` of the file.
