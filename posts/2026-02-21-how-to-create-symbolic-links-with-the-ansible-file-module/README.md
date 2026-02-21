# How to Create Symbolic Links with the Ansible file Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Linux, Symlinks

Description: Learn how to create, manage, and update symbolic links on remote hosts using the Ansible file module for deployments and configuration management.

---

Symbolic links are everywhere in Linux system administration. They are used for zero-downtime deployments, managing configuration file versions, pointing to the current release of an application, and sharing libraries between different paths. The Ansible `file` module with `state: link` makes it easy to create and manage symlinks across your infrastructure in a repeatable way.

This post covers how to create symlinks, update them atomically, handle common edge cases, and use them in real deployment scenarios.

## Basic Symlink Creation

Creating a symbolic link with Ansible requires two parameters: `src` (what the link points to) and `dest` or `path` (where the link is created):

```yaml
# Create a basic symbolic link
- name: Create symlink to current application release
  ansible.builtin.file:
    src: /opt/myapp/releases/v2.1.0
    dest: /opt/myapp/current
    state: link
```

After this task runs, `/opt/myapp/current` is a symlink that points to `/opt/myapp/releases/v2.1.0`. If the symlink already exists and points to the same target, Ansible reports "ok". If it points to a different target, Ansible updates it and reports "changed".

## Symlinks for Zero-Downtime Deployments

The most common use of symlinks in Ansible is the Capistrano-style deployment pattern. Each release gets its own directory, and a `current` symlink points to the active release:

```yaml
# deploy.yml - zero-downtime deployment using symlinks
---
- name: Deploy application
  hosts: app_servers
  become: true
  vars:
    app_name: mywebapp
    release_version: "v2.1.0"
    deploy_base: "/opt/{{ app_name }}"
    release_dir: "{{ deploy_base }}/releases/{{ release_version }}"

  tasks:
    # Create the release directory
    - name: Create release directory
      ansible.builtin.file:
        path: "{{ release_dir }}"
        state: directory
        owner: deploy
        group: deploy
        mode: "0755"

    # Deploy the application code (simplified - could be git, unarchive, etc.)
    - name: Extract application archive
      ansible.builtin.unarchive:
        src: "files/{{ app_name }}-{{ release_version }}.tar.gz"
        dest: "{{ release_dir }}"
        owner: deploy
        group: deploy

    # Link shared directories into the release
    - name: Link shared log directory
      ansible.builtin.file:
        src: "{{ deploy_base }}/shared/log"
        dest: "{{ release_dir }}/log"
        state: link
        owner: deploy
        group: deploy

    - name: Link shared config directory
      ansible.builtin.file:
        src: "{{ deploy_base }}/shared/config"
        dest: "{{ release_dir }}/config"
        state: link
        owner: deploy
        group: deploy

    # Atomically switch the current symlink to the new release
    - name: Update current symlink to new release
      ansible.builtin.file:
        src: "{{ release_dir }}"
        dest: "{{ deploy_base }}/current"
        state: link
        owner: deploy
        group: deploy

    # Restart the application after switching
    - name: Restart application
      ansible.builtin.systemd:
        name: "{{ app_name }}"
        state: restarted
```

The key here is that the symlink update is atomic at the filesystem level. The application either sees the old release or the new one, never a half-deployed state.

## Forcing Symlink Updates

If the destination path exists as a regular file or directory (not a symlink), Ansible will refuse to overwrite it by default. Use `force: true` to replace it:

```yaml
# Force creation of symlink even if a file or directory exists at the path
- name: Force symlink creation (replaces existing file/directory)
  ansible.builtin.file:
    src: /opt/myapp/releases/v2.1.0
    dest: /opt/myapp/current
    state: link
    force: true
```

Be careful with `force: true` because it will delete whatever is at the destination path. Only use it when you are sure the destination should always be a symlink.

## Setting Ownership on Symlinks

When you set `owner` and `group` on a symlink, Ansible changes the ownership of the symlink itself, not the target. On most Linux systems, symlink ownership does not matter much because permission checks follow through to the target. However, some security tools and policies check symlink ownership:

```yaml
# Set ownership on the symlink itself
- name: Create symlink with explicit ownership
  ansible.builtin.file:
    src: /opt/myapp/releases/v2.1.0
    dest: /opt/myapp/current
    state: link
    owner: deploy
    group: deploy
```

Note that you cannot set permissions (mode) on symlinks in Linux. Symlinks always have mode `0777` (lrwxrwxrwx). The actual access control is determined by the target file's permissions.

## Creating Multiple Symlinks with a Loop

When you need to create several symlinks, a loop keeps things tidy:

