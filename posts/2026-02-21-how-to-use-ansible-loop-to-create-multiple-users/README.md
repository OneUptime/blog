# How to Use Ansible loop to Create Multiple Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, User Management, Loops, Linux Administration

Description: Learn how to use Ansible loops to create and manage multiple user accounts with SSH keys, groups, and permissions in a single playbook.

---

User account management is one of the most common tasks in system administration, and it is one where Ansible loops really shine. Instead of writing a separate task for each user, you define all your users in a data structure and let a single looping task handle everything. This approach scales from 3 users to 300 users with zero additional tasks.

## Simple User Creation

The simplest approach is looping over a list of usernames:

```yaml
# Create basic user accounts from a simple list
- name: Create user accounts
  ansible.builtin.user:
    name: "{{ item }}"
    state: present
    shell: /bin/bash
  loop:
    - alice
    - bob
    - charlie
    - deploy
    - monitoring
```

This creates five users with default settings. But in practice, users need different configurations.

## Users with Custom Properties

Use a list of dictionaries to set per-user properties:

```yaml
# Create users with individualized settings
- name: Create application users
  ansible.builtin.user:
    name: "{{ item.name }}"
    uid: "{{ item.uid | default(omit) }}"
    comment: "{{ item.comment | default('') }}"
    shell: "{{ item.shell | default('/bin/bash') }}"
    home: "{{ item.home | default('/home/' + item.name) }}"
    create_home: "{{ item.create_home | default(true) }}"
    system: "{{ item.system | default(false) }}"
    state: present
  loop:
    - name: deploy
      uid: 1100
      comment: "Deployment user"
      shell: /bin/bash
    - name: appuser
      uid: 1101
      comment: "Application runtime user"
      shell: /usr/sbin/nologin
    - name: monitoring
      uid: 1102
      comment: "Monitoring agent"
      shell: /usr/sbin/nologin
      system: true
    - name: backup
      uid: 1103
      comment: "Backup service account"
      shell: /bin/bash
  loop_control:
    label: "{{ item.name }}"
```

The `default(omit)` pattern is important. When `omit` is used as a parameter value, Ansible skips that parameter entirely, letting the module use its own default. This means you only need to specify attributes that differ from defaults.

## Adding Users to Groups

```yaml
# Create users and add them to their respective groups
- name: Ensure required groups exist
  ansible.builtin.group:
    name: "{{ item }}"
    state: present
  loop:
    - docker
    - sudo
    - developers
    - operations
    - monitoring

- name: Create users with group memberships
  ansible.builtin.user:
    name: "{{ item.name }}"
    groups: "{{ item.groups | join(',') }}"
    append: yes
    state: present
  loop:
    - { name: "alice", groups: ["sudo", "docker", "developers"] }
    - { name: "bob", groups: ["docker", "developers"] }
    - { name: "charlie", groups: ["sudo", "operations"] }
    - { name: "deploy", groups: ["docker"] }
    - { name: "nagios", groups: ["monitoring"] }
  loop_control:
    label: "{{ item.name }} -> {{ item.groups | join(', ') }}"
```

The `append: yes` parameter is critical. Without it, the user would be removed from any groups not listed, which could break existing configurations.

## Managing SSH Authorized Keys

Use `subelements` to deploy SSH keys for users who may have multiple keys:

```yaml
# Deploy SSH authorized keys for each user
- name: User management with SSH keys
  hosts: all
  become: yes
  vars:
    managed_users:
      - name: alice
        ssh_keys:
          - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... alice@laptop"
          - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... alice@desktop"
      - name: bob
        ssh_keys:
          - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... bob@workstation"
      - name: deploy
        ssh_keys:
          - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... deploy@ci-server"
          - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... deploy@admin-box"
          - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... deploy@bastion"

  tasks:
    - name: Create user accounts
      ansible.builtin.user:
        name: "{{ item.name }}"
        state: present
        shell: /bin/bash
      loop: "{{ managed_users }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Deploy SSH authorized keys
      ansible.posix.authorized_key:
        user: "{{ item.0.name }}"
        key: "{{ item.1 }}"
        state: present
      loop: "{{ managed_users | subelements('ssh_keys') }}"
      loop_control:
        label: "{{ item.0.name }}"
```

