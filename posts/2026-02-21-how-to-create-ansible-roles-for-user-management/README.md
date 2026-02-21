# How to Create Ansible Roles for User Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, User Management, Security, SSH, Roles

Description: Build an Ansible role for managing system users, SSH keys, sudo access, and password policies consistently across all your servers.

---

User management is one of the first things that breaks when you scale from a handful of servers to dozens or hundreds. Someone joins the team and needs access to production. Someone leaves and their account needs to be disabled everywhere. SSH keys get rotated. Sudo privileges need to change. Doing this manually across many servers is slow and error-prone. An Ansible role centralizes all of it.

## What the Role Handles

This role manages:

- Creating and removing system users
- Group membership
- SSH authorized keys
- Sudo privileges
- Password policies
- Account locking and unlocking
- Home directory configuration
- Shell assignment

## Role Structure

```
roles/user_management/
  defaults/main.yml
  tasks/
    main.yml
    users.yml
    groups.yml
    sudo.yml
    ssh_keys.yml
    password_policy.yml
  templates/
    sudoers.j2
    sshd_config_snippet.j2
  handlers/main.yml
```

## Default Variables

```yaml
# roles/user_management/defaults/main.yml
# Users to manage
um_users: []
# Example:
#   - name: jsmith
#     fullname: "John Smith"
#     state: present
#     groups: [developers, docker]
#     shell: /bin/bash
#     ssh_keys:
#       - "ssh-ed25519 AAAAC3... jsmith@laptop"
#     sudo: true
#     sudo_nopasswd: false

# Users to remove (shorthand for state: absent)
um_removed_users: []
# Example: [former_employee1, former_employee2]

# Groups to create
um_groups: []
# Example:
#   - name: developers
#   - name: deployers

# Default shell for new users
um_default_shell: /bin/bash

# Password policy
um_password_max_days: 90
um_password_min_days: 7
um_password_warn_days: 14
um_password_policy_enabled: false

# SSH settings
um_ssh_key_exclusive: false
um_ssh_dir_mode: '0700'
um_authorized_keys_mode: '0600'

# Sudo settings
um_sudo_group: sudo
um_sudoers_dir: /etc/sudoers.d
um_sudoers_validate: true

# Home directory
um_create_home: true
um_home_base: /home
um_skeleton_dir: /etc/skel
```

## Group Management Tasks

```yaml
# roles/user_management/tasks/groups.yml
# Create groups before users so group membership works
- name: Create managed groups
  ansible.builtin.group:
    name: "{{ item.name }}"
    gid: "{{ item.gid | default(omit) }}"
    system: "{{ item.system | default(false) }}"
    state: present
  loop: "{{ um_groups }}"

- name: Ensure sudo group exists
  ansible.builtin.group:
    name: "{{ um_sudo_group }}"
    state: present
```

## User Management Tasks

```yaml
# roles/user_management/tasks/users.yml
# Create, update, and remove system users
- name: Create managed users
  ansible.builtin.user:
    name: "{{ item.name }}"
    comment: "{{ item.fullname | default(item.name) }}"
    shell: "{{ item.shell | default(um_default_shell) }}"
    groups: "{{ item.groups | default([]) | join(',') }}"
    append: yes
    create_home: "{{ um_create_home }}"
    home: "{{ item.home | default(um_home_base + '/' + item.name) }}"
    uid: "{{ item.uid | default(omit) }}"
    state: present
    password: "{{ item.password_hash | default('!') }}"
  loop: "{{ um_users | selectattr('state', 'undefined') | list +
            um_users | selectattr('state', 'defined') | selectattr('state', 'equalto', 'present') | list }}"
  no_log: true

- name: Remove users marked as absent
  ansible.builtin.user:
    name: "{{ item.name }}"
    state: absent
    remove: "{{ item.remove_home | default(false) }}"
  loop: "{{ um_users | selectattr('state', 'defined') | selectattr('state', 'equalto', 'absent') | list }}"

- name: Remove users from the removed list
  ansible.builtin.user:
    name: "{{ item }}"
    state: absent
    remove: false
  loop: "{{ um_removed_users }}"

- name: Lock removed user accounts (keep home dir intact)
  ansible.builtin.command:
    cmd: "usermod -L {{ item }}"
  loop: "{{ um_removed_users }}"
  changed_when: false
  failed_when: false
```

## SSH Key Management Tasks

