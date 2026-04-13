# How to Use Ansible to Automate MongoDB Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Ansible, Automation, Deployment, DevOps

Description: Learn how to automate MongoDB deployment using Ansible playbooks, roles, and variables for repeatable, infrastructure-as-code database provisioning.

---

## Why Automate MongoDB Deployment with Ansible

Manual MongoDB deployments are error-prone and hard to reproduce. Ansible provides an agentless, idempotent approach to automate installation, configuration, and replica set initialization across any number of servers.

Key benefits include:
- Repeatable deployments across dev, staging, and production
- Version-controlled infrastructure configuration
- Zero downtime upgrades through rolling strategies
- Consistent security hardening on every node

## Prerequisites

Before starting, ensure you have:
- Ansible 2.12+ installed on your control node
- SSH access to target servers
- Python 3.8+ on target hosts
- Target OS: Ubuntu 22.04 or RHEL 8+

## Project Structure

```text
mongodb-ansible/
├── inventory/
│   ├── hosts.yml
│   └── group_vars/
│       └── mongodb.yml
├── roles/
│   └── mongodb/
│       ├── tasks/
│       │   ├── main.yml
│       │   ├── install.yml
│       │   ├── configure.yml
│       │   └── replicaset.yml
│       ├── templates/
│       │   └── mongod.conf.j2
│       └── defaults/
│           └── main.yml
└── site.yml
```

## Inventory Configuration

```yaml
# inventory/hosts.yml
all:
  children:
    mongodb:
      hosts:
        mongo1:
          ansible_host: 10.0.1.10
          mongo_role: primary
        mongo2:
          ansible_host: 10.0.1.11
          mongo_role: secondary
        mongo3:
          ansible_host: 10.0.1.12
          mongo_role: secondary
```

## Group Variables

```yaml
# inventory/group_vars/mongodb.yml
mongodb_version: "7.0"
mongodb_port: 27017
mongodb_replicaset_name: "rs0"
mongodb_data_dir: /var/lib/mongodb
mongodb_log_dir: /var/log/mongodb
mongodb_admin_user: admin
mongodb_admin_password: "{{ vault_mongodb_admin_password }}"
mongodb_bind_ip: "0.0.0.0"
mongodb_wiredtiger_cache_gb: 2
```

## Role Defaults

```yaml
# roles/mongodb/defaults/main.yml
mongodb_version: "7.0"
mongodb_port: 27017
mongodb_replicaset_name: "rs0"
mongodb_data_dir: /var/lib/mongodb
mongodb_log_dir: /var/log/mongodb
mongodb_enable_auth: true
mongodb_net_ssl: false
```

## Installation Tasks

```yaml
# roles/mongodb/tasks/install.yml
- name: Import MongoDB GPG key
  ansible.builtin.apt_key:
    url: "https://www.mongodb.org/static/pgp/server-{{ mongodb_version }}.asc"
    state: present

- name: Add MongoDB repository
  ansible.builtin.apt_repository:
    repo: >
      deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu
      jammy/mongodb-org/{{ mongodb_version }} multiverse
    state: present
    filename: mongodb-org

- name: Install MongoDB packages
  ansible.builtin.apt:
    name:
      - mongodb-org
      - mongodb-org-server
      - mongodb-mongosh
      - mongodb-org-tools
    state: present
    update_cache: true

- name: Ensure MongoDB data and log directories exist
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: mongodb
    group: mongodb
    mode: "0755"
  loop:
    - "{{ mongodb_data_dir }}"
    - "{{ mongodb_log_dir }}"
```

## Configuration Template

```yaml
# roles/mongodb/templates/mongod.conf.j2
systemLog:
  destination: file
  logAppend: true
  path: {{ mongodb_log_dir }}/mongod.log

storage:
  dbPath: {{ mongodb_data_dir }}
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: {{ mongodb_wiredtiger_cache_gb }}

net:
  port: {{ mongodb_port }}
  bindIp: {{ mongodb_bind_ip }}

replication:
  replSetName: "{{ mongodb_replicaset_name }}"

security:
  authorization: {% if mongodb_enable_auth %}enabled{% else %}disabled{% endif %}
```

