# How to Set File Permissions with the Ansible file Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Linux, Security

Description: Master setting file and directory permissions using the Ansible file module with octal modes, symbolic modes, and special permission bits.

---

Getting file permissions right is a critical part of server security. Loose permissions on configuration files, SSL certificates, or application directories can lead to unauthorized access. The Ansible `file` module gives you a clean, repeatable way to enforce permissions across your entire infrastructure.

This post covers every aspect of setting permissions with the `file` module, from basic octal modes to special bits like setuid and sticky.

## Octal Mode Basics

The most common way to set permissions in Ansible is with octal (numeric) mode:

```yaml
# Set a file to 644 (owner read/write, group read, others read)
- name: Set standard file permissions
  ansible.builtin.file:
    path: /etc/myapp/config.yml
    mode: "0644"
```

Always quote the mode value as a string. This is important because without quotes, YAML treats `0644` as the integer `644` (dropping the leading zero), and Ansible would interpret that differently. Here is what goes wrong:

```yaml
# WRONG - YAML drops the leading zero, resulting in mode 644 (decimal)
- name: This will set wrong permissions
  ansible.builtin.file:
    path: /etc/myapp/config.yml
    mode: 0644  # Becomes integer 644, NOT octal 0644

# CORRECT - quoted string preserves the octal notation
- name: This sets the right permissions
  ansible.builtin.file:
    path: /etc/myapp/config.yml
    mode: "0644"
```

Here is a quick reference for common permission values:

```yaml
# Common permission patterns for reference
permission_examples:
  "0644": "Standard file (owner rw, group r, others r)"
  "0755": "Standard directory or executable (owner rwx, group rx, others rx)"
  "0600": "Private file (owner rw only)"
  "0700": "Private directory (owner rwx only)"
  "0750": "Group-accessible directory (owner rwx, group rx)"
  "0640": "Group-readable file (owner rw, group r)"
  "0444": "Read-only for everyone"
  "0400": "Read-only for owner only (SSH private keys)"
```

## Symbolic Mode

If you find octal modes hard to remember, you can use symbolic notation instead:

```yaml
# Set permissions using symbolic mode notation
- name: Set file permissions with symbolic mode
  ansible.builtin.file:
    path: /etc/myapp/config.yml
    mode: "u=rw,g=r,o=r"  # Same as 0644
```

The format is `[who]=[permissions]`, where:
- `u` = user (owner)
- `g` = group
- `o` = others
- `a` = all (user, group, and others)

You can also add or remove permissions incrementally:

```yaml
# Add execute permission for the owner without changing anything else
- name: Make a script executable by owner
  ansible.builtin.file:
    path: /opt/myapp/bin/start.sh
    mode: "u+x"

# Remove write permission from group and others
- name: Remove write permission from group and others
  ansible.builtin.file:
    path: /etc/myapp/app.conf
    mode: "g-w,o-w"

# Give group the same permissions as the owner
- name: Copy owner permissions to group
  ansible.builtin.file:
    path: /opt/shared/data
    state: directory
    mode: "g=u"
```

## Setting Permissions on Multiple Files

Use a loop to set permissions on multiple files at once:

```yaml
# Set different permissions on different files
- name: Set permissions on application files
  ansible.builtin.file:
    path: "{{ item.path }}"
    mode: "{{ item.mode }}"
  loop:
    - { path: "/etc/myapp/app.conf", mode: "0644" }
    - { path: "/etc/myapp/db.conf", mode: "0640" }
    - { path: "/etc/myapp/ssl.key", mode: "0600" }
    - { path: "/opt/myapp/bin/start.sh", mode: "0755" }
    - { path: "/opt/myapp/bin/healthcheck.sh", mode: "0755" }
  loop_control:
    label: "{{ item.path }} -> {{ item.mode }}"
```

## Recursive Permission Changes

The `file` module does not directly support recursive permission changes on existing directory trees. For that, you have two options:

### Option 1: Use the file module with recurse

```yaml
# Set permissions recursively on a directory and all its contents
- name: Set permissions on entire directory tree
  ansible.builtin.file:
    path: /opt/myapp
    state: directory
    owner: myapp
    group: myapp
    mode: "0755"
    recurse: true
```

The catch with `recurse` is that it applies the same mode to both files and directories. Since directories need the execute bit to be traversable, setting `0644` recursively would make subdirectories inaccessible. For different file and directory permissions, use the `find` and `file` modules together.

### Option 2: Separate permissions for files and directories

