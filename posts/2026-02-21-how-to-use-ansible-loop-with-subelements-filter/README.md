# How to Use Ansible loop with subelements Filter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, subelements, Data Structures

Description: Learn how to use the Ansible subelements filter to loop over nested list attributes within a list of dictionaries for complex data processing.

---

The `subelements` filter solves a specific but very common problem in Ansible: you have a list of objects, and each object contains a list attribute that you need to iterate over while keeping a reference to the parent object. Think users with SSH keys, servers with multiple disks, or applications with multiple configuration files. Without `subelements`, you would need nested includes or complicated Jinja2 logic. With it, a single loop handles everything.

## The Problem

Suppose you have a list of users, each with their own list of SSH keys:

```yaml
users:
  - name: alice
    groups: [sudo, docker]
    ssh_keys:
      - "ssh-rsa AAAAB3... alice@laptop"
      - "ssh-rsa AAAAB3... alice@desktop"
  - name: bob
    groups: [docker]
    ssh_keys:
      - "ssh-rsa AAAAB3... bob@laptop"
  - name: charlie
    groups: [sudo]
    ssh_keys:
      - "ssh-rsa AAAAB3... charlie@workstation"
      - "ssh-rsa AAAAB3... charlie@tablet"
      - "ssh-rsa AAAAB3... charlie@phone"
```

You need to add each SSH key to the correct user. A simple `loop` over `users` gives you one iteration per user. A simple `loop` over flattened SSH keys loses the user context. You need both the user AND the key in each iteration. That is what `subelements` does.

## How subelements Works

The `subelements` filter takes a list of dictionaries and the name of a list attribute within each dictionary. It produces a new list where each element is a two-item list: the parent dictionary and one sub-element.

```yaml
# Loop over users and their SSH keys using subelements
- name: Add SSH keys for each user
  ansible.posix.authorized_key:
    user: "{{ item.0.name }}"
    key: "{{ item.1 }}"
    state: present
  loop: "{{ users | subelements('ssh_keys') }}"
  loop_control:
    label: "{{ item.0.name }} - key {{ ansible_loop.index | default('') }}"
```

For the data above, this produces six iterations:

1. `item.0` = alice's dict, `item.1` = alice's first key
2. `item.0` = alice's dict, `item.1` = alice's second key
3. `item.0` = bob's dict, `item.1` = bob's key
4. `item.0` = charlie's dict, `item.1` = charlie's first key
5. `item.0` = charlie's dict, `item.1` = charlie's second key
6. `item.0` = charlie's dict, `item.1` = charlie's third key

## Basic Syntax

```yaml
loop: "{{ parent_list | subelements('sub_attribute_name') }}"
```

Inside the loop:
- `item.0` is the parent dictionary (with all its attributes)
- `item.1` is the current sub-element from the specified list attribute

## Complete User Management Example

Here is a full user management playbook using `subelements`:

```yaml
# Manage users, their groups, and SSH keys using subelements
- name: User management
  hosts: all
  become: yes
  vars:
    managed_users:
      - name: deploy
        uid: 1100
        shell: /bin/bash
        groups: [sudo, docker]
        ssh_keys:
          - "ssh-ed25519 AAAAC3NzaC1... deploy@ci-server"
          - "ssh-ed25519 AAAAC3NzaC1... deploy@admin-laptop"
      - name: monitoring
        uid: 1101
        shell: /usr/sbin/nologin
        groups: [prometheus]
        ssh_keys:
          - "ssh-ed25519 AAAAC3NzaC1... monitoring@grafana"
      - name: backup
        uid: 1102
        shell: /bin/bash
        groups: [backup]
        ssh_keys:
          - "ssh-ed25519 AAAAC3NzaC1... backup@nas"
          - "ssh-ed25519 AAAAC3NzaC1... backup@offsite"

  tasks:
    - name: Create user accounts
      ansible.builtin.user:
        name: "{{ item.name }}"
        uid: "{{ item.uid }}"
        shell: "{{ item.shell }}"
        groups: "{{ item.groups | join(',') }}"
        state: present
      loop: "{{ managed_users }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Deploy SSH authorized keys
      ansible.posix.authorized_key:
        user: "{{ item.0.name }}"
        key: "{{ item.1 }}"
        state: present
        exclusive: no
      loop: "{{ managed_users | subelements('ssh_keys') }}"
      loop_control:
        label: "{{ item.0.name }}"
```

The first task creates users with a simple loop. The second task uses `subelements` to deploy each SSH key to the correct user.

## Handling Missing Sub-Elements

If some parent objects do not have the sub-element attribute, `subelements` will fail. Use the `skip_missing` flag to handle this:

```yaml
# Handle users that might not have SSH keys defined
- name: Deploy SSH keys (skip users without keys)
  ansible.posix.authorized_key:
    user: "{{ item.0.name }}"
    key: "{{ item.1 }}"
    state: present
  loop: "{{ users | subelements('ssh_keys', skip_missing=true) }}"
  loop_control:
    label: "{{ item.0.name }}"
  vars:
    users:
      - name: alice
        ssh_keys:
          - "ssh-rsa AAAAB3... alice@laptop"
      - name: bob
        # No ssh_keys attribute at all
      - name: charlie
        ssh_keys:
          - "ssh-rsa AAAAB3... charlie@workstation"
```

