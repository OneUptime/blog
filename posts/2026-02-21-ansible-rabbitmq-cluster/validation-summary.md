# Validation Summary: How to Use Ansible to Set Up RabbitMQ Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- RabbitMQ
- Erlang node authentication
- RabbitMQ clustering and peer discovery
- RabbitMQ quorum queues
- RabbitMQ CLI tools

## Sources Consulted
- RabbitMQ Clustering Guide: https://www.rabbitmq.com/docs/clustering
- RabbitMQ Cluster Formation and Peer Discovery: https://www.rabbitmq.com/docs/cluster-formation
- RabbitMQ Networking Guide: https://www.rabbitmq.com/docs/networking
- RabbitMQ Configuration Guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ Virtual Hosts and Default Queue Type: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ Quorum Queues Guide: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Deprecated Features List: https://www.rabbitmq.com/release-information/deprecated-features-list
- RabbitMQ Command Line Tools and man pages: https://www.rabbitmq.com/docs/cli and https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- Ansible community.rabbitmq.rabbitmq_policy module: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_policy_module.html

## Issues Found
- The introduction said the setup involved queue mirroring policies. Classic mirrored queues are deprecated and removed in RabbitMQ 4.0, and the guide is using quorum queues, so this was changed to refer to setting the default queue type and queue policies.
- The Erlang cookie playbook started RabbitMQ before peer discovery configuration was applied. RabbitMQ peer discovery only forms a cluster for nodes with a blank database, so the playbook now keeps RabbitMQ stopped until cluster configuration is in place.
- The cluster name example used `advanced.config` even though `cluster_name` is supported directly in `rabbitmq.conf`. The separate advanced configuration task was removed and `cluster_name` was added to the main RabbitMQ configuration template.
- The quorum queue policy implied that a policy could create quorum queues and included `queue-mode`, which is not how queue type is selected. The example now uses `default_queue_type = quorum` for new queue declarations and applies only supported quorum queue policy keys to `quorum_queues`.
- The classic mirrored queue deprecation note said "as of RabbitMQ 3.13." It was corrected to say that classic queue mirroring was deprecated in 2021 and removed in RabbitMQ 4.0.

## Review Notes
The examples assume a fresh deployment where RabbitMQ nodes have not already initialized standalone databases before peer discovery configuration is applied. Existing nodes would need a different migration or reset procedure to join cleanly.
