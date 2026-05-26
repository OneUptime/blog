# Validation Summary: How to Use the community.rabbitmq Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy collections
- community.rabbitmq collection
- RabbitMQ management HTTP API
- RabbitMQ queues, exchanges, bindings, users, vhosts, policies, and plugins
- YAML playbooks and role layout

## Sources Consulted
- Ansible community.rabbitmq collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/index.html
- Ansible community.rabbitmq.rabbitmq_exchange module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_exchange_module.html
- Ansible community.rabbitmq.rabbitmq_queue module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_queue_module.html
- Ansible community.rabbitmq.rabbitmq_binding module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_binding_module.html
- Ansible community.rabbitmq.rabbitmq_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_user_module.html
- Ansible community.rabbitmq.rabbitmq_vhost module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_vhost_module.html
- Ansible community.rabbitmq.rabbitmq_policy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_policy_module.html
- Ansible community.rabbitmq.rabbitmq_plugin module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_plugin_module.html
- RabbitMQ quorum queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ classic queue mirroring documentation: https://www.rabbitmq.com/docs/3.13/ha
- RabbitMQ deprecated features list: https://www.rabbitmq.com/release-information/deprecated-features-list
- RabbitMQ policies documentation: https://www.rabbitmq.com/docs/policies

## Issues Found
- The introduction claimed the collection manages cluster configuration. The current collection module list does not include a cluster configuration module, so this was narrowed to resources the collection actually exposes.
- The requirements example pinned `>=1.3.0`, but the post uses current REST/TLS-related module behavior documented in newer collection versions. Updated the minimum to `>=1.6.0`.
- The module overview incorrectly said HTTP API modules are "prefixed." Updated it to describe the actual REST API versus `rabbitmqctl` split.
- The connection-default variables used names such as `rabbitmq_api_tls` and `rabbitmq_api_ca_cert`, which are not module parameters and were not used by the examples. Updated them to variables that map directly to `login_*` and `ca_cert` parameters, then used those variables in the REST API examples.
- The policy example used classic mirrored queue keys (`ha-mode`, `ha-params`, `ha-sync-mode`). Classic queue mirroring has been removed in RabbitMQ 4.0, so the example was changed to declare quorum queues with `x-queue-type: quorum` and use a quorum queue delivery-limit policy.
- The plugin example passed `names` as a YAML list, but the module documents `names` as a comma-separated string. Updated the example to use the documented format.
- Troubleshooting text said most modules require the management plugin. Updated it to refer specifically to REST API modules.
- Queue argument idempotency notes now mention `x-queue-type`, which RabbitMQ requires at queue declaration time and cannot change via policy.

## Review Notes
The Ansible CLI was not installed in the local environment, so validation was performed against the official Ansible collection documentation and RabbitMQ documentation rather than local `ansible-doc` output.
