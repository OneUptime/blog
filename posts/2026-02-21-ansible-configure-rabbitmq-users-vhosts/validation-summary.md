# Validation Summary: How to Use Ansible to Configure RabbitMQ Users and Vhosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.rabbitmq Ansible collection
- RabbitMQ users, virtual hosts, permissions, and topic permissions
- rabbitmqctl
- Ansible Vault

## Sources Consulted
- Ansible community.rabbitmq.rabbitmq_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_user_module.html
- Ansible community.rabbitmq.rabbitmq_vhost module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_vhost_module.html
- Ansible ansible.builtin.subelements filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/subelements_filter.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- RabbitMQ access control documentation: https://www.rabbitmq.com/docs/access-control
- RabbitMQ rabbitmqctl manual page: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ virtual hosts documentation: https://www.rabbitmq.com/docs/4.2/vhosts
- RabbitMQ management plugin documentation: https://www.rabbitmq.com/docs/management

## Issues Found
- The permission overview simplified queue binding permissions too much. RabbitMQ requires write permission on the target queue and read permission on the source exchange for `queue.bind`. Updated the write and read permission descriptions to reflect that split.
- The verification playbook used `vault_admin_password` without loading the vault file. Added the same `vars_files` entry used by the other playbooks.
- The verification playbook used HTTP Basic authentication against the management API without `force_basic_auth`. Added `force_basic_auth: true`, which matches Ansible's guidance for sending Basic authentication credentials reliably.

## Review Notes
- The RabbitMQ vhost variable examples include `description` fields, but the shown `community.rabbitmq.rabbitmq_vhost` tasks only manage vhost presence. The current Ansible module documentation does not expose a `description` parameter, so these values are inventory metadata unless a separate RabbitMQ HTTP API or CLI metadata task is added later.
- The topic permissions example uses `rabbitmqctl set_topic_permissions`, which is valid. The `community.rabbitmq.rabbitmq_user` module also supports `topic_permissions` for RabbitMQ 3.7.0 and newer.