```yaml
# First, find all directories and set their permissions
- name: Find all directories under /opt/myapp
  ansible.builtin.find:
    paths: /opt/myapp
    file_type: directory
    recurse: true
  register: app_dirs

# Set directory permissions (need execute bit for traversal)
- name: Set directory permissions to 0755
  ansible.builtin.file:
    path: "{{ item.path }}"
    mode: "0755"
  loop: "{{ app_dirs.files }}"
  loop_control:
    label: "{{ item.path }}"

# Then find all regular files and set their permissions
- name: Find all files under /opt/myapp
  ansible.builtin.find:
    paths: /opt/myapp
    file_type: file
    recurse: true
  register: app_files

# Set file permissions (no execute bit for regular files)
- name: Set file permissions to 0644
  ansible.builtin.file:
    path: "{{ item.path }}"
    mode: "0644"
  loop: "{{ app_files.files }}"
  loop_control:
    label: "{{ item.path }}"
```

## Special Permission Bits

### Setuid (4000)

The setuid bit makes an executable run as the file owner regardless of who executes it:

```yaml
# Set the setuid bit on an executable
- name: Set setuid on custom binary
  ansible.builtin.file:
    path: /usr/local/bin/myapp-helper
    mode: "4755"
    owner: root
    group: root
```

### Setgid (2000)

The setgid bit on a directory causes new files created inside it to inherit the directory's group:

```yaml
# Set setgid on a shared directory so files inherit the group
- name: Create shared directory with setgid
  ansible.builtin.file:
    path: /opt/shared/team-data
    state: directory
    owner: root
    group: devteam
    mode: "2775"
```

### Sticky Bit (1000)

The sticky bit on a directory prevents users from deleting files they do not own:

```yaml
# Set sticky bit on a shared temp directory
- name: Create shared temp directory with sticky bit
  ansible.builtin.file:
    path: /opt/myapp/shared-tmp
    state: directory
    owner: root
    group: myapp
    mode: "1777"
```

You can also set these using symbolic notation:

```yaml
# Symbolic notation for special bits
- name: Set setgid using symbolic mode
  ansible.builtin.file:
    path: /opt/shared/team-data
    state: directory
    mode: "g+s"

- name: Set sticky bit using symbolic mode
  ansible.builtin.file:
    path: /opt/myapp/shared-tmp
    state: directory
    mode: "o+t"
```

## Practical Example: Securing a Web Application

Here is a complete example that sets up proper permissions for a web application:

```yaml
# secure-webapp-permissions.yml - full permission setup for a web app
---
- name: Set up secure permissions for web application
  hosts: web_servers
  become: true
  vars:
    app_user: www-data
    app_group: www-data

  tasks:
    # Application root directory
    - name: Set base directory permissions
      ansible.builtin.file:
        path: /var/www/myapp
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: "0755"

    # Configuration files should not be world-readable
    - name: Secure configuration files
      ansible.builtin.file:
        path: "{{ item }}"
        owner: root
        group: "{{ app_group }}"
        mode: "0640"
      loop:
        - /var/www/myapp/.env
        - /var/www/myapp/config/database.yml
        - /var/www/myapp/config/secrets.yml

    # SSL certificate and key files
    - name: Secure SSL private key
      ansible.builtin.file:
        path: /etc/ssl/private/myapp.key
        owner: root
        group: ssl-cert
        mode: "0640"

    - name: Set SSL certificate permissions
      ansible.builtin.file:
        path: /etc/ssl/certs/myapp.crt
        owner: root
        group: root
        mode: "0644"

    # Log directory needs to be writable by the app
    - name: Set log directory permissions
      ansible.builtin.file:
        path: /var/log/myapp
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: "0755"

    # Upload directory needs special handling
    - name: Set upload directory permissions
      ansible.builtin.file:
        path: /var/www/myapp/uploads
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: "0750"

    # Scripts need execute permission
    - name: Set execute permission on scripts
      ansible.builtin.file:
        path: "{{ item }}"
        mode: "0755"
      loop:
        - /var/www/myapp/bin/console
        - /var/www/myapp/bin/deploy.sh
        - /var/www/myapp/bin/healthcheck.sh
```

## Verifying Permissions After Setting Them

You can use the `stat` module to verify permissions were set correctly:

```yaml
# Verify permissions on a critical file
- name: Get file stats for the SSL key
  ansible.builtin.stat:
    path: /etc/ssl/private/myapp.key
  register: ssl_key_stat

- name: Verify SSL key permissions are correct
  ansible.builtin.assert:
    that:
      - ssl_key_stat.stat.mode == "0640"
      - ssl_key_stat.stat.pw_name == "root"
      - ssl_key_stat.stat.gr_name == "ssl-cert"
    fail_msg: "SSL key has incorrect permissions: {{ ssl_key_stat.stat.mode }}"
    success_msg: "SSL key permissions are correct"
```

## Summary

Setting file permissions with the Ansible `file` module is straightforward but has a few details that trip people up. Always quote octal mode values as strings, use symbolic modes when they are more readable, handle files and directories separately for recursive changes, and use special bits like setgid and sticky where shared directories need them. The key to good permission management is being explicit about every file and directory rather than relying on defaults.