```yaml
# Create multiple configuration symlinks
- name: Create configuration symlinks
  ansible.builtin.file:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
    state: link
  loop:
    - src: /opt/myapp/shared/config/database.yml
      dest: /opt/myapp/current/config/database.yml
    - src: /opt/myapp/shared/config/secrets.yml
      dest: /opt/myapp/current/config/secrets.yml
    - src: /opt/myapp/shared/config/redis.yml
      dest: /opt/myapp/current/config/redis.yml
    - src: /opt/myapp/shared/.env
      dest: /opt/myapp/current/.env
  loop_control:
    label: "{{ item.dest }} -> {{ item.src }}"
```

## Symlinks for Configuration Management

A common pattern is to have multiple versions of a configuration file and use a symlink to select the active one:

```yaml
# Manage Nginx site configuration with symlinks
- name: Deploy Nginx site configuration
  ansible.builtin.template:
    src: nginx-site.conf.j2
    dest: /etc/nginx/sites-available/myapp.conf
    owner: root
    group: root
    mode: "0644"

# Enable the site by creating a symlink in sites-enabled
- name: Enable Nginx site
  ansible.builtin.file:
    src: /etc/nginx/sites-available/myapp.conf
    dest: /etc/nginx/sites-enabled/myapp.conf
    state: link
  notify: Reload Nginx
```

To disable a site, just change the state to absent:

```yaml
# Disable a site by removing the symlink
- name: Disable default Nginx site
  ansible.builtin.file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: Reload Nginx
```

## Handling Relative vs Absolute Symlinks

By default, Ansible creates absolute symlinks (the `src` path is stored as-is). Sometimes you need relative symlinks, especially when the filesystem might be mounted at different locations:

```yaml
# Create a relative symlink manually
# If /opt/myapp/current should point to releases/v2.1.0 (relative)
- name: Create relative symlink
  ansible.builtin.file:
    src: releases/v2.1.0
    dest: /opt/myapp/current
    state: link
```

When the `src` does not start with `/`, Ansible treats it as a relative path from the symlink's parent directory. In this case, `/opt/myapp/current` points to `releases/v2.1.0`, which resolves to `/opt/myapp/releases/v2.1.0`.

## Symlink to the Latest Version Using Variables

You can dynamically determine the symlink target using registered variables:

```yaml
# Find the latest release directory and symlink to it
- name: List release directories
  ansible.builtin.find:
    paths: /opt/myapp/releases
    file_type: directory
  register: release_dirs

- name: Determine latest release
  ansible.builtin.set_fact:
    latest_release: "{{ release_dirs.files | sort(attribute='mtime') | last }}"

- name: Symlink current to latest release
  ansible.builtin.file:
    src: "{{ latest_release.path }}"
    dest: /opt/myapp/current
    state: link
    owner: deploy
    group: deploy
```

## Rollback by Changing the Symlink

Rolling back a deployment is as simple as pointing the symlink to a previous release:

```yaml
# rollback.yml - point current to the previous release
---
- name: Rollback to previous release
  hosts: app_servers
  become: true
  vars:
    rollback_version: "v2.0.0"

  tasks:
    - name: Point current symlink to rollback version
      ansible.builtin.file:
        src: "/opt/myapp/releases/{{ rollback_version }}"
        dest: /opt/myapp/current
        state: link
        owner: deploy
        group: deploy

    - name: Restart application after rollback
      ansible.builtin.systemd:
        name: mywebapp
        state: restarted
```

## Cleaning Up Old Symlink Targets

After several deployments, you will want to clean up old releases. Here is a task that keeps only the last N releases:

```yaml
# Keep only the 5 most recent release directories
- name: List all release directories
  ansible.builtin.find:
    paths: /opt/myapp/releases
    file_type: directory
  register: all_releases

- name: Identify old releases to remove
  ansible.builtin.set_fact:
    old_releases: "{{ all_releases.files | sort(attribute='mtime') | map(attribute='path') | list | reverse | list | slice(5) | last | default([]) }}"

- name: Remove old release directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: absent
  loop: "{{ old_releases }}"
  loop_control:
    label: "Removing {{ item }}"
```

## Verifying Symlinks

Check that a symlink exists and points to the right target:

```yaml
# Verify a symlink points to the expected target
- name: Check current symlink
  ansible.builtin.stat:
    path: /opt/myapp/current
  register: current_link

- name: Assert symlink is correct
  ansible.builtin.assert:
    that:
      - current_link.stat.islnk
      - current_link.stat.lnk_target == "/opt/myapp/releases/v2.1.0"
    fail_msg: "Current symlink is broken or points to wrong target"
    success_msg: "Current symlink is correct"
```

## Summary

Symbolic links managed through the Ansible `file` module are a powerful tool for deployments, configuration management, and system administration. The key points are: use `state: link` with `src` and `dest` to create symlinks, use `force: true` when you need to replace existing files or directories, prefer absolute paths unless you have a specific reason for relative ones, and combine symlinks with the Capistrano-style release pattern for zero-downtime deployments. The idempotent nature of Ansible means you can run these tasks repeatedly without worrying about broken links or duplicate entries.
