# How to Manage Redis with Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ansible, DevOps, Automation, Infrastructure as Code, Configuration Management

Description: Learn how to install, configure, and manage Redis instances across multiple servers using Ansible playbooks with idempotent, reproducible automation.

---

## Why Ansible for Redis Management?

Ansible lets you automate Redis installation, configuration updates, cluster setup, and maintenance tasks across multiple servers without manual SSH sessions. Playbooks are idempotent - running them multiple times produces the same result.

## Project Structure

```text
redis-ansible/
  inventory/
    hosts.ini
  group_vars/
    redis.yml
  roles/
    redis/
      tasks/
        main.yml
        install.yml
        configure.yml
        sentinel.yml
      templates/
        redis.conf.j2
        sentinel.conf.j2
      handlers/
        main.yml
      defaults/
        main.yml
  playbooks/
    install.yml
    configure.yml
    backup.yml
```

## Inventory File

```ini
[redis_primary]
redis-primary-01 ansible_host=10.0.1.10

[redis_replica]
redis-replica-01 ansible_host=10.0.1.11
redis-replica-02 ansible_host=10.0.1.12

[redis_sentinel]
sentinel-01 ansible_host=10.0.1.20
sentinel-02 ansible_host=10.0.1.21
sentinel-03 ansible_host=10.0.1.22

[redis:children]
redis_primary
redis_replica
```

## Group Variables

```yaml
# group_vars/redis.yml
redis_version: "7.2"
redis_port: 6379
redis_bind: "0.0.0.0"
redis_maxmemory: "4gb"
redis_maxmemory_policy: "allkeys-lru"
redis_requirepass: "{{ vault_redis_password }}"
redis_data_dir: "/var/lib/redis"
redis_log_dir: "/var/log/redis"

redis_persistence:
  appendonly: "yes"
  appendfsync: "everysec"
  save: "900 1 300 10 60 10000"
```

## Default Variables for the Role

```yaml
# roles/redis/defaults/main.yml
redis_port: 6379
redis_bind: "127.0.0.1"
redis_maxmemory: "1gb"
redis_maxmemory_policy: "noeviction"
redis_requirepass: ""
redis_data_dir: "/var/lib/redis"
redis_log_dir: "/var/log/redis"
redis_loglevel: "notice"
redis_timeout: 0
redis_tcp_keepalive: 300
```

## Installation Tasks

```yaml
# roles/redis/tasks/install.yml
---
- name: Install Redis from package manager
  ansible.builtin.package:
    name: redis-server
    state: present
  when: ansible_os_family == "Debian"

- name: Install Redis on RHEL/CentOS
  ansible.builtin.package:
    name: redis
    state: present
  when: ansible_os_family == "RedHat"

- name: Create Redis data directory
  ansible.builtin.file:
    path: "{{ redis_data_dir }}"
    state: directory
    owner: redis
    group: redis
    mode: '0750'

- name: Create Redis log directory
  ansible.builtin.file:
    path: "{{ redis_log_dir }}"
    state: directory
    owner: redis
    group: redis
    mode: '0750'
```

## Redis Configuration Template

```text
# roles/redis/templates/redis.conf.j2
bind {{ redis_bind }}
port {{ redis_port }}
daemonize no

loglevel {{ redis_loglevel }}
logfile {{ redis_log_dir }}/redis.log

dir {{ redis_data_dir }}

maxmemory {{ redis_maxmemory }}
maxmemory-policy {{ redis_maxmemory_policy }}

{% if redis_requirepass %}
requirepass {{ redis_requirepass }}
{% endif %}

appendonly {{ redis_persistence.appendonly }}
appendfsync {{ redis_persistence.appendfsync }}
save {{ redis_persistence.save }}

tcp-keepalive {{ redis_tcp_keepalive }}
timeout {{ redis_timeout }}
```

## Configure Tasks

```yaml
# roles/redis/tasks/configure.yml
---
- name: Deploy Redis configuration
  ansible.builtin.template:
    src: redis.conf.j2
    dest: /etc/redis/redis.conf
    owner: redis
    group: redis
    mode: '0640'
  notify: Restart Redis

- name: Enable and start Redis service
  ansible.builtin.systemd:
    name: redis-server
    enabled: true
    state: started

- name: Verify Redis is responding
  ansible.builtin.command: >
    redis-cli -p {{ redis_port }}
    {{ '-a ' + redis_requirepass if redis_requirepass else '' }} ping
  register: redis_ping
  changed_when: false
  failed_when: redis_ping.stdout != 'PONG'
```

## Handlers

```yaml
# roles/redis/handlers/main.yml
---
- name: Restart Redis
  ansible.builtin.systemd:
    name: redis-server
    state: restarted

- name: Reload Redis
  ansible.builtin.command: >
    redis-cli {{ '-a ' + redis_requirepass if redis_requirepass else '' }} CONFIG REWRITE
  ignore_errors: true
```

## Main Playbook

```yaml
# playbooks/install.yml
---
- name: Install and configure Redis
  hosts: redis
  become: true
  roles:
    - redis

- name: Configure replica replication
  hosts: redis_replica
  become: true
  tasks:
    - name: Set replication source
      ansible.builtin.command: >
        redis-cli -p {{ redis_port }}
        {{ '-a ' + redis_requirepass if redis_requirepass else '' }}
        REPLICAOF {{ hostvars[groups['redis_primary'][0]]['ansible_host'] }} {{ redis_port }}
      changed_when: false
```

## Backup Playbook

```yaml
# playbooks/backup.yml
---
- name: Backup Redis data
  hosts: redis_primary
  become: true
  tasks:
    - name: Trigger RDB save
      ansible.builtin.command: >
        redis-cli {{ '-a ' + redis_requirepass if redis_requirepass else '' }} BGSAVE
      changed_when: false

    - name: Wait for save to complete
      ansible.builtin.command: >
        redis-cli {{ '-a ' + redis_requirepass if redis_requirepass else '' }} LASTSAVE
      register: last_save
      until: last_save.stdout | int > ansible_date_time.epoch | int - 60
      retries: 10
      delay: 5
      changed_when: false

    - name: Copy RDB file to backup location
      ansible.builtin.copy:
        src: "{{ redis_data_dir }}/dump.rdb"
        dest: "/backups/redis/dump-{{ ansible_date_time.date }}.rdb"
        remote_src: true
```

## Running the Playbooks

```bash
# Install Redis on all hosts
ansible-playbook -i inventory/hosts.ini playbooks/install.yml --ask-vault-pass

# Run backup
ansible-playbook -i inventory/hosts.ini playbooks/backup.yml

# Check mode (dry run)
ansible-playbook -i inventory/hosts.ini playbooks/install.yml --check
```

## Summary

Ansible makes Redis management reproducible and scalable by encoding installation, configuration, and maintenance procedures as idempotent playbooks. Using templates for redis.conf, handlers for service restarts, and vault for password management, you can safely manage Redis across dozens of servers with a single command. This approach reduces manual errors and ensures consistent configuration across all environments.