## Configure Tasks

```yaml
# roles/mongodb/tasks/configure.yml
- name: Deploy mongod configuration
  ansible.builtin.template:
    src: mongod.conf.j2
    dest: /etc/mongod.conf
    owner: root
    group: root
    mode: "0644"
  notify: Restart MongoDB

- name: Enable and start mongod service
  ansible.builtin.systemd:
    name: mongod
    enabled: true
    state: started
```

## Replica Set Initialization

```yaml
# roles/mongodb/tasks/replicaset.yml
- name: Wait for MongoDB to be ready
  ansible.builtin.wait_for:
    port: "{{ mongodb_port }}"
    timeout: 30

- name: Initialize replica set on primary
  community.mongodb.mongodb_replicaset:
    login_host: localhost
    login_port: "{{ mongodb_port }}"
    replica_set: "{{ mongodb_replicaset_name }}"
    members:
      - host: "{{ hostvars['mongo1']['ansible_host'] }}:{{ mongodb_port }}"
        priority: 2
      - host: "{{ hostvars['mongo2']['ansible_host'] }}:{{ mongodb_port }}"
        priority: 1
      - host: "{{ hostvars['mongo3']['ansible_host'] }}:{{ mongodb_port }}"
        priority: 1
  when: mongo_role == 'primary'

- name: Create admin user
  community.mongodb.mongodb_user:
    login_host: localhost
    login_port: "{{ mongodb_port }}"
    database: admin
    name: "{{ mongodb_admin_user }}"
    password: "{{ mongodb_admin_password }}"
    roles:
      - db: admin
        role: root
    state: present
  when: mongo_role == 'primary'
```

## Main Playbook

```yaml
# site.yml
---
- name: Deploy MongoDB Replica Set
  hosts: mongodb
  become: true
  roles:
    - role: mongodb
  handlers:
    - name: Restart MongoDB
      ansible.builtin.systemd:
        name: mongod
        state: restarted
```

## Running the Playbook

```bash
# Check syntax
ansible-playbook site.yml --syntax-check

# Dry run (check mode)
ansible-playbook site.yml --check

# Deploy MongoDB
ansible-playbook site.yml -i inventory/hosts.yml

# Deploy with vault password for secrets
ansible-playbook site.yml -i inventory/hosts.yml --ask-vault-pass

# Limit to a specific host
ansible-playbook site.yml -i inventory/hosts.yml --limit mongo1
```

## Using Ansible Vault for Secrets

```bash
# Encrypt the admin password
ansible-vault encrypt_string 'SuperSecret123!' --name 'vault_mongodb_admin_password'

# Create an encrypted vars file
ansible-vault create inventory/group_vars/vault.yml

# Edit encrypted file
ansible-vault edit inventory/group_vars/vault.yml
```

## Rolling Upgrades

```yaml
# upgrade.yml
---
- name: Rolling MongoDB Upgrade
  hosts: mongodb
  become: true
  serial: 1
  tasks:
    - name: Step down primary before upgrade
      community.mongodb.mongodb_stepdown:
        login_host: localhost
        login_port: "{{ mongodb_port }}"
      when: mongo_role == 'primary'

    - name: Stop MongoDB
      ansible.builtin.systemd:
        name: mongod
        state: stopped

    - name: Upgrade MongoDB packages
      ansible.builtin.apt:
        name: mongodb-org
        state: latest
        update_cache: true

    - name: Start MongoDB
      ansible.builtin.systemd:
        name: mongod
        state: started

    - name: Wait for member to rejoin replica set
      community.mongodb.mongodb_status:
        login_host: localhost
        login_port: "{{ mongodb_port }}"
        poll: 5
        interval: 10
```

## Summary

Ansible provides a clean, declarative way to automate MongoDB deployments using playbooks, roles, and inventory variables. By separating concerns into tasks for installation, configuration, and replica set initialization, you can maintain idempotent deployments that work consistently across all environments. Combining Ansible Vault for secrets management and serial execution for rolling upgrades gives you production-grade automation for MongoDB operations.
