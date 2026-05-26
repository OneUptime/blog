# Validation Summary: How to Use Ansible to Set Up a RabbitMQ Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- RabbitMQ 3.13
- Erlang/OTP
- RabbitMQ clustering
- RabbitMQ quorum queues
- RabbitMQ management plugin

## Sources Consulted
- RabbitMQ 3.13 documentation: https://www.rabbitmq.com/docs/3.13
- RabbitMQ 3.13 clustering guide: https://www.rabbitmq.com/docs/3.13/clustering
- RabbitMQ 3.13 quorum queues guide: https://www.rabbitmq.com/docs/3.13/quorum-queues
- RabbitMQ 3.13 classic queue mirroring guide: https://www.rabbitmq.com/docs/3.13/ha
- RabbitMQ 3.13 Debian/Ubuntu installation guide: https://www.rabbitmq.com/docs/3.13/install-debian
- RabbitMQ 3.13 virtual hosts guide: https://www.rabbitmq.com/docs/3.13/vhosts
- RabbitMQ 3.13 configuration guide: https://www.rabbitmq.com/docs/3.13/configure
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible import_playbook module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible community.rabbitmq collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/

## Issues Found
- The post claimed queues are replicated across all clustered nodes by default. RabbitMQ clustering replicates broker metadata, but queue contents require a replicated queue type. Updated the explanation to distinguish metadata replication from quorum queue content replication.
- The post used mirrored classic queues and `ha-mode: all`. RabbitMQ documents mirrored classic queues as deprecated in 3.13 and removed in RabbitMQ 4.x. Replaced the mirrored queue wording, policy, diagram labels, verification, and summary with quorum queue configuration.
- The installation tasks used the deprecated `apt_key` module and an outdated PackageCloud repository URL. Replaced them with the RabbitMQ team signing key and RabbitMQ-hosted apt repositories.
- The `rabbitmq_version` variable was declared but not used, so the role could install a newer RabbitMQ release where mirrored queue settings no longer work. Updated the install task to pin RabbitMQ 3.13.7 and added the Erlang 26 package version required by the RabbitMQ 3.13 install guide.
- The role deployed `rabbitmq-env.conf.j2` but did not show that template. Added the missing template snippet to set `NODENAME` consistently with the node names used by the cluster commands.
- The verification assertion counted every `rabbit@` occurrence in `cluster_status`, which can double count nodes because output includes multiple sections. Changed it to assert that each expected node name appears in the cluster status.
- The main playbook showed `import_playbook` with a `name` field. Ansible documents `import_playbook` as a top-level include action. Simplified it to the documented top-level form.

## Review Notes
RabbitMQ 3.13 documentation now states that the 3.13 series is out of community support, with new patch releases available only to paying customers through Dec 30, 2027. The tutorial is technically valid for RabbitMQ 3.13.7, but a future update should consider moving the example to a currently community-supported RabbitMQ 4.x release.