## Setting Passwords

For password management, use the `password_hash` filter:

```yaml
# Set user passwords using hashed values
- name: Create users with passwords
  ansible.builtin.user:
    name: "{{ item.name }}"
    password: "{{ item.password | password_hash('sha512', item.salt | default('randomsalt')) }}"
    update_password: on_create
    state: present
  loop:
    - { name: "developer1", password: "{{ vault_dev1_password }}" }
    - { name: "developer2", password: "{{ vault_dev2_password }}" }
    - { name: "qa1", password: "{{ vault_qa1_password }}" }
  loop_control:
    label: "{{ item.name }}"
  no_log: true
```

Important details here:

- `password_hash('sha512')` hashes the password properly for `/etc/shadow`
- `update_password: on_create` only sets the password when the user is first created, not on every playbook run
- `no_log: true` prevents passwords from appearing in the Ansible output

## Removing Users

To remove users who should no longer have access:

```yaml
# Remove departed user accounts
- name: Remove old user accounts
  ansible.builtin.user:
    name: "{{ item }}"
    state: absent
    remove: yes
  loop:
    - former_employee1
    - former_contractor
    - temp_user
```

The `remove: yes` parameter also deletes the user's home directory.

## Complete User Management from Variables

Here is a production-ready pattern using variables files:

```yaml
# vars/users.yml
user_definitions:
  active_users:
    - name: alice
      uid: 1001
      comment: "Alice Smith - DevOps Lead"
      groups: [sudo, docker, developers]
      shell: /bin/bash
      ssh_keys:
        - "ssh-ed25519 AAAAC3... alice@laptop"
    - name: bob
      uid: 1002
      comment: "Bob Jones - Backend Developer"
      groups: [docker, developers]
      shell: /bin/bash
      ssh_keys:
        - "ssh-ed25519 AAAAC3... bob@workstation"
    - name: charlie
      uid: 1003
      comment: "Charlie Wilson - SRE"
      groups: [sudo, docker, operations]
      shell: /bin/bash
      ssh_keys:
        - "ssh-ed25519 AAAAC3... charlie@laptop"
        - "ssh-ed25519 AAAAC3... charlie@tablet"

  service_accounts:
    - name: deploy
      uid: 1100
      comment: "Deployment Service"
      groups: [docker]
      shell: /bin/bash
      system: false
      ssh_keys:
        - "ssh-ed25519 AAAAC3... ci-server"
    - name: monitoring
      uid: 1101
      comment: "Monitoring Agent"
      groups: [monitoring]
      shell: /usr/sbin/nologin
      system: true
      ssh_keys: []

  removed_users:
    - former_admin
    - temp_contractor
    - old_deploy
```

And the playbook:

```yaml
# Complete user management playbook
- name: Manage all user accounts
  hosts: all
  become: yes
  vars_files:
    - vars/users.yml

  vars:
    all_active_users: "{{ user_definitions.active_users + user_definitions.service_accounts }}"

  tasks:
    - name: Ensure required groups exist
      ansible.builtin.group:
        name: "{{ item }}"
        state: present
      loop: "{{ all_active_users | map(attribute='groups') | flatten | unique | list }}"

    - name: Create active user accounts
      ansible.builtin.user:
        name: "{{ item.name }}"
        uid: "{{ item.uid }}"
        comment: "{{ item.comment }}"
        groups: "{{ item.groups | join(',') }}"
        shell: "{{ item.shell }}"
        system: "{{ item.system | default(false) }}"
        append: yes
        state: present
      loop: "{{ all_active_users }}"
      loop_control:
        label: "{{ item.name }} (uid={{ item.uid }})"

    - name: Deploy SSH authorized keys
      ansible.posix.authorized_key:
        user: "{{ item.0.name }}"
        key: "{{ item.1 }}"
        state: present
        exclusive: "{{ true if loop.last else false }}"
      loop: "{{ all_active_users | selectattr('ssh_keys', 'defined') | selectattr('ssh_keys') | subelements('ssh_keys') }}"
      loop_control:
        label: "{{ item.0.name }}"

    - name: Set up sudo access for admin users
      ansible.builtin.lineinfile:
        path: "/etc/sudoers.d/{{ item.name }}"
        line: "{{ item.name }} ALL=(ALL) NOPASSWD: ALL"
        create: yes
        mode: '0440'
        validate: "visudo -cf %s"
      loop: "{{ all_active_users | selectattr('groups', 'contains', 'sudo') | list }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Remove departed user accounts
      ansible.builtin.user:
        name: "{{ item }}"
        state: absent
        remove: yes
      loop: "{{ user_definitions.removed_users }}"

    - name: Remove sudoers files for departed users
      ansible.builtin.file:
        path: "/etc/sudoers.d/{{ item }}"
        state: absent
      loop: "{{ user_definitions.removed_users }}"
```

