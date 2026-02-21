# How to Use the community.rabbitmq Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, RabbitMQ, Message Queues, Automation

Description: A practical guide to managing RabbitMQ servers with Ansible using the community.rabbitmq collection for exchanges, queues, users, and policies.

---

RabbitMQ is one of the most widely deployed message brokers out there, but configuring it by hand across multiple environments gets tedious fast. The `community.rabbitmq` collection for Ansible lets you manage every aspect of RabbitMQ programmatically: users, vhosts, exchanges, queues, bindings, policies, and cluster configuration. This post walks through the collection from installation to real-world usage patterns.

## Installing the Collection

The collection is available from Ansible Galaxy and needs the `requests` Python library for HTTP API access.

```bash
# Install the collection from Galaxy
ansible-galaxy collection install community.rabbitmq

# Install the Python dependency for the HTTP API modules
pip install requests
```

For version pinning, add it to your requirements file.

```yaml
# requirements.yml - lock the collection version
collections:
  - name: community.rabbitmq
    version: ">=1.3.0"
```

## What the Collection Includes

The collection provides modules that fall into two categories: those that use the RabbitMQ management HTTP API and those that use the `rabbitmqctl` CLI directly. The HTTP API modules are prefixed and generally preferred for remote management. Here is the breakdown:

- **rabbitmq_user** - manage users and their permissions
- **rabbitmq_vhost** - create and delete virtual hosts
- **rabbitmq_exchange** - declare exchanges
- **rabbitmq_queue** - declare queues
- **rabbitmq_binding** - create bindings between exchanges and queues
- **rabbitmq_policy** - set policies for HA, TTL, and other queue behaviors
- **rabbitmq_plugin** - enable or disable RabbitMQ plugins
- **rabbitmq_global_parameter** - set global parameters
- **rabbitmq_parameter** - set per-vhost parameters

## Setting Up Connection Defaults

Most modules need to connect to the RabbitMQ management API. Rather than repeating connection details on every task, set them as variables.

```yaml
# group_vars/rabbitmq.yml - connection defaults for all RabbitMQ tasks
rabbitmq_api_host: "rabbitmq.example.com"
rabbitmq_api_port: 15672
rabbitmq_api_user: "admin"
rabbitmq_api_password: "{{ vault_rabbitmq_admin_password }}"
rabbitmq_api_tls: true
rabbitmq_api_ca_cert: "/etc/ssl/certs/ca-bundle.crt"
```

## Managing Virtual Hosts

Virtual hosts provide logical separation between applications. Here is how to create them.

```yaml
# playbook-vhosts.yml - create virtual hosts for each application
- hosts: rabbitmq_primary
  tasks:
    - name: Create virtual hosts for each application team
      community.rabbitmq.rabbitmq_vhost:
        name: "{{ item }}"
        state: present
      loop:
        - /orders
        - /notifications
        - /analytics
        - /logging

    - name: Remove decommissioned vhosts
      community.rabbitmq.rabbitmq_vhost:
        name: "/legacy-app"
        state: absent
```

## Managing Users and Permissions

User management is where this collection really saves time, especially when you have dozens of services each needing their own credentials.

```yaml
# playbook-users.yml - create application users with proper permissions
- hosts: rabbitmq_primary
  vars:
    app_users:
      - name: order-service
        password: "{{ vault_order_svc_password }}"
        vhost: /orders
        configure_priv: "^order\\..*"
        write_priv: "^order\\..*"
        read_priv: "^(order\\.|notifications\\.).*"
        tags: ""
      - name: notification-service
        password: "{{ vault_notification_svc_password }}"
        vhost: /notifications
        configure_priv: "^notification\\..*"
        write_priv: "^notification\\..*"
        read_priv: "^notification\\..*"
        tags: ""
      - name: monitoring
        password: "{{ vault_monitoring_password }}"
        vhost: /
        configure_priv: ""
        write_priv: ""
        read_priv: ".*"
        tags: monitoring
  tasks:
    - name: Create application users
      community.rabbitmq.rabbitmq_user:
        user: "{{ item.name }}"
        password: "{{ item.password }}"
        vhost: "{{ item.vhost }}"
        configure_priv: "{{ item.configure_priv }}"
        write_priv: "{{ item.write_priv }}"
        read_priv: "{{ item.read_priv }}"
        tags: "{{ item.tags }}"
        state: present
      loop: "{{ app_users }}"
      no_log: true  # hide passwords from output
```

## Declaring Exchanges and Queues

The topology of your message broker, the exchanges, queues, and bindings, can be fully managed as code.