With `skip_missing=true`, bob is silently skipped. Without it, the task would fail with an error about the missing attribute.

## Server Disk Configuration

Another practical example is configuring multiple disks on servers:

```yaml
# Configure disks for each server from a structured variable
- name: Manage server storage
  hosts: all
  become: yes
  vars:
    server_storage:
      - hostname: web01
        disks:
          - { device: "/dev/sdb", mount: "/data", fstype: "ext4" }
          - { device: "/dev/sdc", mount: "/logs", fstype: "ext4" }
      - hostname: db01
        disks:
          - { device: "/dev/sdb", mount: "/var/lib/postgresql", fstype: "xfs" }
          - { device: "/dev/sdc", mount: "/var/lib/postgresql/wal", fstype: "xfs" }
          - { device: "/dev/sdd", mount: "/backup", fstype: "ext4" }

  tasks:
    - name: Create filesystems
      community.general.filesystem:
        fstype: "{{ item.1.fstype }}"
        dev: "{{ item.1.device }}"
      loop: "{{ server_storage | selectattr('hostname', 'equalto', inventory_hostname) | list | subelements('disks') }}"
      loop_control:
        label: "{{ item.1.device }} -> {{ item.1.mount }}"

    - name: Mount filesystems
      ansible.posix.mount:
        path: "{{ item.1.mount }}"
        src: "{{ item.1.device }}"
        fstype: "{{ item.1.fstype }}"
        state: mounted
      loop: "{{ server_storage | selectattr('hostname', 'equalto', inventory_hostname) | list | subelements('disks') }}"
      loop_control:
        label: "{{ item.1.device }} -> {{ item.1.mount }}"
```

## Application with Multiple Config Files

```yaml
# Deploy multiple configuration files per application
- name: Deploy application configs
  hosts: app_servers
  vars:
    applications:
      - name: api-gateway
        user: apigateway
        config_files:
          - { src: "gateway.yml.j2", dest: "/etc/api-gateway/config.yml", mode: "0640" }
          - { src: "routes.yml.j2", dest: "/etc/api-gateway/routes.yml", mode: "0640" }
          - { src: "tls.yml.j2", dest: "/etc/api-gateway/tls.yml", mode: "0600" }
      - name: auth-service
        user: authsvc
        config_files:
          - { src: "auth.yml.j2", dest: "/etc/auth-service/config.yml", mode: "0640" }
          - { src: "jwt.yml.j2", dest: "/etc/auth-service/jwt.yml", mode: "0600" }

  tasks:
    - name: Deploy config files for all applications
      ansible.builtin.template:
        src: "{{ item.1.src }}"
        dest: "{{ item.1.dest }}"
        owner: "{{ item.0.user }}"
        mode: "{{ item.1.mode }}"
      loop: "{{ applications | subelements('config_files') }}"
      loop_control:
        label: "{{ item.0.name }}: {{ item.1.dest | basename }}"
```

Each config file is deployed with the correct ownership based on the parent application's user attribute.

## Database Grants with subelements

Managing database permissions is a natural fit for subelements:

```yaml
# Grant database permissions using subelements
- name: Configure database grants
  community.postgresql.postgresql_privs:
    db: "{{ item.1 }}"
    role: "{{ item.0.name }}"
    privs: "{{ item.0.privileges }}"
    type: database
    state: present
  loop: "{{ db_users | subelements('databases') }}"
  loop_control:
    label: "{{ item.0.name }} -> {{ item.1 }}"
  vars:
    db_users:
      - name: app_readonly
        privileges: CONNECT
        databases:
          - production
          - analytics
          - reporting
      - name: app_readwrite
        privileges: ALL
        databases:
          - production
      - name: etl_user
        privileges: ALL
        databases:
          - analytics
          - staging
```

## subelements vs. with_subelements

The `subelements` filter replaces the older `with_subelements` lookup:

```yaml
# Old syntax
- name: Old way
  ansible.builtin.debug:
    msg: "{{ item.0.name }} -> {{ item.1 }}"
  with_subelements:
    - "{{ users }}"
    - ssh_keys

# Modern syntax
- name: New way
  ansible.builtin.debug:
    msg: "{{ item.0.name }} -> {{ item.1 }}"
  loop: "{{ users | subelements('ssh_keys') }}"
```

The modern syntax is preferred for new playbooks because it is consistent with the `loop` keyword pattern.

## Nested subelements

If you need to go deeper than one level, you can chain operations:

```yaml
# Process deeply nested structures with intermediate set_fact
- name: Flatten two levels of nesting
  ansible.builtin.set_fact:
    flattened_configs: >-
      {{
        departments | subelements('teams') |
        map('combine_subelement') | list
      }}
```

In practice, deeply nested structures are better handled by restructuring your data or using intermediate `set_fact` tasks to flatten the structure step by step.

## Summary

The `subelements` filter is the right tool when you need to iterate over a list attribute within each item of a parent list. It keeps the parent context available as `item.0` while iterating over sub-elements as `item.1`. Use it for user management with SSH keys, server configurations with multiple disks, applications with multiple config files, and any similar parent-child data relationship. The `skip_missing=true` parameter makes it safe to use with optional sub-element attributes.