## Configuring User Environments

```yaml
# Set up user-specific configurations
- name: Create user-specific directories
  ansible.builtin.file:
    path: "/home/{{ item.0.name }}/{{ item.1 }}"
    state: directory
    owner: "{{ item.0.name }}"
    group: "{{ item.0.name }}"
    mode: '0755'
  loop: "{{ developers | subelements('directories') }}"
  loop_control:
    label: "{{ item.0.name }}/{{ item.1 }}"
  vars:
    developers:
      - name: alice
        directories: [.ssh, projects, scripts, .config]
      - name: bob
        directories: [.ssh, projects, .config]

# Deploy user shell configurations
- name: Deploy .bashrc for developers
  ansible.builtin.template:
    src: bashrc.j2
    dest: "/home/{{ item.name }}/.bashrc"
    owner: "{{ item.name }}"
    group: "{{ item.name }}"
    mode: '0644'
  loop: "{{ user_definitions.active_users }}"
  loop_control:
    label: "{{ item.name }}"
```

## Auditing User Accounts

```yaml
# Audit and report on user accounts
- name: Check user account status
  ansible.builtin.command: "id {{ item.name }}"
  loop: "{{ all_active_users }}"
  register: user_checks
  changed_when: false
  failed_when: false
  loop_control:
    label: "{{ item.name }}"

- name: Report missing users
  ansible.builtin.debug:
    msg: "USER MISSING: {{ item.item.name }} is not present on {{ inventory_hostname }}"
  loop: "{{ user_checks.results }}"
  when: item.rc != 0
  loop_control:
    label: "{{ item.item.name }}"

- name: Report user account summary
  ansible.builtin.debug:
    msg: >
      Users on {{ inventory_hostname }}:
      Present: {{ user_checks.results | selectattr('rc', 'equalto', 0) | map(attribute='item') | map(attribute='name') | list | join(', ') }},
      Missing: {{ user_checks.results | rejectattr('rc', 'equalto', 0) | map(attribute='item') | map(attribute='name') | list | join(', ') | default('none') }}
```

## Tips for Production User Management

Store user data in a separate variables file (`vars/users.yml`) rather than inline in the playbook. This makes it easy for HR or team leads to update the user list without touching playbook logic.

Use `uid` values explicitly to ensure consistency across servers. If two servers assign different UIDs to the same username, NFS file sharing breaks.

Always use `append: yes` when managing groups. Without it, Ansible removes the user from any groups not in your list, including default groups.

Use `no_log: true` on any task that handles passwords. Even hashed passwords should not be in your logs.

Keep a `removed_users` list and clean up both the account and any associated files (sudoers entries, cron jobs, SSH keys).

## Summary

Ansible loops make user management scalable and repeatable. Define your users in structured variable data, and let loops handle creation, SSH key deployment, group membership, sudo access, and cleanup. The `subelements` filter handles the one-to-many relationship between users and their SSH keys. The `selectattr` filter lets you apply different tasks to different subsets of users (like giving sudo only to admins). And by separating user data from playbook logic, you make the system easy to audit and update.
