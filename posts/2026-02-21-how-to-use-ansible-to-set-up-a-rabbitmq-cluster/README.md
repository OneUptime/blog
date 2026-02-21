# How to Use Ansible to Set Up a RabbitMQ Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, RabbitMQ, Message Queue, Clustering

Description: Deploy a production-ready RabbitMQ cluster using Ansible with mirrored queues, management UI, and automated node joining for reliable message delivery.

---

RabbitMQ clustering provides message queue high availability. When nodes are clustered, queues, exchanges, and bindings are replicated across all nodes. If one node goes down, the remaining nodes continue processing messages. Ansible automates the tricky parts: sharing the Erlang cookie, joining nodes to the cluster, and configuring queue mirroring policies.

## Inventory

```yaml
# inventories/production/hosts.yml
all:
  children:
    rabbitmq_cluster:
      hosts:
        rmq01.example.com:
          ansible_host: 10.0.4.10
          rabbitmq_cluster_master: true
        rmq02.example.com:
          ansible_host: 10.0.4.11
        rmq03.example.com:
          ansible_host: 10.0.4.12
```

```yaml
# inventories/production/group_vars/rabbitmq_cluster.yml
rabbitmq_version: "3.13"
rabbitmq_erlang_cookie: "{{ vault_erlang_cookie }}"
rabbitmq_admin_user: admin
rabbitmq_admin_password: "{{ vault_rabbitmq_admin_password }}"
rabbitmq_app_user: appuser
rabbitmq_app_password: "{{ vault_rabbitmq_app_password }}"
rabbitmq_app_vhost: /production
rabbitmq_cluster_name: "prod-rabbitmq"
```

## RabbitMQ Role

```yaml
# roles/rabbitmq/tasks/main.yml
# Install and configure RabbitMQ

- name: Install Erlang and RabbitMQ dependencies
  ansible.builtin.apt:
    name:
      - erlang-base
      - erlang-asn1
      - erlang-crypto
      - erlang-eldap
      - erlang-ftp
      - erlang-inets
      - erlang-mnesia
      - erlang-os-mon
      - erlang-parsetools
      - erlang-public-key
      - erlang-runtime-tools
      - erlang-snmp
      - erlang-ssl
      - erlang-syntax-tools
      - erlang-tftp
      - erlang-tools
      - erlang-xmerl
    state: present
    update_cache: yes

- name: Add RabbitMQ signing key
  ansible.builtin.apt_key:
    url: https://packagecloud.io/rabbitmq/rabbitmq-server/gpgkey
    state: present

- name: Add RabbitMQ repository
  ansible.builtin.apt_repository:
    repo: "deb https://packagecloud.io/rabbitmq/rabbitmq-server/ubuntu/ {{ ansible_distribution_release }} main"
    state: present

- name: Install RabbitMQ
  ansible.builtin.apt:
    name: rabbitmq-server
    state: present
    update_cache: yes

- name: Stop RabbitMQ for initial configuration
  ansible.builtin.service:
    name: rabbitmq-server
    state: stopped

- name: Deploy Erlang cookie for cluster authentication
  ansible.builtin.copy:
    content: "{{ rabbitmq_erlang_cookie }}"
    dest: /var/lib/rabbitmq/.erlang.cookie
    owner: rabbitmq
    group: rabbitmq
    mode: '0400'
  no_log: true

- name: Deploy RabbitMQ configuration
  ansible.builtin.template:
    src: rabbitmq.conf.j2
    dest: /etc/rabbitmq/rabbitmq.conf
    owner: rabbitmq
    group: rabbitmq
    mode: '0644'

- name: Deploy RabbitMQ environment config
  ansible.builtin.template:
    src: rabbitmq-env.conf.j2
    dest: /etc/rabbitmq/rabbitmq-env.conf
    owner: rabbitmq
    group: rabbitmq
    mode: '0644'

- name: Start RabbitMQ
  ansible.builtin.service:
    name: rabbitmq-server
    state: started
    enabled: yes

- name: Wait for RabbitMQ to start
  ansible.builtin.wait_for:
    port: 5672
    delay: 10
    timeout: 60

- name: Enable management plugin
  community.rabbitmq.rabbitmq_plugin:
    names: rabbitmq_management
    state: enabled

- name: Include cluster joining tasks
  ansible.builtin.include_tasks: cluster.yml
  when: not (rabbitmq_cluster_master | default(false))

- name: Configure users and permissions
  ansible.builtin.include_tasks: users.yml
  when: rabbitmq_cluster_master | default(false)
```

```jinja2
{# roles/rabbitmq/templates/rabbitmq.conf.j2 #}
# RabbitMQ configuration
listeners.tcp.default = 5672
management.tcp.port = 15672
management.tcp.ip = 0.0.0.0

# Cluster configuration
cluster_formation.peer_discovery_backend = classic_config
{% for host in groups['rabbitmq_cluster'] %}
cluster_formation.classic_config.nodes.{{ loop.index }} = rabbit@{{ hostvars[host].inventory_hostname.split('.')[0] }}
{% endfor %}

# Resource limits
vm_memory_high_watermark.relative = 0.7
disk_free_limit.absolute = 2GB

# Logging
log.file.level = info
log.console = false
```

