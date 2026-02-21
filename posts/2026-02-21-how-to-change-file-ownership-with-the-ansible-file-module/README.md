# How to Change File Ownership with the Ansible file Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Linux, Security

Description: Learn how to change file and directory ownership on remote hosts using the Ansible file module including recursive ownership changes and common patterns.

---

File ownership is a fundamental part of Linux security. Every file and directory has an owner and a group, and these determine who can read, write, or execute it. When deploying applications with Ansible, getting ownership right ensures that your services can access the files they need while keeping unauthorized users out.

The Ansible `file` module handles ownership changes through the `owner` and `group` parameters. This post covers how to use them effectively, from basic single-file changes to recursive ownership updates across entire directory trees.

## Basic Ownership Change

Changing the owner and group of a file is straightforward:

```yaml
# Change ownership of a single file
- name: Set ownership on application config
  ansible.builtin.file:
    path: /etc/myapp/config.yml
    owner: myapp
    group: myapp
```

This changes both the owner and the group. You can also change just one:

```yaml
# Change only the owner, leave the group unchanged
- name: Change file owner
  ansible.builtin.file:
    path: /etc/myapp/config.yml
    owner: myapp

# Change only the group, leave the owner unchanged
- name: Change file group
  ansible.builtin.file:
    path: /etc/myapp/config.yml
    group: devops
```

## Using Numeric IDs

You can use numeric user and group IDs instead of names. This is useful when the user or group name might differ across systems but the ID stays the same:

```yaml
# Use numeric UID and GID for ownership
- name: Set ownership using numeric IDs
  ansible.builtin.file:
    path: /opt/myapp/data
    state: directory
    owner: "1001"
    group: "1001"
```

This is particularly common in containerized environments where the user inside the container has a specific UID that might not have a name on the host system.

## Changing Ownership with Permissions

You often want to set ownership and permissions together:

```yaml
# Set ownership and permissions in one task
- name: Configure application secrets file
  ansible.builtin.file:
    path: /etc/myapp/secrets.yml
    owner: root
    group: myapp
    mode: "0640"
```

This gives root full read/write access, the myapp group read access, and everyone else no access. Combining ownership and mode in a single task is both cleaner and more efficient than splitting them into separate tasks.

## Recursive Ownership Changes

To change ownership on an entire directory tree, use the `recurse` parameter:

```yaml
# Change ownership recursively on a directory and all contents
- name: Set ownership on entire application directory
  ansible.builtin.file:
    path: /opt/myapp
    state: directory
    owner: myapp
    group: myapp
    recurse: true
```

This is the equivalent of running `chown -R myapp:myapp /opt/myapp`. Every file and subdirectory within `/opt/myapp` will have its ownership changed.

Be aware that `recurse` can be slow on directories with many files. If you have a directory with thousands of files and only need to change ownership on a few, it is faster to target specific paths.

## Changing Ownership on Multiple Files

Use a loop to change ownership on specific files:

```yaml
# Set ownership on multiple specific files
- name: Set ownership on application binaries
  ansible.builtin.file:
    path: "{{ item }}"
    owner: root
    group: root
    mode: "0755"
  loop:
    - /usr/local/bin/myapp
    - /usr/local/bin/myapp-cli
    - /usr/local/bin/myapp-worker
```

For files that need different ownership, use a list of dictionaries:

```yaml
# Set different ownership on different files
- name: Set file-specific ownership
  ansible.builtin.file:
    path: "{{ item.path }}"
    owner: "{{ item.owner }}"
    group: "{{ item.group }}"
    mode: "{{ item.mode }}"
  loop:
    - { path: "/etc/myapp/app.conf", owner: "root", group: "myapp", mode: "0640" }
    - { path: "/var/log/myapp", owner: "myapp", group: "myapp", mode: "0755" }
    - { path: "/var/run/myapp", owner: "myapp", group: "myapp", mode: "0755" }
    - { path: "/opt/myapp/data", owner: "myapp", group: "myapp", mode: "0700" }
  loop_control:
    label: "{{ item.path }}"
```

## Handling the User and Group Creation

Before changing ownership to a user or group, they need to exist on the target system. A common pattern is to create them first:

```yaml
# Ensure the user and group exist before setting ownership
- name: Create application group
  ansible.builtin.group:
    name: myapp
    gid: 1500
    state: present

- name: Create application user
  ansible.builtin.user:
    name: myapp
    uid: 1500
    group: myapp
    shell: /usr/sbin/nologin
    home: /opt/myapp
    create_home: false
    system: true

# Now safe to set ownership
- name: Set ownership on application directory
  ansible.builtin.file:
    path: /opt/myapp
    state: directory
    owner: myapp
    group: myapp
    mode: "0755"
    recurse: true
```

## Practical Example: Web Application Ownership Model

Here is a complete example showing a realistic ownership setup for a web application:

```yaml
# setup-ownership.yml - comprehensive ownership configuration
---
- name: Configure file ownership for web application
  hosts: web_servers
  become: true
  vars:
    app_user: webapp
    app_group: webapp
    web_group: www-data

  tasks:
    # Create the application user and add it to the web group
    - name: Create application group
      ansible.builtin.group:
        name: "{{ app_group }}"
        state: present

    - name: Create application user
      ansible.builtin.user:
        name: "{{ app_user }}"
        group: "{{ app_group }}"
        groups: "{{ web_group }}"
        append: true
        shell: /usr/sbin/nologin
        system: true

    # Application code is owned by root but readable by the app group
    - name: Set ownership on application code
      ansible.builtin.file:
        path: /opt/webapp/current
        state: directory
        owner: root
        group: "{{ app_group }}"
        mode: "0755"
        recurse: true

    # Config files: root owns them, app group can read
    - name: Set ownership on config files
      ansible.builtin.file:
        path: "{{ item }}"
        owner: root
        group: "{{ app_group }}"
        mode: "0640"
      loop:
        - /etc/webapp/database.yml
        - /etc/webapp/application.yml
        - /etc/webapp/secrets.yml

    # Data directories: app user owns them
    - name: Set ownership on writable directories
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: "0755"
      loop:
        - /var/lib/webapp
        - /var/lib/webapp/uploads
        - /var/lib/webapp/cache
        - /var/log/webapp
        - /var/run/webapp

    # Uploaded files should only be accessible by the app
    - name: Lock down uploads directory
      ansible.builtin.file:
        path: /var/lib/webapp/uploads
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: "0750"

    # SSL certificates: root owns, web group can read the cert, only root reads the key
    - name: Set ownership on SSL certificate
      ansible.builtin.file:
        path: /etc/ssl/certs/webapp.crt
        owner: root
        group: "{{ web_group }}"
        mode: "0644"

    - name: Set ownership on SSL private key
      ansible.builtin.file:
        path: /etc/ssl/private/webapp.key
        owner: root
        group: "{{ web_group }}"
        mode: "0640"
```

## Mixed Ownership with Setgid

When multiple users need to write to the same directory, use setgid to ensure all new files inherit the directory's group:

```yaml
# Set up a shared directory with setgid for team collaboration
- name: Create shared project directory
  ansible.builtin.file:
    path: /opt/shared/project
    state: directory
    owner: root
    group: devteam
    mode: "2775"

# Files created in this directory will automatically have group 'devteam'
```

The `2` in `2775` is the setgid bit. Without it, new files would get the creating user's primary group, which might not be what you want.

## Checking Current Ownership

To verify ownership before or after changes, use the `stat` module:

```yaml
# Check current ownership of a file
- name: Get file ownership information
  ansible.builtin.stat:
    path: /etc/myapp/config.yml
  register: config_stat

- name: Display current ownership
  ansible.builtin.debug:
    msg: "Owner: {{ config_stat.stat.pw_name }}, Group: {{ config_stat.stat.gr_name }}, Mode: {{ config_stat.stat.mode }}"

# Assert ownership is correct
- name: Verify ownership is correct
  ansible.builtin.assert:
    that:
      - config_stat.stat.pw_name == "root"
      - config_stat.stat.gr_name == "myapp"
    fail_msg: "File ownership is incorrect"
```

## Fixing Ownership After Extraction

When extracting archives, files often end up with the wrong ownership:

```yaml
# Extract an archive and fix ownership afterward
- name: Extract application archive
  ansible.builtin.unarchive:
    src: myapp-v2.0.tar.gz
    dest: /opt/myapp/releases/v2.0
    remote_src: false

# The extracted files likely have the wrong owner
- name: Fix ownership after extraction
  ansible.builtin.file:
    path: /opt/myapp/releases/v2.0
    state: directory
    owner: myapp
    group: myapp
    recurse: true
```

Some modules like `unarchive` have their own `owner` and `group` parameters that set ownership during extraction. Using those is more efficient than a separate recursive change:

```yaml
# Set ownership during extraction (more efficient)
- name: Extract and set ownership in one step
  ansible.builtin.unarchive:
    src: myapp-v2.0.tar.gz
    dest: /opt/myapp/releases/v2.0
    owner: myapp
    group: myapp
    remote_src: false
```

## Ownership on Symlinks

When changing ownership on a symlink, Ansible changes the ownership of the symlink itself, not the target:

```yaml
# Change ownership of a symlink (not its target)
- name: Set symlink ownership
  ansible.builtin.file:
    path: /opt/myapp/current
    state: link
    src: /opt/myapp/releases/v2.0
    owner: myapp
    group: myapp
```

On Linux, symlink ownership rarely matters because the kernel follows through to the target for permission checks. But on some systems with strict security policies, symlink ownership can be relevant.

## Summary

Changing file ownership with the Ansible `file` module is essential for any deployment automation. The key practices are: always ensure users and groups exist before setting ownership, use `recurse: true` for directory trees but be mindful of performance on large directories, combine ownership and permissions in the same task for clarity, use setgid on shared directories so new files inherit the correct group, and verify ownership after operations like archive extraction that can leave files with unexpected owners. Getting ownership right from the start prevents permission-related issues that are often hard to debug in production.
