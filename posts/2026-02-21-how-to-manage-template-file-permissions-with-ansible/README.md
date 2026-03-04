# How to Manage Template File Permissions with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Templates, File Permissions, Security, Configuration Management

Description: Learn how to set correct file ownership and permissions when deploying templates with Ansible for secure configuration management.

---

File permissions on configuration files are a critical security concern. A database config with world-readable credentials, a private key with overly permissive access, or an executable script owned by the wrong user can create serious vulnerabilities. The Ansible template module includes parameters for setting ownership, permissions, and SELinux context as part of the deployment, ensuring that files land on disk with the correct access controls from the start.

## Basic Permission Parameters

The template module supports the same permission parameters as the file and copy modules:

```yaml
# Set owner, group, and mode when deploying a template
- name: Deploy application config with strict permissions
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
    owner: appuser
    group: appgroup
    mode: '0640'
```

This creates the file owned by `appuser`, with group `appgroup`, and mode `0640` (owner read/write, group read, others no access).

## Understanding Mode Values

Mode values in Ansible follow Unix permission conventions. Always use quoted strings for octal notation to avoid YAML parsing issues:

```yaml
# Always quote mode values to ensure correct interpretation
- name: Examples of common permission modes
  ansible.builtin.template:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
    mode: "{{ item.mode }}"
  loop:
    # Configuration files (read by owner and group)
    - src: app.conf.j2
      dest: /etc/myapp/app.conf
      mode: '0640'

    # Public config (readable by all)
    - src: public.conf.j2
      dest: /etc/myapp/public.conf
      mode: '0644'

    # Sensitive config with credentials
    - src: secrets.conf.j2
      dest: /etc/myapp/secrets.conf
      mode: '0600'

    # Executable script
    - src: start.sh.j2
      dest: /opt/myapp/bin/start.sh
      mode: '0755'

    # Executable for owner only
    - src: admin_tool.sh.j2
      dest: /opt/myapp/bin/admin_tool.sh
      mode: '0700'
```

A quick reference for common modes:

| Mode | Meaning |
|------|---------|
| 0644 | Owner rw, group r, others r |
| 0640 | Owner rw, group r, others none |
| 0600 | Owner rw only |
| 0755 | Owner rwx, group rx, others rx |
| 0750 | Owner rwx, group rx, others none |
| 0700 | Owner rwx only |
| 0440 | Owner r, group r (sudoers style) |
| 0400 | Owner r only (private keys) |

## Why Quoting Mode Matters

This is a common gotcha. YAML interprets unquoted numbers starting with 0 as octal:

```yaml
# WRONG - YAML may misinterpret unquoted mode values
- name: Bad practice (don't do this)
  ansible.builtin.template:
    src: config.j2
    dest: /etc/config
    mode: 0644   # YAML interprets this as decimal 420, not octal 0644

# CORRECT - Always quote mode values
- name: Good practice
  ansible.builtin.template:
    src: config.j2
    dest: /etc/config
    mode: '0644'  # String "0644" is interpreted as octal correctly
```

Some YAML versions handle this differently, but quoting is always safe and should be your default habit.

## Symbolic Mode

You can also use symbolic notation instead of octal:

```yaml
# Symbolic mode notation
- name: Deploy with symbolic permissions
  ansible.builtin.template:
    src: script.sh.j2
    dest: /opt/myapp/bin/script.sh
    mode: 'u=rwx,g=rx,o=rx'  # Same as 0755

- name: Deploy restricted config
  ansible.builtin.template:
    src: secrets.conf.j2
    dest: /etc/myapp/secrets.conf
    mode: 'u=rw,g=,o='  # Same as 0600
```

## Practical Example: Deploying a Complete Application

Here is a real-world example deploying multiple files with appropriate permissions for each:

```yaml
# Deploy a complete application with proper file permissions
- name: Create application directories
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "{{ item.mode }}"
  loop:
    - path: /opt/myapp
      mode: '0755'
    - path: /opt/myapp/bin
      mode: '0755'
    - path: /opt/myapp/config
      mode: '0750'
    - path: /opt/myapp/logs
      mode: '0750'
    - path: /opt/myapp/data
      mode: '0700'

- name: Deploy executable scripts
  ansible.builtin.template:
    src: "templates/bin/{{ item }}.j2"
    dest: "/opt/myapp/bin/{{ item }}"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'
  loop:
    - start.sh
    - stop.sh
    - health_check.sh

- name: Deploy application configuration
  ansible.builtin.template:
    src: templates/config/app.yml.j2
    dest: /opt/myapp/config/app.yml
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0640'

- name: Deploy credentials file
  ansible.builtin.template:
    src: templates/config/credentials.yml.j2
    dest: /opt/myapp/config/credentials.yml
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'

- name: Deploy logrotate configuration
  ansible.builtin.template:
    src: templates/logrotate.j2
    dest: /etc/logrotate.d/myapp
    owner: root
    group: root
    mode: '0644'

- name: Deploy systemd service file
  ansible.builtin.template:
    src: templates/myapp.service.j2
    dest: /etc/systemd/system/myapp.service
    owner: root
    group: root
    mode: '0644'
  notify: daemon reload
```

## SSL/TLS Certificate and Key Files

Certificate files have specific permission requirements:

```yaml
# Deploy SSL certificates with proper permissions
- name: Deploy SSL certificate (public)
  ansible.builtin.template:
    src: templates/ssl/cert.pem.j2
    dest: /etc/ssl/certs/myapp.pem
    owner: root
    group: root
    mode: '0644'  # Certificates are public

- name: Deploy SSL private key (restricted)
  ansible.builtin.template:
    src: templates/ssl/key.pem.j2
    dest: /etc/ssl/private/myapp.key
    owner: root
    group: ssl-cert
    mode: '0640'  # Private key must be restricted

- name: Deploy SSL certificate chain
  ansible.builtin.template:
    src: templates/ssl/chain.pem.j2
    dest: /etc/ssl/certs/myapp-chain.pem
    owner: root
    group: root
    mode: '0644'
```

## Database Configuration with Credentials

```yaml
# Database config with sensitive credentials needs strict permissions
- name: Deploy database config
  ansible.builtin.template:
    src: database.yml.j2
    dest: /opt/myapp/config/database.yml
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
```

```jinja2
{# templates/database.yml.j2 - Contains sensitive credentials #}
# Database Configuration - Managed by Ansible
# PERMISSIONS: This file should be 0600, owned by {{ app_user }}

production:
  adapter: postgresql
  host: {{ db_host }}
  port: {{ db_port | default(5432) }}
  database: {{ db_name }}
  username: {{ db_username }}
  password: {{ db_password }}
  pool: {{ db_pool_size | default(25) }}
  timeout: {{ db_timeout | default(5000) }}
```

## Sudoers Drop-in Files

Sudoers files have very specific permission requirements. The wrong permissions cause sudo to refuse the file:

```yaml
# Sudoers files MUST be 0440 owned by root:root
- name: Deploy sudoers drop-in
  ansible.builtin.template:
    src: sudoers_appuser.j2
    dest: /etc/sudoers.d/myapp
    owner: root
    group: root
    mode: '0440'
    validate: 'visudo -cf %s'
```

If the permissions are wrong, sudo will silently ignore the file. This is a security feature of sudo, but it can cause confusing debugging sessions.

## SSH Configuration Files

```yaml
# SSH config files have strict permission requirements
- name: Deploy SSH authorized keys
  ansible.builtin.template:
    src: authorized_keys.j2
    dest: "/home/{{ item.name }}/.ssh/authorized_keys"
    owner: "{{ item.name }}"
    group: "{{ item.name }}"
    mode: '0600'  # SSH requires this to be 0600
  loop: "{{ ssh_users }}"

- name: Deploy SSH config
  ansible.builtin.template:
    src: ssh_config.j2
    dest: "/home/{{ item.name }}/.ssh/config"
    owner: "{{ item.name }}"
    group: "{{ item.name }}"
    mode: '0600'
  loop: "{{ ssh_users }}"
```

SSH is particularly strict about permissions. If `~/.ssh/authorized_keys` is not owned by the user or has permissions more permissive than `0600`, SSH will refuse to use it.

## Using Variables for Permission Consistency

Define permissions in variables for consistency across roles:

```yaml
# defaults/main.yml - Centralized permission definitions
app_file_permissions:
  config:
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0640'
  secrets:
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
  scripts:
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'
  system:
    owner: root
    group: root
    mode: '0644'
```

```yaml
# tasks/main.yml - Use centralized permissions
- name: Deploy config files
  ansible.builtin.template:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
    owner: "{{ app_file_permissions[item.type].owner }}"
    group: "{{ app_file_permissions[item.type].group }}"
    mode: "{{ app_file_permissions[item.type].mode }}"
  loop:
    - src: app.conf.j2
      dest: /etc/myapp/app.conf
      type: config
    - src: credentials.conf.j2
      dest: /etc/myapp/credentials.conf
      type: secrets
    - src: startup.sh.j2
      dest: /opt/myapp/bin/startup.sh
      type: scripts
```

## SELinux Context

On systems with SELinux, you may need to set the security context:

```yaml
# Set SELinux context for web-accessible content
- name: Deploy web config with SELinux context
  ansible.builtin.template:
    src: httpd.conf.j2
    dest: /etc/httpd/conf/httpd.conf
    owner: root
    group: root
    mode: '0644'
    setype: httpd_config_t

- name: Deploy web content
  ansible.builtin.template:
    src: index.html.j2
    dest: /var/www/html/index.html
    owner: root
    group: root
    mode: '0644'
    setype: httpd_sys_content_t
```

## Verifying Permissions After Deployment

Add verification tasks to catch permission issues:

```yaml
# Verify critical file permissions after deployment
- name: Check critical file permissions
  ansible.builtin.stat:
    path: "{{ item.path }}"
  register: perm_check
  loop:
    - path: /etc/myapp/credentials.conf
      expected_mode: '0600'
    - path: /etc/sudoers.d/myapp
      expected_mode: '0440'
    - path: /etc/ssh/sshd_config
      expected_mode: '0600'

- name: Assert correct permissions
  ansible.builtin.assert:
    that:
      - item.stat.mode == item.item.expected_mode
    fail_msg: >
      SECURITY: {{ item.item.path }} has mode {{ item.stat.mode }}
      but expected {{ item.item.expected_mode }}
  loop: "{{ perm_check.results }}"
  loop_control:
    label: "{{ item.item.path }}"
```

## Summary

File permissions are not an afterthought; they are a core part of configuration deployment. Always specify `owner`, `group`, and `mode` on every template task, especially for files containing credentials (`0600`), system configs (`0644`), executable scripts (`0755`), sudoers files (`0440`), and SSH keys (`0600`). Quote mode values to prevent YAML parsing issues, use variables for consistent permission definitions across your roles, and add verification tasks for critical files. Getting permissions right during deployment is far easier than fixing them after a security audit finds the problems.