```yaml
# roles/user_management/tasks/ssh_keys.yml
# Deploy SSH authorized keys for each user
- name: Deploy SSH authorized keys
  ansible.posix.authorized_key:
    user: "{{ item.0.name }}"
    key: "{{ item.1 }}"
    exclusive: "{{ um_ssh_key_exclusive }}"
    state: present
  loop: "{{ um_users | subelements('ssh_keys', skip_missing=True) }}"
  when:
    - item.0.state | default('present') == 'present'
    - item.0.ssh_keys is defined

- name: Set correct permissions on .ssh directories
  ansible.builtin.file:
    path: "{{ item.home | default(um_home_base + '/' + item.name) }}/.ssh"
    state: directory
    owner: "{{ item.name }}"
    group: "{{ item.name }}"
    mode: "{{ um_ssh_dir_mode }}"
  loop: "{{ um_users }}"
  when:
    - item.state | default('present') == 'present'
    - item.ssh_keys is defined
```

## Sudo Configuration Tasks

```yaml
# roles/user_management/tasks/sudo.yml
# Configure sudo access for users
- name: Ensure sudoers.d directory exists
  ansible.builtin.file:
    path: "{{ um_sudoers_dir }}"
    state: directory
    owner: root
    group: root
    mode: '0750'

- name: Deploy per-user sudoers files
  ansible.builtin.template:
    src: sudoers.j2
    dest: "{{ um_sudoers_dir }}/{{ item.name }}"
    owner: root
    group: root
    mode: '0440'
    validate: "{{ 'visudo -cf %s' if um_sudoers_validate else omit }}"
  loop: "{{ um_users | selectattr('sudo', 'defined') | selectattr('sudo', 'equalto', true) | list }}"

- name: Remove sudoers files for users without sudo
  ansible.builtin.file:
    path: "{{ um_sudoers_dir }}/{{ item.name }}"
    state: absent
  loop: "{{ um_users | selectattr('sudo', 'defined') | selectattr('sudo', 'equalto', false) | list +
            um_users | rejectattr('sudo', 'defined') | list }}"

- name: Remove sudoers files for removed users
  ansible.builtin.file:
    path: "{{ um_sudoers_dir }}/{{ item }}"
    state: absent
  loop: "{{ um_removed_users }}"
```

## Sudoers Template

```
# roles/user_management/templates/sudoers.j2
# Sudoers file for {{ item.name }} - managed by Ansible
{% if item.sudo_nopasswd | default(false) %}
{{ item.name }} ALL=(ALL) NOPASSWD: {{ item.sudo_commands | default('ALL') }}
{% else %}
{{ item.name }} ALL=(ALL) {{ item.sudo_commands | default('ALL') }}
{% endif %}
```

## Password Policy Tasks

```yaml
# roles/user_management/tasks/password_policy.yml
# Configure password aging policies
- name: Set password aging for managed users
  ansible.builtin.command:
    cmd: >
      chage
      --maxdays {{ um_password_max_days }}
      --mindays {{ um_password_min_days }}
      --warndays {{ um_password_warn_days }}
      {{ item.name }}
  loop: "{{ um_users }}"
  when:
    - item.state | default('present') == 'present'
    - um_password_policy_enabled
  changed_when: false

- name: Install libpam-pwquality for password complexity
  ansible.builtin.apt:
    name: libpam-pwquality
    state: present
  when: um_password_policy_enabled
```

## Main Task File

```yaml
# roles/user_management/tasks/main.yml
- name: Include group management
  ansible.builtin.include_tasks: groups.yml

- name: Include user management
  ansible.builtin.include_tasks: users.yml

- name: Include SSH key management
  ansible.builtin.include_tasks: ssh_keys.yml

- name: Include sudo configuration
  ansible.builtin.include_tasks: sudo.yml

- name: Include password policy
  ansible.builtin.include_tasks: password_policy.yml
  when: um_password_policy_enabled
```

## Using the Role

```yaml
# manage-users.yml
- hosts: all
  become: yes
  roles:
    - role: user_management
      vars:
        um_groups:
          - name: developers
          - name: deployers
          - name: monitoring

        um_users:
          - name: jsmith
            fullname: "John Smith"
            groups: [developers, docker]
            ssh_keys:
              - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBx... jsmith@work"
              - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICy... jsmith@home"
            sudo: true
            sudo_nopasswd: false

          - name: deploy_bot
            fullname: "Deployment Bot"
            groups: [deployers]
            shell: /bin/bash
            ssh_keys:
              - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDz... deploy@ci"
            sudo: true
            sudo_nopasswd: true
            sudo_commands: "/usr/bin/systemctl restart myapp, /usr/bin/systemctl status myapp"

          - name: monitor
            fullname: "Monitoring Agent"
            groups: [monitoring]
            shell: /usr/sbin/nologin
            sudo: false

          - name: former_employee
            state: absent
            remove_home: false

        um_removed_users:
          - intern_2024
          - contractor_bob

        um_password_policy_enabled: true
        um_password_max_days: 90
```

This role keeps user management centralized and auditable. Every change goes through version control. When someone joins the team, you add them to the variables file and run the playbook. When someone leaves, you move them to the removed list. SSH keys, sudo access, and group membership are all tracked in one place, which makes security audits straightforward.