```yaml
# playbook-topology.yml - declare the full messaging topology
- hosts: rabbitmq_primary
  tasks:
    - name: Create the main order exchange
      community.rabbitmq.rabbitmq_exchange:
        name: "order.events"
        type: topic
        durable: true
        vhost: /orders
        login_user: "admin"
        login_password: "{{ vault_rabbitmq_admin_password }}"
        login_host: "{{ rabbitmq_api_host }}"

    - name: Create dead letter exchange
      community.rabbitmq.rabbitmq_exchange:
        name: "order.dlx"
        type: fanout
        durable: true
        vhost: /orders
        login_user: "admin"
        login_password: "{{ vault_rabbitmq_admin_password }}"
        login_host: "{{ rabbitmq_api_host }}"

    - name: Create order processing queues
      community.rabbitmq.rabbitmq_queue:
        name: "{{ item.name }}"
        durable: true
        vhost: /orders
        arguments: "{{ item.args | default({}) }}"
        login_user: "admin"
        login_password: "{{ vault_rabbitmq_admin_password }}"
        login_host: "{{ rabbitmq_api_host }}"
      loop:
        - name: order.created
          args:
            x-dead-letter-exchange: order.dlx
            x-message-ttl: 86400000  # 24 hours
        - name: order.shipped
          args:
            x-dead-letter-exchange: order.dlx
        - name: order.dlq  # dead letter queue
          args: {}

    - name: Bind queues to exchanges
      community.rabbitmq.rabbitmq_binding:
        source: "order.events"
        destination: "{{ item.queue }}"
        routing_key: "{{ item.routing_key }}"
        destination_type: queue
        vhost: /orders
        login_user: "admin"
        login_password: "{{ vault_rabbitmq_admin_password }}"
        login_host: "{{ rabbitmq_api_host }}"
      loop:
        - queue: order.created
          routing_key: "order.created.#"
        - queue: order.shipped
          routing_key: "order.shipped.#"

    - name: Bind dead letter queue to DLX
      community.rabbitmq.rabbitmq_binding:
        source: "order.dlx"
        destination: "order.dlq"
        destination_type: queue
        vhost: /orders
        login_user: "admin"
        login_password: "{{ vault_rabbitmq_admin_password }}"
        login_host: "{{ rabbitmq_api_host }}"
```

## Setting Policies

Policies control queue behavior like replication, TTL, and max length. They are applied using pattern matching on queue names.

```yaml
# playbook-policies.yml - set HA and resource limit policies
- hosts: rabbitmq_primary
  tasks:
    - name: Set HA policy for all order queues
      community.rabbitmq.rabbitmq_policy:
        name: ha-orders
        pattern: "^order\\."
        tags:
          ha-mode: exactly
          ha-params: 2
          ha-sync-mode: automatic
        vhost: /orders
        apply_to: queues
        state: present

    - name: Set max queue length policy to prevent unbounded growth
      community.rabbitmq.rabbitmq_policy:
        name: max-length-default
        pattern: ".*"
        tags:
          max-length: 1000000
          overflow: reject-publish
        vhost: /orders
        apply_to: queues
        priority: 0
        state: present

    - name: Set message TTL for temporary queues
      community.rabbitmq.rabbitmq_policy:
        name: ttl-temp-queues
        pattern: "^temp\\."
        tags:
          message-ttl: 3600000  # 1 hour
          expires: 7200000       # auto-delete after 2 hours idle
        vhost: /orders
        apply_to: queues
        priority: 10
        state: present
```

## Managing Plugins

RabbitMQ plugins can be enabled and disabled through the collection as well.

```yaml
# playbook-plugins.yml - enable required RabbitMQ plugins
- hosts: rabbitmq_servers
  become: yes
  tasks:
    - name: Enable management and monitoring plugins
      community.rabbitmq.rabbitmq_plugin:
        names:
          - rabbitmq_management
          - rabbitmq_prometheus
          - rabbitmq_shovel
          - rabbitmq_shovel_management
          - rabbitmq_federation
          - rabbitmq_federation_management
        state: enabled
      notify: restart rabbitmq

  handlers:
    - name: restart rabbitmq
      ansible.builtin.service:
        name: rabbitmq-server
        state: restarted
```

## A Full Role Example

In practice, you would wrap all of this into a reusable role. Here is the structure.

```
roles/rabbitmq_config/
  defaults/main.yml
  tasks/main.yml
  tasks/vhosts.yml
  tasks/users.yml
  tasks/topology.yml
  tasks/policies.yml
  vars/main.yml
```

The main task file ties it all together.

```yaml
# roles/rabbitmq_config/tasks/main.yml - orchestrate RabbitMQ configuration
- name: Configure virtual hosts
  ansible.builtin.include_tasks: vhosts.yml

- name: Configure users and permissions
  ansible.builtin.include_tasks: users.yml

- name: Configure exchanges, queues, and bindings
  ansible.builtin.include_tasks: topology.yml

- name: Configure policies
  ansible.builtin.include_tasks: policies.yml
```

## Troubleshooting Tips

A few things I have run into when using this collection:

1. **Management plugin must be enabled.** Most modules use the HTTP API, which requires the `rabbitmq_management` plugin. If you get connection refused errors on port 15672, that is probably the issue.

2. **User permissions are per-vhost.** If a user needs access to multiple vhosts, you need to set permissions for each vhost separately. The module only sets permissions for the vhost specified in the task.

3. **Idempotency with arguments.** Queue arguments like `x-message-ttl` are set at creation time. If you change them in your playbook, the module will not recreate the queue. You need to delete and recreate it, which means losing messages. Plan your queue arguments carefully before deploying to production.

4. **Use `no_log` for password tasks.** The module output can include passwords in plain text. Always set `no_log: true` on tasks that handle credentials.

The `community.rabbitmq` collection turns RabbitMQ configuration into repeatable, version-controlled infrastructure code. Combined with Ansible Vault for credential management, it gives you a solid foundation for managing message broker infrastructure at scale.