## Cluster Joining

```yaml
# roles/rabbitmq/tasks/cluster.yml
# Join this node to the RabbitMQ cluster

- name: Stop RabbitMQ application
  ansible.builtin.command: rabbitmqctl stop_app
  changed_when: true

- name: Reset node
  ansible.builtin.command: rabbitmqctl reset
  changed_when: true

- name: Join cluster
  ansible.builtin.command: >
    rabbitmqctl join_cluster
    rabbit@{{ hostvars[groups['rabbitmq_cluster'] | first].inventory_hostname.split('.')[0] }}
  register: join_result
  changed_when: true
  failed_when:
    - join_result.rc != 0
    - "'already_member' not in join_result.stderr"

- name: Start RabbitMQ application
  ansible.builtin.command: rabbitmqctl start_app
  changed_when: true
```

## User and Permission Setup

```yaml
# roles/rabbitmq/tasks/users.yml
# Configure users, vhosts, and permissions

- name: Remove default guest user
  community.rabbitmq.rabbitmq_user:
    user: guest
    state: absent

- name: Create admin user
  community.rabbitmq.rabbitmq_user:
    user: "{{ rabbitmq_admin_user }}"
    password: "{{ rabbitmq_admin_password }}"
    tags: administrator
    vhost: /
    configure_priv: ".*"
    read_priv: ".*"
    write_priv: ".*"
    state: present
  no_log: true

- name: Create application vhost
  community.rabbitmq.rabbitmq_vhost:
    name: "{{ rabbitmq_app_vhost }}"
    state: present

- name: Create application user
  community.rabbitmq.rabbitmq_user:
    user: "{{ rabbitmq_app_user }}"
    password: "{{ rabbitmq_app_password }}"
    vhost: "{{ rabbitmq_app_vhost }}"
    configure_priv: ".*"
    read_priv: ".*"
    write_priv: ".*"
    state: present
  no_log: true

- name: Set HA policy for all queues
  community.rabbitmq.rabbitmq_policy:
    name: ha-all
    pattern: ".*"
    vhost: "{{ rabbitmq_app_vhost }}"
    tags:
      ha-mode: all
      ha-sync-mode: automatic
    state: present

- name: Set cluster name
  ansible.builtin.command: "rabbitmqctl set_cluster_name {{ rabbitmq_cluster_name }}"
  changed_when: true
```

## RabbitMQ Cluster Architecture

```mermaid
graph TD
    A[Producer App] --> B[RabbitMQ Node 1]
    A --> C[RabbitMQ Node 2]
    A --> D[RabbitMQ Node 3]
    B <-->|Mirrored Queues| C
    C <-->|Mirrored Queues| D
    D <-->|Mirrored Queues| B
    B --> E[Consumer App]
    C --> E
    D --> E
```

## Cluster Verification

```yaml
# playbooks/verify-rabbitmq.yml
- name: Verify RabbitMQ Cluster
  hosts: rabbitmq_cluster[0]
  become: yes
  tasks:
    - name: Check cluster status
      ansible.builtin.command: rabbitmqctl cluster_status
      register: cluster_status
      changed_when: false

    - name: Display cluster status
      ansible.builtin.debug:
        msg: "{{ cluster_status.stdout_lines }}"

    - name: Verify all nodes are in the cluster
      ansible.builtin.assert:
        that:
          - "groups['rabbitmq_cluster'] | length == cluster_status.stdout | regex_findall('rabbit@') | length"
        fail_msg: "Not all nodes are in the cluster"

    - name: Check queue mirroring policy
      ansible.builtin.command: rabbitmqctl list_policies -p {{ rabbitmq_app_vhost }}
      register: policies
      changed_when: false

    - name: Verify HA policy exists
      ansible.builtin.assert:
        that:
          - "'ha-all' in policies.stdout"
```

## Main Playbook

```yaml
# playbooks/rabbitmq-cluster.yml
- name: Deploy RabbitMQ Cluster
  hosts: rabbitmq_cluster
  become: yes
  serial: 1
  order: inventory
  roles:
    - rabbitmq

- name: Verify cluster
  ansible.builtin.import_playbook: verify-rabbitmq.yml
```

## Summary

RabbitMQ clustering with Ansible handles Erlang cookie distribution, sequential node joining, management plugin activation, user/permission setup, and HA policy configuration. The shared Erlang cookie authenticates nodes to each other. The first node starts normally while subsequent nodes stop their app, reset, and join the cluster. Queue mirroring with `ha-mode: all` ensures messages survive node failures. The management plugin provides a web UI for monitoring at port 15672.
